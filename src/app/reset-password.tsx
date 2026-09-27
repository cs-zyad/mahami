import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/auth-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

export default function ResetPasswordScreen() {
  const { session, signOut, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [completed, setCompleted] = useState(false);

  const handleUpdate = async () => {
    setError(undefined);

    if (password.length < 8) {
      setError('استخدم ٨ أحرف على الأقل.');
      return;
    }

    if (password !== confirmation) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await signOut();
    setCompleted(true);
  };

  return (
    <AuthShell
      title={completed ? 'تم تحديث كلمة المرور' : 'كلمة مرور جديدة'}
      subtitle={completed ? 'تقدر الآن تدخل حسابك باستخدام كلمة المرور الجديدة.' : 'اختر كلمة قوية ومختلفة عن كلماتك السابقة.'}>
      {completed ? (
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>تم حفظ كلمة المرور الجديدة بأمان.</Text>
          <PrimaryButton label="تسجيل الدخول" onPress={() => router.replace('/login')} />
        </View>
      ) : (
        <View style={styles.form}>
          {!session && <Text style={styles.error}>افتح هذه الشاشة من رابط الاستعادة المرسل إلى بريدك.</Text>}
          <TextField
            label="كلمة المرور الجديدة"
            placeholder="٨ أحرف على الأقل"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <TextField
            label="تأكيد كلمة المرور"
            placeholder="أعد كتابة كلمة المرور"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoComplete="new-password"
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton
            label={loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            onPress={handleUpdate}
            disabled={!session || loading}
          />
        </View>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  error: { color: Palette.danger, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  successCard: { backgroundColor: Palette.surface, borderRadius: Radius.large, padding: 22, gap: 16, alignItems: 'center' },
  successIcon: { color: Palette.success, fontSize: 36, fontWeight: '900' },
  successText: { color: Palette.ink, fontSize: 15, lineHeight: 24, textAlign: 'center', writingDirection: 'rtl' },
});
