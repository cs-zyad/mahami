import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { FormScreen } from '@/components/ui/form-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { RoutineIcon, routineIconOptions } from '@/components/ui/routine-icon';
import { TextField } from '@/components/ui/text-field';
import { TimePickerField } from '@/components/ui/time-picker-field';
import { Palette, Radius } from '@/constants/design';
import { useRoutines } from '@/contexts/routines-context';

const weekDays = [
  { value: 6, label: 'س', fullLabel: 'السبت' },
  { value: 0, label: 'ح', fullLabel: 'الأحد' },
  { value: 1, label: 'ن', fullLabel: 'الاثنين' },
  { value: 2, label: 'ث', fullLabel: 'الثلاثاء' },
  { value: 3, label: 'ر', fullLabel: 'الأربعاء' },
  { value: 4, label: 'خ', fullLabel: 'الخميس' },
  { value: 5, label: 'ج', fullLabel: 'الجمعة' },
] as const;

const allDays = weekDays.map((day) => day.value);
function createInitialTime() {
  const value = new Date();
  value.setHours(19, 0, 0, 0);
  return value;
}

function dateFromTime(time?: string | null) {
  const value = createInitialTime();
  if (!time) return value;
  const [hours, minutes] = time.split(':').map(Number);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

function BrandSwitch({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="تفعيل تذكير الروتين"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.switchTrack,
        value && styles.switchTrackActive,
        pressed && styles.switchPressed,
      ]}>
      <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
    </Pressable>
  );
}

export default function AddRoutineScreen() {
  const params = useLocalSearchParams<{ routineId?: string | string[] }>();
  const routineId = Array.isArray(params.routineId) ? params.routineId[0] : params.routineId;
  const { routines, addRoutine, updateRoutine, deleteRoutine } = useRoutines();
  const editingRoutine = routines.find((routine) => routine.id === routineId);
  const isEditing = !!routineId;
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [reminderTime, setReminderTime] = useState(createInitialTime);
  const [selectedDays, setSelectedDays] = useState<number[]>(allDays);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [loadedRoutineId, setLoadedRoutineId] = useState<string>();
  const isEveryDay = selectedDays.length === allDays.length;

  useEffect(() => {
    if (!editingRoutine || loadedRoutineId === editingRoutine.id) return;
    setTitle(editingRoutine.title);
    setIcon(editingRoutine.icon || 'sparkles');
    setReminderTime(dateFromTime(editingRoutine.reminder_time));
    setSelectedDays(editingRoutine.repeat_days);
    setReminderEnabled(editingRoutine.reminder_enabled);
    setLoadedRoutineId(editingRoutine.id);
  }, [editingRoutine, loadedRoutineId]);

  const selectedDaysLabel = useMemo(() => {
    if (isEveryDay) return 'جميع الأيام محددة';
    if (selectedDays.length === 0) return 'لم تحدد أي يوم';
    return weekDays
      .filter((day) => selectedDays.includes(day.value))
      .map((day) => day.fullLabel)
      .join('، ');
  }, [isEveryDay, selectedDays]);

  const toggleDay = (day: number) => {
    setError(undefined);
    setSelectedDays((current) => current.includes(day)
      ? current.filter((selectedDay) => selectedDay !== day)
      : [...current, day]);
  };

  const handleSave = async () => {
    setError(undefined);
    if (!title.trim()) {
      setError('اكتب اسم الروتين أولًا.');
      return;
    }
    if (selectedDays.length === 0) {
      setError('اختر يومًا واحدًا على الأقل.');
      return;
    }

    const hours = String(reminderTime.getHours()).padStart(2, '0');
    const minutes = String(reminderTime.getMinutes()).padStart(2, '0');
    setSaving(true);
    const input = {
      title,
      icon,
      reminderEnabled,
      reminderTime: reminderEnabled ? `${hours}:${minutes}` : null,
      repeatDays: selectedDays,
    };
    const result = isEditing && routineId
      ? await updateRoutine(routineId, input)
      : await addRoutine(input);
    setSaving(false);

    if (!result.saved) {
      setError(result.error);
      return;
    }

    router.back();
  };

  const confirmDelete = () => {
    if (!routineId || !editingRoutine) return;
    Alert.alert(
      'حذف الروتين؟',
      `سيتم حذف «${editingRoutine.title}» وسجل إنجازاته وإلغاء تذكيراته.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteRoutine(routineId);
            setDeleting(false);
            if (!result.saved) {
              setError(result.error);
              return;
            }
            router.back();
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <FormScreen
      title={isEditing ? 'إعدادات الروتين' : 'روتين جديد'}
      subtitle={isEditing ? 'عدّل التفاصيل بالطريقة المناسبة لك.' : 'ابنِ عادة بسيطة تقدر تستمر عليها.'}>
      <View style={styles.form}>
        <TextField
          label="اسم الروتين"
          placeholder="مثال: قراءة صفحتين من القرآن"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setError(undefined);
          }}
          autoFocus={!isEditing}
          returnKeyType="done"
        />

        <View style={styles.fieldGroup}>
          <View style={styles.iconHeader}>
            <Text style={styles.iconHint}>بني على بيج من هوية مهامي</Text>
            <Text style={styles.label}>رمز الروتين</Text>
          </View>
          <View style={styles.iconOptions}>
            {routineIconOptions.map((option) => {
              const selected = icon === option.key;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="radio"
                  accessibilityLabel={`رمز ${option.label}`}
                  accessibilityState={{ selected }}
                  onPress={() => setIcon(option.key)}
                  style={({ pressed }) => [
                    styles.iconOption,
                    selected && styles.iconOptionSelected,
                    pressed && styles.pressed,
                  ]}>
                  <RoutineIcon icon={option.key} size={21} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>وقت التذكير</Text>
          <TimePickerField value={reminderTime} onChange={setReminderTime} />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.daysHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isEveryDay }}
              onPress={() => setSelectedDays(isEveryDay ? [] : allDays)}
              style={({ pressed }) => [
                styles.everyDayButton,
                isEveryDay && styles.everyDayButtonActive,
                pressed && styles.pressed,
              ]}>
              <View style={[styles.everyDayCheck, isEveryDay && styles.everyDayCheckActive]}>
                {isEveryDay && (
                <AppIcon
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={11}
                  tintColor={Palette.white}
                  fallback="✓"
                />
                )}
              </View>
              <Text style={[styles.everyDayButtonText, isEveryDay && styles.everyDayButtonTextActive]}>
                يوميًا
              </Text>
            </Pressable>
            <Text style={styles.label}>أيام التكرار</Text>
          </View>

          <View style={styles.days}>
            {weekDays.map((day) => {
              const selected = selectedDays.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day.fullLabel}
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleDay(day.value)}
                  style={({ pressed }) => [
                    styles.day,
                    selected && styles.daySelected,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.daysSummary, selectedDays.length === 0 && styles.daysSummaryError]}>
            {selectedDaysLabel}
          </Text>
        </View>

        <View style={styles.reminderRow}>
          <BrandSwitch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
          />
          <View style={styles.reminderCopy}>
            <Text style={styles.reminderTitle}>تذكير الروتين</Text>
            <Text style={styles.reminderText}>
              {reminderEnabled ? 'تذكير في الوقت والأيام المحددة' : 'لن يصلك إشعار لهذا الروتين'}
            </Text>
          </View>
          <View style={styles.reminderIcon}>
            <AppIcon
              name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
              size={18}
              tintColor={Palette.primary}
              fallback="•"
            />
          </View>
        </View>

        <View style={styles.streakNote}>
          <View style={styles.streakIcon}>
            <AppIcon
              name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              size={21}
              tintColor={Palette.primary}
              fallback="♢"
            />
          </View>
          <View style={styles.streakCopy}>
            <Text style={styles.streakTitle}>سلسلتك تبدأ من أول إنجاز</Text>
            <Text style={styles.streakText}>كل يوم محدد تنجز فيه الروتين يزيد استمراريتك.</Text>
          </View>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton
          label={saving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'حفظ الروتين'}
          disabled={saving || deleting || !title.trim() || selectedDays.length === 0}
          onPress={handleSave}
          style={styles.save}
        />

        {isEditing && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`حذف روتين ${title}`}
            disabled={saving || deleting}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteRoutineButton,
              pressed && styles.deleteRoutineButtonPressed,
              (saving || deleting) && styles.disabled,
            ]}>
            <View style={styles.deleteRoutineIcon}>
              <AppIcon
                name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }}
                size={19}
                tintColor={Palette.danger}
                fallback="×"
              />
            </View>
            <View style={styles.deleteRoutineCopy}>
              <Text style={styles.deleteRoutineTitle}>{deleting ? 'جاري الحذف...' : 'حذف الروتين'}</Text>
              <Text style={styles.deleteRoutineText}>سيُحذف الروتين وسجل إنجازاته نهائيًا</Text>
            </View>
          </Pressable>
        )}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 24 },
  fieldGroup: { gap: 12 },
  label: { color: Palette.ink, fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  iconHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  iconHint: { color: Palette.inkMuted, fontSize: 10, writingDirection: 'rtl' },
  iconOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: { borderWidth: 2, borderColor: Palette.primary, backgroundColor: Palette.accentSoft },
  daysHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  everyDayButton: {
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  everyDayButtonActive: { borderColor: Palette.primary, backgroundColor: Palette.accentSoft },
  everyDayButtonText: { color: Palette.inkMuted, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  everyDayButtonTextActive: { color: Palette.primary },
  everyDayCheck: { width: 20, height: 20, borderRadius: 7, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  everyDayCheckActive: { borderColor: Palette.primary, backgroundColor: Palette.primary },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  day: {
    width: 42,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { borderColor: Palette.primary, backgroundColor: Palette.primary },
  dayText: { color: Palette.inkMuted, fontSize: 13, fontWeight: '900' },
  dayTextSelected: { color: Palette.white },
  daysSummary: { color: Palette.inkMuted, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  daysSummaryError: { color: Palette.danger },
  reminderRow: {
    minHeight: 84,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    paddingHorizontal: 13,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  reminderCopy: { flex: 1, alignItems: 'flex-start' },
  reminderIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  reminderText: { color: Palette.inkMuted, fontSize: 11, marginTop: 4, writingDirection: 'rtl' },
  switchTrack: { width: 54, height: 32, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surfaceMuted, padding: 3, justifyContent: 'center', alignItems: 'flex-end' },
  switchTrackActive: { borderColor: Palette.primary, backgroundColor: Palette.primary, alignItems: 'flex-start' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line },
  switchThumbActive: { borderColor: '#E7D5C4', backgroundColor: Palette.canvas },
  switchPressed: { opacity: 0.8 },
  streakNote: {
    minHeight: 86,
    borderRadius: Radius.medium,
    backgroundColor: '#F4E6D2',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  streakIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E9D2B4', alignItems: 'center', justifyContent: 'center' },
  streakCopy: { flex: 1, alignItems: 'flex-start' },
  streakTitle: { color: Palette.primary, fontSize: 13, fontWeight: '900', writingDirection: 'rtl' },
  streakText: { color: Palette.inkMuted, fontSize: 11, lineHeight: 18, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  error: { color: Palette.danger, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  save: { marginTop: 2 },
  deleteRoutineButton: {
    minHeight: 72,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: '#E6CBC4',
    backgroundColor: '#F8ECE8',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteRoutineButtonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  deleteRoutineIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F1DBD5', alignItems: 'center', justifyContent: 'center' },
  deleteRoutineCopy: { flex: 1, alignItems: 'flex-start', gap: 3 },
  deleteRoutineTitle: { color: Palette.danger, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  deleteRoutineText: { color: Palette.danger, opacity: 0.78, fontSize: 10, textAlign: 'right', writingDirection: 'rtl' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
