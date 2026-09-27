import * as ImagePicker from 'expo-image-picker';
import { router, useSegments } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { DueDateTimeField } from '@/components/ui/due-date-time-field';
import { FormScreen } from '@/components/ui/form-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Palette, Radius, Shadow } from '@/constants/design';
import { useTasks } from '@/contexts/tasks-context';
import { defaultTaskCategories } from '@/lib/task-categories';
import { analyzeTaskImage, getSmartScanStatus, SmartCaptureError, smartCaptureErrorMessage } from '@/lib/smart-capture';
import { SmartScanStatus, SmartTaskDraft, SmartTaskPriority } from '@/types/smart-capture';

const priorityOptions: { value: SmartTaskPriority; label: string; color: string; soft: string }[] = [
  { value: 'important_urgent', label: 'مهم وعاجل', color: '#A84F46', soft: '#F6E3E0' },
  { value: 'important', label: 'مهم غير عاجل', color: '#A66A32', soft: '#F6E8D6' },
  { value: 'later', label: 'لاحقًا', color: '#766B62', soft: '#EEE9E2' },
];

const reminderOptions: { value: number | null; label: string }[] = [
  { value: null, label: 'بدون' },
  { value: 0, label: 'وقت الموعد' },
  { value: 10, label: 'قبل 10 د' },
  { value: 30, label: 'قبل 30 د' },
  { value: 60, label: 'قبل ساعة' },
];

type SelectedImage = {
  uri: string;
  base64: string;
  mediaType: string;
};

function quotaCopy(status: SmartScanStatus | null) {
  if (!status) return 'جاري التحقق من الرصيد';
  return status.allowanceType === 'monthly'
    ? `${status.remaining} من ${status.usageLimit} متبقية هذا الشهر`
    : `${status.remaining} تجربة مجانية متبقية`;
}

export default function SmartCaptureScreen() {
  const segments = useSegments();
  const isTabScreen = segments[0] === '(tabs)';
  const { addTask, tasks } = useTasks();
  const [status, setStatus] = useState<SmartScanStatus | null>(null);
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [drafts, setDrafts] = useState<SmartTaskDraft[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const selectedDrafts = useMemo(() => drafts.filter((draft) => draft.selected && draft.title.trim()), [drafts]);
  // Your own sections, plus whatever the analysis suggested, so nothing gets lost.
  const categoryOptions = useMemo(() => [...new Set([
    ...defaultTaskCategories.map((item) => item.label),
    ...tasks.map((task) => task.category.trim()).filter(Boolean),
    ...drafts.map((draft) => draft.category.trim()).filter(Boolean),
  ])], [drafts, tasks]);

  const refreshStatus = async () => {
    setLoadingStatus(true);
    try {
      setStatus(await getSmartScanStatus());
    } catch (statusError) {
      const code = statusError instanceof SmartCaptureError ? statusError.code : 'quota_unavailable';
      setError(smartCaptureErrorMessage(code));
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    let active = true;
    void getSmartScanStatus()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch((statusError) => {
        if (!active) return;
        const code = statusError instanceof SmartCaptureError ? statusError.code : 'quota_unavailable';
        setError(smartCaptureErrorMessage(code));
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const keepAsset = (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      setError('تعذر تجهيز الصورة. جرّب اختيارها مرة أخرى.');
      return;
    }
    setImage({
      uri: asset.uri,
      base64: asset.base64,
      mediaType: asset.mimeType || 'image/jpeg',
    });
    setDrafts([]);
    setError(undefined);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.72,
      base64: true,
    });
    if (!result.canceled) keepAsset(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('إذن الكاميرا', 'اسمح لمهامي باستخدام الكاميرا حتى تلتقط صورة للمهام.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.back,
      allowsEditing: false,
      quality: 0.72,
      base64: true,
    });
    if (!result.canceled) keepAsset(result.assets[0]);
  };

  const analyze = async () => {
    if (!image || analyzing) return;
    if (status?.remaining === 0) {
      router.push('/mahami-plus');
      return;
    }

    setAnalyzing(true);
    setError(undefined);
    try {
      const result = await analyzeTaskImage({ imageBase64: image.base64, mediaType: image.mediaType });
      setDrafts(result.tasks);
      setStatus((current) => current ? {
        ...current,
        allowanceType: result.quota.allowanceType,
        usageLimit: result.quota.usageLimit,
        used: result.quota.used,
        remaining: result.quota.remaining,
        periodEnd: result.quota.periodEnd,
      } : current);
    } catch (analysisError) {
      const code = analysisError instanceof SmartCaptureError ? analysisError.code : 'analysis_failed';
      setError(smartCaptureErrorMessage(code));
      if (code === 'limit_reached') await refreshStatus();
    } finally {
      setAnalyzing(false);
    }
  };

  const resetCapture = () => {
    setImage(null);
    setDrafts([]);
    setError(undefined);
  };

  const cancelCapture = () => {
    resetCapture();
    if (!isTabScreen) router.back();
  };

  const updateDraft = (id: string, values: Partial<SmartTaskDraft>) => {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...values } : draft));
  };

  const saveTasks = async () => {
    if (!selectedDrafts.length || saving) return;
    setSaving(true);
    setError(undefined);
    let savedCount = 0;

    for (const draft of selectedDrafts) {
      const result = await addTask({
        title: draft.title,
        description: draft.description,
        important: draft.priority !== 'later',
        urgent: draft.priority === 'important_urgent',
        category: draft.category,
        dueAt: draft.dueAt?.toISOString() ?? null,
        reminderMinutes: draft.reminderMinutes,
      });
      if (result.saved) savedCount += 1;
    }

    setSaving(false);
    if (!savedCount) {
      setError('تعذر حفظ المهام. تحقق من الاتصال وإعدادات التنبيهات ثم حاول مرة أخرى.');
      return;
    }
    if (savedCount < selectedDrafts.length) {
      Alert.alert('حُفظ جزء من المهام', `تم حفظ ${savedCount} من ${selectedDrafts.length} مهام.`);
    }
    resetCapture();
    router.navigate({
      pathname: '/tasks',
      params: { view: 'all', savedAt: Date.now().toString() },
    });
  };

  return (
    <FormScreen
      title="مهام AI"
      subtitle="حوّل صورة جدولك أو ملاحظاتك إلى مهام مرتبة."
      showBack={!isTabScreen}>
      <View style={styles.quotaCard}>
        <View style={styles.quotaIcon}>
          <AppIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={19} tintColor={Palette.primary} fallback="✦" />
        </View>
        <View style={styles.quotaCopy}>
          <Text style={styles.quotaTitle}>{status?.allowanceType === 'monthly' ? 'مهامي بلس' : 'التجربة المجانية'}</Text>
          <Text style={styles.quotaText}>{loadingStatus ? 'جاري التحقق...' : quotaCopy(status)}</Text>
        </View>
        {status?.remaining === 0 && (
          <Pressable onPress={() => router.push('/mahami-plus')} style={styles.upgradePill}>
            <Text style={styles.upgradePillText}>ترقية</Text>
          </Pressable>
        )}
      </View>

      {drafts.length > 0 ? (
        <View style={styles.reviewWrap}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewCount}>{selectedDrafts.length} محددة</Text>
            <View style={styles.reviewCopy}>
              <Text style={styles.reviewTitle}>راجع قبل الحفظ</Text>
              <Text style={styles.reviewText}>عدّل أي معلومة لم تظهر بشكل صحيح.</Text>
            </View>
          </View>

          {drafts.map((draft, index) => (
            <View key={draft.id} style={[styles.draftCard, !draft.selected && styles.draftCardOff]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draft.selected }}
                onPress={() => updateDraft(draft.id, { selected: !draft.selected })}
                style={styles.draftTop}>
                <Text style={styles.draftNumber}>مهمة {index + 1}</Text>
                <View style={[styles.checkbox, draft.selected && styles.checkboxSelected]}>
                  {draft.selected && <Text style={styles.check}>✓</Text>}
                </View>
              </Pressable>
              <TextInput
                value={draft.title}
                onChangeText={(title) => updateDraft(draft.id, { title })}
                placeholder="عنوان المهمة"
                placeholderTextColor={Palette.inkMuted}
                style={styles.titleInput}
              />
              <TextInput
                value={draft.description}
                onChangeText={(description) => updateDraft(draft.id, { description })}
                placeholder="تفاصيل إضافية — اختياري"
                placeholderTextColor={Palette.inkMuted}
                multiline
                style={styles.descriptionInput}
              />

              <Text style={styles.fieldLabel}>الأولوية</Text>
              <View style={styles.priorityRow}>
                {priorityOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => updateDraft(draft.id, { priority: option.value })}
                    style={[
                      styles.priority,
                      { backgroundColor: option.soft },
                      draft.priority === option.value && { borderColor: option.color, borderWidth: 2 },
                    ]}>
                    <Text numberOfLines={1} style={[styles.priorityText, { color: option.color }]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>التصنيف</Text>
              <View style={styles.categoryRow}>
                {categoryOptions.map((option) => {
                  const selected = draft.category === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => updateDraft(draft.id, { category: option })}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}>
                      <Text numberOfLines={1} style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>الموعد — اختياري</Text>
              <DueDateTimeField
                value={draft.dueAt}
                onChange={(dueAt) => updateDraft(draft.id, {
                  dueAt,
                  reminderMinutes: dueAt ? draft.reminderMinutes : null,
                })}
              />

              {!!draft.dueAt && (
                <>
                  <Text style={styles.fieldLabel}>التذكير</Text>
                  <View style={styles.reminderOptions}>
                    {reminderOptions.map((option) => {
                      const selected = draft.reminderMinutes === option.value;
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => updateDraft(draft.id, { reminderMinutes: option.value })}
                          style={[styles.reminderOption, selected && styles.reminderOptionSelected]}>
                          <Text style={[styles.reminderOptionText, selected && styles.reminderOptionTextSelected]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          ))}

          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label={saving ? 'جاري حفظ المهام...' : `حفظ ${selectedDrafts.length} مهام`} disabled={saving || selectedDrafts.length === 0} onPress={() => void saveTasks()} />
          <PrimaryButton label="تحليل صورة أخرى" variant="secondary" onPress={resetCapture} />
          <PrimaryButton label="إلغاء بدون إضافة" variant="ghost" onPress={cancelCapture} />
        </View>
      ) : !image ? (
        <View style={styles.startWrap}>
          <View style={[styles.voiceCard, styles.voiceCardSoon]}>
            <View style={styles.voiceIcon}>
              <AppIcon
                name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
                size={27}
                tintColor={Palette.white}
                fallback="●"
              />
            </View>
            <View style={styles.voiceCopy}>
              <Text style={styles.voiceTitle}>أضف مهمة بصوتك</Text>
              <Text style={styles.voiceText}>ميزة قادمة في تحديث قريب بإذن الله.</Text>
            </View>
            <View style={styles.voiceSoonBadge}>
              <Text style={styles.voiceSoonText}>قريبًا</Text>
            </View>
          </View>

          <View style={styles.methodDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>المتاح الآن</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroSymbol}>
              <AppIcon name={{ ios: 'text.viewfinder', android: 'document_scanner', web: 'document_scanner' }} size={38} tintColor={Palette.primary} fallback="▣" />
            </View>
            <Text style={styles.heroTitle}>صوّرها، ومهامي يرتبها</Text>
            <Text style={styles.heroText}>جدول، رسالة، ملاحظات أو ورقة مكتوبة. ستراجع النتيجة دائمًا قبل أن تُحفظ.</Text>
          </View>
          <PrimaryButton label="اختيار صورة من الجوال" onPress={() => void pickImage()} />
          <PrimaryButton label="التقاط صورة بالكاميرا" variant="secondary" onPress={() => void takePhoto()} />
          <View style={styles.privacyRow}>
            <AppIcon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={14} tintColor={Palette.success} fallback="●" />
            <Text style={styles.privacyText}>لا نحتفظ بالصورة في حسابك أو قاعدة بيانات مهامي.</Text>
          </View>
        </View>
      ) : drafts.length === 0 ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: image.uri }} resizeMode="cover" style={styles.preview} />
          <Pressable onPress={() => setImage(null)} style={styles.changeImage}>
            <Text style={styles.changeImageText}>اختيار صورة أخرى</Text>
          </Pressable>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {status?.remaining === 0 ? (
            <PrimaryButton label="اشترك في مهامي بلس" onPress={() => router.push('/mahami-plus')} />
          ) : (
            <PrimaryButton label={analyzing ? 'جاري قراءة الصورة...' : 'تحويل الصورة إلى مهام'} disabled={analyzing || loadingStatus} onPress={() => void analyze()} />
          )}
          {analyzing && <ActivityIndicator color={Palette.primary} style={styles.loader} />}
        </View>
      ) : null}

      {!image && !!error && <Text style={styles.error}>{error}</Text>}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  voiceCard: { minHeight: 154, borderRadius: Radius.large, backgroundColor: Palette.primary, padding: 17, flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', gap: 13, ...Shadow.card },
  voiceCardSoon: { opacity: 0.75 },
  voiceIcon: { width: 54, height: 54, borderRadius: 19, backgroundColor: Palette.accent, alignItems: 'center', justifyContent: 'center' },
  voiceCopy: { flex: 1, minWidth: 180, alignItems: 'flex-end' },
  voiceTitle: { color: Palette.white, fontSize: 17, fontWeight: '900', writingDirection: 'rtl' },
  voiceText: { color: '#EEDFD3', fontSize: 10, lineHeight: 17, textAlign: 'right', writingDirection: 'rtl', marginTop: 5 },
  voiceSoonBadge: { width: '100%', minHeight: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  voiceSoonText: { color: Palette.white, fontSize: 12, fontWeight: '900', writingDirection: 'rtl' },
  methodDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Palette.line },
  dividerText: { color: Palette.inkMuted, fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  quotaCard: { minHeight: 76, borderRadius: Radius.medium, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, ...Shadow.card },
  quotaIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  quotaCopy: { flex: 1, alignItems: 'flex-end' },
  quotaTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900', writingDirection: 'rtl' },
  quotaText: { color: Palette.inkMuted, fontSize: 10, marginTop: 4, writingDirection: 'rtl' },
  upgradePill: { backgroundColor: Palette.primary, borderRadius: Radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  upgradePillText: { color: Palette.white, fontSize: 11, fontWeight: '900', writingDirection: 'rtl' },
  startWrap: { gap: 12, marginTop: 18 },
  heroCard: { minHeight: 190, borderRadius: Radius.large, backgroundColor: '#EFE3D5', padding: 22, alignItems: 'center', justifyContent: 'center', ...Shadow.card },
  heroSymbol: { width: 68, height: 68, borderRadius: 23, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { color: Palette.ink, fontSize: 20, fontWeight: '900', writingDirection: 'rtl' },
  heroText: { color: Palette.inkMuted, fontSize: 12, lineHeight: 21, textAlign: 'center', writingDirection: 'rtl', marginTop: 9, maxWidth: 280 },
  privacyRow: { minHeight: 42, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  privacyText: { color: Palette.inkMuted, fontSize: 10, writingDirection: 'rtl' },
  previewWrap: { gap: 13, marginTop: 18 },
  preview: { width: '100%', height: 310, borderRadius: Radius.large, backgroundColor: Palette.surfaceMuted },
  changeImage: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 7 },
  changeImageText: { color: Palette.primary, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  loader: { marginTop: 2 },
  reviewWrap: { gap: 13, marginTop: 18 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewCount: { color: Palette.primary, fontSize: 11, fontWeight: '900', backgroundColor: Palette.accentSoft, borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 7, writingDirection: 'rtl' },
  reviewCopy: { alignItems: 'flex-end' },
  reviewTitle: { color: Palette.ink, fontSize: 18, fontWeight: '900', writingDirection: 'rtl' },
  reviewText: { color: Palette.inkMuted, fontSize: 10, marginTop: 3, writingDirection: 'rtl' },
  draftCard: { borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line, padding: 15, gap: 10, ...Shadow.card },
  draftCardOff: { opacity: 0.52 },
  draftTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  draftNumber: { color: Palette.inkMuted, fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  checkbox: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Palette.success, borderColor: Palette.success },
  check: { color: Palette.white, fontWeight: '900' },
  titleInput: { minHeight: 52, borderRadius: Radius.small, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.canvas, paddingHorizontal: 13, color: Palette.ink, fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  descriptionInput: { minHeight: 68, borderRadius: Radius.small, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.canvas, padding: 13, color: Palette.ink, fontSize: 12, textAlign: 'right', textAlignVertical: 'top', writingDirection: 'rtl' },
  fieldLabel: { color: Palette.ink, fontSize: 11, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  priorityRow: { flexDirection: 'row-reverse', gap: 6 },
  priority: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  priorityText: { fontSize: 9, fontWeight: '900', writingDirection: 'rtl' },
  reminderOptions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
  reminderOption: { minHeight: 36, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.canvas, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  reminderOptionSelected: { borderColor: Palette.primary, backgroundColor: Palette.accentSoft },
  reminderOptionText: { color: Palette.inkMuted, fontSize: 9, fontWeight: '800', writingDirection: 'rtl' },
  reminderOptionTextSelected: { color: Palette.primary },
  categoryRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  categoryChip: { minHeight: 38, justifyContent: 'center', borderRadius: Radius.small, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.canvas, paddingHorizontal: 14 },
  categoryChipSelected: { borderColor: Palette.primary, borderWidth: 2, backgroundColor: Palette.accentSoft },
  categoryChipText: { color: Palette.inkMuted, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  categoryChipTextSelected: { color: Palette.primary },
  error: { color: Palette.danger, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl', backgroundColor: '#F8E9E5', borderRadius: Radius.small, padding: 12 },
});
