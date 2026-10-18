import { Href, router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { makeStyles, useTheme } from '@/contexts/theme-context';
import { AppIcon } from '@/components/ui/app-icon';
import { Radius } from '@/constants/design';

type BackButtonProps = {
  fallbackHref?: Href;
};

export function BackButton({ fallbackHref = '/' }: BackButtonProps) {
  const styles = useStyles();
  const { palette } = useTheme();
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
        tintColor={palette.primary}
        fallback="›"
      />
      <Text style={styles.label}>رجوع</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((P) => ({
  button: {
    minWidth: 76,
    height: 44,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: P.line,
    backgroundColor: P.surface,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  label: {
    color: P.primary,
    fontSize: 13,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  pressed: {
    backgroundColor: P.accentSoft,
    borderColor: P.accent,
    transform: [{ scale: 0.97 }],
  },
}));
