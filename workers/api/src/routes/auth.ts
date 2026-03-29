/**
 * Auth routes — Google OAuth2 flow endpoints.
 * Thin handlers that delegate to services/auth.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { Errors } from '../lib/errors';
import * as authService from '../services/auth';

const auth = new Hono<AppEnv>();

/**
 * GET /auth/google — Redirect to Google consent screen.
 * Optional query param: ?state=<opaque_string> (for CSRF / deep-link return)
 */
auth.get('/google', (c) => {
  const state = c.req.query('state');

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

  if (error) {
    // If we have a state/redirect, redirect back with error
    if (state) {
      const redirectUri = decodeURIComponent(state);
      return c.redirect(`${redirectUri}?error=${encodeURIComponent(error)}`);
    }
    throw Errors.UNAUTHORIZED(`Google OAuth error: ${error}`);
  }

  if (!code) {
    throw Errors.VALIDATION('Missing authorization code');
  }

  console.log('[auth/callback] code received');

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

    // If we have a mobile redirect URI in state, redirect back to the app with data
    if (state) {
      const redirectUri = decodeURIComponent(state);
      const data = encodeURIComponent(JSON.stringify(responseData));
      const deepLink = `${redirectUri}?data=${data}`;

      // Return an HTML page that triggers the deep link via JavaScript.
      // Direct HTTP redirect to exp:// or custom schemes doesn't work in Android Chrome.
      // The page auto-redirects via window.location, which Android handles as an intent.
      return c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
<p>Login berhasil! Mengalihkan ke DuitKu...</p>
<script>window.location.replace(${JSON.stringify(deepLink)});</script>
</body></html>`);
    }

    // Fallback: return JSON for non-mobile clients
    return c.json(responseData);
  } catch (err) {
    console.error('[auth/callback] ERROR:', err);
    if (state) {
      const redirectUri = decodeURIComponent(state);
      const errorMsg = encodeURIComponent(String(err));
      const deepLink = `${redirectUri}?error=${errorMsg}`;
      return c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Error</title></head>
<body>
<p>Login gagal. Mengalihkan ke DuitKu...</p>
<script>window.location.replace(${JSON.stringify(deepLink)});</script>
</body></html>`);
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

  console.log('[auth/exchange] Exchanging code with redirect_uri:', body.redirect_uri);

  try {
    const result = await authService.handleOAuthCallback({
      code: body.code,
      db: c.env.DB,
      kv: c.env.KV,
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      redirectUri: body.redirect_uri, // Use the same redirect_uri the app used with Google
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
    throw Errors.UNAUTHORIZED(`Token exchange failed: ${err}`);
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
