import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Radius } from '@/constants/design';

type PickerMode = 'date' | 'time';

type DueDateTimeFieldProps = {
  value: Date | null;
  onChange: (value: Date | null) => void;
};

const arabicDigits = (value: string) => value.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

function suggestedDueDate() {
  const value = new Date();
  value.setSeconds(0, 0);
  value.setMinutes(Math.ceil(value.getMinutes() / 5) * 5);
  value.setHours(value.getHours() + 1);
  return value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatTime(value: Date) {
  const hours = value.getHours();
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  return `${arabicDigits(String(hours % 12 || 12))}:${arabicDigits(minutes)} ${period}`;
}

export function DueDateTimeField({ value, onChange }: DueDateTimeFieldProps) {
  const [openMode, setOpenMode] = useState<PickerMode>();

  const openPicker = (mode: PickerMode) => {
    if (!value) onChange(suggestedDueDate());
    setOpenMode((current) => current === mode ? undefined : mode);
  };

  const handleChange = (event: DateTimePickerEvent, selectedValue?: Date) => {
    if (Platform.OS === 'android') setOpenMode(undefined);
    if (event.type === 'dismissed' || !selectedValue) return;

    const nextValue = new Date(value ?? suggestedDueDate());
    if (openMode === 'date') {
      nextValue.setFullYear(selectedValue.getFullYear(), selectedValue.getMonth(), selectedValue.getDate());
    } else {
      nextValue.setHours(selectedValue.getHours(), selectedValue.getMinutes(), 0, 0);
    }
    onChange(nextValue);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.fieldsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value ? `تعديل التاريخ، ${formatDate(value)}` : 'اختيار تاريخ المهمة'}
          onPress={() => openPicker('date')}
          style={({ pressed }) => [styles.field, openMode === 'date' && styles.fieldOpen, pressed && styles.pressed]}>
          <View style={styles.iconBox}>
            <AppIcon
              name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
              size={18}
              tintColor={Palette.primary}
              fallback="▣"
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>التاريخ</Text>
            <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
              {value ? formatDate(value) : 'اختر التاريخ'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value ? `تعديل الوقت، ${formatTime(value)}` : 'اختيار وقت المهمة'}
          onPress={() => openPicker('time')}
          style={({ pressed }) => [styles.field, openMode === 'time' && styles.fieldOpen, pressed && styles.pressed]}>
          <View style={styles.iconBox}>
            <AppIcon
              name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
              size={18}
              tintColor={Palette.primary}
              fallback="◷"
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>الوقت</Text>
            <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
              {value ? formatTime(value) : 'اختر الوقت'}
            </Text>
          </View>
        </Pressable>
      </View>

      {openMode && (
        <View style={styles.pickerPanel}>
          <DateTimePicker
            value={value ?? suggestedDueDate()}
            mode={openMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={openMode === 'date' ? new Date() : undefined}
            minuteInterval={5}
            locale="ar-SA"
            themeVariant="light"
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpenMode(undefined)}
              style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
              <Text style={styles.doneText}>تم</Text>
            </Pressable>
          )}
        </View>
      )}

      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إزالة موعد المهمة"
          onPress={() => {
            setOpenMode(undefined);
            onChange(null);
          }}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
          <Text style={styles.clearText}>إزالة الموعد</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 9 },
  fieldsRow: { flexDirection: 'row', gap: 10 },
  field: {
    flex: 1,
    minHeight: 82,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  fieldOpen: { borderColor: Palette.primary, backgroundColor: '#FBF6F0' },
  iconBox: { width: 34, height: 34, borderRadius: 11, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'flex-start', gap: 4 },
  label: { color: Palette.inkMuted, fontSize: 10, writingDirection: 'rtl' },
  value: { maxWidth: '100%', color: Palette.ink, fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  placeholder: { color: Palette.inkMuted, fontWeight: '700' },
  pickerPanel: { borderRadius: Radius.medium, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, overflow: 'hidden', paddingBottom: 8 },
  doneButton: { minHeight: 44, marginHorizontal: 12, borderRadius: Radius.small, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: Palette.primary, fontSize: 14, fontWeight: '900' },
  clearButton: { minHeight: 34, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 5 },
  clearText: { color: Palette.danger, fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
