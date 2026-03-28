/**
 * Budget service — all CRUD + spending check + threshold business logic.
 * Routes call these functions; they handle validation, RLS, and D1 queries.
 * Money = INTEGER (Rupiah). Timestamps = TEXT (ISO 8601).
 */

import type {
  Budget,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetWithSpending,
  BudgetStatus,
  CategoryHint,
} from '@duitku/shared';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import { Errors } from '../lib/errors';

// --------------- Validation helpers ---------------

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

function validateCategory(category: unknown): CategoryHint {
  if (!category || typeof category !== 'string') {
    throw Errors.VALIDATION('Category is required');
  }
  if (!VALID_CATEGORIES.includes(category)) {
    throw Errors.VALIDATION(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  return category as CategoryHint;
}

// --------------- Spending helpers ---------------

/**
 * Get the first and last day of the current month in UTC as YYYY-MM-DD strings.
 */
function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0)); // last day of month
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get spending per category for the current month.
 * Returns a map of category → total spent (integer Rupiah).
 */
async function getMonthlySpending(
  db: D1Database,
  userId: string
): Promise<Map<string, number>> {
  const { start, end } = getCurrentMonthRange();

  const result = await db
    .prepare(
      `SELECT category, COALESCE(SUM(amount), 0) as spent
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
       GROUP BY category`
    )
    .bind(userId, start, end)
    .all<{ category: string; spent: number }>();

  const spending = new Map<string, number>();
  for (const row of result.results ?? []) {
    spending.set(row.category, row.spent);
  }
  return spending;
}

/**
 * Attach spending data to a budget record.
 */
function attachSpending(budget: Budget, spending: Map<string, number>): BudgetWithSpending {
  const spent = spending.get(budget.category) ?? 0;
  const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
  return { ...budget, spent, percentage };
}

// --------------- CRUD operations ---------------

/**
 * List all budgets for a user with current month spending attached.
 * Always filtered by user_id (manual RLS).
 */
export async function list(
  db: D1Database,
  userId: string
): Promise<{ data: BudgetWithSpending[] }> {
  const [budgetsResult, spending] = await Promise.all([
    db
      .prepare('SELECT * FROM budgets WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Budget>(),
    getMonthlySpending(db, userId),
  ]);

  const budgets = (budgetsResult.results ?? []).map((b) => attachSpending(b, spending));
  return { data: budgets };
}

/**
 * Get a single budget by ID, scoped to the user.
 * Returns 404 if not found or owned by another user (no info leakage).
 */
export async function getById(
  db: D1Database,
  userId: string,
  id: string
): Promise<Budget> {
  const row = await db
    .prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<Budget>();

  if (!row) {
    throw Errors.NOT_FOUND('Budget');
  }

  return row;
}

/**
 * Create a new budget.
 * Validates amount (positive integer) and category (valid CategoryHint).
 * Catches UNIQUE constraint violation → 409 CONFLICT.
 */
export async function create(
  db: D1Database,
  userId: string,
  input: CreateBudgetInput
): Promise<Budget> {
  const category = validateCategory(input.category);
  if (input.amount === undefined || input.amount === null) {
    throw Errors.VALIDATION('Amount is required');
  }
  const amount = validateAmount(input.amount);
  const period = input.period ?? 'monthly';

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO budgets (id, user_id, category, amount, period, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, userId, category, amount, period, 1, now, now)
      .run();
  } catch (err: unknown) {
    // D1 UNIQUE constraint violation
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE') || message.includes('unique') || message.includes('constraint')) {
      throw Errors.CONFLICT(`Budget for category '${category}' already exists`);
    }
    throw err;
  }

  return {
    id,
    user_id: userId,
    category,
    amount,
    period,
    is_active: 1,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update an existing budget.
 * Only amount and is_active can be updated. Ownership checked via user_id (manual RLS).
 */
export async function update(
  db: D1Database,
  userId: string,
  id: string,
  input: UpdateBudgetInput
): Promise<Budget> {
  // Verify ownership first
  const existing = await getById(db, userId, id);

  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (input.amount !== undefined) {
    const amount = validateAmount(input.amount);
    setClauses.push('amount = ?');
    params.push(amount);
  }

  if (input.is_active !== undefined) {
    if (input.is_active !== 0 && input.is_active !== 1) {
      throw Errors.VALIDATION('is_active must be 0 or 1');
    }
    setClauses.push('is_active = ?');
    params.push(input.is_active);
  }

  // No-op update — return existing record unchanged
  if (setClauses.length === 0) {
    return existing;
  }

  const now = new Date().toISOString();
  setClauses.push('updated_at = ?');
  params.push(now);

  // Add WHERE params
  params.push(id, userId);

  await db
    .prepare(
      `UPDATE budgets SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`
    )
    .bind(...params)
    .run();

  return getById(db, userId, id);
}

/**
 * Delete a budget.
 * Ownership checked via user_id (manual RLS).
 * Returns 404 if not found or owned by another user.
 */
export async function remove(
  db: D1Database,
  userId: string,
  id: string
): Promise<void> {
  await getById(db, userId, id);

  await db
    .prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
}

/**
 * Get budget status — all active budgets with spending data and alert flags.
 * Returns warnings (>=80%) and exceeded (>=100%) arrays for notification triggers.
 */
export async function getStatus(
  db: D1Database,
  userId: string
): Promise<BudgetStatus> {
  const [budgetsResult, spending] = await Promise.all([
    db
      .prepare('SELECT * FROM budgets WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC')
      .bind(userId)
      .all<Budget>(),
    getMonthlySpending(db, userId),
  ]);

  const budgets = (budgetsResult.results ?? []).map((b) => attachSpending(b, spending));

  const warnings = budgets.filter((b) => b.percentage >= 80);
  const exceeded = budgets.filter((b) => b.percentage >= 100);

  return { budgets, warnings, exceeded };
}
