/**
 * Budget types — single source of truth.
 * DB conventions: money = INTEGER (Rupiah), boolean = 0/1, timestamps = TEXT (ISO 8601).
 */

import type { CategoryHint } from '../constants/categories';

/** Budget period — currently only monthly */
export type BudgetPeriod = 'monthly';

/** Budget record as stored in D1 */
export interface Budget {
  id: string;
  user_id: string;
  category: CategoryHint;
  /** Budget limit in Rupiah as integer — never float */
  amount: number;
  period: BudgetPeriod;
  /** 0 = inactive, 1 = active */
  is_active: 0 | 1;
  /** ISO 8601 */
  created_at: string;
  /** ISO 8601 */
  updated_at: string;
}

/** Input for creating a new budget */
export interface CreateBudgetInput {
  category: CategoryHint;
  /** Budget limit in Rupiah — must be positive integer */
  amount: number;
  period?: BudgetPeriod;
}

/** Input for updating an existing budget — all fields optional */
export interface UpdateBudgetInput {
  /** Budget limit in Rupiah — must be positive integer if provided */
  amount?: number;
  /** 0 = inactive, 1 = active */
  is_active?: 0 | 1;
}

/** Budget with current month spending data */
export interface BudgetWithSpending extends Budget {
  /** Amount spent in current month for this category (integer, Rupiah) */
  spent: number;
  /** Percentage of budget used (0-100+), calculated as (spent / amount) * 100 */
  percentage: number;
}

/** Budget status response — all active budgets with alert flags */
export interface BudgetStatus {
  budgets: BudgetWithSpending[];
  /** Budgets where spending >= 80% of limit */
  warnings: BudgetWithSpending[];
  /** Budgets where spending >= 100% of limit */
  exceeded: BudgetWithSpending[];
}
