import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppleSignInButton } from '@/components/auth/apple-sign-in-button';
import { AuthShell } from '@/components/auth/auth-shell';
import { Palette } from '@/constants/design';

// New accounts are created through Apple only. Signing up by email sends a
// confirmation message, and Supabase's built-in mail service caps the whole
// project at a few per hour, so that path turned real users away on launch
// day. Apple sends no mail. Existing email accounts still sign in from the
// login screen.
export default function SignUpScreen() {
  return (
    <AuthShell title="ابدأ مساحتك" subtitle="سجّل بحساب Apple وابدأ خلال ثوانٍ.">
      <View style={styles.primaryAuth}>
        <AppleSignInButton intent="sign-up" />
      </View>

      <Text style={styles.note}>
        نستخدم حساب Apple لتسجيلك بأمان، بلا كلمة مرور تحفظها أو بريد تنتظره.
      </Text>

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
  primaryAuth: { gap: 12 },
  note: {
    color: Palette.inkMuted,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 18,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 28 },
  footerText: { color: Palette.inkMuted, fontSize: 14, writingDirection: 'rtl' },
  link: { color: Palette.primary, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
});
