import { Image, Text, View } from 'react-native';

import { makeStyles } from '@/contexts/theme-context';

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  const styles = useStyles();
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

const useStyles = makeStyles((P) => ({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  markCompact: { width: 36, height: 36, borderRadius: 12 },
  name: { color: P.ink, fontSize: 26, fontWeight: '900', writingDirection: 'rtl' },
}));
