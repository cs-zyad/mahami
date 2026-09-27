import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/auth-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const [confirmationEmail, setConfirmationEmail] = useState<string>();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string>();
  const { resendConfirmation, signUp } = useAuth();
  const emailValid = email.includes('@');
  const passwordValid = password.length >= 8;

  const handleSubmit = async () => {
    setSubmitted(true);
    setAuthError(undefined);
    if (!name.trim() || !emailValid || !passwordValid) return;

    setLoading(true);
    const result = await signUp(name, email, password);
    setLoading(false);

    if (result.error) {
      setAuthError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setConfirmationEmail(email.trim().toLowerCase());
      return;
    }

    router.replace('/onboarding');
  };

  const handleResend = async () => {
    if (!confirmationEmail) return;
    setResendStatus(undefined);
    setResending(true);
    const result = await resendConfirmation(confirmationEmail);
    setResending(false);
    setResendStatus(result.error ?? 'أرسلنا رابطًا جديدًا. استخدم أحدث رسالة وصلتك.');
  };

  if (confirmationEmail) {
    return (
      <AuthShell title="أكد بريدك" subtitle="أنشأنا حسابك، وبقيت خطوة واحدة لحمايته.">
        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationIcon}>✉</Text>
          <Text style={styles.confirmationTitle}>تفقد بريدك الإلكتروني</Text>
          <Text style={styles.confirmationText}>أرسلنا رابط التأكيد إلى {confirmationEmail}. افتح الرابط من نفس الجوال الذي عليه Expo Go.</Text>
          {!!resendStatus && <Text style={styles.resendStatus}>{resendStatus}</Text>}
          <PrimaryButton
            label={resending ? 'جاري الإرسال...' : 'إرسال رابط جديد'}
            onPress={handleResend}
            disabled={resending}
          />
          <PrimaryButton label="الذهاب لتسجيل الدخول" onPress={() => router.replace('/login')} variant="secondary" />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="ابدأ مساحتك" subtitle="ثلاث خطوات بسيطة، وبعدها يكون يومك أمامك بوضوح.">
      <View style={styles.form}>
        <TextField
          label="الاسم"
          placeholder="كيف نناديك؟"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          error={submitted && !name.trim() ? 'اكتب اسمك للمتابعة' : undefined}
        />
        <TextField
          label="البريد الإلكتروني"
          placeholder="name@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={submitted && !emailValid ? 'تحقق من البريد الإلكتروني' : undefined}
        />
        <TextField
          label="كلمة المرور"
          placeholder="٨ أحرف على الأقل"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          error={submitted && !passwordValid ? 'استخدم ٨ أحرف على الأقل' : undefined}
        />
        {!!authError && <Text style={styles.authError}>{authError}</Text>}
        <PrimaryButton
          label={loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submit}
        />
      </View>
      <View style={styles.footer}>
        <Pressable onPress={() => router.replace('/login')} hitSlop={10}>
          <Text style={styles.link}>تسجيل الدخول</Text>
        </Pressable>
        <Text style={styles.footerText}>لديك حساب؟</Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  submit: { marginTop: 6 },
  footer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { color: Palette.inkMuted, fontSize: 14, writingDirection: 'rtl' },
  link: { color: Palette.primary, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  authError: { color: Palette.danger, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  confirmationCard: { backgroundColor: Palette.surface, borderRadius: 24, padding: 22, alignItems: 'center', gap: 13 },
  confirmationIcon: { color: Palette.primary, fontSize: 34, fontWeight: '900' },
  confirmationTitle: { color: Palette.ink, fontSize: 20, fontWeight: '900', writingDirection: 'rtl' },
  confirmationText: { color: Palette.inkMuted, fontSize: 14, lineHeight: 23, textAlign: 'center', writingDirection: 'rtl', marginBottom: 5 },
  resendStatus: { color: Palette.primary, fontSize: 12, lineHeight: 20, textAlign: 'center', writingDirection: 'rtl' },
});
