/**
 * Recurring transaction routes — thin HTTP handlers for recurring expense management.
 * All business logic lives in services/recurring.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { authMiddleware } from '../middleware/auth';
import * as recurringService from '../services/recurring';

const recurring = new Hono<AppEnv>();

// All recurring routes require auth
recurring.use('*', authMiddleware);

/**
 * GET /recurring — list confirmed recurring + detected candidates.
 */
recurring.get('/', async (c) => {
  const userId = c.get('userId');
  const [confirmed, detected] = await Promise.all([
    recurringService.listRecurring(c.env.DB, userId),
    recurringService.detectRecurring(c.env.DB, userId),
  ]);
  return c.json({
    success: true,
    data: {
      confirmed: confirmed.data,
      detected: detected.data,
    },
  });
});

/**
 * POST /recurring/confirm — confirm a detected recurring expense.
 * Registered before /:id to avoid Hono path collision.
 */
recurring.post('/confirm', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const result = await recurringService.confirmRecurring(c.env.DB, userId, body);
  return c.json({ success: true, data: result }, 201);
});

/**
 * PUT /recurring/:id/dismiss — dismiss a recurring expense.
 */
recurring.put('/:id/dismiss', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  await recurringService.dismissRecurring(c.env.DB, userId, id);
  return c.json({ success: true, data: null });
});

export { recurring };
