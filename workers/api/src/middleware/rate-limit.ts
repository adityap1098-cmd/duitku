/**
 * Rate limiting middleware — KV-based sliding window.
 * Uses Cloudflare KV to track request counts per IP.
 *
 * Two tiers:
 * - General API: 100 requests/minute
 * - Auth endpoints: 10 requests/minute (stricter to prevent brute-force)
 */

import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';
import { Errors } from '../lib/errors';

/** Rate limit configuration */
interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** KV key prefix */
  prefix: string;
}

const GENERAL_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
  prefix: 'rl:gen',
};

const AUTH_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowSeconds: 60,
  prefix: 'rl:auth',
};

/**
 * Get client IP from Cloudflare headers.
 * Falls back to 'unknown' (still rate-limited as a single bucket).
 */
function getClientIp(c: Context): string {
  return c.req.header('CF-Connecting-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

/**
 * Check and increment rate limit counter.
 * Returns remaining requests, or throws RATE_LIMITED.
 */
async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  config: RateLimitConfig
): Promise<number> {
  const key = `${config.prefix}:${ip}`;

  // Get current count
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= config.maxRequests) {
    throw Errors.RATE_LIMITED(config.windowSeconds);
  }

  // Increment — use expirationTtl so the key auto-expires
  await kv.put(key, String(count + 1), {
    expirationTtl: config.windowSeconds,
  });

  return config.maxRequests - count - 1;
}

/**
 * General rate limiting middleware — 100 req/min per IP.
 * Apply to all routes.
 */
export async function rateLimitMiddleware(
  c: Context<AppEnv>,
  next: Next
): Promise<Response | void> {
  const ip = getClientIp(c);

  try {
    const remaining = await checkRateLimit(c.env.KV, ip, GENERAL_LIMIT);
    // Set rate limit headers
    c.res.headers.set('X-RateLimit-Limit', String(GENERAL_LIMIT.maxRequests));
    c.res.headers.set('X-RateLimit-Remaining', String(remaining));
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as any).code === 'RATE_LIMITED') {
      throw err;
    }
    // KV failure should not block requests — log and continue
    console.error('[rate-limit] KV error:', err);
  }

  await next();
}

/**
 * Strict rate limiting for auth endpoints — 10 req/min per IP.
 * Apply to /auth/* routes.
 */
export async function authRateLimitMiddleware(
  c: Context<AppEnv>,
  next: Next
): Promise<Response | void> {
  const ip = getClientIp(c);

  try {
    await checkRateLimit(c.env.KV, ip, AUTH_LIMIT);
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as any).code === 'RATE_LIMITED') {
      throw err;
    }
    console.error('[rate-limit] KV error:', err);
  }

  await next();
}
