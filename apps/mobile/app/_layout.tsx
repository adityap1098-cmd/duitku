import { useEffect, useState, useRef, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';
import { initNotifications } from '../lib/notifications';
import { ThemeProvider, useTheme } from '../contexts/theme-context';
import { BiometricLock } from '../components/biometric-lock';

// MUST be called at module level in root layout to intercept OAuth redirects
// before expo-router tries to match the deep link to a route.
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Config.QUERY.STALE_TIME,
      retry: Config.QUERY.RETRY_COUNT,
    },
  },
});

/**
 * Auth guard hook — redirects based on authentication + onboarding state.
 * - First-launch users (not authenticated, not seen onboarding) → onboarding
 * - Returning users (not authenticated, seen onboarding) → login
 * - Authenticated users on auth/onboarding routes → home
 */
function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const hasSeenOnboarding = useSettingsStore((s) => s.hasSeenOnboarding);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while auth state is loading
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!isAuthenticated && !hasSeenOnboarding && !inOnboardingGroup) {
      // First launch — show onboarding before login
      router.replace('/(onboarding)' as never);
    } else if (!isAuthenticated && hasSeenOnboarding && !inAuthGroup) {
      // Returning user who's seen onboarding — go to login
      router.replace('/(auth)/login' as never);
    } else if (isAuthenticated && (inAuthGroup || inOnboardingGroup)) {
      // Authenticated but on login/onboarding → redirect to home
      router.replace('/(tabs)/home' as never);
    }
  }, [isAuthenticated, isLoading, hasSeenOnboarding, segments, router]);
}

/**
 * Root layout with auth guard, theme support, and biometric lock.
 * Shows a loading spinner while auth state hydrates from secure storage.
 */
function RootLayoutInner() {
  const { isLoading } = useAuthStore();
  const { Colors, isDark } = useTheme();
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);

  const [isLocked, setIsLocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useProtectedRoute();

  // Request notification permissions on app startup
  useEffect(() => {
    initNotifications();
  }, []);

  // Verify stored tokens are still valid on app launch
  useEffect(() => {
    if (!isLoading) {
      const { restoreSession, isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        restoreSession();
      }
    }
  }, [isLoading]);

  // Listen for app state changes to trigger biometric lock
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      // App came from background/inactive to active
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        biometricEnabled
      ) {
        setIsLocked(true);
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [biometricEnabled]);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  // Show loading screen while hydrating auth state from secure storage
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(onboarding)"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="auth/callback"
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
      </Stack>
      {isLocked && <BiometricLock onUnlock={handleUnlock} />}
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
