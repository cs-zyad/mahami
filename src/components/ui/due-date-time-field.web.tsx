import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Palette, Radius } from '@/constants/design';

type DueDateTimeFieldProps = {
  value: Date | null;
  onChange: (value: Date | null) => void;
};

function dateText(value: Date | null) {
  if (!value) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function timeText(value: Date | null) {
  if (!value) return '';
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function DueDateTimeField({ value, onChange }: DueDateTimeFieldProps) {
  const [date, setDate] = useState(dateText(value));
  const [time, setTime] = useState(timeText(value));

  useEffect(() => {
    setDate(dateText(value));
    setTime(timeText(value));
  }, [value]);

  const applyValue = (nextDate = date, nextTime = time) => {
    if (!nextDate && !nextTime) {
      onChange(null);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(nextTime)) return;
    const parsed = new Date(`${nextDate}T${nextTime}:00`);
    if (!Number.isNaN(parsed.getTime())) onChange(parsed);
  };

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Text style={styles.label}>التاريخ</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          onBlur={() => applyValue()}
          placeholder="2026-09-03"
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>الوقت</Text>
        <TextInput
          value={time}
          onChangeText={setTime}
          onBlur={() => applyValue()}
          placeholder="19:00"
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, minHeight: 76, borderRadius: Radius.medium, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, padding: 12, alignItems: 'flex-start', justifyContent: 'center', gap: 5 },
  label: { color: Palette.inkMuted, fontSize: 10, writingDirection: 'rtl' },
  input: { width: '100%', color: Palette.ink, fontSize: 13, fontWeight: '900', textAlign: 'right' },
});
