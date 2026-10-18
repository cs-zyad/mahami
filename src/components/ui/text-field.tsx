import { Text, TextInput, TextInputProps, View } from 'react-native';

import { makeStyles, useTheme } from '@/contexts/theme-context';
import { Radius } from '@/constants/design';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...props }: TextFieldProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={palette.inkMuted}
        selectionColor={palette.accent}
        style={[styles.input, error && styles.inputError, props.style]}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const useStyles = makeStyles((P) => ({
  wrapper: { gap: 8 },
  label: { color: P.ink, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  input: {
    minHeight: 54,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: P.line,
    backgroundColor: P.surface,
    color: P.ink,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputError: { borderColor: P.danger },
  error: { color: P.danger, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
}));
