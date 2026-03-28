/**
 * useRecurring — TanStack Query hooks for recurring expense endpoints.
 * Follows the established mutation + invalidation pattern from use-sync.ts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '../../../lib/api-client';
import type {
  RecurringTransaction,
  RecurringCandidate,
  ConfirmRecurringInput,
  ApiResponse,
} from '@duitku/shared';

/** Query key factory for recurring queries */
export const recurringKeys = {
  all: ['recurring'] as const,
  list: () => [...recurringKeys.all, 'list'] as const,
};

/** Shape returned by GET /recurring */
interface RecurringListResponse {
  data: {
    confirmed: RecurringTransaction[];
    candidates: RecurringCandidate[];
  };
}

/**
 * Fetch confirmed recurring transactions and detected candidates.
 * GET /recurring → { confirmed: [...], candidates: [...] }
 */
export function useRecurringList() {
  return useQuery({
    queryKey: recurringKeys.list(),
    queryFn: () => get<RecurringListResponse>('/recurring'),
  });
}

/**
 * Confirm a detected recurring expense.
 * POST /recurring/confirm — invalidates the recurring list on success.
 */
export function useConfirmRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfirmRecurringInput) =>
      post<ApiResponse<RecurringTransaction>>('/recurring/confirm', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

/**
 * Dismiss a detected recurring expense candidate.
 * PUT /recurring/:id/dismiss — invalidates the recurring list on success.
 */
export function useDismissRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      put<ApiResponse<RecurringTransaction>>(`/recurring/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}
