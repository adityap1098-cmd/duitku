/**
 * Auth module — Google OAuth2 flow, token storage, refresh logic.
 *
 * Flow (Worker-mediated, Expo Go compatible):
 * 1. App opens Worker /auth/google via tunnel URL
 * 2. Worker redirects to Google consent with redirect_uri = localhost callback
 * 3. Google sends code to Worker (via localhost, reached by adb reverse)
 * 4. Worker exchanges code, returns HTML page with window.location = exp://... deep link
 * 5. Android opens deep link in Expo Go
 * 6. expo-router auth/callback route captures the data and processes login
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

import type { AuthTokens, UserProfile } from '@duitku/shared';
import { Config } from '../constants/config';

// Ensure browser redirects are completed on mount
WebBrowser.maybeCompleteAuthSession();

/** Storage keys for tokens */
const STORAGE = Config.STORAGE_KEYS;

/** Callback response from the Worker */
interface AuthCallbackResponse {
  tokens: AuthTokens;
  user: UserProfile;
  created: boolean;
}

// --------------- Token Storage ---------------

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(STORAGE.ACCESS_TOKEN, tokens.access_token);
  await SecureStore.setItemAsync(STORAGE.REFRESH_TOKEN, tokens.refresh_token);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE.REFRESH_TOKEN);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(STORAGE.REFRESH_TOKEN);
}

// --------------- OAuth Flow ---------------

/**
 * Login with Google via Worker-mediated OAuth flow.
 *
 * Uses Linking.addEventListener to capture the deep link redirect,
 * since WebBrowser.openAuthSessionAsync doesn't reliably capture
 * exp:// deep links from HTTP 302 redirects via worker callback.
 */
export async function login(): Promise<AuthCallbackResponse> {
  return new Promise<AuthCallbackResponse>(async (resolve, reject) => {
    // Build the return URI for the app
    const returnUri = AuthSession.makeRedirectUri({
      scheme: Config.SCHEME,
      path: 'auth/callback',
    });

    console.log('[auth] returnUri:', returnUri);

    // Listen for the deep link redirect
    const handleRedirect = async (event: { url: string }) => {
      console.log('[auth] Deep link received:', event.url);

      try {
        const url = new URL(event.url);
        const errorParam = url.searchParams.get('error');
        if (errorParam) {
          reject(new AuthError('OAUTH_ERROR', decodeURIComponent(errorParam)));
          return;
        }

        const responseData = url.searchParams.get('data');
        if (!responseData) {
          reject(new AuthError('NO_AUTH_DATA', 'No authentication data received'));
          return;
        }

        const parsed: AuthCallbackResponse = JSON.parse(decodeURIComponent(responseData));
        await storeTokens(parsed.tokens);
        resolve(parsed);
      } catch (err) {
        reject(new AuthError('PARSE_ERROR', `Failed to parse auth data: ${err}`));
      }
    };

    // Subscribe to deep link events
    const subscription = Linking.addEventListener('url', handleRedirect);

    try {
      // Open Worker auth URL in browser
      const state = encodeURIComponent(returnUri);
      const authUrl = `${Config.API_URL}/auth/google?state=${state}`;

      console.log('[auth] Opening:', authUrl);

      // Open browser — don't wait for specific redirect URL matching,
      // the Linking event listener handles the deep link capture
      const result = await WebBrowser.openBrowserAsync(authUrl);

      console.log('[auth] Browser closed, type:', result.type);

      // If browser was dismissed without redirect, reject after a short delay
      // (the deep link handler might fire slightly after browser close)
      setTimeout(() => {
        subscription.remove();
        reject(new AuthError('LOGIN_CANCELLED', 'Login was cancelled'));
      }, 3000);
    } catch (err) {
      subscription.remove();
      reject(new AuthError('BROWSER_ERROR', `Browser error: ${err}`));
    }
  });
}

/**
 * Refresh the access token using the stored refresh token.
 */
export async function refreshAccessToken(): Promise<AuthTokens | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${Config.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      if (response.status === 401) await clearTokens();
      return null;
    }

    const data = await response.json() as { tokens: AuthTokens };
    await storeTokens(data.tokens);
    return data.tokens;
  } catch (error) {
    console.error('[auth] Token refresh failed:', error);
    return null;
  }
}

/**
 * Logout — invalidate refresh token on server, clear local tokens.
 */
export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${Config.API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      console.warn('[auth] Server logout failed, clearing local tokens');
    }
  }

  await clearTokens();
}

// --------------- Custom Error ---------------

export class AuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
