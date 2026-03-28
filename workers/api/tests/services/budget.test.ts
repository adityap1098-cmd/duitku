/**
 * Budget service tests — covers CRUD, RLS, validation, spending calc, and threshold detection.
 * Uses a lightweight D1 mock backed by in-memory arrays (same pattern as transaction.test.ts).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as budgetService from '../../src/services/budget';
import { AppError } from '../../src/lib/errors';

// --------------- D1 Mock ---------------

interface MockRow {
  [key: string]: unknown;
}

/**
 * Minimal D1Database mock for budget + transaction tables.
 * Stores rows in separate arrays; matches SQL patterns used by the budget service.
 */
function createMockDB() {
  let budgetRows: MockRow[] = [];
  let transactionRows: MockRow[] = [];

  const mockDB = {
    _getBudgets: () => budgetRows,
    _getTransactions: () => transactionRows,
    _addTransaction: (row: MockRow) => { transactionRows.push(row); },

    prepare: (sql: string) => {
      let bindings: unknown[] = [];

      const stmt = {
        bind: (...args: unknown[]) => {
          bindings = args;
          return stmt;
        },

        first: async <T = MockRow>(): Promise<T | null> => {
          const sqlLower = sql.toLowerCase();

          // SELECT * FROM budgets WHERE id = ? AND user_id = ?
          if (sqlLower.includes('select') && sqlLower.includes('budgets') && sqlLower.includes('where')) {
            const id = bindings[0];
            const userId = bindings[1];
            const row = budgetRows.find((r) => r.id === id && r.user_id === userId);
            return (row as T) ?? null;
          }

          return null;
        },

        all: async <T = MockRow>(): Promise<{ results: T[] }> => {
          const sqlLower = sql.toLowerCase();

          // Spending query: SELECT category, COALESCE(SUM(amount), 0) as spent FROM transactions ...
          if (sqlLower.includes('transactions') && sqlLower.includes('coalesce') && sqlLower.includes('group by')) {
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

            // Group by category
            const grouped = new Map<string, number>();
            for (const r of filtered) {
              const cat = r.category as string;
              grouped.set(cat, (grouped.get(cat) ?? 0) + (r.amount as number));
            }

            const results = Array.from(grouped.entries()).map(([category, spent]) => ({
              category,
              spent,
            }));

            return { results: results as T[] };
          }

          // SELECT * FROM budgets WHERE user_id = ? AND is_active = 1
          if (sqlLower.includes('budgets') && sqlLower.includes('is_active = 1')) {
            const userId = bindings[0];
            const filtered = budgetRows.filter(
              (r) => r.user_id === userId && r.is_active === 1
            );
            return { results: filtered as T[] };
          }

          // SELECT * FROM budgets WHERE user_id = ?
          if (sqlLower.includes('budgets') && sqlLower.includes('user_id = ?')) {
            const userId = bindings[0];
            const filtered = budgetRows.filter((r) => r.user_id === userId);
            return { results: filtered as T[] };
          }

          return { results: [] };
        },

        run: async () => {
          const sqlLower = sql.toLowerCase().trim();

          if (sqlLower.startsWith('insert') && sqlLower.includes('budgets')) {
            // Check UNIQUE(user_id, category) constraint
            const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
            if (colMatch) {
              const cols = colMatch[1].split(',').map((c) => c.trim());
              const row: MockRow = {};
              cols.forEach((col, i) => {
                row[col] = bindings[i];
              });

              // Simulate UNIQUE constraint
              const exists = budgetRows.find(
                (r) => r.user_id === row.user_id && r.category === row.category
              );
              if (exists) {
                throw new Error('UNIQUE constraint failed: budgets.user_id, budgets.category');
              }

              budgetRows.push(row);
            }
            return { success: true };
          }

          if (sqlLower.startsWith('update') && sqlLower.includes('budgets')) {
            const id = bindings[bindings.length - 2];
            const userId = bindings[bindings.length - 1];
            const idx = budgetRows.findIndex((r) => r.id === id && r.user_id === userId);
            if (idx >= 0) {
              const setMatch = sql.match(/SET\s+(.+)\s+WHERE/i);
              if (setMatch) {
                const setClauses = setMatch[1].split(',').map((s) => s.trim());
                let bindIdx = 0;
                for (const clause of setClauses) {
                  const colName = clause.split('=')[0].trim();
                  budgetRows[idx][colName] = bindings[bindIdx];
                  bindIdx++;
                }
              }
            }
            return { success: true };
          }

          if (sqlLower.startsWith('delete') && sqlLower.includes('budgets')) {
            const id = bindings[0];
            const userId = bindings[1];
            budgetRows = budgetRows.filter((r) => !(r.id === id && r.user_id === userId));
            return { success: true };
          }

          return { success: true };
        },
      };

      return stmt;
    },
  };

  return mockDB;
}

// --------------- Helpers ---------------

const USER_ID = 'user-123';
const OTHER_USER_ID = 'user-456';

function validBudgetInput() {
  return {
    category: 'food' as const,
    amount: 500000,
  };
}

/** Get YYYY-MM-DD for a day in the current month */
function currentMonthDate(day: number): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => `mock-uuid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

// --------------- Tests ---------------

describe('budgetService.create', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('creates a budget with valid input', async () => {
    const result = await budgetService.create(db as any, USER_ID, validBudgetInput());

    expect(result.id).toBeTruthy();
    expect(result.user_id).toBe(USER_ID);
    expect(result.category).toBe('food');
    expect(result.amount).toBe(500000);
    expect(result.period).toBe('monthly');
    expect(result.is_active).toBe(1);
    expect(result.created_at).toBeTruthy();
    expect(result.updated_at).toBeTruthy();
  });

  it('rejects zero amount', async () => {
    const input = { ...validBudgetInput(), amount: 0 };
    await expect(budgetService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount must be greater than 0'
    );
  });

  it('rejects negative amount', async () => {
    const input = { ...validBudgetInput(), amount: -5000 };
    await expect(budgetService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount must be greater than 0'
    );
  });

  it('rejects float amount', async () => {
    const input = { ...validBudgetInput(), amount: 150.50 };
    await expect(budgetService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount must be an integer'
    );
  });

  it('rejects empty category', async () => {
    const input = { amount: 500000, category: '' as any };
    await expect(budgetService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Category is required'
    );
  });

  it('rejects invalid category string', async () => {
    const input = { amount: 500000, category: 'invalid-cat' as any };
    await expect(budgetService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Invalid category'
    );
  });

  it('rejects missing amount', async () => {
    const input = { category: 'food' } as any;
    await expect(budgetService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount is required'
    );
  });

  it('rejects missing category', async () => {
    const input = { amount: 500000 } as any;
    await expect(budgetService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Category is required'
    );
  });

  it('rejects duplicate category for same user (409 CONFLICT)', async () => {
    await budgetService.create(db as any, USER_ID, validBudgetInput());

    await expect(
      budgetService.create(db as any, USER_ID, validBudgetInput())
    ).rejects.toThrow("Budget for category 'food' already exists");

    // Verify it's a 409
    try {
      await budgetService.create(db as any, USER_ID, validBudgetInput());
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(409);
    }
  });

  it('allows same category for different users', async () => {
    await budgetService.create(db as any, USER_ID, validBudgetInput());
    const result = await budgetService.create(db as any, OTHER_USER_ID, validBudgetInput());
    expect(result.user_id).toBe(OTHER_USER_ID);
  });
});

describe('budgetService.list', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(async () => {
    db = createMockDB();
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 500000 });
    await budgetService.create(db as any, USER_ID, { category: 'transport', amount: 300000 });
    await budgetService.create(db as any, OTHER_USER_ID, { category: 'shopping', amount: 1000000 });
  });

  it('returns budgets for user with spending data', async () => {
    const result = await budgetService.list(db as any, USER_ID);

    expect(result.data.length).toBe(2);
    expect(result.data.every((b) => b.user_id === USER_ID)).toBe(true);
    // All should have spent and percentage fields
    expect(result.data.every((b) => typeof b.spent === 'number')).toBe(true);
    expect(result.data.every((b) => typeof b.percentage === 'number')).toBe(true);
  });

  it('does not return other user\'s budgets (RLS)', async () => {
    const result = await budgetService.list(db as any, USER_ID);
    expect(result.data.every((b) => b.user_id === USER_ID)).toBe(true);
  });

  it('returns empty array when user has no budgets', async () => {
    const result = await budgetService.list(db as any, 'user-no-budgets');
    expect(result.data).toEqual([]);
  });
});

describe('budgetService.getById', () => {
  let db: ReturnType<typeof createMockDB>;
  let budgetId: string;

  beforeEach(async () => {
    db = createMockDB();
    const budget = await budgetService.create(db as any, USER_ID, validBudgetInput());
    budgetId = budget.id;
  });

  it('returns budget for correct user', async () => {
    const result = await budgetService.getById(db as any, USER_ID, budgetId);
    expect(result.id).toBe(budgetId);
    expect(result.user_id).toBe(USER_ID);
  });

  it('throws NOT_FOUND for wrong user (no info leakage)', async () => {
    await expect(
      budgetService.getById(db as any, OTHER_USER_ID, budgetId)
    ).rejects.toThrow('Budget not found');
  });

  it('throws NOT_FOUND for non-existent ID', async () => {
    await expect(
      budgetService.getById(db as any, USER_ID, 'non-existent-id')
    ).rejects.toThrow('Budget not found');
  });
});

describe('budgetService.update', () => {
  let db: ReturnType<typeof createMockDB>;
  let budgetId: string;

  beforeEach(async () => {
    db = createMockDB();
    const budget = await budgetService.create(db as any, USER_ID, validBudgetInput());
    budgetId = budget.id;
  });

  it('updates amount', async () => {
    const result = await budgetService.update(db as any, USER_ID, budgetId, { amount: 750000 });
    expect(result.amount).toBe(750000);
  });

  it('updates is_active', async () => {
    const result = await budgetService.update(db as any, USER_ID, budgetId, { is_active: 0 });
    expect(result.is_active).toBe(0);
  });

  it('succeeds as no-op with empty update', async () => {
    const result = await budgetService.update(db as any, USER_ID, budgetId, {});
    expect(result.id).toBe(budgetId);
    expect(result.amount).toBe(500000);
  });

  it('throws NOT_FOUND for wrong user', async () => {
    await expect(
      budgetService.update(db as any, OTHER_USER_ID, budgetId, { amount: 99999 })
    ).rejects.toThrow('Budget not found');
  });

  it('rejects invalid amount on update', async () => {
    await expect(
      budgetService.update(db as any, USER_ID, budgetId, { amount: -100 })
    ).rejects.toThrow('Amount must be greater than 0');
  });

  it('rejects float amount on update', async () => {
    await expect(
      budgetService.update(db as any, USER_ID, budgetId, { amount: 100.5 })
    ).rejects.toThrow('Amount must be an integer');
  });
});

describe('budgetService.remove', () => {
  let db: ReturnType<typeof createMockDB>;
  let budgetId: string;

  beforeEach(async () => {
    db = createMockDB();
    const budget = await budgetService.create(db as any, USER_ID, validBudgetInput());
    budgetId = budget.id;
  });

  it('deletes a budget', async () => {
    await budgetService.remove(db as any, USER_ID, budgetId);
    await expect(
      budgetService.getById(db as any, USER_ID, budgetId)
    ).rejects.toThrow('Budget not found');
  });

  it('throws NOT_FOUND for wrong user', async () => {
    await expect(
      budgetService.remove(db as any, OTHER_USER_ID, budgetId)
    ).rejects.toThrow('Budget not found');
  });

  it('throws NOT_FOUND for non-existent ID', async () => {
    await expect(
      budgetService.remove(db as any, USER_ID, 'non-existent')
    ).rejects.toThrow('Budget not found');
  });
});

describe('budgetService.getStatus — spending & thresholds', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(async () => {
    db = createMockDB();
  });

  it('returns spent = 0 when no transactions in current month', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 500000 });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets.length).toBe(1);
    expect(status.budgets[0].spent).toBe(0);
    expect(status.budgets[0].percentage).toBe(0);
    expect(status.warnings).toEqual([]);
    expect(status.exceeded).toEqual([]);
  });

  it('calculates spending from current month transactions', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 500000 });

    // Add a food expense for this month
    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'expense',
      amount: 200000,
      category: 'food',
      date: currentMonthDate(5),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].spent).toBe(200000);
    expect(status.budgets[0].percentage).toBe(40);
  });

  it('flags warning at exactly 80% threshold', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 100000 });

    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'expense',
      amount: 80000,
      category: 'food',
      date: currentMonthDate(10),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].percentage).toBe(80);
    expect(status.warnings.length).toBe(1);
    expect(status.warnings[0].category).toBe('food');
    expect(status.exceeded).toEqual([]);
  });

  it('flags both warning and exceeded at exactly 100% threshold', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'transport', amount: 300000 });

    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'expense',
      amount: 300000,
      category: 'transport',
      date: currentMonthDate(15),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].percentage).toBe(100);
    expect(status.warnings.length).toBe(1); // 100 >= 80
    expect(status.exceeded.length).toBe(1); // 100 >= 100
  });

  it('flags exceeded when over 100%', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'shopping', amount: 200000 });

    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'expense',
      amount: 250000,
      category: 'shopping',
      date: currentMonthDate(5),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].percentage).toBe(125);
    expect(status.warnings.length).toBe(1);
    expect(status.exceeded.length).toBe(1);
  });

  it('does not flag when spending below 80%', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 1000000 });

    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'expense',
      amount: 500000,
      category: 'food',
      date: currentMonthDate(3),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].percentage).toBe(50);
    expect(status.warnings).toEqual([]);
    expect(status.exceeded).toEqual([]);
  });

  it('excludes is_active = 0 budgets from status', async () => {
    const budget = await budgetService.create(db as any, USER_ID, { category: 'food', amount: 500000 });
    await budgetService.update(db as any, USER_ID, budget.id, { is_active: 0 });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets.length).toBe(0);
  });

  it('aggregates multiple transactions for same category', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 500000 });

    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'expense',
      amount: 100000,
      category: 'food',
      date: currentMonthDate(1),
    });
    db._addTransaction({
      id: 'txn-2',
      user_id: USER_ID,
      type: 'expense',
      amount: 150000,
      category: 'food',
      date: currentMonthDate(10),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].spent).toBe(250000);
    expect(status.budgets[0].percentage).toBe(50);
  });

  it('only counts expense transactions, not income', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'other', amount: 500000 });

    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'income',
      amount: 1000000,
      category: 'other',
      date: currentMonthDate(1),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].spent).toBe(0);
    expect(status.budgets[0].percentage).toBe(0);
  });

  it('does not count other user transactions', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 100000 });

    // Other user's expense
    db._addTransaction({
      id: 'txn-1',
      user_id: OTHER_USER_ID,
      type: 'expense',
      amount: 99999,
      category: 'food',
      date: currentMonthDate(5),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].spent).toBe(0);
  });

  it('handles between 80-100% spending', async () => {
    await budgetService.create(db as any, USER_ID, { category: 'food', amount: 100000 });

    db._addTransaction({
      id: 'txn-1',
      user_id: USER_ID,
      type: 'expense',
      amount: 90000,
      category: 'food',
      date: currentMonthDate(5),
    });

    const status = await budgetService.getStatus(db as any, USER_ID);
    expect(status.budgets[0].percentage).toBe(90);
    expect(status.warnings.length).toBe(1);
    expect(status.exceeded.length).toBe(0); // not yet exceeded
  });
});
