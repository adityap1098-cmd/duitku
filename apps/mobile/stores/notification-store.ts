/**
 * Notification dedup store — tracks which budget threshold alerts have
 * already been sent this month to prevent duplicate notifications on
 * repeated app opens or screen refreshes.
 *
 * Persisted with AsyncStorage so dedup survives app restarts.
 * Key format: `YYYY-MM` → array of `{budgetId}-{threshold}` strings.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------- Types ---------------

interface NotificationState {
  /**
   * Record of already-notified thresholds per month.
   * Key: 'YYYY-MM', Value: array of '{budgetId}-{threshold}' strings.
   */
  notifiedThresholds: Record<string, string[]>;
}

interface NotificationActions {
  /** Check if a specific budget+threshold combo has been notified this month */
  hasNotified: (budgetId: string, threshold: number, month: string) => boolean;
  /** Mark a budget+threshold combo as notified for this month */
  markNotified: (budgetId: string, threshold: number, month: string) => void;
  /** Clean up old months — keeps only the current month */
  cleanOldMonths: (currentMonth: string) => void;
}

type NotificationStore = NotificationState & NotificationActions;

// --------------- Helpers ---------------

/** Build a dedup key from budgetId and threshold */
function buildKey(budgetId: string, threshold: number): string {
  return `${budgetId}-${threshold}`;
}

/** Get current month as YYYY-MM */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// --------------- Store ---------------

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // State
      notifiedThresholds: {},

      // Actions
      hasNotified: (
        budgetId: string,
        threshold: number,
        month: string
      ): boolean => {
        const entries = get().notifiedThresholds[month] ?? [];
        return entries.includes(buildKey(budgetId, threshold));
      },

      markNotified: (
        budgetId: string,
        threshold: number,
        month: string
      ): void => {
        const key = buildKey(budgetId, threshold);
        set((state) => {
          const existing = state.notifiedThresholds[month] ?? [];
          if (existing.includes(key)) return state; // already tracked
          return {
            notifiedThresholds: {
              ...state.notifiedThresholds,
              [month]: [...existing, key],
            },
          };
        });
      },

      cleanOldMonths: (currentMonth: string): void => {
        set((state) => {
          const cleaned: Record<string, string[]> = {};
          // Keep only the current month
          if (state.notifiedThresholds[currentMonth]) {
            cleaned[currentMonth] = state.notifiedThresholds[currentMonth];
          }
          return { notifiedThresholds: cleaned };
        });
      },
    }),
    {
      name: 'duitku-notification-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
