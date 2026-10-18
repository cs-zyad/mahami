import { Pressable, Text, ViewStyle } from 'react-native';

import { makeStyles } from '@/contexts/theme-context';
import { Radius } from '@/constants/design';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, variant !== 'primary' && styles.darkLabel]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((P) => ({
  base: {
    minHeight: 56,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: P.primary },
  secondary: { backgroundColor: P.surface, borderWidth: 1, borderColor: P.line },
  ghost: { backgroundColor: 'transparent' },
  label: { color: P.onPrimary, fontSize: 16, fontWeight: '800', writingDirection: 'rtl' },
  darkLabel: { color: P.primary },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
}));
