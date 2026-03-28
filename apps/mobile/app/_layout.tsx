import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Colors } from '../constants/theme';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/auth-store';

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
 * Root layout with auth guard.
 * Shows a loading spinner while auth state hydrates from secure storage.
 */
function RootLayoutInner() {
  const { isLoading } = useAuthStore();

  useProtectedRoute();

  // Show loading screen while hydrating auth state from secure storage
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
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
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
