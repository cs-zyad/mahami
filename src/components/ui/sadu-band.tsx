import { View } from 'react-native';

import { makeStyles, useTheme } from '@/contexts/theme-context';

// A سدو band: two rules with a row of diamonds and chevrons between them, the
// motif that runs along the edge of a woven panel.
//
// Built from plain Views — a rotated square is a diamond, and a zero-width box
// with coloured borders is a triangle — so it needs no SVG dependency and can
// ship over the air.
const MOTIF_COUNT = 13;

export function SaduBand({ compact = false }: { compact?: boolean }) {
  const styles = useStyles();
  const { palette, ornament } = useTheme();

  // The plain themes stay plain; the band belongs to the heritage one.
  if (!ornament) return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.band, compact && styles.bandCompact]}>
      <View style={styles.rule} />

      <View style={styles.motifRow}>
        {Array.from({ length: MOTIF_COUNT }, (_, index) => (
          <View key={index} style={styles.motifGroup}>
            <View
              style={[
                styles.diamond,
                { backgroundColor: index % 2 === 0 ? palette.primary : palette.accent },
              ]}
            />
            <View style={[styles.chevron, { borderBottomColor: palette.accent }]} />
          </View>
        ))}
      </View>

      <View style={styles.rule} />
    </View>
  );
}

const useStyles = makeStyles((P) => ({
  band: { gap: 4, paddingVertical: 2, overflow: 'hidden' },
  bandCompact: { gap: 3 },
  rule: { height: 1.5, backgroundColor: P.accent, opacity: 0.5, borderRadius: 1 },
  motifRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  motifGroup: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  diamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }] },
  chevron: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.75,
  },
}));
