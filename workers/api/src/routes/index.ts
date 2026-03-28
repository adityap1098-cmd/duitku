import type { Hono } from 'hono';

import type { AppEnv } from '../index';
import { auth } from './auth';
import { health } from './health';
import { sync } from './sync';
import { transactions } from './transactions';

/**
 * Register all route groups on the Hono app.
 * New routes: import here and add app.route().
 */
export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/health', health);
  app.route('/auth', auth);
  app.route('/transactions', transactions);
  app.route('/sync', sync);
}
