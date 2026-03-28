/**
 * Export routes — thin HTTP handlers for the export feature.
 * All business logic lives in services/export.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import { authMiddleware } from '../middleware/auth';
import { Errors } from '../lib/errors';
import * as exportService from '../services/export';

const exportRoutes = new Hono<AppEnv>();

// All export routes require auth
exportRoutes.use('*', authMiddleware);

/**
 * GET /export/monthly?year=2026&month=3
 * Returns XLSX binary with appropriate Content-Type and Content-Disposition.
 */
exportRoutes.get('/monthly', async (c) => {
  const userId = c.get('userId');

  // Parse and validate query params
  const yearStr = c.req.query('year');
  const monthStr = c.req.query('month');

  if (!yearStr || !monthStr) {
    throw Errors.VALIDATION('Both year and month query parameters are required');
  }

  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw Errors.VALIDATION('Year and month must be valid numbers');
  }

  // Service handles further validation (range checks)
  const { buffer, meta } = await exportService.generateMonthlyExport(
    c.env.DB,
    userId,
    year,
    month
  );

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${meta.filename}"`,
      'X-Export-Rows': String(meta.rows),
      'X-Export-Generated-At': meta.generatedAt,
    },
  });
});

export { exportRoutes };
