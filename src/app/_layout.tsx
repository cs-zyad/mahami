import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui/brand-mark';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { themeStatusBar } from '@/constants/design';
import { ThemeProvider, makeStyles, useTheme } from '@/contexts/theme-context';
import { useOverTheAirUpdates } from '@/hooks/use-over-the-air-updates';
import { useWidgetSync } from '@/widgets/use-widget-sync';
import { RoutinesProvider } from '@/contexts/routines-context';
import { TasksProvider } from '@/contexts/tasks-context';

function AppNavigator() {
  const { loading, session } = useAuth();
  const { palette } = useTheme();
  const styles = useStyles();
  const segments = useSegments();
  useWidgetSync();

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0] as string | undefined;
    const protectedRoute =
      firstSegment === '(tabs)' ||
      firstSegment === 'add-task' ||
      firstSegment === 'add-routine' ||
      firstSegment === 'smart-capture' ||
      firstSegment === 'mahami-plus' ||
      firstSegment === 'edit-profile' ||
      firstSegment === 'onboarding' ||
      firstSegment === 'reset-password';

    const signedOutRoute =
      firstSegment === 'login' ||
      firstSegment === 'signup' ||
      firstSegment === 'forgot-password' ||
      firstSegment === 'resend-confirmation' ||
      firstSegment === 'phone-login';

    if (!session && protectedRoute) {
      router.replace('/login');
      return;
    }

    if (session && signedOutRoute) {
      const needsOnboarding = session.user.user_metadata.onboarding_completed !== true;
      router.replace(needsOnboarding ? '/onboarding' : '/home');
      return;
    }

    if (session && !firstSegment) {
      const needsOnboarding = session.user.user_metadata.onboarding_completed !== true;
      router.replace(needsOnboarding ? '/onboarding' : '/home');
    }
  }, [loading, segments, session]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <BrandMark />
        <ActivityIndicator color={palette.primary} size="small" />
        <Text style={styles.loadingText}>جاري تجهيز حسابك...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.canvas },
        animation: 'fade_from_bottom',
      }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

function ThemedApp() {
  const { theme } = useTheme();

  return (
    <AuthProvider>
      <TasksProvider>
        <RoutinesProvider>
          <StatusBar style={themeStatusBar[theme]} />
          <AppNavigator />
        </RoutinesProvider>
      </TasksProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  useOverTheAirUpdates();

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

const useStyles = makeStyles((P) => ({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: P.canvas,
  },
  loadingText: {
    color: P.inkMuted,
    fontSize: 13,
    writingDirection: 'rtl',
  },
}));
