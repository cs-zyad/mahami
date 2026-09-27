import { Image, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/design';

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/brand-icon.png')}
        style={[styles.mark, compact && styles.markCompact]}
      />
      {!compact && <Text style={styles.name}>مهامي</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  markCompact: { width: 36, height: 36, borderRadius: 12 },
  name: { color: Palette.ink, fontSize: 26, fontWeight: '900', writingDirection: 'rtl' },
});
