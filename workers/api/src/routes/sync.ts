/**
 * Sync routes — thin HTTP handlers for Gmail sync operations.
 * All business logic lives in services/sync.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { authMiddleware } from '../middleware/auth';
import * as syncService from '../services/sync';

const sync = new Hono<AppEnv>();

// All sync routes require auth
sync.use('*', authMiddleware);

/**
 * POST /sync/trigger — manually trigger Gmail sync for authenticated user.
 * Includes a KV-based concurrent sync guard to prevent duplicate syncs.
 */
sync.post('/trigger', async (c) => {
  const userId = c.get('userId');

  // Optional date range from request body
  const body = await c.req.json<{ after?: string; before?: string }>().catch(() => ({}));
  const afterDate = body.after; // YYYY-MM-DD
  const beforeDate = body.before; // YYYY-MM-DD

  // Concurrent sync guard — prevent duplicate syncs per user
  const lockKey = `sync:lock:${userId}`;
  const existingLock = await c.env.KV.get(lockKey);
  if (existingLock) {
    return c.json({
      success: false,
      error: { code: 'SYNC_IN_PROGRESS', message: 'A sync is already running for this account' },
    }, 409);
  }

  // Acquire lock with 5-minute TTL (auto-expires if sync hangs)
  await c.env.KV.put(lockKey, new Date().toISOString(), { expirationTtl: 300 });

  try {
    const syncLog = await syncService.triggerSync(
      c.env.DB,
      userId,
      c.env.ENCRYPTION_KEY,
      c.env.GOOGLE_CLIENT_ID,
      c.env.GOOGLE_CLIENT_SECRET,
      afterDate,
      beforeDate
    );

    return c.json({
      success: true,
      data: syncLog,
    });
  } finally {
    // Release lock when done (success or failure)
    await c.env.KV.delete(lockKey);
  }
});

/**
 * GET /sync/status — get latest sync status for authenticated user.
 */
sync.get('/status', async (c) => {
  const userId = c.get('userId');

  const syncLog = await syncService.getLatestSyncLog(c.env.DB, userId);

  return c.json({
    success: true,
    data: syncLog,
  });
});

export { sync };
