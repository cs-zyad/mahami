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
  // Apple leads, but the email form must stay reachable: accounts created
  // before this change can only sign in that way.
  const [showEmailForm, setShowEmailForm] = useState(false);
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
      <View style={styles.primaryAuth}>
        <AppleSignInButton />
      </View>

      {!showEmailForm && (
        <View style={styles.altRow}>
          <Pressable onPress={() => setShowEmailForm(true)} hitSlop={10}>
            <Text style={styles.altLink}>تسجيل الدخول بالبريد الإلكتروني</Text>
          </Pressable>
        </View>
      )}

      {showEmailForm && (
      <View style={styles.form}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو بالبريد الإلكتروني</Text>
          <View style={styles.dividerLine} />
        </View>
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
      )}

    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  primaryAuth: { gap: 12 },
  altRow: { alignItems: 'center', marginTop: 20 },
  altLink: { color: Palette.primary, fontSize: 14, fontWeight: '800', writingDirection: 'rtl' },
  dividerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Palette.line },
  dividerText: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  forgot: { color: Palette.primary, fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  confirmationLink: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  authError: { color: Palette.danger, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
});
