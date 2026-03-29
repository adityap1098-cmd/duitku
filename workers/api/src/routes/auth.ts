/**
 * Auth routes — Google OAuth2 flow endpoints.
 * Thin handlers that delegate to services/auth.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { Errors } from '../lib/errors';
import * as authService from '../services/auth';

const auth = new Hono<AppEnv>();

// --------------- Security helpers ---------------

/**
 * Allowed redirect URI schemes for OAuth state parameter.
 * Only these prefixes are accepted as redirect targets after login.
 */
const ALLOWED_REDIRECT_PREFIXES = [
  'exp://',
  'duitku://',
  'http://localhost',
  'https://auth.expo.io',
];

/**
 * Allowed redirect_uri values for /auth/exchange.
 * Must match what the mobile app sends to Google.
 */
const ALLOWED_EXCHANGE_REDIRECT_PREFIXES = [
  'https://auth.expo.io',
  'http://localhost',
  'exp://',
  'duitku://',
];

/**
 * Validate a redirect URI against the allowlist.
 * Returns true if the URI starts with one of the allowed prefixes.
 */
function isAllowedRedirect(uri: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => uri.startsWith(prefix));
}

/**
 * Build a safe HTML page that redirects via JS.
 * Uses CSP to prevent script injection and properly escapes the URL.
 */
function buildRedirectHtml(title: string, message: string, redirectUrl: string): Response {
  // Double-encode: JSON.stringify handles JS string escaping,
  // and we place it in a CSP-protected inline script
  const safeUrl = JSON.stringify(redirectUrl);
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline';">
<title>${title}</title>
</head>
<body>
<p>${message}</p>
<script>window.location.replace(${safeUrl});</script>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Sanitize error messages for user-facing responses.
 * Never expose internal error details.
 */
function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    // Only pass through known safe error messages
    if (err.message.startsWith('Google OAuth error:')) {
      return err.message;
    }
  }
  return 'Authentication failed';
}

// --------------- Routes ---------------

/**
 * GET /auth/google — Redirect to Google consent screen.
 * Optional query param: ?state=<opaque_string> (for CSRF / deep-link return)
 */
auth.get('/google', (c) => {
  const state = c.req.query('state');

  // Validate state (redirect URI) against allowlist if provided
  if (state) {
    const decoded = decodeURIComponent(state);
    if (!isAllowedRedirect(decoded, ALLOWED_REDIRECT_PREFIXES)) {
      throw Errors.VALIDATION('Invalid redirect URI in state parameter');
    }
  }

  const authUrl = authService.buildAuthUrl(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_REDIRECT_URI,
    state
  );

  return c.redirect(authUrl);
});

/**
 * GET /auth/callback — Google OAuth2 callback.
 * Exchanges code for tokens, creates/updates user, returns JWT session.
 */
auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const state = c.req.query('state'); // Contains the mobile app's redirect URI

  // Validate state redirect URI
  let validatedRedirectUri: string | null = null;
  if (state) {
    const decoded = decodeURIComponent(state);
    if (isAllowedRedirect(decoded, ALLOWED_REDIRECT_PREFIXES)) {
      validatedRedirectUri = decoded;
    }
    // If state is present but invalid, ignore it (fall through to JSON response)
  }

  if (error) {
    if (validatedRedirectUri) {
      return buildRedirectHtml(
        'Error',
        'Login gagal. Mengalihkan ke DuitKu...',
        `${validatedRedirectUri}?error=${encodeURIComponent(error)}`
      );
    }
    throw Errors.UNAUTHORIZED(`Google OAuth error: ${error}`);
  }

  if (!code) {
    throw Errors.VALIDATION('Missing authorization code');
  }

  try {
    const result = await authService.handleOAuthCallback({
      code,
      db: c.env.DB,
      kv: c.env.KV,
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      redirectUri: c.env.GOOGLE_REDIRECT_URI,
      jwtSecret: c.env.JWT_SECRET,
      encryptionKey: c.env.ENCRYPTION_KEY,
    });

    const responseData = {
      tokens: result.tokens,
      user: result.user,
      created: result.created,
    };

    // If we have a validated mobile redirect URI, redirect back to the app
    if (validatedRedirectUri) {
      const data = encodeURIComponent(JSON.stringify(responseData));
      const deepLink = `${validatedRedirectUri}?data=${data}`;

      return buildRedirectHtml(
        'Redirecting...',
        'Login berhasil! Mengalihkan ke DuitKu...',
        deepLink
      );
    }

    // Fallback: return JSON for non-mobile clients
    return c.json(responseData);
  } catch (err) {
    console.error('[auth/callback] ERROR:', err);
    if (validatedRedirectUri) {
      const safeError = sanitizeError(err);
      return buildRedirectHtml(
        'Error',
        'Login gagal. Mengalihkan ke DuitKu...',
        `${validatedRedirectUri}?error=${encodeURIComponent(safeError)}`
      );
    }
    throw err;
  }
});

/**
 * POST /auth/exchange — Exchange authorization code for session tokens.
 * Used by mobile app after receiving code from Google via Expo auth proxy.
 * Body: { code: string, redirect_uri: string }
 */
auth.post('/exchange', async (c) => {
  const body = await c.req.json<{ code?: string; redirect_uri?: string }>();

  if (!body.code) {
    throw Errors.VALIDATION('Missing authorization code');
  }
  if (!body.redirect_uri) {
    throw Errors.VALIDATION('Missing redirect_uri');
  }

  // Validate redirect_uri against allowlist
  if (!isAllowedRedirect(body.redirect_uri, ALLOWED_EXCHANGE_REDIRECT_PREFIXES)) {
    throw Errors.VALIDATION('Invalid redirect_uri');
  }

  try {
    const result = await authService.handleOAuthCallback({
      code: body.code,
      db: c.env.DB,
      kv: c.env.KV,
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      redirectUri: body.redirect_uri,
      jwtSecret: c.env.JWT_SECRET,
      encryptionKey: c.env.ENCRYPTION_KEY,
    });

    return c.json({
      tokens: result.tokens,
      user: result.user,
      created: result.created,
    });
  } catch (err) {
    console.error('[auth/exchange] ERROR:', err);
    throw Errors.UNAUTHORIZED('Token exchange failed');
  }
});

/**
 * POST /auth/refresh — Rotate refresh token and issue new JWT.
 * Body: { refresh_token: string }
 */
auth.post('/refresh', async (c) => {
  const body = await c.req.json<{ refresh_token?: string }>();

  if (!body.refresh_token) {
    throw Errors.VALIDATION('Missing refresh_token in request body');
  }

  const tokens = await authService.refreshSession(
    c.env.DB,
    c.env.KV,
    body.refresh_token,
    c.env.JWT_SECRET
  );

  if (!tokens) {
    throw Errors.UNAUTHORIZED('Invalid or expired refresh token');
  }

  return c.json({ tokens });
});

/**
 * POST /auth/logout — Invalidate refresh token.
 * Body: { refresh_token: string }
 */
auth.post('/logout', async (c) => {
  const body = await c.req.json<{ refresh_token?: string }>();

  if (!body.refresh_token) {
    throw Errors.VALIDATION('Missing refresh_token in request body');
  }

  await authService.invalidateRefreshToken(c.env.KV, body.refresh_token);

  return c.json({ success: true });
});

export { auth };
