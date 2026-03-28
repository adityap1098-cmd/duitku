/**
 * Auth service — Google OAuth2 token exchange, user upsert, session management.
 * All business logic lives here; routes are thin HTTP handlers.
 */

import type { AuthTokens, CreateUserInput, UserProfile, UserTier } from '@duitku/shared';
import { generateJWT, generateRefreshToken, type GenerateJWTInput } from '../lib/jwt';
import { encrypt } from '../lib/crypto';

// --------------- Google OAuth2 ---------------

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/** Scopes: profile + email + Gmail read-only for email sync */
const OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ');

/** Refresh token TTL in KV: 30 days (in seconds) */
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60;

/** Google userinfo response shape */
interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

/** Google token exchange response */
interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// --------------- Public API ---------------

/**
 * Build the Google OAuth2 authorization URL.
 */
export function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  state?: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for Google tokens.
 * Returns both access_token and refresh_token (if first login or re-consent).
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[auth] Google token exchange failed:', response.status, errorBody);
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch Google user profile using an access token.
 */
export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Find or create user in D1 from Google profile.
 * Returns the user profile and whether it was newly created.
 */
export async function findOrCreateUser(
  db: D1Database,
  googleUser: GoogleUserInfo
): Promise<{ user: UserProfile & { tier: UserTier; google_id: string }; created: boolean }> {
  // Try to find existing user by google_id
  const existing = await db
    .prepare('SELECT id, email, name, avatar_url, tier, google_id FROM users WHERE google_id = ?')
    .bind(googleUser.id)
    .first<{ id: string; email: string; name: string; avatar_url: string | null; tier: UserTier; google_id: string }>();

  if (existing) {
    // Update profile info in case it changed on Google's side
    await db
      .prepare('UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = ? WHERE id = ?')
      .bind(googleUser.email, googleUser.name, googleUser.picture, new Date().toISOString(), existing.id)
      .run();

    return {
      user: {
        id: existing.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.picture,
        tier: existing.tier,
        google_id: existing.google_id,
      },
      created: false,
    };
  }

  // Create new user
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      'INSERT INTO users (id, email, name, avatar_url, tier, google_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(userId, googleUser.email, googleUser.name, googleUser.picture, 'free', googleUser.id, 1, now, now)
    .run();

  return {
    user: {
      id: userId,
      email: googleUser.email,
      name: googleUser.name,
      avatar_url: googleUser.picture,
      tier: 'free' as UserTier,
      google_id: googleUser.id,
    },
    created: true,
  };
}

/**
 * Store Gmail refresh token (encrypted) in the users table.
 * Only stored if Google returns a refresh_token (first login / re-consent).
 */
export async function storeGmailRefreshToken(
  db: D1Database,
  userId: string,
  gmailRefreshToken: string,
  encryptionKey: string
): Promise<void> {
  const encrypted = await encrypt(gmailRefreshToken, encryptionKey);
  await db
    .prepare('UPDATE users SET gmail_refresh_token = ?, updated_at = ? WHERE id = ?')
    .bind(encrypted, new Date().toISOString(), userId)
    .run();
}

/**
 * Create a session: generate JWT + refresh token, store refresh token in KV.
 * KV key format: `refresh:{refreshToken}` → `{userId}`
 */
export async function createSession(
  kv: KVNamespace,
  jwtInput: GenerateJWTInput,
  jwtSecret: string
): Promise<AuthTokens> {
  const { token: accessToken, expiresIn } = await generateJWT(jwtInput, jwtSecret);
  const refreshToken = generateRefreshToken();

  // Store refresh token in KV with 30-day TTL
  await kv.put(`refresh:${refreshToken}`, jwtInput.userId, {
    expirationTtl: REFRESH_TOKEN_TTL,
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  };
}

/**
 * Refresh a session: validate old refresh token, rotate it, issue new JWT.
 * Returns null if the refresh token is invalid/expired.
 */
export async function refreshSession(
  db: D1Database,
  kv: KVNamespace,
  oldRefreshToken: string,
  jwtSecret: string
): Promise<AuthTokens | null> {
  // Lookup userId from KV
  const userId = await kv.get(`refresh:${oldRefreshToken}`);
  if (!userId) {
    return null; // expired or invalid
  }

  // Delete old refresh token (rotation)
  await kv.delete(`refresh:${oldRefreshToken}`);

  // Fetch user data for JWT payload
  const user = await db
    .prepare('SELECT id, email, tier FROM users WHERE id = ? AND is_active = 1')
    .bind(userId)
    .first<{ id: string; email: string; tier: UserTier }>();

  if (!user) {
    return null; // user deleted or deactivated
  }

  // Issue new session
  return createSession(kv, { userId: user.id, email: user.email, tier: user.tier }, jwtSecret);
}

/**
 * Invalidate a refresh token (logout).
 */
export async function invalidateRefreshToken(
  kv: KVNamespace,
  refreshToken: string
): Promise<void> {
  await kv.delete(`refresh:${refreshToken}`);
}

/**
 * Handle the full OAuth callback flow:
 * 1. Exchange code for tokens
 * 2. Fetch user info
 * 3. Find or create user
 * 4. Store Gmail refresh token (if present)
 * 5. Create session (JWT + refresh token)
 */
export async function handleOAuthCallback(params: {
  code: string;
  db: D1Database;
  kv: KVNamespace;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  jwtSecret: string;
  encryptionKey: string;
}): Promise<{
  tokens: AuthTokens;
  user: UserProfile;
  created: boolean;
}> {
  const { code, db, kv, clientId, clientSecret, redirectUri, jwtSecret, encryptionKey } = params;

  // 1. Exchange code for Google tokens
  const googleTokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

  // 2. Fetch Google user profile
  const googleUser = await fetchGoogleUserInfo(googleTokens.access_token);

  // 3. Find or create user in D1
  const { user, created } = await findOrCreateUser(db, googleUser);

  // 4. Store Gmail refresh token if provided
  if (googleTokens.refresh_token) {
    await storeGmailRefreshToken(db, user.id, googleTokens.refresh_token, encryptionKey);
  }

  // 5. Create session
  const tokens = await createSession(
    kv,
    { userId: user.id, email: user.email, tier: user.tier },
    jwtSecret
  );

  return {
    tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      tier: user.tier,
    },
    created,
  };
}
