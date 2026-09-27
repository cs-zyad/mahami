import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';

import { supabase } from '@/lib/supabase';

export const MAHAMI_PLUS_ENTITLEMENT = 'mahami_plus';

let configuredUserId: string | null = null;

function revenueCatKey() {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';
  return '';
}

export function isPurchasesConfigured() {
  return revenueCatKey().length > 10;
}

async function ensurePurchases(userId: string) {
  const apiKey = revenueCatKey();
  if (!apiKey) throw new Error('purchases_not_configured');

  if (!configuredUserId) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey, appUserID: userId });
    configuredUserId = userId;
  } else if (configuredUserId !== userId) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }
}

function hasMahamiPlus(customerInfo: CustomerInfo) {
  return customerInfo.entitlements.active[MAHAMI_PLUS_ENTITLEMENT]?.isActive === true;
}

export async function getMahamiPlusPackage(userId: string): Promise<PurchasesPackage> {
  await ensurePurchases(userId);
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current;
  const packageToBuy = offering?.monthly ?? offering?.availablePackages[0];
  if (!packageToBuy) throw new Error('offering_not_configured');
  return packageToBuy;
}

export async function purchaseMahamiPlus(userId: string, packageToBuy: PurchasesPackage) {
  await ensurePurchases(userId);
  const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
  if (!hasMahamiPlus(customerInfo)) throw new Error('entitlement_not_active');
  await syncRevenueCatSubscription();
}

export async function restoreMahamiPlus(userId: string) {
  await ensurePurchases(userId);
  const customerInfo = await Purchases.restorePurchases();
  await syncRevenueCatSubscription();
  return hasMahamiPlus(customerInfo);
}

export async function syncRevenueCatSubscription() {
  if (!supabase) throw new Error('supabase_not_configured');
  const { error } = await supabase.functions.invoke('sync-revenuecat-subscription');
  if (error) throw new Error('subscription_sync_failed');
}

export function purchaseErrorMessage(error: unknown) {
  const details = error as { message?: string; userCancelled?: boolean };
  if (details.userCancelled) return null;
  if (details.message === 'purchases_not_configured') return 'أضف مفتاح RevenueCat العام لإظهار اشتراك App Store.';
  if (details.message === 'offering_not_configured') return 'أنشئ عرضًا شهريًا في RevenueCat واربطه بمنتج مهامي بلس.';
  if (details.message === 'subscription_sync_failed') return 'تمت العملية لكن تعذرت مزامنة الاشتراك. استخدم استعادة المشتريات بعد قليل.';
  return 'تعذر إكمال العملية من App Store. حاول مرة أخرى.';
}
