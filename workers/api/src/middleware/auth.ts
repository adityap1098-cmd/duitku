/**
 * Auth middleware — extracts Bearer token, verifies JWT, sets userId on context.
 * Apply to all routes that require authentication.
 */

import type { Context, Next } from 'hono';

import type { AppEnv } from '../index';
import { Errors } from '../lib/errors';
import { verifyJWT } from '../lib/jwt';

/**
 * JWT auth middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and sets `userId` on the Hono context for downstream handlers.
 */
export async function authMiddleware(
  c: Context<AppEnv>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    throw Errors.UNAUTHORIZED('Missing Authorization header');
  }

  // Expect "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw Errors.UNAUTHORIZED('Invalid Authorization header format');
  }

  const token = parts[1];

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('userId', payload.sub);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    throw Errors.UNAUTHORIZED(message);
  }

  await next();
}
