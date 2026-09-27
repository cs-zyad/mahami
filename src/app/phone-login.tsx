import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/auth-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

type Step = 'phone' | 'otp';
type PendingAction = 'send' | 'verify' | 'resend';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const TEST_PHONE_INPUT = '96651111111';
const TEST_PHONE_AUTH = '+966511111111';
const TEST_OTP_INPUT = '1111';

function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizeSaudiPhone(value: string) {
  let digits = toEnglishDigits(value).replace(/\D/g, '');

  if (__DEV__ && digits === TEST_PHONE_INPUT) return TEST_PHONE_AUTH;

  if (digits.startsWith('00966')) digits = digits.slice(2);
  if (digits.startsWith('9660')) digits = `966${digits.slice(4)}`;
  if (digits.startsWith('05')) digits = `966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) digits = `966${digits}`;

  return /^9665\d{8}$/.test(digits) ? `+${digits}` : undefined;
}

function formatPhone(phone: string) {
  const match = phone.match(/^\+966(5\d)(\d{3})(\d{4})$/);
  return match ? `+966 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

export default function PhoneLoginScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(__DEV__ ? TEST_PHONE_INPUT : '+966 ');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [isTestLogin, setIsTestLogin] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [fieldError, setFieldError] = useState<string>();
  const [authError, setAuthError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [resendSeconds, setResendSeconds] = useState(0);
  const { sendPhoneOtp, signInTestAccount, verifyPhoneOtp } = useAuth();

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timeout = setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resendSeconds]);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setFieldError(undefined);
    setAuthError(undefined);
  };

  const handleSendCode = async () => {
    const phoneDigits = toEnglishDigits(phone).replace(/\D/g, '');
    const usingTestLogin = __DEV__ && phoneDigits === TEST_PHONE_INPUT;
    const normalizedPhone = normalizeSaudiPhone(phone);
    setFieldError(undefined);
    setAuthError(undefined);
    setStatus(undefined);

    if (!normalizedPhone) {
      setFieldError('أدخل رقم جوال سعودي صحيح، مثل 05xxxxxxxx');
      return;
    }

    if (usingTestLogin) {
      setIsTestLogin(true);
      setPhone(TEST_PHONE_INPUT);
      setVerifiedPhone(normalizedPhone);
      setOtp('');
      setStep('otp');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      return;
    }

    setPendingAction('send');
    const result = await sendPhoneOtp(normalizedPhone);
    setPendingAction(undefined);

    if (result.error) {
      setAuthError(result.error);
      return;
    }

    setIsTestLogin(usingTestLogin);
    setPhone(usingTestLogin ? TEST_PHONE_INPUT : normalizedPhone);
    setVerifiedPhone(normalizedPhone);
    setOtp('');
    setStep('otp');
    setResendSeconds(RESEND_COOLDOWN_SECONDS);
  };

  const handleOtpChange = (value: string) => {
    const activeOtpLength = isTestLogin ? TEST_OTP_INPUT.length : OTP_LENGTH;
    setOtp(toEnglishDigits(value).replace(/\D/g, '').slice(0, activeOtpLength));
    setFieldError(undefined);
    setAuthError(undefined);
  };

  const handleVerifyCode = async () => {
    const activeOtpLength = isTestLogin ? TEST_OTP_INPUT.length : OTP_LENGTH;
    setFieldError(undefined);
    setAuthError(undefined);

    if (otp.length !== activeOtpLength) {
      setFieldError(`أدخل رمز التحقق المكوّن من ${activeOtpLength} أرقام`);
      return;
    }

    if (isTestLogin && otp !== TEST_OTP_INPUT) {
      setFieldError('رمز التحقق غير صحيح.');
      return;
    }

    setPendingAction('verify');
    const result = isTestLogin
      ? await signInTestAccount()
      : await verifyPhoneOtp(verifiedPhone, otp);
    setPendingAction(undefined);

    if (result.error) {
      setAuthError(result.error);
      return;
    }

    router.replace(result.needsOnboarding ? '/onboarding' : '/home');
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || pendingAction) return;

    setAuthError(undefined);
    setStatus(undefined);

    if (isTestLogin) {
      setOtp('');
      setStatus('أرسلنا لك رمزًا جديدًا.');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      return;
    }

    setPendingAction('resend');
    const result = await sendPhoneOtp(verifiedPhone);
    setPendingAction(undefined);

    if (result.error) {
      setAuthError(result.error);
      return;
    }

    setOtp('');
    setStatus('أرسلنا لك رمزًا جديدًا.');
    setResendSeconds(RESEND_COOLDOWN_SECONDS);
  };

  const handleEditPhone = () => {
    setStep('phone');
    setIsTestLogin(false);
    setOtp('');
    setFieldError(undefined);
    setAuthError(undefined);
    setStatus(undefined);
  };

  if (step === 'otp') {
    const resendDisabled = resendSeconds > 0 || !!pendingAction;
    const activeOtpLength = isTestLogin ? TEST_OTP_INPUT.length : OTP_LENGTH;

    return (
      <AuthShell
        title="رمز التحقق"
        subtitle="أدخل رمز التحقق الذي أرسلناه إلى جوالك.">
        <View style={styles.form}>
          <View style={styles.numberCard}>
            <View style={styles.numberTextGroup}>
              <Text style={styles.numberCaption}>تم إرسال الرمز إلى</Text>
              <Text style={styles.numberValue}>
                {isTestLogin ? TEST_PHONE_INPUT : formatPhone(verifiedPhone)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تعديل رقم الجوال"
              hitSlop={8}
              onPress={handleEditPhone}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
              <Text style={styles.editButtonText}>تعديل</Text>
            </Pressable>
          </View>

          <TextField
            label="رمز التحقق"
            placeholder={isTestLogin ? '••••' : '••••••'}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={activeOtpLength}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleVerifyCode}
            error={fieldError}
            style={styles.otpInput}
          />

          {!!authError && <Text style={styles.authError}>{authError}</Text>}
          {!!status && <Text style={styles.successText}>{status}</Text>}

          <PrimaryButton
            label={pendingAction === 'verify' ? 'جاري التحقق...' : 'تأكيد الرمز'}
            onPress={handleVerifyCode}
            disabled={!!pendingAction || otp.length !== activeOtpLength}
            style={styles.submit}
          />

          <View style={styles.resendRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إعادة إرسال رمز التحقق"
              disabled={resendDisabled}
              hitSlop={8}
              onPress={handleResend}>
              <Text style={[styles.resendLink, resendDisabled && styles.disabledLink]}>
                {pendingAction === 'resend' ? 'جاري الإرسال...' : 'إرسال رمز جديد'}
              </Text>
            </Pressable>
            <Text style={styles.resendText}>
              {resendSeconds > 0 ? `يمكنك إعادة الإرسال بعد ${resendSeconds} ثانية` : 'لم يصلك الرمز؟'}
            </Text>
          </View>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="الدخول برقم الجوال"
      subtitle="سنرسل لك رمز تحقق لمرة واحدة. لا تحتاج إلى حفظ كلمة مرور.">
      <View style={styles.form}>
        <View style={styles.countryBadge}>
          <Text style={styles.countryFlag}>🇸🇦</Text>
          <View style={styles.countryTextGroup}>
            <Text style={styles.countryName}>المملكة العربية السعودية</Text>
            <Text style={styles.countryCode}>رمز الدولة الافتراضي +966</Text>
          </View>
        </View>

        <TextField
          label="رقم الجوال"
          placeholder="+966 5xxxxxxxx"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="tel"
          textContentType="telephoneNumber"
          autoCapitalize="none"
          returnKeyType="send"
          onSubmitEditing={handleSendCode}
          error={fieldError}
          style={styles.phoneInput}
        />

        <Text style={styles.privacyNote}>
          بإكمالك، قد تصلك رسالة نصية للتحقق. لن نشارك رقمك مع الآخرين.
        </Text>
        {!!authError && <Text style={styles.authError}>{authError}</Text>}

        <PrimaryButton
          label={pendingAction === 'send' ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق'}
          onPress={handleSendCode}
          disabled={!!pendingAction}
          style={styles.submit}
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  submit: { marginTop: 4 },
  countryBadge: {
    minHeight: 70,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryFlag: { fontSize: 25 },
  countryTextGroup: { flex: 1, alignItems: 'flex-start', gap: 3 },
  countryName: {
    color: Palette.ink,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  countryCode: {
    color: Palette.inkMuted,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  phoneInput: {
    textAlign: 'left',
    writingDirection: 'ltr',
    letterSpacing: 0.5,
  },
  privacyNote: {
    color: Palette.inkMuted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  authError: {
    color: Palette.danger,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  successText: {
    color: Palette.success,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  numberCard: {
    minHeight: 76,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  numberTextGroup: { flex: 1, alignItems: 'flex-start', gap: 5 },
  numberCaption: {
    color: Palette.inkMuted,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  numberValue: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  editButton: {
    minWidth: 58,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  editButtonText: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  otpInput: {
    minHeight: 66,
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'ltr',
    letterSpacing: 12,
    paddingLeft: 28,
  },
  resendRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  resendText: {
    color: Palette.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  resendLink: {
    color: Palette.primary,
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  disabledLink: { color: Palette.inkMuted, opacity: 0.7 },
});
