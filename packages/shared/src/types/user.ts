/**
 * User types — single source of truth.
 * DB conventions: boolean = 0/1 INTEGER, timestamps = TEXT (ISO 8601).
 */

/** User tier for feature gating */
export type UserTier = 'free' | 'premium' | 'admin';

/** User record as stored in D1 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  tier: UserTier;
  google_id: string;
  /** 0 = inactive, 1 = active */
  is_active: number;
  /** ISO 8601 */
  created_at: string;
  /** ISO 8601 */
  updated_at: string;
}

/** Subset returned to the client (no google_id) */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  tier: UserTier;
}

/** JWT payload embedded in access tokens */
export interface AuthTokenPayload {
  sub: string; // user id
  email: string;
  tier: UserTier;
  iat: number;
  exp: number;
}

/** Token pair returned after login */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  /** Seconds until access_token expires */
  expires_in: number;
}

/** Input for creating a new user from Google OAuth */
export interface CreateUserInput {
  email: string;
  name: string;
  avatar_url: string | null;
  google_id: string;
}
