/**
 * Security headers middleware.
 * Sets standard security headers on all responses.
 */

import type { Context, Next } from 'hono';

/**
 * Add security headers to every response.
 */
export async function securityHeaders(c: Context, next: Next): Promise<void | Response> {
  await next();

  // Prevent framing (clickjacking)
  c.res.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  c.res.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS protection (legacy browsers)
  c.res.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy — don't leak full URLs
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy — disable unused browser features
  c.res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Content Security Policy — strict for API responses
  // The /auth/callback HTML page sets its own CSP via meta tag
  if (!c.res.headers.get('Content-Type')?.includes('text/html')) {
    c.res.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'"
    );
  }

  // HSTS — enforce HTTPS (1 year, include subdomains)
  // Only set in production (Workers are always HTTPS, but localhost dev isn't)
  const url = new URL(c.req.url);
  if (url.protocol === 'https:') {
    c.res.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
}
