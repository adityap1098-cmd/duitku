/**
 * DuitKu App Configuration
 *
 * Environment-aware config. Reads API_URL from app.json extra.apiUrl,
 * which can be overridden per EAS build profile via eas.json env vars.
 *
 * For production:
 *   1. Set apiUrl in app.json extra to your deployed Worker URL
 *   2. Or use eas.json env to override per profile
 */

import Constants from 'expo-constants';

/** Fallback for local development */
const FALLBACK_API_URL = 'http://localhost:8787';

/**
 * Get API URL from Expo config, with fallback.
 * Priority: app.json extra.apiUrl → fallback to localhost
 */
function getApiUrl(): string {
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl && typeof configUrl === 'string') {
    return configUrl;
  }
  return FALLBACK_API_URL;
}

export const Config = {
  /** Base URL for the DuitKu API (Cloudflare Worker) */
  API_URL: getApiUrl(),

  /** Google OAuth client ID (Web application type) */
  GOOGLE_CLIENT_ID: '695257571068-kd7rpjmpuajo4notqnvl931im2a7971s.apps.googleusercontent.com',

  /** Deep link scheme matching app.json */
  SCHEME: 'duitku',

  /** Auth token storage keys */
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'duitku_access_token',
    REFRESH_TOKEN: 'duitku_refresh_token',
  },

  /** Query client defaults */
  QUERY: {
    STALE_TIME: 5 * 60 * 1000, // 5 minutes
    RETRY_COUNT: 2,
  },
} as const;
