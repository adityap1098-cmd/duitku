/**
 * Recurring transaction service tests — covers detection, confirm, dismiss, list.
 * Uses a lightweight D1 mock backed by in-memory arrays (same pattern as budget.test.ts).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as recurringService from '../../src/services/recurring';
import { AppError } from '../../src/lib/errors';

// --------------- D1 Mock ---------------

interface MockRow {
  [key: string]: unknown;
}

/**
 * Minimal D1Database mock for transactions + recurring_transactions tables.
 * Supports the SQL patterns used by the recurring service.
 */
function createMockDB() {
  let transactionRows: MockRow[] = [];
  let recurringRows: MockRow[] = [];

  const mockDB = {
    _getTransactions: () => transactionRows,
    _getRecurring: () => recurringRows,
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

          // SELECT id FROM recurring_transactions WHERE id = ? AND user_id = ?
          if (sqlLower.includes('recurring_transactions') && sqlLower.includes('where')) {
            const id = bindings[0];
            const userId = bindings[1];
            const row = recurringRows.find((r) => r.id === id && r.user_id === userId);
            return (row as T) ?? null;
          }

          return null;
        },

        all: async <T = MockRow>(): Promise<{ results: T[] }> => {
          const sqlLower = sql.toLowerCase();

          // detectRecurring — the big GROUP BY query with LEFT JOIN
          if (sqlLower.includes('left join recurring_transactions') || (sqlLower.includes('group by t.description') && sqlLower.includes('having'))) {
            const userId = bindings[0] as string;

            // Filter expenses for this user
            const expenses = transactionRows.filter(
              (r) => r.user_id === userId && r.type === 'expense'
            );

            // Group by description + category
            const groups = new Map<string, {
              description: string;
              category: string;
              months: Set<string>;
              count: number;
              totalAmount: number;
              lastSeen: string;
            }>();

            for (const r of expenses) {
              const key = `${r.description}::${r.category}`;
              const date = r.date as string;
              const month = date.substring(0, 7);

              if (!groups.has(key)) {
                groups.set(key, {
                  description: r.description as string,
                  category: r.category as string,
                  months: new Set(),
                  count: 0,
                  totalAmount: 0,
                  lastSeen: date,
                });
              }

              const g = groups.get(key)!;
              g.months.add(month);
              g.count++;
              g.totalAmount += r.amount as number;
              if (date > g.lastSeen) g.lastSeen = date;
            }

            // Filter: months_active >= 2 AND not already in recurring_transactions
            const results: MockRow[] = [];
            for (const g of groups.values()) {
              if (g.months.size < 2) continue;

              // Check if already confirmed/dismissed
              const exists = recurringRows.find(
                (rr) =>
                  rr.user_id === userId &&
                  rr.description === g.description &&
                  rr.category === g.category
              );
              if (exists) continue;

              results.push({
                description: g.description,
                category: g.category,
                months_active: g.months.size,
                occurrence_count: g.count,
                avg_amount: Math.round(g.totalAmount / g.count),
                last_seen: g.lastSeen,
              });
            }

            // Sort by months_active DESC, occurrence_count DESC
            results.sort((a, b) => {
              const mDiff = (b.months_active as number) - (a.months_active as number);
              if (mDiff !== 0) return mDiff;
              return (b.occurrence_count as number) - (a.occurrence_count as number);
            });

            return { results: results as T[] };
          }

          // listRecurring — SELECT * FROM recurring_transactions WHERE user_id = ? AND is_dismissed = 0
          if (sqlLower.includes('recurring_transactions') && sqlLower.includes('is_dismissed = 0')) {
            const userId = bindings[0] as string;
            const filtered = recurringRows.filter(
              (r) => r.user_id === userId && r.is_dismissed === 0
            );
            // Sort by created_at DESC
            filtered.sort((a, b) => (b.created_at as string).localeCompare(a.created_at as string));
            return { results: filtered as T[] };
          }

          return { results: [] };
        },

        run: async () => {
          const sqlLower = sql.toLowerCase().trim();

          // INSERT INTO recurring_transactions
          if (sqlLower.startsWith('insert') && sqlLower.includes('recurring_transactions')) {
            const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
            if (colMatch) {
              const cols = colMatch[1].split(',').map((c) => c.trim());
              const row: MockRow = {};
              cols.forEach((col, i) => {
                row[col] = bindings[i];
              });
              recurringRows.push(row);
            }
            return { success: true };
          }

          // UPDATE recurring_transactions SET is_dismissed = 1, updated_at = ? WHERE id = ? AND user_id = ?
          if (sqlLower.startsWith('update') && sqlLower.includes('recurring_transactions')) {
            const updatedAt = bindings[0];
            const id = bindings[1];
            const userId = bindings[2];
            const idx = recurringRows.findIndex((r) => r.id === id && r.user_id === userId);
            if (idx >= 0) {
              recurringRows[idx].is_dismissed = 1;
              recurringRows[idx].updated_at = updatedAt;
            }
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

function addExpense(
  db: ReturnType<typeof createMockDB>,
  userId: string,
  amount: number,
  category: string,
  date: string,
  description: string = 'Recurring expense'
) {
  db._addTransaction({
    id: `txn-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    type: 'expense',
    amount,
    category,
    date,
    description,
  });
}

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => `mock-uuid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

// --------------- Tests ---------------

describe('recurringService.detectRecurring', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('detects expenses appearing across 2+ months', async () => {
    addExpense(db, USER_ID, 100000, 'subscription', '2025-01-15', 'Netflix');
    addExpense(db, USER_ID, 100000, 'subscription', '2025-02-15', 'Netflix');
    addExpense(db, USER_ID, 100000, 'subscription', '2025-03-15', 'Netflix');

    const result = await recurringService.detectRecurring(db as any, USER_ID);

    expect(result.data.length).toBe(1);
    expect(result.data[0].description).toBe('Netflix');
    expect(result.data[0].category).toBe('subscription');
    expect(result.data[0].months_active).toBe(3);
    expect(result.data[0].occurrence_count).toBe(3);
    expect(result.data[0].average_amount).toBe(100000);
    expect(result.data[0].last_seen).toBe('2025-03-15');
  });

  it('ignores expenses that only appear in one month', async () => {
    addExpense(db, USER_ID, 50000, 'food', '2025-01-15', 'One-time meal');
    addExpense(db, USER_ID, 50000, 'food', '2025-01-20', 'One-time meal');

    const result = await recurringService.detectRecurring(db as any, USER_ID);

    expect(result.data.length).toBe(0);
  });

  it('excludes already confirmed recurring items', async () => {
    addExpense(db, USER_ID, 100000, 'subscription', '2025-01-15', 'Netflix');
    addExpense(db, USER_ID, 100000, 'subscription', '2025-02-15', 'Netflix');

    // Confirm Netflix first
    await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });

    const result = await recurringService.detectRecurring(db as any, USER_ID);
    expect(result.data.length).toBe(0);
  });

  it('excludes dismissed recurring items', async () => {
    addExpense(db, USER_ID, 100000, 'subscription', '2025-01-15', 'Netflix');
    addExpense(db, USER_ID, 100000, 'subscription', '2025-02-15', 'Netflix');

    // Confirm then dismiss
    const confirmed = await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });
    await recurringService.dismissRecurring(db as any, USER_ID, confirmed.id);

    const result = await recurringService.detectRecurring(db as any, USER_ID);
    expect(result.data.length).toBe(0);
  });

  it('returns empty when no transactions', async () => {
    const result = await recurringService.detectRecurring(db as any, USER_ID);
    expect(result.data).toEqual([]);
  });

  it('does not include other user data (RLS)', async () => {
    addExpense(db, OTHER_USER_ID, 100000, 'subscription', '2025-01-15', 'Netflix');
    addExpense(db, OTHER_USER_ID, 100000, 'subscription', '2025-02-15', 'Netflix');

    const result = await recurringService.detectRecurring(db as any, USER_ID);
    expect(result.data.length).toBe(0);
  });

  it('sorts by months_active DESC, then occurrence_count DESC', async () => {
    // Item A: 3 months
    addExpense(db, USER_ID, 100000, 'subscription', '2025-01-15', 'Netflix');
    addExpense(db, USER_ID, 100000, 'subscription', '2025-02-15', 'Netflix');
    addExpense(db, USER_ID, 100000, 'subscription', '2025-03-15', 'Netflix');

    // Item B: 2 months, more occurrences
    addExpense(db, USER_ID, 50000, 'food', '2025-01-01', 'GrabFood');
    addExpense(db, USER_ID, 50000, 'food', '2025-01-15', 'GrabFood');
    addExpense(db, USER_ID, 50000, 'food', '2025-02-01', 'GrabFood');
    addExpense(db, USER_ID, 50000, 'food', '2025-02-15', 'GrabFood');

    const result = await recurringService.detectRecurring(db as any, USER_ID);

    expect(result.data.length).toBe(2);
    expect(result.data[0].description).toBe('Netflix'); // 3 months first
    expect(result.data[1].description).toBe('GrabFood'); // 2 months second
  });
});

describe('recurringService.confirmRecurring', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('creates a recurring transaction record', async () => {
    const result = await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });

    expect(result.id).toBeTruthy();
    expect(result.user_id).toBe(USER_ID);
    expect(result.description).toBe('Netflix');
    expect(result.category).toBe('subscription');
    expect(result.estimated_amount).toBe(100000);
    expect(result.is_dismissed).toBe(0);
    expect(result.created_at).toBeTruthy();
    expect(result.updated_at).toBeTruthy();
  });

  it('rejects missing description', async () => {
    await expect(
      recurringService.confirmRecurring(db as any, USER_ID, {
        description: '',
        category: 'subscription',
        estimated_amount: 100000,
      })
    ).rejects.toThrow('Description is required');
  });

  it('rejects invalid category', async () => {
    await expect(
      recurringService.confirmRecurring(db as any, USER_ID, {
        description: 'Netflix',
        category: 'invalid-cat' as any,
        estimated_amount: 100000,
      })
    ).rejects.toThrow('Invalid category');
  });

  it('rejects zero amount', async () => {
    await expect(
      recurringService.confirmRecurring(db as any, USER_ID, {
        description: 'Netflix',
        category: 'subscription',
        estimated_amount: 0,
      })
    ).rejects.toThrow('Estimated amount must be greater than 0');
  });

  it('rejects negative amount', async () => {
    await expect(
      recurringService.confirmRecurring(db as any, USER_ID, {
        description: 'Netflix',
        category: 'subscription',
        estimated_amount: -5000,
      })
    ).rejects.toThrow('Estimated amount must be greater than 0');
  });

  it('rejects float amount', async () => {
    await expect(
      recurringService.confirmRecurring(db as any, USER_ID, {
        description: 'Netflix',
        category: 'subscription',
        estimated_amount: 100.50,
      })
    ).rejects.toThrow('Estimated amount must be an integer');
  });

  it('rejects missing amount', async () => {
    await expect(
      recurringService.confirmRecurring(db as any, USER_ID, {
        description: 'Netflix',
        category: 'subscription',
      } as any)
    ).rejects.toThrow('Estimated amount is required');
  });

  it('trims whitespace from description', async () => {
    const result = await recurringService.confirmRecurring(db as any, USER_ID, {
      description: '  Netflix  ',
      category: 'subscription',
      estimated_amount: 100000,
    });

    expect(result.description).toBe('Netflix');
  });
});

describe('recurringService.dismissRecurring', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('marks a recurring transaction as dismissed', async () => {
    const confirmed = await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });

    await recurringService.dismissRecurring(db as any, USER_ID, confirmed.id);

    // Should not appear in active list
    const list = await recurringService.listRecurring(db as any, USER_ID);
    expect(list.data.length).toBe(0);
  });

  it('throws NOT_FOUND for non-existent ID', async () => {
    await expect(
      recurringService.dismissRecurring(db as any, USER_ID, 'non-existent')
    ).rejects.toThrow('Recurring transaction not found');
  });

  it('throws NOT_FOUND for wrong user (no info leakage)', async () => {
    const confirmed = await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });

    await expect(
      recurringService.dismissRecurring(db as any, OTHER_USER_ID, confirmed.id)
    ).rejects.toThrow('Recurring transaction not found');
  });
});

describe('recurringService.listRecurring', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('returns active recurring transactions', async () => {
    await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });
    await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Spotify',
      category: 'subscription',
      estimated_amount: 50000,
    });

    const result = await recurringService.listRecurring(db as any, USER_ID);

    expect(result.data.length).toBe(2);
    expect(result.data.every((r) => r.is_dismissed === 0)).toBe(true);
  });

  it('excludes dismissed recurring transactions', async () => {
    const confirmed = await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });
    await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Spotify',
      category: 'subscription',
      estimated_amount: 50000,
    });

    await recurringService.dismissRecurring(db as any, USER_ID, confirmed.id);

    const result = await recurringService.listRecurring(db as any, USER_ID);
    expect(result.data.length).toBe(1);
    expect(result.data[0].description).toBe('Spotify');
  });

  it('returns empty array when no recurring transactions', async () => {
    const result = await recurringService.listRecurring(db as any, USER_ID);
    expect(result.data).toEqual([]);
  });

  it('does not return other user data (RLS)', async () => {
    await recurringService.confirmRecurring(db as any, USER_ID, {
      description: 'Netflix',
      category: 'subscription',
      estimated_amount: 100000,
    });

    const result = await recurringService.listRecurring(db as any, OTHER_USER_ID);
    expect(result.data.length).toBe(0);
  });
});
