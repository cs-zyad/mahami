import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/contexts/theme-context';

// A tiled field of the same diamond motif SaduBand uses along an edge, here
// scattered loosely across a whole surface — the weave of a sadu panel rather
// than its border. Built from plain Views for the same reason SaduBand is:
// no SVG dependency, so it ships over the air.
//
// `density` sets how many diamonds are drawn — a screen-sized watermark wants
// far fewer, larger ones than a small card, where too many would just read as
// noise behind the text sitting on top of it.
type Density = 'surface' | 'card';

// Kept low for 'card': task lists render every row at once (no FlatList
// virtualization), so this count multiplies directly by however many tasks
// are on screen.
const COUNTS: Record<Density, number> = { surface: 48, card: 7 };
const SIZES: Record<Density, number> = { surface: 22, card: 13 };

export function SaduPattern({
  density = 'card',
  opacity,
  style,
}: {
  density?: Density;
  /** Defaults lower for the full-surface watermark, which sits behind far more text. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { palette, ornament } = useTheme();

  // The plain themes stay plain; the pattern belongs to the heritage one.
  if (!ornament) return null;

  const resolvedOpacity = opacity ?? (density === 'surface' ? 0.05 : 0.09);
  const size = SIZES[density];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.clip, style]}>
      <View style={[styles.grid, { opacity: resolvedOpacity }]}>
        {Array.from({ length: COUNTS[density] }, (_, index) => (
          <View
            key={index}
            style={[
              styles.diamond,
              {
                width: size,
                height: size,
                backgroundColor: index % 3 === 0 ? palette.accent : palette.primary,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  clip: { overflow: 'hidden' },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'space-around',
    justifyContent: 'space-around',
  },
  diamond: { margin: 10, transform: [{ rotate: '45deg' }] },
}));
