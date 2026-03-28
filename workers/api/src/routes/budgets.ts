/**
 * Budget routes — thin HTTP handlers.
 * All business logic lives in services/budget.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { authMiddleware } from '../middleware/auth';
import * as budgetService from '../services/budget';

const budgets = new Hono<AppEnv>();

// All budget routes require auth
budgets.use('*', authMiddleware);

/**
 * GET /budgets/status — budget status with spending + alert flags.
 * MUST be registered BEFORE /:id to avoid path collision.
 */
budgets.get('/status', async (c) => {
  const userId = c.get('userId');
  const status = await budgetService.getStatus(c.env.DB, userId);
  return c.json({ success: true, data: status });
});

/**
 * GET /budgets — list all budgets with current month spending.
 */
budgets.get('/', async (c) => {
  const userId = c.get('userId');
  const result = await budgetService.list(c.env.DB, userId);
  return c.json({ success: true, data: result.data });
});

/**
 * GET /budgets/:id — get single budget.
 */
budgets.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const budget = await budgetService.getById(c.env.DB, userId, id);
  return c.json({ success: true, data: budget });
});

/**
 * POST /budgets — create a new budget.
 */
budgets.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const budget = await budgetService.create(c.env.DB, userId, body);
  return c.json({ success: true, data: budget }, 201);
});

/**
 * PUT /budgets/:id — update an existing budget.
 */
budgets.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const budget = await budgetService.update(c.env.DB, userId, id, body);
  return c.json({ success: true, data: budget });
});

/**
 * DELETE /budgets/:id — delete a budget.
 */
budgets.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  await budgetService.remove(c.env.DB, userId, id);
  return c.json({ success: true, data: null });
});

export { budgets };
