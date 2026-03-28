/**
 * Auth module — Google OAuth2 flow, token storage, refresh logic.
 * Uses expo-auth-session for OAuth and expo-secure-store for token persistence.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

import type { AuthTokens, UserProfile } from '@duitku/shared';
import { Config } from '../constants/config';

// Ensure browser redirects are completed on mount
WebBrowser.maybeCompleteAuthSession();

/** Google OAuth2 discovery document */
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/** Storage keys for tokens */
const STORAGE = Config.STORAGE_KEYS;

/** Callback response from the Worker /auth/callback endpoint */
interface AuthCallbackResponse {
  tokens: AuthTokens;
  user: UserProfile;
  created: boolean;
}

// --------------- Token Storage ---------------

/**
 * Store tokens in expo-secure-store (encrypted on device).
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(STORAGE.ACCESS_TOKEN, tokens.access_token);
  await SecureStore.setItemAsync(STORAGE.REFRESH_TOKEN, tokens.refresh_token);
}

/**
 * Get the current access token from secure storage.
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE.ACCESS_TOKEN);
}

/**
 * Get the current refresh token from secure storage.
 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE.REFRESH_TOKEN);
}

/**
 * Clear all stored tokens (logout).
 */
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(STORAGE.REFRESH_TOKEN);
}

// --------------- OAuth Flow ---------------

/**
 * Login with Google via the Worker's OAuth flow.
 *
 * Flow:
 * 1. Open Worker /auth/google in a web browser (redirects to Google consent)
 * 2. Google redirects back to Worker /auth/callback with the authorization code
 * 3. Worker exchanges code for tokens, creates/updates user, returns JWT + user
 * 4. We capture the callback response and store the JWT tokens locally
 *
 * Since the Worker handles the full exchange, the mobile app uses
 * a web browser flow pointing at the Worker, which redirects back
 * with the auth result via our app's deep link scheme.
 */
export async function login(): Promise<AuthCallbackResponse> {
  // Build the redirect URI back to our app
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: Config.SCHEME,
    path: 'auth/callback',
  });

  // Build the Worker auth URL with a state param containing our redirect URI
  const state = encodeURIComponent(redirectUri);
  const authUrl = `${Config.API_URL}/auth/google?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  // Open the browser for the OAuth flow
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success' || !result.url) {
    throw new AuthError('LOGIN_CANCELLED', 'Login was cancelled or failed');
  }

  // Parse tokens and user from the redirect URL params
  const url = new URL(result.url);
  const responseData = url.searchParams.get('data');

  if (!responseData) {
    // Alternative: the Worker may have encoded data differently
    // Try to extract from hash fragment
    const hashParams = new URLSearchParams(url.hash.replace('#', ''));
    const hashData = hashParams.get('data');

    if (!hashData) {
      throw new AuthError('NO_AUTH_DATA', 'No authentication data received from server');
    }

    const parsed: AuthCallbackResponse = JSON.parse(decodeURIComponent(hashData));
    await storeTokens(parsed.tokens);
    return parsed;
  }

  const parsed: AuthCallbackResponse = JSON.parse(decodeURIComponent(responseData));
  await storeTokens(parsed.tokens);
  return parsed;
}

/**
 * Refresh the access token using the stored refresh token.
 * Returns the new tokens or null if refresh failed.
 */
export async function refreshAccessToken(): Promise<AuthTokens | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${Config.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token invalid/expired — clear tokens
      if (response.status === 401) {
        await clearTokens();
      }
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
      // Best-effort server logout — always clear local tokens
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
