/**
 * JWT helpers using Web Crypto API (Cloudflare Workers compatible).
 * HMAC-SHA256 signing — no Node.js crypto dependency.
 */

import type { AuthTokenPayload, UserTier } from '@duitku/shared';

/** JWT header — always HMAC-SHA256 */
const JWT_HEADER = { alg: 'HS256', typ: 'JWT' };

/** Access token lifetime: 15 minutes */
const ACCESS_TOKEN_TTL = 15 * 60;

/** Refresh token length in bytes (32 → 64 hex chars) */
const REFRESH_TOKEN_BYTES = 32;

// --------------- Encoding helpers ---------------

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  // Restore standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function textEncode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function textDecode(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

// --------------- Crypto ---------------

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, textEncode(data));
  return base64UrlEncode(signature);
}

async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const key = await importKey(secret);
  const sigBytes = base64UrlDecode(signature);
  return crypto.subtle.verify('HMAC', key, sigBytes, textEncode(data));
}

// --------------- Public API ---------------

export interface GenerateJWTInput {
  userId: string;
  email: string;
  tier: UserTier;
}

/**
 * Generate a signed JWT access token.
 * Payload follows AuthTokenPayload shape from @duitku/shared.
 */
export async function generateJWT(
  input: GenerateJWTInput,
  secret: string
): Promise<{ token: string; expiresIn: number }> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: input.userId,
    email: input.email,
    tier: input.tier,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL,
  };

  const headerB64 = base64UrlEncode(textEncode(JSON.stringify(JWT_HEADER)));
  const payloadB64 = base64UrlEncode(textEncode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const signatureB64 = await sign(unsignedToken, secret);

  return {
    token: `${unsignedToken}.${signatureB64}`,
    expiresIn: ACCESS_TOKEN_TTL,
  };
}

/**
 * Verify and decode a JWT token.
 * Returns the payload if valid, throws on expiry or bad signature.
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<AuthTokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const unsigned = `${headerB64}.${payloadB64}`;

  // Verify signature
  const valid = await verifySignature(unsigned, signatureB64, secret);
  if (!valid) {
    throw new Error('Invalid JWT signature');
  }

  // Decode payload
  const payloadJson = textDecode(base64UrlDecode(payloadB64));
  const payload: AuthTokenPayload = JSON.parse(payloadJson);

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('JWT expired');
  }

  return payload;
}

/**
 * Generate a cryptographically random refresh token (hex string).
 */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(REFRESH_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
