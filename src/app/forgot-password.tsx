import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { makeStyles } from '@/contexts/theme-context';
import { AuthShell } from '@/components/auth/auth-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Radius } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

export default function ForgotPasswordScreen() {
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const { sendPasswordReset } = useAuth();

  const handleReset = async () => {
    setAuthError(undefined);
    setLoading(true);
    const result = await sendPasswordReset(email);
    setLoading(false);

    if (result.error) {
      setAuthError(result.error);
      return;
    }

    setSent(true);
  };

  return (
    <AuthShell title="استعادة الحساب" subtitle="أدخل بريدك وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.">
      {sent ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>تفقد بريدك</Text>
          <Text style={styles.noticeBody}>أرسلنا رابط الاستعادة إلى {email || 'بريدك الإلكتروني'}.</Text>
          <PrimaryButton label="العودة لتسجيل الدخول" onPress={() => router.replace('/login')} variant="secondary" />
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="البريد الإلكتروني"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {!!authError && <Text style={styles.authError}>{authError}</Text>}
          <PrimaryButton
            label={loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
            onPress={handleReset}
            disabled={!email.includes('@') || loading}
          />
        </View>
      )}
    </AuthShell>
  );
}

const useStyles = makeStyles((P) => ({
  form: { gap: 20 },
  notice: { backgroundColor: P.surface, borderRadius: Radius.large, padding: 22, gap: 14 },
  noticeTitle: { color: P.ink, fontSize: 21, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  noticeBody: { color: P.inkMuted, fontSize: 14, lineHeight: 23, textAlign: 'right', writingDirection: 'rtl' },
  authError: { color: P.danger, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
}));
