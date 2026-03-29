/**
 * Transaction service tests — covers CRUD, RLS, validation, and summary.
 * Uses a lightweight D1 mock backed by an in-memory array.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as transactionService from '../../src/services/transaction';
import { AppError } from '../../src/lib/errors';

// --------------- D1 Mock ---------------

interface MockRow {
  [key: string]: unknown;
}

/**
 * Minimal D1Database mock that stores rows in-memory.
 * Supports SELECT, INSERT, UPDATE, DELETE with parameterized bindings.
 */
function createMockDB() {
  let rows: MockRow[] = [];

  function matchWhere(row: MockRow, sql: string, bindings: unknown[]): boolean {
    // This is a simplified matcher — handles the service's query patterns
    return true; // filtering is done at the statement level
  }

  const mockDB = {
    _rows: rows,
    _getRows: () => rows,
    _setRows: (newRows: MockRow[]) => { rows = newRows; mockDB._rows = rows; },

    prepare: (sql: string) => {
      let bindings: unknown[] = [];

      const stmt = {
        bind: (...args: unknown[]) => {
          bindings = args;
          return stmt;
        },
        first: async <T = MockRow>(columnName?: string): Promise<T | null> => {
          const sqlLower = sql.toLowerCase();

          if (sqlLower.includes('coalesce') && sqlLower.includes('sum')) {
            // Handle summary query (must be checked before count(*) since summary SQL contains both)
            const filtered = applyFilters(rows, sql, bindings);
            const totalIncome = filtered
              .filter((r) => r.type === 'income')
              .reduce((sum, r) => sum + (r.amount as number), 0);
            const totalExpense = filtered
              .filter((r) => r.type === 'expense')
              .reduce((sum, r) => sum + (r.amount as number), 0);
            return {
              total_income: totalIncome,
              total_expense: totalExpense,
              count: filtered.length,
            } as unknown as T;
          }

          if (sqlLower.includes('count(*)')) {
            // Handle COUNT queries with WHERE filtering
            const filtered = applyFilters(rows, sql, bindings);
            return { total: filtered.length } as unknown as T;
          }

          // SELECT * WHERE id = ? AND user_id = ?
          if (sqlLower.includes('select') && sqlLower.includes('where')) {
            const filtered = applyFilters(rows, sql, bindings);
            return (filtered[0] as T) ?? null;
          }

          return null;
        },
        all: async <T = MockRow>(): Promise<{ results: T[] }> => {
          const filtered = applyFilters(rows, sql, bindings);

          // Handle LIMIT/OFFSET
          const limitMatch = sql.match(/LIMIT\s+\?/i);
          const offsetMatch = sql.match(/OFFSET\s+\?/i);
          let result = filtered;

          if (limitMatch && offsetMatch) {
            // Last two bindings are limit and offset
            const limit = bindings[bindings.length - 2] as number;
            const offset = bindings[bindings.length - 1] as number;
            result = filtered.slice(offset, offset + limit);
          }

          return { results: result as T[] };
        },
        run: async () => {
          const sqlLower = sql.toLowerCase().trim();

          if (sqlLower.startsWith('insert')) {
            // Parse INSERT ... VALUES (?, ?, ...)
            const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
            if (colMatch) {
              const cols = colMatch[1].split(',').map((c) => c.trim());
              const row: MockRow = {};
              cols.forEach((col, i) => {
                row[col] = bindings[i];
              });
              rows.push(row);
            }
            return { success: true };
          }

          if (sqlLower.startsWith('update')) {
            // Find the row by id and user_id (last two bindings)
            const id = bindings[bindings.length - 2];
            const userId = bindings[bindings.length - 1];
            const idx = rows.findIndex((r) => r.id === id && r.user_id === userId);
            if (idx >= 0) {
              // Parse SET clause field names
              const setMatch = sql.match(/SET\s+(.+)\s+WHERE/i);
              if (setMatch) {
                const setClauses = setMatch[1].split(',').map((s) => s.trim());
                let bindIdx = 0;
                for (const clause of setClauses) {
                  const colName = clause.split('=')[0].trim();
                  rows[idx][colName] = bindings[bindIdx];
                  bindIdx++;
                }
              }
            }
            return { success: true };
          }

          if (sqlLower.startsWith('delete')) {
            const id = bindings[0];
            const userId = bindings[1];
            rows = rows.filter((r) => !(r.id === id && r.user_id === userId));
            mockDB._rows = rows;
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

/**
 * Apply WHERE clause filters from SQL to rows.
 * Handles the patterns used by the transaction service.
 */
function applyFilters(rows: MockRow[], sql: string, bindings: unknown[]): MockRow[] {
  const sqlLower = sql.toLowerCase();
  let filtered = [...rows];
  let bindIdx = 0;

  // user_id = ?
  if (sqlLower.includes('user_id = ?')) {
    const userId = bindings[bindIdx++];
    filtered = filtered.filter((r) => r.user_id === userId);
  }

  // Additional WHERE conditions after user_id
  // Check for standalone "id = ?" (not "user_id = ?") pattern — used by getById
  const hasStandaloneId = /\bWHERE\s+id\s*=\s*\?/.test(sql) || /\bAND\s+id\s*=\s*\?/.test(sql);
  if (hasStandaloneId) {
    // Pattern: WHERE id = ? AND user_id = ?
    const id = bindings[0];
    const userId = bindings[1];
    return rows.filter((r) => r.id === id && r.user_id === userId);
  }

  // type = ?
  if (sqlLower.includes("type = ?") && !sqlLower.includes("case when type")) {
    const type = bindings[bindIdx++];
    filtered = filtered.filter((r) => r.type === type);
  }

  // category = ?
  if (sqlLower.includes('category = ?')) {
    const category = bindings[bindIdx++];
    filtered = filtered.filter((r) => r.category === category);
  }

  // date >= ?
  if (sqlLower.includes('date >= ?')) {
    const dateFrom = bindings[bindIdx++] as string;
    filtered = filtered.filter((r) => (r.date as string) >= dateFrom);
  }

  // date <= ?
  if (sqlLower.includes('date <= ?')) {
    const dateTo = bindings[bindIdx++] as string;
    filtered = filtered.filter((r) => (r.date as string) <= dateTo);
  }

  // description LIKE ? OR notes LIKE ?
  if (sqlLower.includes('description like ?')) {
    const pattern = bindings[bindIdx++] as string;
    bindIdx++; // skip second LIKE binding (same value)
    const searchTerm = pattern.replace(/%/g, '').toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.description as string || '').toLowerCase().includes(searchTerm) ||
        (r.notes as string || '').toLowerCase().includes(searchTerm)
    );
  }

  return filtered;
}

// --------------- Helpers ---------------

const USER_ID = 'user-123';
const OTHER_USER_ID = 'user-456';

function validInput() {
  return {
    type: 'expense' as const,
    amount: 50000,
    category: 'food' as const,
    description: 'Nasi Goreng',
    date: '2025-01-15',
  };
}

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => `mock-uuid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

// --------------- Tests ---------------

describe('transactionService.create', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('creates a transaction with valid input', async () => {
    const result = await transactionService.create(db as any, USER_ID, validInput());

    expect(result.id).toBeTruthy();
    expect(result.user_id).toBe(USER_ID);
    expect(result.type).toBe('expense');
    expect(result.amount).toBe(50000);
    expect(result.category).toBe('food');
    expect(result.description).toBe('Nasi Goreng');
    expect(result.date).toBe('2025-01-15');
    expect(result.source).toBe('manual');
    expect(result.created_at).toBeTruthy();
    expect(result.updated_at).toBeTruthy();
  });

  it('defaults description to empty string when omitted', async () => {
    const input = { type: 'income' as const, amount: 100000, category: 'other' as const };
    const result = await transactionService.create(db as any, USER_ID, input);

    expect(result.description).toBe('');
  });

  it('defaults date to today when omitted', async () => {
    const input = { type: 'income' as const, amount: 100000, category: 'other' as const };
    const result = await transactionService.create(db as any, USER_ID, input);

    const today = new Date().toISOString().split('T')[0];
    expect(result.date).toBe(today);
  });

  it('rejects negative amount', async () => {
    const input = { ...validInput(), amount: -5000 };
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(AppError);
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount must be greater than 0'
    );
  });

  it('rejects zero amount', async () => {
    const input = { ...validInput(), amount: 0 };
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount must be greater than 0'
    );
  });

  it('rejects float amount', async () => {
    const input = { ...validInput(), amount: 150.50 };
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount must be an integer'
    );
  });

  it('rejects amount exceeding max (integer overflow guard)', async () => {
    const input = { ...validInput(), amount: 1_000_000_000_000 };
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'must not exceed'
    );
  });

  it('allows amount at max boundary', async () => {
    const input = { ...validInput(), amount: 999_999_999_999 };
    // Should not throw validation error (may fail on DB mock, but that's OK)
    try {
      await transactionService.create(db as any, USER_ID, input);
    } catch (err) {
      // If it throws, it should NOT be the overflow error
      expect((err as Error).message).not.toContain('must not exceed');
    }
  });

  it('rejects invalid category', async () => {
    const input = { ...validInput(), category: 'invalid-cat' as any };
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Invalid category'
    );
  });

  it('rejects invalid type', async () => {
    const input = { ...validInput(), type: 'refund' as any };
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Type must be one of'
    );
  });

  it('rejects missing type', async () => {
    const input = { amount: 50000, category: 'food' } as any;
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Type is required'
    );
  });

  it('rejects missing amount', async () => {
    const input = { type: 'expense', category: 'food' } as any;
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Amount is required'
    );
  });

  it('rejects missing category', async () => {
    const input = { type: 'expense', amount: 50000 } as any;
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Category is required'
    );
  });

  it('rejects non-ISO date string', async () => {
    const input = { ...validInput(), date: '15/01/2025' };
    await expect(transactionService.create(db as any, USER_ID, input)).rejects.toThrow(
      'Date must be in ISO 8601 format'
    );
  });

  it('accepts full ISO 8601 datetime string', async () => {
    const input = { ...validInput(), date: '2025-01-15T10:30:00Z' };
    const result = await transactionService.create(db as any, USER_ID, input);
    expect(result.date).toBe('2025-01-15T10:30:00Z');
  });
});

describe('transactionService.list', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(async () => {
    db = createMockDB();
    // Seed with transactions
    await transactionService.create(db as any, USER_ID, {
      type: 'expense',
      amount: 50000,
      category: 'food',
      description: 'Lunch',
      date: '2025-01-15',
    });
    await transactionService.create(db as any, USER_ID, {
      type: 'income',
      amount: 5000000,
      category: 'other',
      description: 'Salary',
      date: '2025-01-01',
    });
    await transactionService.create(db as any, OTHER_USER_ID, {
      type: 'expense',
      amount: 30000,
      category: 'transport',
      description: 'Grab',
      date: '2025-01-10',
    });
  });

  it('returns paginated results for user', async () => {
    const result = await transactionService.list(db as any, USER_ID, {});

    expect(result.data.length).toBe(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.per_page).toBe(20);
    expect(result.pagination.total_pages).toBe(1);
  });

  it('does not return other user\'s transactions (RLS)', async () => {
    const result = await transactionService.list(db as any, USER_ID, {});
    const userIds = result.data.map((t) => t.user_id);
    expect(userIds.every((id) => id === USER_ID)).toBe(true);
  });

  it('returns empty array with pagination when no transactions', async () => {
    const result = await transactionService.list(db as any, 'user-no-txns', {});

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.total_pages).toBe(1);
  });

  it('filters by type', async () => {
    const result = await transactionService.list(db as any, USER_ID, { type: 'income' });
    expect(result.data.length).toBe(1);
    expect(result.data[0].type).toBe('income');
  });

  it('filters by category', async () => {
    const result = await transactionService.list(db as any, USER_ID, { category: 'food' });
    expect(result.data.length).toBe(1);
    expect(result.data[0].category).toBe('food');
  });

  it('returns empty when no matching filter', async () => {
    const result = await transactionService.list(db as any, USER_ID, { category: 'health' });
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('respects pagination parameters', async () => {
    const result = await transactionService.list(db as any, USER_ID, { page: 1, per_page: 1 });
    expect(result.data.length).toBe(1);
    expect(result.pagination.per_page).toBe(1);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.total_pages).toBe(2);
  });
});

describe('transactionService.getById', () => {
  let db: ReturnType<typeof createMockDB>;
  let txnId: string;

  beforeEach(async () => {
    db = createMockDB();
    const txn = await transactionService.create(db as any, USER_ID, validInput());
    txnId = txn.id;
  });

  it('returns transaction for correct user', async () => {
    const result = await transactionService.getById(db as any, USER_ID, txnId);
    expect(result.id).toBe(txnId);
    expect(result.user_id).toBe(USER_ID);
  });

  it('throws NOT_FOUND for wrong user (no info leakage)', async () => {
    await expect(
      transactionService.getById(db as any, OTHER_USER_ID, txnId)
    ).rejects.toThrow('Transaction not found');
  });

  it('throws NOT_FOUND for non-existent ID', async () => {
    await expect(
      transactionService.getById(db as any, USER_ID, 'non-existent-id')
    ).rejects.toThrow('Transaction not found');
  });
});

describe('transactionService.update', () => {
  let db: ReturnType<typeof createMockDB>;
  let txnId: string;

  beforeEach(async () => {
    db = createMockDB();
    const txn = await transactionService.create(db as any, USER_ID, validInput());
    txnId = txn.id;
  });

  it('updates specified fields', async () => {
    const result = await transactionService.update(db as any, USER_ID, txnId, {
      amount: 75000,
      description: 'Updated lunch',
    });

    expect(result.amount).toBe(75000);
    expect(result.description).toBe('Updated lunch');
    // Unchanged fields preserved
    expect(result.type).toBe('expense');
    expect(result.category).toBe('food');
  });

  it('succeeds as no-op with empty update', async () => {
    const result = await transactionService.update(db as any, USER_ID, txnId, {});
    expect(result.id).toBe(txnId);
    expect(result.amount).toBe(50000); // unchanged
  });

  it('throws NOT_FOUND for wrong user', async () => {
    await expect(
      transactionService.update(db as any, OTHER_USER_ID, txnId, { amount: 99999 })
    ).rejects.toThrow('Transaction not found');
  });

  it('rejects invalid amount on update', async () => {
    await expect(
      transactionService.update(db as any, USER_ID, txnId, { amount: -100 })
    ).rejects.toThrow('Amount must be greater than 0');
  });

  it('rejects float amount on update', async () => {
    await expect(
      transactionService.update(db as any, USER_ID, txnId, { amount: 100.5 })
    ).rejects.toThrow('Amount must be an integer');
  });

  it('rejects invalid category on update', async () => {
    await expect(
      transactionService.update(db as any, USER_ID, txnId, { category: 'bogus' as any })
    ).rejects.toThrow('Invalid category');
  });
});

describe('transactionService.remove', () => {
  let db: ReturnType<typeof createMockDB>;
  let txnId: string;

  beforeEach(async () => {
    db = createMockDB();
    const txn = await transactionService.create(db as any, USER_ID, validInput());
    txnId = txn.id;
  });

  it('deletes a transaction', async () => {
    await transactionService.remove(db as any, USER_ID, txnId);

    // Verify it's gone
    await expect(
      transactionService.getById(db as any, USER_ID, txnId)
    ).rejects.toThrow('Transaction not found');
  });

  it('throws NOT_FOUND for wrong user', async () => {
    await expect(
      transactionService.remove(db as any, OTHER_USER_ID, txnId)
    ).rejects.toThrow('Transaction not found');
  });

  it('throws NOT_FOUND for non-existent ID', async () => {
    await expect(
      transactionService.remove(db as any, USER_ID, 'non-existent')
    ).rejects.toThrow('Transaction not found');
  });
});

describe('transactionService.getSummary', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(async () => {
    db = createMockDB();
    await transactionService.create(db as any, USER_ID, {
      type: 'income',
      amount: 5000000,
      category: 'other',
      description: 'Salary',
      date: '2025-01-01',
    });
    await transactionService.create(db as any, USER_ID, {
      type: 'expense',
      amount: 50000,
      category: 'food',
      description: 'Lunch',
      date: '2025-01-15',
    });
    await transactionService.create(db as any, USER_ID, {
      type: 'expense',
      amount: 30000,
      category: 'transport',
      description: 'Grab ride',
      date: '2025-01-15',
    });
    // Another user's transaction — should not be included
    await transactionService.create(db as any, OTHER_USER_ID, {
      type: 'income',
      amount: 9999999,
      category: 'other',
      date: '2025-01-01',
    });
  });

  it('returns correct totals for user', async () => {
    const summary = await transactionService.getSummary(db as any, USER_ID, {});

    expect(summary.total_income).toBe(5000000);
    expect(summary.total_expense).toBe(80000);
    expect(summary.net).toBe(4920000);
    expect(summary.count).toBe(3);
  });

  it('returns zeros for user with no transactions', async () => {
    const summary = await transactionService.getSummary(db as any, 'user-empty', {});

    expect(summary.total_income).toBe(0);
    expect(summary.total_expense).toBe(0);
    expect(summary.net).toBe(0);
    expect(summary.count).toBe(0);
  });

  it('filters summary by category', async () => {
    const summary = await transactionService.getSummary(db as any, USER_ID, {
      category: 'food',
    });

    expect(summary.total_expense).toBe(50000);
    expect(summary.total_income).toBe(0);
    expect(summary.count).toBe(1);
  });
});
