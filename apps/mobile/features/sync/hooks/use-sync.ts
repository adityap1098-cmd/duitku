/**
 * Sync hooks — TanStack Query hooks for Gmail sync status and trigger.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../../lib/api-client';
import { transactionKeys } from '../../transactions/hooks/use-transactions';
import { syncLog as logSync, errLog } from '../../../lib/logger';
import type { SyncLog, SyncTriggerResponse } from '@duitku/shared';

/** Query key factory for sync queries */
export const syncKeys = {
  all: ['sync'] as const,
  status: () => [...syncKeys.all, 'status'] as const,
};

/**
 * Fetch the latest sync status (most recent SyncLog).
 * Auto-refetches every 30 seconds.
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: syncKeys.status(),
    queryFn: () => get<{ data: SyncLog | null }>('/sync/status'),
    refetchInterval: 30_000,
  });
}

/**
 * Trigger a manual sync via POST /sync/trigger.
 * On success, invalidates sync status and transaction list caches
 * so the UI picks up newly imported transactions.
 */
export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params?: { after?: string; before?: string }) => {
      logSync('Triggering sync...', params ?? {});
      return post<SyncTriggerResponse>('/sync/trigger', params);
    },
    onSuccess: (data) => {
      logSync('Sync complete', { status: data?.data?.status, created: data?.data?.transactions_created });
      queryClient.invalidateQueries({ queryKey: syncKeys.status() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
    onError: (err) => {
      errLog('Sync failed', { message: err instanceof Error ? err.message : String(err) });
    },
  });
}
