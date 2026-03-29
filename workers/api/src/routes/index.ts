import type { Hono } from 'hono';

import type { AppEnv } from '../index';
import { auth } from './auth';
import { budgets } from './budgets';
import { exportRoutes } from './export';
import { health } from './health';
import { insights } from './insights';
import { recurring } from './recurring';
import { sync } from './sync';
import { transactions } from './transactions';
import { authRateLimitMiddleware } from '../middleware/rate-limit';

/**
 * Register all route groups on the Hono app.
 * New routes: import here and add app.route().
 */
export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/health', health);

  // Auth endpoints get stricter rate limiting (10 req/min vs 100)
  app.use('/auth/*', authRateLimitMiddleware);
  app.route('/auth', auth);

  app.route('/budgets', budgets);
  app.route('/export', exportRoutes);
  app.route('/insights', insights);
  app.route('/recurring', recurring);
  app.route('/transactions', transactions);
  app.route('/sync', sync);
}
