import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Radius } from '@/constants/design';

type BackButtonProps = {
  fallbackHref?: Href;
};

export function BackButton({ fallbackHref = '/' }: BackButtonProps) {
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="رجوع"
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <AppIcon
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={Palette.primary}
        fallback="›"
      />
      <Text style={styles.label}>رجوع</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 76,
    height: 44,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  label: {
    color: Palette.primary,
    fontSize: 13,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  pressed: {
    backgroundColor: Palette.accentSoft,
    borderColor: Palette.accent,
    transform: [{ scale: 0.97 }],
  },
});
