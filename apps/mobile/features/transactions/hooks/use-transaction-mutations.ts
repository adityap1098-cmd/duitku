/**
 * Transaction mutation hooks — create, update, delete with cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, del } from '../../../lib/api-client';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  ApiResponse,
} from '@duitku/shared';
import { transactionKeys } from './use-transactions';

/**
 * Create a new transaction.
 * Invalidates the transactions list cache on success.
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      post<ApiResponse<Transaction>>('/transactions', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

/**
 * Update an existing transaction.
 * Invalidates both the list and the specific detail cache on success.
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateTransactionInput;
    }) => put<ApiResponse<Transaction>>(`/transactions/${id}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Delete a transaction.
 * Invalidates the transactions list cache on success.
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}
