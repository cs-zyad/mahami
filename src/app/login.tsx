import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppleSignInButton } from '@/components/auth/apple-sign-in-button';
import { AuthShell } from '@/components/auth/auth-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const { signIn } = useAuth();

  const handleLogin = async () => {
    setAuthError(undefined);
    if (!email.includes('@') || !password) {
      setAuthError('أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setAuthError(result.error);
      return;
    }

    router.replace(result.needsOnboarding ? '/onboarding' : '/home');
  };

  return (
    <AuthShell title="أهلًا بعودتك" subtitle="سجّل دخولك وكمل من المكان الذي توقفت عنده.">
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
        <TextField
          label="كلمة المرور"
          placeholder="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        <Pressable onPress={() => router.push('/forgot-password')} hitSlop={10}>
          <Text style={styles.forgot}>نسيت كلمة المرور؟</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/resend-confirmation')} hitSlop={10}>
          <Text style={styles.confirmationLink}>لم يصلك رابط تأكيد صالح؟</Text>
        </Pressable>
        {!!authError && <Text style={styles.authError}>{authError}</Text>}
        <PrimaryButton
          label={loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          onPress={handleLogin}
          disabled={loading}
        />
      </View>

      <View style={styles.quickLogin}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو دخول سريع</Text>
          <View style={styles.dividerLine} />
        </View>

        <AppleSignInButton />
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => router.replace('/signup')} hitSlop={10}>
          <Text style={styles.link}>إنشاء حساب</Text>
        </Pressable>
        <Text style={styles.footerText}>جديد في مهامي؟</Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  quickLogin: { gap: 12, marginTop: 28 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Palette.line },
  dividerText: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  forgot: { color: Palette.primary, fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  confirmationLink: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { color: Palette.inkMuted, fontSize: 14, writingDirection: 'rtl' },
  link: { color: Palette.primary, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  authError: { color: Palette.danger, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
});
