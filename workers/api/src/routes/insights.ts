/**
 * Insights routes — thin HTTP handlers for spending analytics.
 * All business logic lives in services/insights.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { authMiddleware } from '../middleware/auth';
import * as insightsService from '../services/insights';
import { Errors } from '../lib/errors';

const insights = new Hono<AppEnv>();

// All insights routes require auth
insights.use('*', authMiddleware);

/** Validate a date string is YYYY-MM-DD format */
function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

/**
 * GET /insights — category breakdown with optional date range.
 * Query params: date_from?, date_to? (YYYY-MM-DD)
 */
insights.get('/', async (c) => {
  const userId = c.get('userId');
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');

  if (dateFrom && !isValidDate(dateFrom)) {
    throw Errors.VALIDATION('date_from must be YYYY-MM-DD format');
  }
  if (dateTo && !isValidDate(dateTo)) {
    throw Errors.VALIDATION('date_to must be YYYY-MM-DD format');
  }

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
  let months: number | undefined;
  if (monthsParam) {
    months = parseInt(monthsParam, 10);
    if (isNaN(months) || months < 1 || months > 24) {
      months = 6; // safe default
    }
  }
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
