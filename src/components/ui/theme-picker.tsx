import { Pressable, Text, View } from 'react-native';

import { Radius, themeDescriptions, themeLabels, themeOrder, themes } from '@/constants/design';
import { makeStyles, useTheme } from '@/contexts/theme-context';

// Each card previews the theme it selects, drawn in that theme's own colours
// rather than the active one — so the choice is visible before it is made.
export function ThemePicker() {
  const styles = useStyles();
  const { theme, setTheme } = useTheme();

  return (
    <View style={styles.row}>
      {themeOrder.map((name) => {
        const preview = themes[name];
        const selected = name === theme;

        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={themeLabels[name]}
            onPress={() => setTheme(name)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: preview.canvas, borderColor: selected ? preview.primary : preview.line },
              selected && styles.cardSelected,
              pressed && styles.pressed,
            ]}>
            <View style={[styles.swatchRow, { backgroundColor: preview.surface }]}>
              <View style={[styles.swatch, { backgroundColor: preview.primary }]} />
              <View style={[styles.swatch, { backgroundColor: preview.accent }]} />
              <View style={[styles.bar, { backgroundColor: preview.inkMuted }]} />
            </View>

            <View style={styles.labelRow}>
              <View style={styles.labelCopy}>
                <Text style={[styles.label, { color: preview.ink }]}>{themeLabels[name]}</Text>
                <Text style={[styles.description, { color: preview.inkMuted }]}>
                  {themeDescriptions[name]}
                </Text>
              </View>
              {selected && (
                <View style={[styles.check, { backgroundColor: preview.primary }]}>
                  <Text style={[styles.checkMark, { color: preview.onPrimary }]}>✓</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((P, S) => ({
  row: { gap: 11 },
  card: {
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    padding: 12,
    gap: 11,
    ...S.card,
  },
  cardSelected: { borderWidth: 2.5 },
  pressed: { opacity: 0.85 },
  swatchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
    borderRadius: Radius.small,
    paddingVertical: 13,
    paddingHorizontal: 11,
  },
  swatch: { width: 20, height: 20, borderRadius: Radius.pill },
  bar: { flex: 1, height: 6, borderRadius: Radius.pill, opacity: 0.55 },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  labelCopy: { flex: 1, alignItems: 'flex-start', gap: 3 },
  description: { fontSize: 11, lineHeight: 17, writingDirection: 'rtl', textAlign: 'right' },
  label: { fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  check: { width: 21, height: 21, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 12, fontWeight: '900' },
}));
