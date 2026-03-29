/**
 * OAuth callback route — handles deep link redirect from Worker.
 *
 * When the Worker redirects to exp://127.0.0.1:8081/--/auth/callback?data=...
 * and the Linking event listener doesn't catch it (e.g., app was killed),
 * expo-router sends us here. We parse the auth data and complete login.
 */

import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuthStore } from '../../stores/auth-store';
import { storeTokens } from '../../lib/auth';

import type { AuthTokens, UserProfile } from '@duitku/shared';

interface AuthCallbackResponse {
  tokens: AuthTokens;
  user: UserProfile;
  created: boolean;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string; error?: string }>();
  const { Colors } = useTheme();

  useEffect(() => {
    async function handleCallback() {
      try {
        if (params.error) {
          console.error('[auth/callback] Error:', params.error);
          router.replace('/(auth)/login' as never);
          return;
        }

        if (params.data) {
          console.log('[auth/callback] Got auth data, processing...');
          const parsed: AuthCallbackResponse = JSON.parse(decodeURIComponent(params.data));

          // Store tokens
          await storeTokens(parsed.tokens);

          // Update auth store directly
          useAuthStore.setState({
            user: parsed.user,
            isAuthenticated: true,
            isAuthenticating: false,
            error: null,
          });

          console.log('[auth/callback] Login complete, redirecting to home');
          router.replace('/(tabs)/home' as never);
          return;
        }

        // No data, no error — shouldn't happen
        console.warn('[auth/callback] No data or error in callback');
        router.replace('/(auth)/login' as never);
      } catch (err) {
        console.error('[auth/callback] Failed to process:', err);
        router.replace('/(auth)/login' as never);
      }
    }

    handleCallback();
  }, [params.data, params.error, router]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={[styles.text, { color: Colors.textSecondary }]}>
        Menyelesaikan login...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 14,
    marginTop: 12,
  },
});
