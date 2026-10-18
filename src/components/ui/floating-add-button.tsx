import { Pressable, Text, View } from 'react-native';

import { makeStyles, useTheme } from '@/contexts/theme-context';
import { AppIcon } from '@/components/ui/app-icon';

type FloatingAddButtonProps = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
};

export function FloatingAddButton({ label, accessibilityLabel, onPress }: FloatingAddButtonProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
      <View style={styles.icon}>
        <AppIcon
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={20}
          tintColor={palette.primary}
          fallback="+"
        />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((P, S) => ({
  button: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    minWidth: 150,
    height: 58,
    borderRadius: 20,
    backgroundColor: P.primary,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...S.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: P.onPrimary,
    fontSize: 14,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  buttonPressed: {
    backgroundColor: P.primaryPressed,
    transform: [{ scale: 0.97 }],
  },
}));
