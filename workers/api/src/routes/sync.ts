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
 */
sync.post('/trigger', async (c) => {
  const userId = c.get('userId');

  const syncLog = await syncService.triggerSync(
    c.env.DB,
    userId,
    c.env.ENCRYPTION_KEY,
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET
  );

  return c.json({
    success: true,
    data: syncLog,
  });
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
