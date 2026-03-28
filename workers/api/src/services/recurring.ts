/**
 * Recurring transaction service — detect, confirm, dismiss, list recurring expenses.
 * All monetary values are INTEGER (Rupiah). Every query filters by user_id (manual RLS).
 */

import type {
  RecurringCandidate,
  RecurringTransaction,
  ConfirmRecurringInput,
  CategoryHint,
} from '@duitku/shared';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import { Errors } from '../lib/errors';

// --------------- Validation ---------------

const VALID_CATEGORIES: string[] = DEFAULT_CATEGORIES.map((c) => c.id);

function validateConfirmInput(input: ConfirmRecurringInput): void {
  if (!input.description || typeof input.description !== 'string' || input.description.trim() === '') {
    throw Errors.VALIDATION('Description is required');
  }
  if (!input.category || typeof input.category !== 'string') {
    throw Errors.VALIDATION('Category is required');
  }
  if (!VALID_CATEGORIES.includes(input.category)) {
    throw Errors.VALIDATION(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (input.estimated_amount === undefined || input.estimated_amount === null) {
    throw Errors.VALIDATION('Estimated amount is required');
  }
  if (typeof input.estimated_amount !== 'number' || !Number.isFinite(input.estimated_amount)) {
    throw Errors.VALIDATION('Estimated amount must be a number');
  }
  if (input.estimated_amount <= 0) {
    throw Errors.VALIDATION('Estimated amount must be greater than 0');
  }
  if (!Number.isInteger(input.estimated_amount)) {
    throw Errors.VALIDATION('Estimated amount must be an integer (no decimals)');
  }
}

// --------------- Service functions ---------------

/**
 * Detect recurring expense patterns from transaction history.
 * Finds descriptions that appear across 2+ distinct months, excluding
 * items already confirmed or dismissed by the user.
 */
export async function detectRecurring(
  db: D1Database,
  userId: string
): Promise<{ data: RecurringCandidate[] }> {
  const result = await db
    .prepare(
      `SELECT
         t.description,
         t.category,
         COUNT(DISTINCT strftime('%Y-%m', t.date)) as months_active,
         COUNT(*) as occurrence_count,
         CAST(ROUND(AVG(t.amount)) AS INTEGER) as avg_amount,
         MAX(t.date) as last_seen
       FROM transactions t
       LEFT JOIN recurring_transactions rt
         ON rt.user_id = t.user_id
         AND rt.description = t.description
         AND rt.category = t.category
       WHERE t.user_id = ?
         AND t.type = 'expense'
         AND rt.id IS NULL
       GROUP BY t.description, t.category
       HAVING months_active >= 2
       ORDER BY months_active DESC, occurrence_count DESC`
    )
    .bind(userId)
    .all<{
      description: string;
      category: string;
      months_active: number;
      occurrence_count: number;
      avg_amount: number;
      last_seen: string;
    }>();

  const data: RecurringCandidate[] = (result.results ?? []).map((row) => ({
    description: row.description,
    category: row.category as CategoryHint,
    average_amount: row.avg_amount,
    occurrence_count: row.occurrence_count,
    last_seen: row.last_seen,
    months_active: row.months_active,
  }));

  return { data };
}

/**
 * Confirm a recurring expense — saves it to recurring_transactions.
 */
export async function confirmRecurring(
  db: D1Database,
  userId: string,
  input: ConfirmRecurringInput
): Promise<RecurringTransaction> {
  validateConfirmInput(input);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO recurring_transactions (id, user_id, description, category, estimated_amount, is_dismissed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, userId, input.description.trim(), input.category, input.estimated_amount, 0, now, now)
    .run();

  return {
    id,
    user_id: userId,
    description: input.description.trim(),
    category: input.category,
    estimated_amount: input.estimated_amount,
    is_dismissed: 0,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Dismiss a recurring transaction — sets is_dismissed = 1.
 * Throws NOT_FOUND if the record doesn't exist or belongs to another user.
 */
export async function dismissRecurring(
  db: D1Database,
  userId: string,
  id: string
): Promise<void> {
  // Verify existence and ownership
  const existing = await db
    .prepare('SELECT id FROM recurring_transactions WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<{ id: string }>();

  if (!existing) {
    throw Errors.NOT_FOUND('Recurring transaction');
  }

  const now = new Date().toISOString();

  await db
    .prepare(
      'UPDATE recurring_transactions SET is_dismissed = 1, updated_at = ? WHERE id = ? AND user_id = ?'
    )
    .bind(now, id, userId)
    .run();
}

/**
 * List active (non-dismissed) recurring transactions for the user.
 */
export async function listRecurring(
  db: D1Database,
  userId: string
): Promise<{ data: RecurringTransaction[] }> {
  const result = await db
    .prepare(
      `SELECT * FROM recurring_transactions
       WHERE user_id = ? AND is_dismissed = 0
       ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<RecurringTransaction>();

  return { data: result.results ?? [] };
}
