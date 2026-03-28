/**
 * useBudgetAlerts — checks budget spending against thresholds and triggers
 * local push notifications for new threshold crossings.
 *
 * Call this hook at the top level of the budget list screen so alerts
 * fire on mount and when budget data refreshes.
 *
 * Dedup logic: uses notification store to ensure each budget+threshold
 * combo only triggers once per month.
 */

import { useEffect, useRef } from 'react';
import { useBudgetStatus } from './use-budgets';
import {
  useNotificationStore,
  getCurrentMonth,
} from '../../../stores/notification-store';
import { scheduleBudgetAlert } from '../../../lib/notifications';
import type { BudgetWithSpending } from '@duitku/shared';

/** Thresholds that trigger notifications (order matters — check highest first) */
const ALERT_THRESHOLDS = [100, 80] as const;

/**
 * Check a single budget against all thresholds and send notifications
 * for any new crossings.
 */
async function checkBudgetThresholds(
  budget: BudgetWithSpending,
  month: string,
  hasNotified: (id: string, threshold: number, month: string) => boolean,
  markNotified: (id: string, threshold: number, month: string) => void
): Promise<void> {
  for (const threshold of ALERT_THRESHOLDS) {
    if (budget.percentage >= threshold) {
      if (!hasNotified(budget.id, threshold, month)) {
        await scheduleBudgetAlert(
          budget.category,
          budget.percentage,
          budget.spent,
          budget.amount
        );
        markNotified(budget.id, threshold, month);
      }
    }
  }
}

/**
 * Hook that monitors budget spending and fires local notifications
 * when thresholds are crossed for the first time this month.
 *
 * Safe to call repeatedly — dedup prevents duplicate notifications.
 */
export function useBudgetAlerts(): void {
  const { data } = useBudgetStatus();
  const hasNotified = useNotificationStore((s) => s.hasNotified);
  const markNotified = useNotificationStore((s) => s.markNotified);
  const cleanOldMonths = useNotificationStore((s) => s.cleanOldMonths);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const budgets = data?.data?.budgets;
    if (!budgets || budgets.length === 0) return;

    // Prevent running twice for the same data render
    if (hasCheckedRef.current) return;

    const month = getCurrentMonth();

    // Clean up stale month entries
    cleanOldMonths(month);

    // Check all budgets for threshold crossings
    const checkAll = async () => {
      for (const budget of budgets) {
        await checkBudgetThresholds(
          budget,
          month,
          hasNotified,
          markNotified
        );
      }
    };

    hasCheckedRef.current = true;
    checkAll().catch((err) => {
      console.error('[budget-alerts] Failed to check thresholds:', err);
    });

    // Reset on data change so next fetch triggers a re-check
    return () => {
      hasCheckedRef.current = false;
    };
  }, [data, hasNotified, markNotified, cleanOldMonths]);
}
