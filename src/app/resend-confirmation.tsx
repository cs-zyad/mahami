import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/auth-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

export default function ResendConfirmationScreen() {
  const { resendConfirmation } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setError(undefined);
    setLoading(true);
    const result = await resendConfirmation(email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSent(true);
  };

  return (
    <AuthShell title="إعادة إرسال التأكيد" subtitle="سنرسل لك رابطًا جديدًا يفتح مهامي مباشرة.">
      {sent ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>تم إرسال الرابط</Text>
          <Text style={styles.noticeBody}>استخدم أحدث رسالة وصلت إلى {email} وافتحها من نفس الجوال الذي عليه Expo Go.</Text>
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
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton
            label={loading ? 'جاري الإرسال...' : 'إرسال رابط جديد'}
            onPress={handleResend}
            disabled={!email.includes('@') || loading}
          />
        </View>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  notice: { backgroundColor: Palette.surface, borderRadius: Radius.large, padding: 22, gap: 14 },
  noticeTitle: { color: Palette.ink, fontSize: 21, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  noticeBody: { color: Palette.inkMuted, fontSize: 14, lineHeight: 23, textAlign: 'right', writingDirection: 'rtl' },
  error: { color: Palette.danger, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
});
