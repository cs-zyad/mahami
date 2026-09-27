import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Shadow } from '@/constants/design';

type FloatingAddButtonProps = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
};

export function FloatingAddButton({ label, accessibilityLabel, onPress }: FloatingAddButtonProps) {
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
          tintColor={Palette.primary}
          fallback="+"
        />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    minWidth: 150,
    height: 58,
    borderRadius: 20,
    backgroundColor: Palette.primary,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadow.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  buttonPressed: {
    backgroundColor: Palette.primaryPressed,
    transform: [{ scale: 0.97 }],
  },
});
