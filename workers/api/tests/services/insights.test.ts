/**
 * Insights service tests — covers category breakdown, spending trend, and month comparison.
 * Uses a lightweight D1 mock backed by in-memory arrays (same pattern as budget.test.ts).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as insightsService from '../../src/services/insights';

// --------------- D1 Mock ---------------

interface MockRow {
  [key: string]: unknown;
}

/**
 * Minimal D1Database mock for transactions table.
 * Supports the SQL patterns used by the insights service:
 *   - SELECT category, SUM(amount) ... GROUP BY category
 *   - SELECT strftime('%Y-%m', date) as month, SUM(amount) ... GROUP BY month
 *   - SELECT COALESCE(SUM(amount), 0) as total ...
 */
function createMockDB() {
  let transactionRows: MockRow[] = [];

  const mockDB = {
    _getTransactions: () => transactionRows,
    _addTransaction: (row: MockRow) => { transactionRows.push(row); },
    _clear: () => { transactionRows = []; },

    prepare: (sql: string) => {
      let bindings: unknown[] = [];

      const stmt = {
        bind: (...args: unknown[]) => {
          bindings = args;
          return stmt;
        },

        first: async <T = MockRow>(): Promise<T | null> => {
          const sqlLower = sql.toLowerCase();

          // COALESCE(SUM(amount), 0) as total — aggregate total for a date range
          if (sqlLower.includes('coalesce') && sqlLower.includes('sum(amount)')) {
            const userId = bindings[0] as string;
            const dateStart = bindings[1] as string;
            const dateEnd = bindings[2] as string;

            const filtered = transactionRows.filter(
              (r) =>
                r.user_id === userId &&
                r.type === 'expense' &&
                (r.date as string) >= dateStart &&
                (r.date as string) <= dateEnd
            );

            const total = filtered.reduce((sum, r) => sum + (r.amount as number), 0);
            return { total } as unknown as T;
          }

          return null;
        },

        all: async <T = MockRow>(): Promise<{ results: T[] }> => {
          const sqlLower = sql.toLowerCase();
          const userId = bindings[0] as string;

          // Category breakdown: GROUP BY category
          if (sqlLower.includes('group by category') && !sqlLower.includes('strftime')) {
            let filtered = transactionRows.filter(
              (r) => r.user_id === userId && r.type === 'expense'
            );

            // Apply optional date filters
            let bindIdx = 1;
            if (sqlLower.includes('date >= ?')) {
              const dateFrom = bindings[bindIdx++] as string;
              filtered = filtered.filter((r) => (r.date as string) >= dateFrom);
            }
            if (sqlLower.includes('date <= ?')) {
              const dateTo = bindings[bindIdx++] as string;
              filtered = filtered.filter((r) => (r.date as string) <= dateTo);
            }

            // Group by category
            const grouped = new Map<string, number>();
            for (const r of filtered) {
              const cat = r.category as string;
              grouped.set(cat, (grouped.get(cat) ?? 0) + (r.amount as number));
            }

            const results = Array.from(grouped.entries())
              .map(([category, total]) => ({ category, total }))
              .sort((a, b) => b.total - a.total);

            return { results: results as T[] };
          }

          // Spending trend: GROUP BY month (strftime)
          if (sqlLower.includes("strftime('%y-%m'") || sqlLower.includes("strftime('%Y-%m'")) {
            // For trend: bindings = [userId, startDate]
            // For month comparison category breakdown: bindings = [userId, startDate, endDate]
            const startDate = bindings[1] as string;
            let filtered = transactionRows.filter(
              (r) =>
                r.user_id === userId &&
                r.type === 'expense' &&
                (r.date as string) >= startDate
            );

            // Check if there's also an end date (month comparison category query)
            if (sqlLower.includes('date <= ?')) {
              const endDate = bindings[2] as string;
              filtered = filtered.filter((r) => (r.date as string) <= endDate);
            }

            // If this is a GROUP BY category query (month comparison per-category)
            if (sqlLower.includes('group by category')) {
              const grouped = new Map<string, number>();
              for (const r of filtered) {
                const cat = r.category as string;
                grouped.set(cat, (grouped.get(cat) ?? 0) + (r.amount as number));
              }
              const results = Array.from(grouped.entries())
                .map(([category, total]) => ({ category, total }));
              return { results: results as T[] };
            }

            // Group by YYYY-MM (month)
            const grouped = new Map<string, number>();
            for (const r of filtered) {
              const date = r.date as string;
              const month = date.substring(0, 7); // YYYY-MM
              grouped.set(month, (grouped.get(month) ?? 0) + (r.amount as number));
            }

            const results = Array.from(grouped.entries())
              .map(([month, amount]) => ({ month, amount }))
              .sort((a, b) => a.month.localeCompare(b.month));

            return { results: results as T[] };
          }

          // Month comparison — category-level: GROUP BY category with date range
          if (sqlLower.includes('group by category') && sqlLower.includes('date >= ?') && sqlLower.includes('date <= ?')) {
            const dateStart = bindings[1] as string;
            const dateEnd = bindings[2] as string;

            const filtered = transactionRows.filter(
              (r) =>
                r.user_id === userId &&
                r.type === 'expense' &&
                (r.date as string) >= dateStart &&
                (r.date as string) <= dateEnd
            );

            const grouped = new Map<string, number>();
            for (const r of filtered) {
              const cat = r.category as string;
              grouped.set(cat, (grouped.get(cat) ?? 0) + (r.amount as number));
            }

            const results = Array.from(grouped.entries())
              .map(([category, total]) => ({ category, total }));

            return { results: results as T[] };
          }

          return { results: [] };
        },

        run: async () => ({ success: true }),
      };

      return stmt;
    },
  };

  return mockDB;
}

// --------------- Helpers ---------------

const USER_ID = 'user-123';
const OTHER_USER_ID = 'user-456';

/** Helper to get current month date string */
function currentMonthDate(day: number): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Helper to get previous month date string */
function previousMonthDate(day: number): string {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day));
  const y = prev.getUTCFullYear();
  const m = String(prev.getUTCMonth() + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addExpense(db: ReturnType<typeof createMockDB>, userId: string, amount: number, category: string, date: string) {
  db._addTransaction({
    id: `txn-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    type: 'expense',
    amount,
    category,
    date,
    description: `${category} expense`,
  });
}

// --------------- Tests ---------------

describe('insightsService.getCategoryBreakdown', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('returns category breakdown with labels and percentages', async () => {
    addExpense(db, USER_ID, 100000, 'food', '2025-01-15');
    addExpense(db, USER_ID, 50000, 'food', '2025-01-16');
    addExpense(db, USER_ID, 50000, 'transport', '2025-01-15');

    const result = await insightsService.getCategoryBreakdown(db as any, USER_ID);

    expect(result.data.length).toBe(2);
    // Sorted by total DESC
    expect(result.data[0].category).toBe('food');
    expect(result.data[0].amount).toBe(150000);
    expect(result.data[0].percentage).toBe(75);
    expect(result.data[0].label).toBe('Makanan & Minuman');
    expect(result.data[0].icon).toBe('🍔');

    expect(result.data[1].category).toBe('transport');
    expect(result.data[1].amount).toBe(50000);
    expect(result.data[1].percentage).toBe(25);
  });

  it('returns empty array when no expenses', async () => {
    const result = await insightsService.getCategoryBreakdown(db as any, USER_ID);
    expect(result.data).toEqual([]);
  });

  it('filters by date range', async () => {
    addExpense(db, USER_ID, 100000, 'food', '2025-01-15');
    addExpense(db, USER_ID, 50000, 'food', '2025-02-15');

    const result = await insightsService.getCategoryBreakdown(
      db as any,
      USER_ID,
      '2025-01-01',
      '2025-01-31'
    );

    expect(result.data.length).toBe(1);
    expect(result.data[0].amount).toBe(100000);
    expect(result.data[0].percentage).toBe(100);
  });

  it('does not include other user data (RLS)', async () => {
    addExpense(db, USER_ID, 100000, 'food', '2025-01-15');
    addExpense(db, OTHER_USER_ID, 999999, 'food', '2025-01-15');

    const result = await insightsService.getCategoryBreakdown(db as any, USER_ID);

    expect(result.data.length).toBe(1);
    expect(result.data[0].amount).toBe(100000);
  });

  it('does not include income transactions', async () => {
    addExpense(db, USER_ID, 100000, 'food', '2025-01-15');
    // Add an income transaction directly
    db._addTransaction({
      id: 'txn-income',
      user_id: USER_ID,
      type: 'income',
      amount: 5000000,
      category: 'other',
      date: '2025-01-01',
      description: 'Salary',
    });

    const result = await insightsService.getCategoryBreakdown(db as any, USER_ID);

    expect(result.data.length).toBe(1);
    expect(result.data[0].category).toBe('food');
  });
});

describe('insightsService.getSpendingTrend', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('returns monthly totals sorted by month ASC', async () => {
    addExpense(db, USER_ID, 100000, 'food', currentMonthDate(5));
    addExpense(db, USER_ID, 50000, 'transport', currentMonthDate(10));
    addExpense(db, USER_ID, 200000, 'food', previousMonthDate(5));

    const result = await insightsService.getSpendingTrend(db as any, USER_ID, 6);

    expect(result.data.length).toBeGreaterThanOrEqual(2);
    // Should be sorted by month ASC
    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i].month >= result.data[i - 1].month).toBe(true);
    }
  });

  it('returns empty array when no expenses', async () => {
    const result = await insightsService.getSpendingTrend(db as any, USER_ID, 6);
    expect(result.data).toEqual([]);
  });

  it('respects custom months parameter', async () => {
    // Add expenses in current month — should always be included regardless of months param
    addExpense(db, USER_ID, 100000, 'food', currentMonthDate(1));

    const result = await insightsService.getSpendingTrend(db as any, USER_ID, 3);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  it('aggregates multiple transactions in same month', async () => {
    addExpense(db, USER_ID, 100000, 'food', currentMonthDate(1));
    addExpense(db, USER_ID, 50000, 'transport', currentMonthDate(15));

    const result = await insightsService.getSpendingTrend(db as any, USER_ID, 6);

    // Current month should have 150000 total
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const currentEntry = result.data.find((d) => d.month === currentMonth);
    expect(currentEntry).toBeDefined();
    expect(currentEntry!.amount).toBe(150000);
  });
});

describe('insightsService.getMonthComparison', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('compares current and previous month spending', async () => {
    addExpense(db, USER_ID, 100000, 'food', currentMonthDate(5));
    addExpense(db, USER_ID, 50000, 'transport', currentMonthDate(10));
    addExpense(db, USER_ID, 200000, 'food', previousMonthDate(5));

    const result = await insightsService.getMonthComparison(db as any, USER_ID);

    expect(result.current_total).toBe(150000);
    expect(result.previous_total).toBe(200000);
    expect(result.change_amount).toBe(-50000);
    expect(result.change_percentage).toBe(-25); // -50000/200000 * 100
    expect(result.current_month).toBeTruthy();
    expect(result.previous_month).toBeTruthy();
  });

  it('returns zeros when no spending in either month', async () => {
    const result = await insightsService.getMonthComparison(db as any, USER_ID);

    expect(result.current_total).toBe(0);
    expect(result.previous_total).toBe(0);
    expect(result.change_amount).toBe(0);
    expect(result.change_percentage).toBe(0);
    expect(result.category_changes).toEqual([]);
  });

  it('handles no previous month spending (change_percentage = 0)', async () => {
    addExpense(db, USER_ID, 100000, 'food', currentMonthDate(5));

    const result = await insightsService.getMonthComparison(db as any, USER_ID);

    expect(result.current_total).toBe(100000);
    expect(result.previous_total).toBe(0);
    expect(result.change_amount).toBe(100000);
    expect(result.change_percentage).toBe(0); // no previous → 0%
  });

  it('includes category-level changes', async () => {
    addExpense(db, USER_ID, 100000, 'food', currentMonthDate(5));
    addExpense(db, USER_ID, 200000, 'food', previousMonthDate(5));
    addExpense(db, USER_ID, 50000, 'transport', previousMonthDate(10));

    const result = await insightsService.getMonthComparison(db as any, USER_ID);

    expect(result.category_changes.length).toBeGreaterThanOrEqual(1);

    const foodChange = result.category_changes.find((c) => c.category === 'food');
    expect(foodChange).toBeDefined();
    expect(foodChange!.current).toBe(100000);
    expect(foodChange!.previous).toBe(200000);
    expect(foodChange!.change).toBe(-100000);

    const transportChange = result.category_changes.find((c) => c.category === 'transport');
    expect(transportChange).toBeDefined();
    expect(transportChange!.current).toBe(0);
    expect(transportChange!.previous).toBe(50000);
    expect(transportChange!.change).toBe(-50000);
  });

  it('does not include other user data (RLS)', async () => {
    addExpense(db, USER_ID, 100000, 'food', currentMonthDate(5));
    addExpense(db, OTHER_USER_ID, 999999, 'food', currentMonthDate(5));

    const result = await insightsService.getMonthComparison(db as any, USER_ID);

    expect(result.current_total).toBe(100000);
  });
});
