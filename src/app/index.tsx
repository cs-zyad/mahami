import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/ui/brand-mark';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Palette, Radius, Shadow } from '@/constants/design';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <View style={styles.content}>
        <View style={styles.brand}><BrandMark /></View>

        <View style={styles.hero}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>٣</Text></View>
              <Text style={styles.previewLabel}>مساحتك لليوم</Text>
            </View>
            <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
            <View style={styles.taskPreview}>
              <View style={styles.previewCheck}><Text style={styles.previewCheckText}>✓</Text></View>
              <View style={styles.previewCopy}>
                <View style={[styles.previewLine, styles.previewLineShort]} />
                <View style={styles.previewLineMuted} />
              </View>
            </View>
            <View style={styles.taskPreview}>
              <View style={styles.previewEmpty} />
              <View style={styles.previewCopy}>
                <View style={styles.previewLine} />
                <View style={styles.previewLineMuted} />
              </View>
            </View>
          </View>

          <View style={styles.eyebrow}><Text style={styles.eyebrowText}>وضوح أكثر، ضغط أقل</Text></View>
          <Text style={styles.title}>يومك يستحق{`\n`}ترتيبًا يشبهك.</Text>
          <Text style={styles.subtitle}>
            مهامك، أولوياتك وروتينك اليومي في مساحة عربية هادئة تساعدك تنجز المهم.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="إنشاء حساب" onPress={() => router.push('/signup')} />
          <PrimaryButton
            label="لدي حساب بالفعل"
            onPress={() => router.push('/login')}
            variant="ghost"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 18 },
  brand: { alignItems: 'flex-end' },
  orbTop: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: Palette.accentSoft, opacity: 0.55, top: -130, left: -120,
  },
  orbBottom: {
    position: 'absolute', width: 230, height: 230, borderRadius: 115,
    backgroundColor: '#E7DDCB', opacity: 0.75, bottom: -130, right: -100,
  },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'flex-end', paddingTop: 10 },
  previewCard: {
    alignSelf: 'stretch', backgroundColor: Palette.surface, borderRadius: Radius.large,
    padding: 18, marginBottom: 25, transform: [{ rotate: '-1.5deg' }], ...Shadow.card,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { color: Palette.ink, fontSize: 15, fontWeight: '800', writingDirection: 'rtl' },
  miniBadge: { backgroundColor: Palette.accentSoft, minWidth: 32, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  miniBadgeText: { color: Palette.primary, fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Palette.surfaceMuted, marginTop: 14, overflow: 'hidden' },
  progressFill: { width: '62%', height: '100%', backgroundColor: Palette.accent, borderRadius: 3 },
  taskPreview: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 15 },
  previewCheck: { width: 26, height: 26, borderRadius: 9, backgroundColor: Palette.success, alignItems: 'center', justifyContent: 'center' },
  previewCheckText: { color: Palette.white, fontWeight: '900' },
  previewEmpty: { width: 26, height: 26, borderRadius: 9, borderWidth: 1.5, borderColor: Palette.line },
  previewCopy: { flex: 1, alignItems: 'flex-end', gap: 6 },
  previewLine: { width: '68%', height: 7, borderRadius: 4, backgroundColor: '#675346' },
  previewLineShort: { width: '51%' },
  previewLineMuted: { width: '32%', height: 5, borderRadius: 3, backgroundColor: Palette.surfaceMuted },
  eyebrow: { backgroundColor: Palette.accentSoft, paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.pill, marginBottom: 15 },
  eyebrowText: { color: Palette.primary, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  title: { color: Palette.ink, fontSize: 41, lineHeight: 54, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', letterSpacing: -0.7 },
  subtitle: { color: Palette.inkMuted, fontSize: 16, lineHeight: 27, textAlign: 'right', writingDirection: 'rtl', marginTop: 12, maxWidth: 355 },
  actions: { gap: 2 },
});
