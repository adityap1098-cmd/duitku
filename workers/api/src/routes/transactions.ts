/**
 * Transaction routes — thin HTTP handlers.
 * All business logic lives in services/transaction.ts.
 */

import { Hono } from 'hono';

import type { AppEnv } from '../index';
import type { TransactionFilter } from '@duitku/shared';
import { authMiddleware } from '../middleware/auth';
import * as transactionService from '../services/transaction';
import { Errors } from '../lib/errors';

const transactions = new Hono<AppEnv>();

// All transaction routes require auth
transactions.use('*', authMiddleware);

/**
 * GET /transactions/summary — income/expense summary.
 * MUST be registered BEFORE /:id to avoid path collision.
 */
transactions.get('/summary', async (c) => {
  const userId = c.get('userId');
  const search = c.req.query('search');

  // Search length cap — prevent DoS via massive query strings
  if (search && search.length > 200) {
    throw Errors.VALIDATION('Search query too long (max 200 chars)');
  }

  const filter: TransactionFilter = {
    type: c.req.query('type') as TransactionFilter['type'],
    category: c.req.query('category') as TransactionFilter['category'],
    date_from: c.req.query('date_from'),
    date_to: c.req.query('date_to'),
    search: search,
  };

  const summary = await transactionService.getSummary(c.env.DB, userId, filter);
  return c.json({ success: true, data: summary });
});

/**
 * GET /transactions — list with pagination and filters.
 */
transactions.get('/', async (c) => {
  const userId = c.get('userId');
  const search = c.req.query('search');

  // Search length cap
  if (search && search.length > 200) {
    throw Errors.VALIDATION('Search query too long (max 200 chars)');
  }

  const filter: TransactionFilter = {
    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
    per_page: c.req.query('per_page') ? Number(c.req.query('per_page')) : undefined,
    type: c.req.query('type') as TransactionFilter['type'],
    category: c.req.query('category') as TransactionFilter['category'],
    date_from: c.req.query('date_from'),
    date_to: c.req.query('date_to'),
    search: search,
  };

  const result = await transactionService.list(c.env.DB, userId, filter);
  return c.json({ success: true, data: result.data, pagination: result.pagination });
});

/**
 * GET /transactions/:id — get single transaction.
 */
transactions.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const transaction = await transactionService.getById(c.env.DB, userId, id);
  return c.json({ success: true, data: transaction });
});

/**
 * POST /transactions — create a new transaction.
 */
transactions.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const transaction = await transactionService.create(c.env.DB, userId, body);
  return c.json({ success: true, data: transaction }, 201);
});

/**
 * PUT /transactions/:id — update an existing transaction.
 */
transactions.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();

  const transaction = await transactionService.update(c.env.DB, userId, id, body);
  return c.json({ success: true, data: transaction });
});

/**
 * DELETE /transactions/:id — delete a transaction.
 */
transactions.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  await transactionService.remove(c.env.DB, userId, id);
  return c.json({ success: true, data: null });
});

export { transactions };
