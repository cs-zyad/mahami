import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Palette, Radius } from '@/constants/design';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={Palette.inkMuted}
        selectionColor={Palette.accent}
        style={[styles.input, error && styles.inputError, props.style]}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { color: Palette.ink, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  input: {
    minHeight: 54,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    color: Palette.ink,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputError: { borderColor: Palette.danger },
  error: { color: Palette.danger, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
});
