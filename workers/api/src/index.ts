import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { AppError } from './lib/errors';
import { registerRoutes } from './routes/index';
import { syncAllUsers } from './services/sync';
import { securityHeaders } from './middleware/security-headers';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { bodyLimitMiddleware } from './middleware/body-limit';

/**
 * Cloudflare Worker environment bindings.
 * Extend as new bindings are added in wrangler.toml.
 */
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  // R2: R2Bucket;           // Phase 2 — file storage
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS: string;
}

/** Hono app-level type context */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
  };
};

const app = new Hono<AppEnv>();

// --------------- Middleware ---------------

// CORS — allow mobile dev server + configured origins
app.use('*', async (c, next) => {
  const origins = (c.env.ALLOWED_ORIGINS || 'http://localhost:8081')
    .split(',')
    .map((o) => o.trim());

  const corsMiddleware = cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  return corsMiddleware(c, next);
});

// Security headers — set on every response
app.use('*', securityHeaders);

// Body size limit — 1MB max (before any body parsing)
app.use('*', bodyLimitMiddleware());

// Rate limiting — 100 req/min general (KV-based)
app.use('*', rateLimitMiddleware);

// Global error handler — converts AppError to structured JSON
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.status as any);
  }

  console.error('Unhandled error:', err);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    500
  );
});

// --------------- Routes ---------------

registerRoutes(app);

// 404 fallback
app.notFound((c) => {
  return c.json(
    { error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` } },
    404
  );
});

// --------------- Export ---------------

export default {
  fetch: app.fetch,

  /**
   * Cron trigger handler — runs every 6 hours for Gmail sync.
   * Calls syncAllUsers to process all users with connected Gmail.
   */
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(
      (async () => {
        console.log('[cron] Gmail sync triggered');
        try {
          const result = await syncAllUsers(
            env.DB,
            env.KV,
            env.ENCRYPTION_KEY,
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET
          );
          console.log(
            `[cron] Gmail sync complete: ${result.usersProcessed} users, ${result.usersSucceeded} succeeded, ${result.usersFailed} failed`
          );
        } catch (err) {
          console.error(
            '[cron] Gmail sync failed:',
            err instanceof Error ? err.message : err
          );
        }
      })()
    );
  },
};
