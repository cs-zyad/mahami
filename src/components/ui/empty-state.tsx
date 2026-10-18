import { Pressable, Text, View } from 'react-native';

import { makeStyles } from '@/contexts/theme-context';
import { Radius } from '@/constants/design';

type EmptyStateProps = {
  symbol: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  symbol,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const styles = useStyles();
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.symbolBox}><Text style={styles.symbol}>{symbol}</Text></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {!!actionLabel && !!onAction && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((P) => ({
  container: {
    minHeight: 230,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: P.line,
    borderStyle: 'dashed',
    backgroundColor: P.surface,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 190 },
  symbolBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { color: P.primary, fontSize: 22, fontWeight: '900' },
  title: { color: P.ink, fontSize: 16, fontWeight: '900', marginTop: 14, writingDirection: 'rtl' },
  description: {
    color: P.inkMuted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 6,
    maxWidth: 260,
  },
  action: {
    minHeight: 44,
    borderRadius: Radius.medium,
    backgroundColor: P.primary,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
  },
  actionText: { color: P.onPrimary, fontSize: 12, fontWeight: '900', writingDirection: 'rtl' },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
}));
