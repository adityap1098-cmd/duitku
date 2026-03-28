/**
 * Transaction types — single source of truth.
 * DB conventions: money = INTEGER (Rupiah), boolean = 0/1, timestamps = TEXT (ISO 8601).
 */

import type { CategoryHint } from '../constants/categories';

/** Income vs Expense */
export type TransactionType = 'income' | 'expense';

/** Data source for the transaction */
export type TransactionSource = 'manual' | 'gmail_sync';

/** Transaction record as stored in D1 */
export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  /** Amount in Rupiah as integer — never float */
  amount: number;
  category: CategoryHint;
  description: string;
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string;
  source: TransactionSource;
  notes: string | null;
  /** ISO 8601 */
  created_at: string;
  /** ISO 8601 */
  updated_at: string;
}

/** Input for creating a new transaction */
export interface CreateTransactionInput {
  type: TransactionType;
  /** Amount in Rupiah — must be positive integer */
  amount: number;
  category: CategoryHint;
  description?: string;
  /** ISO 8601 date string (YYYY-MM-DD). Defaults to today if omitted. */
  date?: string;
  source?: TransactionSource;
  notes?: string;
}

/** Input for updating an existing transaction — all fields optional */
export interface UpdateTransactionInput {
  type?: TransactionType;
  /** Amount in Rupiah — must be positive integer if provided */
  amount?: number;
  category?: CategoryHint;
  description?: string;
  /** ISO 8601 date string (YYYY-MM-DD) */
  date?: string;
  notes?: string;
}

/** Filters for listing/querying transactions */
export interface TransactionFilter {
  page?: number;
  per_page?: number;
  /** Filter by transaction type */
  type?: TransactionType;
  /** Filter by category */
  category?: CategoryHint;
  /** Start of date range (inclusive, ISO 8601) */
  date_from?: string;
  /** End of date range (inclusive, ISO 8601) */
  date_to?: string;
  /** Search in description and notes */
  search?: string;
}

/** Summary aggregation — total income and expense for a filter */
export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  net: number;
  count: number;
}
