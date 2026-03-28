/**
 * useBudgets / useBudgetStatus — fetches budget data via TanStack Query.
 * Key factory follows transactionKeys pattern exactly.
 */

import { useQuery } from '@tanstack/react-query';
import { get } from '../../../lib/api-client';
import type {
  BudgetWithSpending,
  BudgetStatus,
  ApiResponse,
} from '@duitku/shared';

/** Query key factory for budget queries */
export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  list: () => [...budgetKeys.lists()] as const,
  details: () => [...budgetKeys.all, 'detail'] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
  status: () => [...budgetKeys.all, 'status'] as const,
};

/**
 * Fetch all active budgets with current month spending.
 */
export function useBudgets() {
  return useQuery({
    queryKey: budgetKeys.list(),
    queryFn: () =>
      get<ApiResponse<BudgetWithSpending[]>>('/budgets'),
  });
}

/**
 * Fetch budget status — all budgets with warning/exceeded flags.
 */
export function useBudgetStatus() {
  return useQuery({
    queryKey: budgetKeys.status(),
    queryFn: () =>
      get<ApiResponse<BudgetStatus>>('/budgets/status'),
  });
}
