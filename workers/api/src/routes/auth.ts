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

  if (error) {
    throw Errors.UNAUTHORIZED(`Google OAuth error: ${error}`);
  }

  if (!code) {
    throw Errors.VALIDATION('Missing authorization code');
  }

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

  return c.json({
    tokens: result.tokens,
    user: result.user,
    created: result.created,
  });
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
