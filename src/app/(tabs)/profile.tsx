import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Radius, Shadow } from '@/constants/design';
import { PRIVACY_URL, SUPPORT_URL } from '@/constants/links';
import { useAuth } from '@/contexts/auth-context';
import { getSmartScanStatus } from '@/lib/smart-capture';
import { SmartScanStatus } from '@/types/smart-capture';

type SettingRowProps = {
  title: string;
  subtitle?: string;
  icon: string;
  androidIcon: string;
  trailing?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
};

function SettingRow({ title, subtitle, icon, androidIcon, trailing, danger, onPress }: SettingRowProps) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
      {trailing ?? (onPress ? (
        <AppIcon name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={16} tintColor={Palette.inkMuted} fallback="‹" />
      ) : null)}
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, danger && styles.danger]}>{title}</Text>
        {!!subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <View style={[styles.settingIcon, danger && styles.dangerIcon]}>
        <AppIcon name={{ ios: icon as never, android: androidIcon as never, web: androidIcon as never }} size={19} tintColor={danger ? Palette.danger : Palette.primary} fallback="•" />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { session, signOut, deleteAccount } = useAuth();
  const [smartStatus, setSmartStatus] = useState<SmartScanStatus | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const name = session?.user.user_metadata.full_name || 'مستخدم مهامي';
  const accountContact = session?.user.email || session?.user.phone || '';
  const initial = name.trim().charAt(0) || 'م';

  useEffect(() => {
    void getSmartScanStatus().then(setSmartStatus).catch(() => undefined);
  }, []);

  // Permissions change outside the app, so re-read them whenever it returns to the foreground.
  useEffect(() => {
    let active = true;

    const syncNotificationStatus = () => {
      Notifications.getPermissionsAsync()
        .then((permissions) => {
          if (active) setNotificationsEnabled(permissions.granted);
        })
        .catch(() => undefined);
    };

    syncNotificationStatus();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNotificationStatus();
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const handleNotificationsPress = async () => {
    if (notificationsEnabled) {
      await Linking.openSettings();
      return;
    }
    const requested = await Notifications.requestPermissionsAsync().catch(() => null);
    if (requested?.granted) {
      setNotificationsEnabled(true);
      return;
    }
    Alert.alert(
      'الإشعارات معطّلة',
      'فعّل الإشعارات من إعدادات جهازك حتى تصلك تذكيرات المهام والروتين.',
      [
        { text: 'لاحقًا', style: 'cancel' },
        { text: 'فتح الإعدادات', onPress: () => void Linking.openSettings() },
      ],
    );
  };

  const signOutNow = async () => {
    const result = await signOut();
    if (!result.error) router.replace('/');
  };

  const deleteAccountNow = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    if (result.error) {
      Alert.alert('تعذر حذف الحساب', result.error);
      return;
    }
    router.replace('/');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'حذف الحساب نهائيًا',
      'سيتم حذف حسابك وكل مهامك وروتيناتك نهائيًا، ولا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف نهائيًا', style: 'destructive', onPress: () => void deleteAccountNow() },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الخروج', style: 'destructive', onPress: signOutNow },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>حسابي</Text>
          <Text style={styles.subtitle}>مساحتك وإعداداتك</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileEmail}>{accountContact}</Text>
            <Pressable onPress={() => router.push('/edit-profile')}>
              <Text style={styles.editProfile}>تعديل الملف الشخصي</Text>
            </Pressable>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        </View>

        <Text style={styles.sectionLabel}>الاشتراك</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            title="مهامي بلس"
            subtitle={smartStatus?.allowanceType === 'monthly'
              ? `${smartStatus.remaining} من ${smartStatus.usageLimit} عملية ذكية متبقية`
              : 'حوّل الصور إلى مهام · ١٠ ر.س شهريًا'}
            icon="sparkles"
            androidIcon="auto_awesome"
            onPress={() => router.push('/mahami-plus')}
          />
        </View>

        <Text style={styles.sectionLabel}>التفضيلات</Text>
        <View style={styles.settingsCard}>
          <SettingRow title="اللغة" subtitle="العربية" icon="globe" androidIcon="language" />
          <View style={styles.divider} />
          <SettingRow
            title="الإشعارات"
            subtitle={notificationsEnabled ? 'مفعّلة للمهام والروتين' : 'معطّلة — اضغط للتفعيل'}
            icon="bell.fill"
            androidIcon="notifications"
            onPress={() => void handleNotificationsPress()}
            trailing={(
              <Switch
                value={notificationsEnabled}
                onValueChange={() => void handleNotificationsPress()}
                trackColor={{ true: Palette.accentSoft }}
                thumbColor={notificationsEnabled ? Palette.primary : undefined}
              />
            )}
          />
        </View>

        <Text style={styles.sectionLabel}>البيانات والدعم</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            title="الخصوصية"
            subtitle="سياسة الخصوصية وبياناتك"
            icon="lock.fill"
            androidIcon="lock"
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
          <View style={styles.divider} />
          <SettingRow
            title="المساعدة والملاحظات"
            subtitle="الأسئلة الشائعة والتواصل معنا"
            icon="questionmark.circle.fill"
            androidIcon="help"
            onPress={() => void WebBrowser.openBrowserAsync(SUPPORT_URL)}
          />
          <View style={styles.divider} />
          <SettingRow
            title={deleting ? 'جاري حذف الحساب...' : 'حذف الحساب'}
            subtitle="حذف نهائي لحسابك وكل بياناتك"
            icon="trash.fill"
            androidIcon="delete"
            danger
            onPress={deleting ? undefined : handleDeleteAccount}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تسجيل الخروج"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
          <View style={styles.logoutIcon}>
            <AppIcon
              name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
              size={18}
              tintColor={Palette.danger}
              fallback="×"
            />
          </View>
        </Pressable>
        <Text style={styles.version}>مهامي · الإصدار ١.٠</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.canvas },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 },
  header: { alignItems: 'flex-end' },
  title: { color: Palette.ink, fontSize: 30, fontWeight: '900', writingDirection: 'rtl' },
  subtitle: { color: Palette.inkMuted, fontSize: 12, marginTop: 3, writingDirection: 'rtl' },
  profileCard: { backgroundColor: Palette.primary, borderRadius: Radius.large, padding: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, ...Shadow.card },
  profileCopy: { flex: 1, alignItems: 'flex-end' },
  profileName: { color: Palette.white, fontSize: 21, fontWeight: '900', writingDirection: 'rtl' },
  profileEmail: { color: '#DFD0C4', fontSize: 11, marginTop: 4 },
  editProfile: { color: '#F0CDAE', fontSize: 11, fontWeight: '800', marginTop: 13, writingDirection: 'rtl' },
  avatar: { width: 66, height: 66, borderRadius: 23, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Palette.primary, fontSize: 24, fontWeight: '900' },
  sectionLabel: { color: Palette.inkMuted, fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', marginTop: 27, marginBottom: 10, paddingRight: 4 },
  settingsCard: { backgroundColor: Palette.surface, borderRadius: Radius.large, paddingHorizontal: 15, ...Shadow.card },
  settingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingCopy: { flex: 1, alignItems: 'flex-end' },
  settingTitle: { color: Palette.ink, fontSize: 14, fontWeight: '800', writingDirection: 'rtl' },
  settingSubtitle: { color: Palette.inkMuted, fontSize: 10, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  settingIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Palette.line },
  danger: { color: Palette.danger },
  dangerIcon: { backgroundColor: '#F5E1DD' },
  pressed: { opacity: 0.7 },
  logoutButton: {
    minHeight: 60,
    marginTop: 18,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: '#EACCC6',
    backgroundColor: '#FBF3F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    color: Palette.danger,
    fontSize: 14,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  logoutIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F3DFDA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  version: { color: Palette.inkMuted, fontSize: 10, textAlign: 'center', marginTop: 22, writingDirection: 'rtl' },
});
