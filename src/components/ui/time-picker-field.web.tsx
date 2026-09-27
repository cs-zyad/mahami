import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
  const initialValue = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  const [text, setText] = useState(initialValue);

  const applyTime = () => {
    const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      setText(initialValue);
      return;
    }
    const nextValue = new Date(value);
    nextValue.setHours(Number(match[1]), Number(match[2]), 0, 0);
    onChange(nextValue);
  };

  return (
    <View style={styles.timeCard}>
      <Text style={styles.hint}>اكتب الوقت بنظام 24 ساعة</Text>
      <TextInput
        accessibilityLabel="وقت التذكير"
        value={text}
        onChangeText={setText}
        onBlur={applyTime}
        onSubmitEditing={applyTime}
        placeholder="19:00"
        maxLength={5}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  timeCard: {
    minHeight: 76,
    borderRadius: Radius.medium,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  input: { color: Palette.ink, fontSize: 20, fontWeight: '900', textAlign: 'right', minWidth: 120 },
  hint: { color: Palette.inkMuted, fontSize: 11, writingDirection: 'rtl' },
});
