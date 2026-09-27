import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';

import { AppIcon } from '@/components/ui/app-icon';
import { FormScreen } from '@/components/ui/form-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Palette, Radius, Shadow } from '@/constants/design';
import { PRIVACY_URL, TERMS_URL } from '@/constants/links';
import { useAuth } from '@/contexts/auth-context';
import { getMahamiPlusPackage, isPurchasesConfigured, purchaseErrorMessage, purchaseMahamiPlus, restoreMahamiPlus } from '@/lib/purchases';
import { getSmartScanStatus } from '@/lib/smart-capture';
import { SmartScanStatus } from '@/types/smart-capture';

const benefits = [
  ['text.viewfinder', '50 عملية تحويل ذكية كل شهر', 'حوّل الجداول والرسائل والصور إلى مهام.'],
  ['checkmark.circle.fill', 'مراجعة قبل الحفظ', 'أنت تختار وتعدّل قبل إضافة أي مهمة.'],
  ['lock.fill', 'خصوصية واضحة', 'لا نحتفظ بالصورة أو التسجيل بعد اكتمال التحليل.'],
] as const;

export default function MahamiPlusScreen() {
  const { session } = useAuth();
  const [status, setStatus] = useState<SmartScanStatus | null>(null);
  const [packageToBuy, setPackageToBuy] = useState<PurchasesPackage | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(isPurchasesConfigured());
  const [processing, setProcessing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string>();
  const purchasesConfigured = isPurchasesConfigured();

  useEffect(() => {
    void getSmartScanStatus().then(setStatus).catch(() => undefined);
    const userId = session?.user.id;
    if (!userId || !purchasesConfigured) return;
    void getMahamiPlusPackage(userId)
      .then(setPackageToBuy)
      .catch((error) => setPurchaseError(purchaseErrorMessage(error) ?? undefined))
      .finally(() => setLoadingProduct(false));
  }, [purchasesConfigured, session?.user.id]);

  const active = status?.allowanceType === 'monthly';

  const subscribe = async () => {
    const userId = session?.user.id;
    if (!userId || !packageToBuy || processing) return;
    setProcessing(true);
    setPurchaseError(undefined);
    try {
      await purchaseMahamiPlus(userId, packageToBuy);
      setStatus(await getSmartScanStatus());
      Alert.alert('تم تفعيل مهامي بلس', 'أصبح لديك الآن ٥٠ عملية تحويل ذكية.', [
        { text: 'ابدأ الآن', onPress: () => router.replace('/ai-tasks') },
      ]);
    } catch (error) {
      const message = purchaseErrorMessage(error);
      if (message) setPurchaseError(message);
    } finally {
      setProcessing(false);
    }
  };

  const restore = async () => {
    const userId = session?.user.id;
    if (!userId || processing) return;
    setProcessing(true);
    setPurchaseError(undefined);
    try {
      const restored = await restoreMahamiPlus(userId);
      setStatus(await getSmartScanStatus());
      Alert.alert(
        restored ? 'تمت الاستعادة' : 'لا يوجد اشتراك فعّال',
        restored ? 'تمت استعادة مهامي بلس لهذا الحساب.' : 'لم نجد مشتريات مرتبطة بحساب Apple الحالي.',
      );
    } catch (error) {
      const message = purchaseErrorMessage(error);
      if (message) setPurchaseError(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <FormScreen title="مهامي بلس" subtitle="حوّل ما تراه إلى خطة قابلة للإنجاز.">
      <View style={styles.hero}>
        <View style={styles.crown}>
          <AppIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={30} tintColor={Palette.primary} fallback="✦" />
        </View>
        <Text style={styles.plan}>مهامي بلس</Text>
        <View style={styles.priceRow}>
          <Text style={styles.period}>شهريًا</Text>
          <Text style={styles.price}>{packageToBuy?.product.priceString || '١٠ ر.س'}</Text>
        </View>
        <Text style={styles.cancel}>يتجدد تلقائيًا ويمكنك الإلغاء من إعدادات Apple.</Text>
      </View>

      <View style={styles.benefits}>
        {benefits.map(([icon, title, description], index) => (
          <View key={title} style={[styles.benefit, index < benefits.length - 1 && styles.benefitBorder]}>
            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>{title}</Text>
              <Text style={styles.benefitText}>{description}</Text>
            </View>
            <View style={styles.benefitIcon}>
              <AppIcon name={{ ios: icon, android: 'check_circle', web: 'check_circle' }} size={19} tintColor={Palette.primary} fallback="✓" />
            </View>
          </View>
        ))}
      </View>

      {active ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>اشتراكك فعّال ✓</Text>
          <Text style={styles.activeText}>{status.remaining} من {status.usageLimit} عملية متبقية.</Text>
          <PrimaryButton label="ابدأ التحويل الذكي" onPress={() => router.replace('/ai-tasks')} />
        </View>
      ) : (
        <View style={styles.actions}>
          {loadingProduct && <ActivityIndicator color={Palette.primary} />}
          {!purchasesConfigured && (
            <Text style={styles.setupNotice}>الاشتراك غير متاح على هذا الجهاز حاليًا. حاول مرة أخرى بعد قليل.</Text>
          )}
          {!!purchaseError && <Text style={styles.error}>{purchaseError}</Text>}
          <PrimaryButton
            label={processing ? 'جاري التواصل مع App Store...' : `اشترك بـ ${packageToBuy?.product.priceString || '١٠ ر.س'} شهريًا`}
            disabled={!packageToBuy || processing}
            onPress={() => void subscribe()}
          />
          <PrimaryButton label="استعادة المشتريات" variant="ghost" disabled={!purchasesConfigured || processing} onPress={() => void restore()} />
        </View>
      )}

      <Text style={styles.terms}>
        اشتراك شهري يتجدد تلقائيًا بـ {packageToBuy?.product.priceString || '١٠ ر.س'} حتى تلغيه من إعدادات Apple قبل ٢٤ ساعة من نهاية الفترة. باستمرارك توافق على{' '}
        <Text style={styles.termsLink} onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}>شروط الاستخدام</Text>
        {' '}و{' '}
        <Text style={styles.termsLink} onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}>سياسة الخصوصية</Text>.
      </Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 250, borderRadius: Radius.large, backgroundColor: Palette.primary, padding: 24, alignItems: 'center', justifyContent: 'center', ...Shadow.card },
  crown: { width: 68, height: 68, borderRadius: 24, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  plan: { color: Palette.white, fontSize: 24, fontWeight: '900', writingDirection: 'rtl' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8, marginTop: 13 },
  period: { color: '#DDCDC1', fontSize: 11, writingDirection: 'rtl' },
  price: { color: Palette.white, fontSize: 30, fontWeight: '900', writingDirection: 'rtl' },
  cancel: { color: '#DDCDC1', fontSize: 10, marginTop: 10, textAlign: 'center', writingDirection: 'rtl' },
  benefits: { borderRadius: Radius.large, backgroundColor: Palette.surface, paddingHorizontal: 15, marginTop: 18, ...Shadow.card },
  benefit: { minHeight: 82, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  benefitBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.line },
  benefitCopy: { flex: 1, alignItems: 'flex-start' },
  benefitTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  benefitText: { color: Palette.inkMuted, fontSize: 10, lineHeight: 17, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  benefitIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 7, marginTop: 18 },
  setupNotice: { color: Palette.inkMuted, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl', backgroundColor: Palette.accentSoft, borderRadius: Radius.small, padding: 12 },
  error: { color: Palette.danger, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl', backgroundColor: '#F8E9E5', borderRadius: Radius.small, padding: 12 },
  activeCard: { gap: 10, borderRadius: Radius.large, backgroundColor: Palette.successSoft, padding: 18, marginTop: 18 },
  activeTitle: { color: Palette.success, fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  activeText: { color: Palette.inkMuted, fontSize: 11, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4 },
  terms: { color: Palette.inkMuted, fontSize: 10, lineHeight: 18, textAlign: 'center', writingDirection: 'rtl', marginTop: 12, paddingHorizontal: 14 },
  termsLink: { color: Palette.primary, fontWeight: '800', textDecorationLine: 'underline' },
});
