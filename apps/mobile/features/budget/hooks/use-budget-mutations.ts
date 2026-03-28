/**
 * Budget mutation hooks — create, update, delete with cache invalidation.
 * Follows use-transaction-mutations.ts pattern exactly.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, del } from '../../../lib/api-client';
import type {
  Budget,
  CreateBudgetInput,
  UpdateBudgetInput,
  ApiResponse,
} from '@duitku/shared';
import { budgetKeys } from './use-budgets';

/**
 * Create a new budget.
 * Invalidates the budget list and status caches on success.
 */
export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBudgetInput) =>
      post<ApiResponse<Budget>>('/budgets', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.status() });
    },
  });
}

/**
 * Update an existing budget.
 * Invalidates list, status, and specific detail caches on success.
 */
export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateBudgetInput;
    }) => put<ApiResponse<Budget>>(`/budgets/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.status() });
      queryClient.invalidateQueries({
        queryKey: budgetKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Delete a budget.
 * Invalidates the budget list and status caches on success.
 */
export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del(`/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.status() });
    },
  });
}
