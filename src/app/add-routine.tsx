import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { makeStyles, useTheme } from '@/contexts/theme-context';
import { AppIcon } from '@/components/ui/app-icon';
import { FormScreen } from '@/components/ui/form-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { RoutineIcon, routineIconOptions } from '@/components/ui/routine-icon';
import { TextField } from '@/components/ui/text-field';
import { TimePickerField } from '@/components/ui/time-picker-field';
import { Radius } from '@/constants/design';
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
  const styles = useStyles();
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
  const styles = useStyles();
  const { palette } = useTheme();
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
                  tintColor={palette.onPrimary}
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
              tintColor={palette.primary}
              fallback="•"
            />
          </View>
        </View>

        <View style={styles.streakNote}>
          <View style={styles.streakIcon}>
            <AppIcon
              name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              size={21}
              tintColor={palette.primary}
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
                tintColor={palette.danger}
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

const useStyles = makeStyles((P) => ({
  form: { gap: 24 },
  fieldGroup: { gap: 12 },
  label: { color: P.ink, fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  iconHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconHint: { color: P.inkMuted, fontSize: 10, writingDirection: 'rtl' },
  iconOptions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.line,
    backgroundColor: P.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: { borderWidth: 2, borderColor: P.primary, backgroundColor: P.accentSoft },
  daysHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  everyDayButton: {
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: P.line,
    backgroundColor: P.surface,
    paddingHorizontal: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  everyDayButtonActive: { borderColor: P.primary, backgroundColor: P.accentSoft },
  everyDayButtonText: { color: P.inkMuted, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  everyDayButtonTextActive: { color: P.primary },
  everyDayCheck: { width: 20, height: 20, borderRadius: 7, borderWidth: 1, borderColor: P.line, backgroundColor: P.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  everyDayCheckActive: { borderColor: P.primary, backgroundColor: P.primary },
  days: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 5 },
  day: {
    width: 42,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: P.line,
    backgroundColor: P.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { borderColor: P.primary, backgroundColor: P.primary },
  dayText: { color: P.inkMuted, fontSize: 13, fontWeight: '900' },
  dayTextSelected: { color: P.onPrimary },
  daysSummary: { color: P.inkMuted, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  daysSummaryError: { color: P.danger },
  reminderRow: {
    minHeight: 84,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: P.line,
    backgroundColor: P.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reminderCopy: { flex: 1, alignItems: 'flex-end' },
  reminderIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { color: P.ink, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  reminderText: { color: P.inkMuted, fontSize: 11, marginTop: 4, writingDirection: 'rtl' },
  switchTrack: { width: 54, height: 32, borderRadius: Radius.pill, borderWidth: 1, borderColor: P.line, backgroundColor: P.surfaceMuted, padding: 3, justifyContent: 'center', alignItems: 'flex-start' },
  switchTrackActive: { borderColor: P.primary, backgroundColor: P.primary, alignItems: 'flex-end' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: P.surface, borderWidth: 1, borderColor: P.line },
  switchThumbActive: { borderColor: P.line, backgroundColor: P.canvas },
  switchPressed: { opacity: 0.8 },
  streakNote: {
    minHeight: 86,
    borderRadius: Radius.medium,
    backgroundColor: P.warnSoft,
    padding: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 13,
  },
  streakIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: P.warnSoft, alignItems: 'center', justifyContent: 'center' },
  streakCopy: { flex: 1, alignItems: 'flex-end' },
  streakTitle: { color: P.primary, fontSize: 13, fontWeight: '900', writingDirection: 'rtl' },
  streakText: { color: P.inkMuted, fontSize: 11, lineHeight: 18, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  error: { color: P.danger, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  save: { marginTop: 2 },
  deleteRoutineButton: {
    minHeight: 72,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: P.dangerSoft,
    backgroundColor: P.dangerSoft,
    paddingHorizontal: 13,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  deleteRoutineButtonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  deleteRoutineIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: P.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  deleteRoutineCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  deleteRoutineTitle: { color: P.danger, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  deleteRoutineText: { color: P.danger, opacity: 0.78, fontSize: 10, textAlign: 'right', writingDirection: 'rtl' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
}));
