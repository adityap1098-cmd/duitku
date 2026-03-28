/**
 * useInsights — TanStack Query hooks for spending insights endpoints.
 * Follows the established query key factory pattern from transactionKeys.
 */

import { useQuery } from '@tanstack/react-query';
import { get } from '../../../lib/api-client';
import type {
  CategoryBreakdown,
  SpendingTrend,
  MonthComparison,
} from '@duitku/shared';

/** Query key factory for insight queries */
export const insightKeys = {
  all: ['insights'] as const,
  categories: (dateFrom?: string, dateTo?: string) =>
    [...insightKeys.all, 'categories', { dateFrom, dateTo }] as const,
  trend: (months?: number) =>
    [...insightKeys.all, 'trend', { months }] as const,
  comparison: () => [...insightKeys.all, 'comparison'] as const,
};

/**
 * Fetch category spending breakdown with optional date range.
 * GET /insights?date_from=...&date_to=...
 */
export function useCategoryBreakdown(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: insightKeys.categories(dateFrom, dateTo),
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const qs = params.toString();
      return get<{ data: CategoryBreakdown[] }>(
        `/insights${qs ? `?${qs}` : ''}`
      );
    },
  });
}

/**
 * Fetch spending trend over N months.
 * GET /insights/trend?months=...
 */
export function useSpendingTrend(months?: number) {
  return useQuery({
    queryKey: insightKeys.trend(months),
    queryFn: () => {
      const params = new URLSearchParams();
      if (months != null) params.set('months', String(months));
      const qs = params.toString();
      return get<{ data: SpendingTrend[] }>(
        `/insights/trend${qs ? `?${qs}` : ''}`
      );
    },
  });
}

/**
 * Fetch month-over-month spending comparison.
 * GET /insights/comparison
 */
export function useMonthComparison() {
  return useQuery({
    queryKey: insightKeys.comparison(),
    queryFn: () =>
      get<{ data: MonthComparison }>('/insights/comparison'),
  });
}
