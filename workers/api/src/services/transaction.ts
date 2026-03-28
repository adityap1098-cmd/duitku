/**
 * Transaction service — all CRUD business logic.
 * Routes call these functions; they handle validation, RLS, and D1 queries.
 * Money = INTEGER (Rupiah). Timestamps = TEXT (ISO 8601).
 */

import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
  TransactionSummary,
  TransactionType,
  CategoryHint,
} from '@duitku/shared';
import type { PaginationMeta } from '@duitku/shared';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import { Errors } from '../lib/errors';

// --------------- Validation helpers ---------------

const VALID_TYPES: TransactionType[] = ['income', 'expense'];
const VALID_CATEGORIES: string[] = DEFAULT_CATEGORIES.map((c) => c.id);

function validateAmount(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw Errors.VALIDATION('Amount must be a number');
  }
  if (amount <= 0) {
    throw Errors.VALIDATION('Amount must be greater than 0');
  }
  if (!Number.isInteger(amount)) {
    throw Errors.VALIDATION('Amount must be an integer (no decimals)');
  }
  return amount;
}

function validateType(type: unknown): TransactionType {
  if (!VALID_TYPES.includes(type as TransactionType)) {
    throw Errors.VALIDATION(`Type must be one of: ${VALID_TYPES.join(', ')}`);
  }
  return type as TransactionType;
}

function validateCategory(category: unknown): CategoryHint {
  if (!VALID_CATEGORIES.includes(category as string)) {
    throw Errors.VALIDATION(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  return category as CategoryHint;
}

function validateDate(date: unknown): string {
  if (typeof date !== 'string') {
    throw Errors.VALIDATION('Date must be a string');
  }
  // Accept YYYY-MM-DD or full ISO 8601 datetime
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!dateRegex.test(date)) {
    throw Errors.VALIDATION('Date must be in ISO 8601 format (YYYY-MM-DD or full datetime)');
  }
  // Verify it parses to a valid date
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw Errors.VALIDATION('Date is not a valid calendar date');
  }
  return date;
}

// --------------- CRUD operations ---------------

/**
 * List transactions for a user with pagination and optional filters.
 * Always filtered by user_id (manual RLS).
 */
export async function list(
  db: D1Database,
  userId: string,
  filter: TransactionFilter = {}
): Promise<{ data: Transaction[]; pagination: PaginationMeta }> {
  const page = Math.max(1, filter.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filter.per_page ?? 20));
  const offset = (page - 1) * perPage;

  // Build dynamic WHERE clause
  const conditions: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (filter.type) {
    conditions.push('type = ?');
    params.push(filter.type);
  }

  if (filter.category) {
    conditions.push('category = ?');
    params.push(filter.category);
  }

  if (filter.date_from) {
    conditions.push('date >= ?');
    params.push(filter.date_from);
  }

  if (filter.date_to) {
    conditions.push('date <= ?');
    params.push(filter.date_to);
  }

  if (filter.search) {
    conditions.push('(description LIKE ? OR notes LIKE ?)');
    const searchPattern = `%${filter.search}%`;
    params.push(searchPattern, searchPattern);
  }

  const whereClause = conditions.join(' AND ');

  // Count total matching rows
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM transactions WHERE ${whereClause}`)
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total ?? 0;

  // Fetch paginated rows, ordered by date descending then created_at descending
  const dataResult = await db
    .prepare(
      `SELECT * FROM transactions WHERE ${whereClause} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`
    )
    .bind(...params, perPage, offset)
    .all<Transaction>();

  return {
    data: dataResult.results ?? [],
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage) || 1,
    },
  };
}

/**
 * Get a single transaction by ID, scoped to the user.
 * Returns 404 if not found or owned by another user (no info leakage).
 */
export async function getById(
  db: D1Database,
  userId: string,
  id: string
): Promise<Transaction> {
  const row = await db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<Transaction>();

  if (!row) {
    throw Errors.NOT_FOUND('Transaction');
  }

  return row;
}

/**
 * Create a new transaction.
 * Validates all inputs; amount must be a positive integer.
 */
export async function create(
  db: D1Database,
  userId: string,
  input: CreateTransactionInput
): Promise<Transaction> {
  // Validate required fields
  if (!input.type) {
    throw Errors.VALIDATION('Type is required');
  }
  if (input.amount === undefined || input.amount === null) {
    throw Errors.VALIDATION('Amount is required');
  }
  if (!input.category) {
    throw Errors.VALIDATION('Category is required');
  }

  const type = validateType(input.type);
  const amount = validateAmount(input.amount);
  const category = validateCategory(input.category);
  const date = input.date ? validateDate(input.date) : new Date().toISOString().split('T')[0];
  const description = input.description ?? '';
  const source = input.source ?? 'manual';
  const notes = input.notes ?? null;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO transactions (id, user_id, type, amount, category, description, date, source, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, userId, type, amount, category, description, date, source, notes, now, now)
    .run();

  return {
    id,
    user_id: userId,
    type,
    amount,
    category,
    description,
    date,
    source,
    notes,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update an existing transaction.
 * Only provided fields are updated. Ownership is checked via user_id (manual RLS).
 */
export async function update(
  db: D1Database,
  userId: string,
  id: string,
  input: UpdateTransactionInput
): Promise<Transaction> {
  // Verify ownership first
  const existing = await getById(db, userId, id);

  // Build SET clause from provided fields
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (input.type !== undefined) {
    const type = validateType(input.type);
    setClauses.push('type = ?');
    params.push(type);
  }

  if (input.amount !== undefined) {
    const amount = validateAmount(input.amount);
    setClauses.push('amount = ?');
    params.push(amount);
  }

  if (input.category !== undefined) {
    const category = validateCategory(input.category);
    setClauses.push('category = ?');
    params.push(category);
  }

  if (input.description !== undefined) {
    setClauses.push('description = ?');
    params.push(input.description);
  }

  if (input.date !== undefined) {
    const date = validateDate(input.date);
    setClauses.push('date = ?');
    params.push(date);
  }

  if (input.notes !== undefined) {
    setClauses.push('notes = ?');
    params.push(input.notes);
  }

  // No-op update — return existing record unchanged
  if (setClauses.length === 0) {
    return existing;
  }

  // Always update the updated_at timestamp
  const now = new Date().toISOString();
  setClauses.push('updated_at = ?');
  params.push(now);

  // Add WHERE params
  params.push(id, userId);

  await db
    .prepare(
      `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`
    )
    .bind(...params)
    .run();

  // Return the updated transaction
  return getById(db, userId, id);
}

/**
 * Delete a transaction.
 * Ownership is checked via user_id (manual RLS).
 * Returns 404 if not found or owned by another user.
 */
export async function remove(
  db: D1Database,
  userId: string,
  id: string
): Promise<void> {
  // Verify ownership first
  await getById(db, userId, id);

  await db
    .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
}

/**
 * Get income/expense summary for a user with optional filters.
 * Returns totals as integers (Rupiah).
 */
export async function getSummary(
  db: D1Database,
  userId: string,
  filter: TransactionFilter = {}
): Promise<TransactionSummary> {
  const conditions: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (filter.type) {
    conditions.push('type = ?');
    params.push(filter.type);
  }

  if (filter.category) {
    conditions.push('category = ?');
    params.push(filter.category);
  }

  if (filter.date_from) {
    conditions.push('date >= ?');
    params.push(filter.date_from);
  }

  if (filter.date_to) {
    conditions.push('date <= ?');
    params.push(filter.date_to);
  }

  if (filter.search) {
    conditions.push('(description LIKE ? OR notes LIKE ?)');
    const searchPattern = `%${filter.search}%`;
    params.push(searchPattern, searchPattern);
  }

  const whereClause = conditions.join(' AND ');

  const result = await db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COUNT(*) as count
       FROM transactions WHERE ${whereClause}`
    )
    .bind(...params)
    .first<{ total_income: number; total_expense: number; count: number }>();

  const totalIncome = result?.total_income ?? 0;
  const totalExpense = result?.total_expense ?? 0;

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net: totalIncome - totalExpense,
    count: result?.count ?? 0,
  };
}
