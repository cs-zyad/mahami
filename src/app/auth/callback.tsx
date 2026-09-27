import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/auth-shell';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Palette, Radius } from '@/constants/design';
import { createSessionFromAuthUrl } from '@/lib/auth-links';

export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL();
  const handledUrl = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!url || handledUrl.current === url) return;
    handledUrl.current = url;

    let active = true;

    const finishAuthentication = async () => {
      const result = await createSessionFromAuthUrl(url);
      if (!active) return;

      if (result.error || !result.session) {
        setError('تعذر استخدام الرابط. قد يكون منتهيًا أو مستخدمًا من قبل. اطلب رابطًا جديدًا.');
        return;
      }

      if (result.type === 'recovery') {
        router.replace('/reset-password');
        return;
      }

      const needsOnboarding = result.session.user.user_metadata.onboarding_completed !== true;
      router.replace(needsOnboarding ? '/onboarding' : '/home');
    };

    void finishAuthentication();
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <AuthShell
      title={error ? 'الرابط غير صالح' : 'جاري تأكيد حسابك'}
      subtitle={error ? 'نحافظ على أمان حسابك، لذلك لا نقبل الروابط المنتهية أو المستخدمة.' : 'لحظات ونرجعك إلى مهامي.'}>
      <View style={styles.card}>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <PrimaryButton label="العودة لتسجيل الدخول" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={Palette.primary} />
            <Text style={styles.loading}>جاري التحقق من الرابط الآمن...</Text>
          </>
        )}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 160,
    borderRadius: Radius.large,
    backgroundColor: Palette.surface,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  loading: { color: Palette.inkMuted, fontSize: 14, writingDirection: 'rtl' },
  error: { color: Palette.danger, fontSize: 14, lineHeight: 23, textAlign: 'center', writingDirection: 'rtl' },
});
