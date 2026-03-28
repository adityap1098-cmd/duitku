/**
 * Insights routes — thin HTTP handlers for spending analytics.
 * All business logic lives in services/insights.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { authMiddleware } from '../middleware/auth';
import * as insightsService from '../services/insights';

const insights = new Hono<AppEnv>();

// All insights routes require auth
insights.use('*', authMiddleware);

/**
 * GET /insights — category breakdown with optional date range.
 * Query params: date_from?, date_to? (YYYY-MM-DD)
 */
insights.get('/', async (c) => {
  const userId = c.get('userId');
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');
  const result = await insightsService.getCategoryBreakdown(
    c.env.DB,
    userId,
    dateFrom,
    dateTo
  );
  return c.json({ success: true, data: result.data });
});

/**
 * GET /insights/trend — monthly spending trend.
 * Query params: months? (number, default 6)
 */
insights.get('/trend', async (c) => {
  const userId = c.get('userId');
  const monthsParam = c.req.query('months');
  const months = monthsParam ? parseInt(monthsParam, 10) : undefined;
  const result = await insightsService.getSpendingTrend(c.env.DB, userId, months);
  return c.json({ success: true, data: result.data });
});

/**
 * GET /insights/comparison — current vs previous month comparison.
 */
insights.get('/comparison', async (c) => {
  const userId = c.get('userId');
  const result = await insightsService.getMonthComparison(c.env.DB, userId);
  return c.json({ success: true, data: result });
});

export { insights };
