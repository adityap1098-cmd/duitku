/**
 * useTransactions — fetches paginated, filterable transaction list via TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import { get } from '../../../lib/api-client';
import type {
  Transaction,
  TransactionFilter,
  TransactionSummary,
  PaginatedResponse,
} from '@duitku/shared';

/** Query key factory for transaction queries */
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filter: TransactionFilter) =>
    [...transactionKeys.lists(), filter] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

/**
 * Build query string from TransactionFilter.
 * Only includes defined values.
 */
function buildQueryString(filter: TransactionFilter): string {
  const params = new URLSearchParams();

  if (filter.page != null) params.set('page', String(filter.page));
  if (filter.per_page != null) params.set('per_page', String(filter.per_page));
  if (filter.type) params.set('type', filter.type);
  if (filter.category) params.set('category', filter.category);
  if (filter.date_from) params.set('date_from', filter.date_from);
  if (filter.date_to) params.set('date_to', filter.date_to);
  if (filter.search) params.set('search', filter.search);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch paginated transactions with optional filters.
 *
 * @param filter - TransactionFilter with page, per_page, type, category, date range, search
 * @returns TanStack Query result with paginated transaction data
 */
export function useTransactions(filter: TransactionFilter = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filter),
    queryFn: () =>
      get<PaginatedResponse<Transaction>>(
        `/transactions${buildQueryString(filter)}`
      ),
  });
}

/**
 * Fetch transaction summary (income/expense totals).
 * Optionally filtered by date range or category.
 */
export function useTransactionSummary(filter: TransactionFilter = {}) {
  return useQuery({
    queryKey: [...transactionKeys.all, 'summary', filter] as const,
    queryFn: () =>
      get<{ success: boolean; data: TransactionSummary }>(
        `/transactions/summary${buildQueryString(filter)}`
      ),
  });
}
