import { Hono } from 'hono';

import type { AppEnv } from '../index';

const health = new Hono<AppEnv>();

/**
 * GET /health — liveness + DB connectivity check.
 * Returns { status: "ok", db: "connected" } on success.
 */
health.get('/', async (c) => {
  try {
    // Verify D1 is reachable with a lightweight query
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return c.json(
      { status: 'error', db: 'disconnected', message: err instanceof Error ? err.message : 'Unknown DB error' },
      503
    );
  }
});

export { health };
