import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { ColorValue, Platform, StyleSheet, Text } from 'react-native';

type IconName = string | {
  ios?: string;
  android?: string;
  web?: string;
};

type AppIconProps = {
  name: IconName;
  size?: number;
  tintColor?: ColorValue;
  fallback?: string;
};

export function AppIcon({ name, size = 24, tintColor, fallback = '•' }: AppIconProps) {
  const iosName = typeof name === 'string' ? name : name.ios;

  if (Platform.OS !== 'ios' || !iosName) {
    return <Text style={[styles.fallback, { color: tintColor, fontSize: size }]}>{fallback}</Text>;
  }

  return (
    <SymbolView
      name={iosName as SymbolViewProps['name']}
      size={size}
      tintColor={tintColor}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { fontWeight: '800', textAlign: 'center' },
});
