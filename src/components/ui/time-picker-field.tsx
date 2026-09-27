import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Radius } from '@/constants/design';

type TimePickerFieldProps = {
  value: Date;
  onChange: (value: Date) => void;
};

const arabicDigits = (value: string) => value.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

export function formatRoutineTime(value: Date) {
  const hours = value.getHours();
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;
  return `${arabicDigits(String(displayHours))}:${arabicDigits(minutes)} ${period}`;
}

export function TimePickerField({ value, onChange }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (selectedTime) onChange(selectedTime);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`تعديل وقت التذكير، الوقت الحالي ${formatRoutineTime(value)}`}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.timeCard, pressed && styles.pressed]}>
        <View style={styles.iconBox}>
          <AppIcon
            name={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }}
            size={20}
            tintColor={Palette.primary}
            fallback="◷"
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.hint}>اضغط لتعديل الوقت</Text>
          <Text style={styles.value}>{formatRoutineTime(value)}</Text>
        </View>
        <AppIcon
          name={{ ios: open ? 'chevron.up' : 'chevron.down', android: open ? 'expand_less' : 'expand_more' }}
          size={15}
          tintColor={Palette.inkMuted}
          fallback={open ? '⌃' : '⌄'}
        />
      </Pressable>

      {open && (
        <View style={styles.pickerPanel}>
          <DateTimePicker
            value={value}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minuteInterval={5}
            locale="ar-SA"
            themeVariant="light"
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
              <Text style={styles.doneText}>تم</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  timeCard: {
    minHeight: 76,
    borderRadius: Radius.medium,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, alignItems: 'flex-start', gap: 4 },
  value: { color: Palette.ink, fontSize: 20, fontWeight: '900', writingDirection: 'rtl' },
  hint: { color: Palette.inkMuted, fontSize: 11, writingDirection: 'rtl' },
  pickerPanel: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  doneButton: {
    minHeight: 44,
    marginHorizontal: 12,
    borderRadius: Radius.small,
    backgroundColor: Palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: Palette.primary, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
