import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { BackButton } from '@/components/ui/back-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Palette, Radius, Shadow } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

type SetupOptionProps = {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  icon: 'bell.badge.fill' | 'calendar';
  androidIcon: 'notifications' | 'calendar_month';
};

function SetupOption({ title, description, selected, onPress, icon, androidIcon }: SetupOptionProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <AppIcon
          name={{ ios: icon, android: androidIcon, web: androidIcon }}
          size={22}
          tintColor={selected ? Palette.white : Palette.primary}
          fallback={selected ? '✓' : '○'}
        />
      </View>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string>();
  const { completeOnboarding } = useAuth();

  const handleContinue = async () => {
    setSetupError(undefined);
    setSaving(true);

    // Asked only now, exactly as the note under the button promises.
    if (notifications) {
      await Notifications.requestPermissionsAsync().catch(() => undefined);
    }

    const result = await completeOnboarding();
    setSaving(false);

    if (result.error) {
      setSetupError(result.error);
      return;
    }

    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.step}>الخطوة ١ من ١</Text>
          <BackButton />
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>خلّ مهامي يعمل{`\n`}بالطريقة المناسبة لك</Text>
          <Text style={styles.subtitle}>اختر ما يناسبك الآن. تقدر تغيّر هذه الخيارات من الإعدادات في أي وقت.</Text>
        </View>

        <View style={styles.options}>
          <SetupOption
            title="ذكّرني في الوقت المناسب"
            description="تنبيهات للمهام والروتين، بدون إزعاج زائد."
            selected={notifications}
            onPress={() => setNotifications((value) => !value)}
            icon="bell.badge.fill"
            androidIcon="notifications"
          />
        </View>

        <View style={styles.insight}>
          <Text style={styles.insightNumber}>١٠</Text>
          <View style={styles.insightCopy}>
            <Text style={styles.insightTitle}>ثوانٍ فقط</Text>
            <Text style={styles.insightText}>وبعدها تبدأ أول يوم مرتب داخل مهامي.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {!!setupError && <Text style={styles.setupError}>{setupError}</Text>}
          <PrimaryButton
            label={saving ? 'جاري تجهيز مساحتك...' : 'افتح مساحتي'}
            onPress={handleContinue}
            disabled={saving}
          />
          <Text style={styles.privacy}>لن نطلب صلاحية النظام إلا بعد ضغط المتابعة.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { color: Palette.inkMuted, fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  heading: { alignItems: 'flex-end', marginTop: 52 },
  title: { color: Palette.ink, fontSize: 35, lineHeight: 47, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: Palette.inkMuted, fontSize: 15, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl', marginTop: 10, maxWidth: 350 },
  options: { gap: 14, marginTop: 34 },
  option: {
    minHeight: 105, backgroundColor: Palette.surface, borderRadius: Radius.large,
    borderWidth: 1, borderColor: 'transparent', padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 15, ...Shadow.card,
  },
  optionSelected: { borderColor: Palette.accent, backgroundColor: '#FFF9F4' },
  optionCopy: { flex: 1, alignItems: 'flex-end', gap: 5 },
  optionTitle: { color: Palette.ink, fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  optionDescription: { color: Palette.inkMuted, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  optionIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  optionIconSelected: { backgroundColor: Palette.primary },
  pressed: { opacity: 0.82 },
  insight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 28, paddingRight: 6 },
  insightNumber: { color: Palette.accent, fontSize: 38, fontWeight: '900' },
  insightCopy: { alignItems: 'flex-end' },
  insightTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  insightText: { color: Palette.inkMuted, fontSize: 12, marginTop: 2, writingDirection: 'rtl' },
  footer: { marginTop: 'auto', gap: 12 },
  privacy: { color: Palette.inkMuted, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  setupError: { color: Palette.danger, fontSize: 12, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
});
