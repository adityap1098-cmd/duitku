/**
 * DuitKu App Configuration
 *
 * Environment-aware config. In dev, API points to local Wrangler.
 * In production, this will be set to the deployed Worker URL.
 */

const DEV_API_URL = 'https://benefit-bold-usr-earned.trycloudflare.com';

// In production builds, this would come from expo-constants or environment
export const Config = {
  /** Base URL for the DuitKu API (Cloudflare Worker) */
  API_URL: DEV_API_URL,

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
