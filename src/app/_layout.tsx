import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui/brand-mark';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { Palette } from '@/constants/design';
import { RoutinesProvider } from '@/contexts/routines-context';
import { TasksProvider } from '@/contexts/tasks-context';

function AppNavigator() {
  const { loading, session } = useAuth();
  const segments = useSegments();

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
        <ActivityIndicator color={Palette.primary} size="small" />
        <Text style={styles.loadingText}>جاري تجهيز حسابك...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.canvas },
        animation: 'fade_from_bottom',
      }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TasksProvider>
        <RoutinesProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </RoutinesProvider>
      </TasksProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: Palette.canvas,
  },
  loadingText: {
    color: Palette.inkMuted,
    fontSize: 13,
    writingDirection: 'rtl',
  },
});
