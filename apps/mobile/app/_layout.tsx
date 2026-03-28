import { useEffect, useState, useRef, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';
import { initNotifications } from '../lib/notifications';
import { ThemeProvider, useTheme } from '../contexts/theme-context';
import { BiometricLock } from '../components/biometric-lock';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Config.QUERY.STALE_TIME,
      retry: Config.QUERY.RETRY_COUNT,
    },
  },
});

/**
 * Auth guard hook — redirects based on authentication state.
 * - Unauthenticated users on protected routes → redirected to login
 * - Authenticated users on auth routes → redirected to home
 */
function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while auth state is loading
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated and not on login → redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated but on login → redirect to home
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments, router]);
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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(auth)/login"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
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
