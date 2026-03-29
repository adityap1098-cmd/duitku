import { useEffect, useState, useRef, useCallback } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold
} from '@expo-google-fonts/space-mono';

import { Config } from '../constants/config';
import { useAuthStore } from '../stores/auth-store';
import { useSettingsStore } from '../stores/settings-store';
import { initNotifications } from '../lib/notifications';
import { ThemeProvider, useTheme } from '../contexts/theme-context';
import { BiometricLock } from '../components/biometric-lock';
import { navLog, authLog } from '../lib/logger';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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
function useProtectedRoute(isLoaded: boolean) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const hasSeenOnboarding = useSettingsStore((s) => s.hasSeenOnboarding);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while auth state or fonts are loading
    if (isLoading || !isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    navLog('Auth guard check', {
      isAuthenticated,
      hasSeenOnboarding,
      segments: segments.join('/'),
      inAuthGroup,
      inOnboardingGroup,
    });

    if (!isAuthenticated && !hasSeenOnboarding && !inOnboardingGroup) {
      navLog('→ Redirect to onboarding');
      router.replace('/(onboarding)' as never);
    } else if (!isAuthenticated && hasSeenOnboarding && !inAuthGroup) {
      navLog('→ Redirect to login');
      router.replace('/(auth)/login' as never);
    } else if (isAuthenticated && (inAuthGroup || inOnboardingGroup)) {
      navLog('→ Redirect to home (authenticated)');
      router.replace('/(tabs)/home' as never);
    }
  }, [isAuthenticated, isLoading, isLoaded, hasSeenOnboarding, segments, router]);
}

/**
 * Root layout with auth guard, theme support, and biometric lock.
 * Shows a loading spinner while auth state hydrates from secure storage.
 */
function RootLayoutInner() {
  const { isLoading: authLoading } = useAuthStore();
  const { Colors, isDark } = useTheme();
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);

  const [isLocked, setIsLocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Load Fonts
  const [fontsLoaded, fontError] = useFonts({
    'Outfit': Outfit_700Bold, // Default Outfit
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'Outfit-ExtraBold': Outfit_800ExtraBold,
    'Outfit-Black': Outfit_900Black,
    'PlusJakartaSans': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'SpaceMono': SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
  });

  const isLoaded = fontsLoaded || !!fontError;

  useProtectedRoute(isLoaded);

  // Log every screen change
  const pathname = usePathname();
  useEffect(() => {
    navLog(`Screen: ${pathname}`);
  }, [pathname]);

  useEffect(() => {
    if (isLoaded && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded, authLoading]);

  // Request notification permissions on app startup
  useEffect(() => {
    initNotifications();
  }, []);

  // Verify stored tokens are still valid on app launch
  useEffect(() => {
    if (!authLoading) {
      const { restoreSession, isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        restoreSession();
      }
    }
  }, [authLoading]);

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

  // Show nothing while fonts/auth are loading (Splash screen is showing)
  if (!isLoaded || authLoading) {
    return null;
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
