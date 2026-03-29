/**
 * Body size limit middleware.
 * Rejects requests with bodies larger than the configured limit.
 * Default: 1MB (generous for JSON APIs, prevents abuse).
 */

import type { Context, Next } from 'hono';
import { Errors } from '../lib/errors';

/** Default max body size: 1MB */
const DEFAULT_MAX_BODY_SIZE = 1024 * 1024;

/**
 * Reject requests with oversized bodies.
 * Checks Content-Length header first (fast path), then reads body if needed.
 */
export function bodyLimitMiddleware(maxBytes: number = DEFAULT_MAX_BODY_SIZE) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    // Only check methods that can have a body
    const method = c.req.method;
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next();
    }

    // Fast path: check Content-Length header
    const contentLength = c.req.header('Content-Length');
    if (contentLength) {
      const length = parseInt(contentLength, 10);
      if (!isNaN(length) && length > maxBytes) {
        throw Errors.VALIDATION(
          `Request body too large (${Math.round(length / 1024)}KB). Maximum: ${Math.round(maxBytes / 1024)}KB`
        );
      }
    }

    await next();
  };
}
