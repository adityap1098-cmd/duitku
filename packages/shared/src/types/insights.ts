/**
 * Insights & Recurring types — single source of truth.
 * Used by the insights and recurring services on the worker,
 * and by the Insights tab on mobile.
 */

import type { CategoryHint } from '../constants/categories';

/** Spending breakdown for a single category */
export interface CategoryBreakdown {
  category: CategoryHint;
  label: string;
  icon: string;
  /** Total spent in Rupiah (integer) */
  amount: number;
  /** Percentage of total spending (0-100) */
  percentage: number;
}

/** Monthly spending data point for trend charts */
export interface SpendingTrend {
  /** Month in YYYY-MM format */
  month: string;
  /** Total spent in Rupiah (integer) */
  amount: number;
}

/** Change in spending for a single category between two months */
export interface CategoryChange {
  category: CategoryHint;
  label: string;
  /** Current month spending (integer Rupiah) */
  current: number;
  /** Previous month spending (integer Rupiah) */
  previous: number;
  /** Difference: current - previous (can be negative) */
  change: number;
}

/** Month-over-month comparison data */
export interface MonthComparison {
  /** Current month in YYYY-MM format */
  current_month: string;
  /** Previous month in YYYY-MM format */
  previous_month: string;
  /** Current month total spending (integer Rupiah) */
  current_total: number;
  /** Previous month total spending (integer Rupiah) */
  previous_total: number;
  /** Difference: current - previous */
  change_amount: number;
  /** Percentage change ((current - previous) / previous * 100), 0 if no previous */
  change_percentage: number;
  /** Per-category breakdown of changes */
  category_changes: CategoryChange[];
}

/** A detected recurring expense candidate (not yet confirmed by user) */
export interface RecurringCandidate {
  description: string;
  category: CategoryHint;
  /** Rounded average amount in Rupiah (integer) */
  average_amount: number;
  /** Number of transactions matched */
  occurrence_count: number;
  /** ISO 8601 date string of last occurrence */
  last_seen: string;
  /** Number of distinct months the expense appeared */
  months_active: number;
}

/** Confirmed recurring transaction record as stored in D1 */
export interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  category: CategoryHint;
  /** Estimated monthly amount in Rupiah (integer) */
  estimated_amount: number;
  /** 0 = active, 1 = dismissed */
  is_dismissed: number;
  /** ISO 8601 */
  created_at: string;
  /** ISO 8601 */
  updated_at: string;
}

/** Input for confirming a recurring expense */
export interface ConfirmRecurringInput {
  description: string;
  category: CategoryHint;
  /** Estimated monthly amount in Rupiah (integer) */
  estimated_amount: number;
}
