import { Tabs } from 'expo-router';
import { ColorValue, StyleSheet, View } from 'react-native';

import { makeStyles, useTheme } from '@/contexts/theme-context';
import { AppIcon } from '@/components/ui/app-icon';

type IconProps = { focused: boolean; color: ColorValue; icon: string; androidIcon: string; fallback: string };

function TabIcon({ focused, color, icon, androidIcon, fallback }: IconProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <AppIcon
        name={{ ios: icon as never, android: androidIcon as never, web: androidIcon as never }}
        size={21}
        tintColor={focused ? palette.white : color}
        fallback={fallback}
      />
    </View>
  );
}

export const unstable_settings = { initialRouteName: 'home' };

export default function TabLayout() {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} icon="person.fill" androidIcon="person" fallback="●" />,
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'الروتين',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} icon="arrow.trianglehead.2.clockwise.rotate.90" androidIcon="routine" fallback="↻" />,
        }}
      />
      <Tabs.Screen
        name="ai-tasks"
        options={{
          title: 'مهام AI',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} icon="sparkles" androidIcon="auto_awesome" fallback="✦" />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'المهام',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} icon="checkmark.circle.fill" androidIcon="check_circle" fallback="✓" />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} icon="house.fill" androidIcon="home" fallback="⌂" />,
        }}
      />
    </Tabs>
  );
}

const useStyles = makeStyles((P) => ({
  tabBar: {
    height: 84,
    paddingTop: 9,
    paddingBottom: 12,
    backgroundColor: P.surface,
    borderTopColor: P.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: { gap: 3 },
  label: { fontSize: 11, fontWeight: '700' },
  iconWrap: { width: 38, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconWrapFocused: { backgroundColor: P.primary },
}));
