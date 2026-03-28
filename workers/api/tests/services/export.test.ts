/**
 * Export service tests — covers XLSX generation, validation, empty data,
 * summary sheet correctness, RLS filtering, and negative test cases.
 * Uses a lightweight D1 mock backed by an in-memory array.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import * as exportService from '../../src/services/export';
import { AppError } from '../../src/lib/errors';

// --------------- D1 Mock ---------------

interface MockRow {
  [key: string]: unknown;
}

/**
 * Minimal D1Database mock that stores rows in-memory.
 * Supports the SELECT query pattern used by the export service.
 */
function createMockDB() {
  let rows: MockRow[] = [];

  const mockDB = {
    _rows: rows,
    _setRows: (newRows: MockRow[]) => {
      rows = newRows;
      mockDB._rows = rows;
    },

    prepare: (sql: string) => {
      let bindings: unknown[] = [];

      const stmt = {
        bind: (...args: unknown[]) => {
          bindings = args;
          return stmt;
        },
        all: async <T = MockRow>(): Promise<{ results: T[] }> => {
          // Filter by user_id, date_from, date_to
          const [userId, dateFrom, dateTo] = bindings;
          const filtered = rows.filter((r) => {
            if (r.user_id !== userId) return false;
            if (dateFrom && (r.date as string) < (dateFrom as string)) return false;
            if (dateTo && (r.date as string) > (dateTo as string)) return false;
            return true;
          });

          // Sort by date ASC (matching the service SQL)
          filtered.sort((a, b) =>
            (a.date as string).localeCompare(b.date as string)
          );

          return { results: filtered as T[] };
        },
        first: async <T = MockRow>(): Promise<T | null> => null,
        run: async () => ({ success: true }),
      };

      return stmt;
    },
  };

  return mockDB;
}

// --------------- Test Helpers ---------------

function makeTransaction(overrides: Partial<MockRow> = {}): MockRow {
  return {
    id: crypto.randomUUID(),
    user_id: 'user-1',
    type: 'expense',
    amount: 50000,
    category: 'food',
    description: 'Makan siang',
    date: '2026-03-15',
    source: 'manual',
    notes: null,
    created_at: '2026-03-15T12:00:00Z',
    updated_at: '2026-03-15T12:00:00Z',
    ...overrides,
  };
}

/**
 * Parse an XLSX ArrayBuffer and return the workbook for inspection.
 */
function parseXLSX(buffer: ArrayBuffer): XLSX.WorkBook {
  const data = new Uint8Array(buffer);
  return XLSX.read(data, { type: 'array' });
}

// --------------- Tests ---------------

describe('Export Service', () => {
  let mockDB: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    mockDB = createMockDB();
  });

  // ======= XLSX Generation =======

  describe('generateMonthlyExport', () => {
    it('should produce a valid XLSX ArrayBuffer', async () => {
      mockDB._setRows([makeTransaction()]);

      const { buffer, meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify it's a valid XLSX by parsing it
      const wb = parseXLSX(buffer);
      expect(wb.SheetNames).toContain('Transaksi');
      expect(wb.SheetNames).toContain('Ringkasan');
    });

    it('should return correct metadata', async () => {
      mockDB._setRows([
        makeTransaction({ date: '2026-03-10' }),
        makeTransaction({ date: '2026-03-20' }),
      ]);

      const { meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      expect(meta.filename).toBe('DuitKu-2026-03.xlsx');
      expect(meta.rows).toBe(2);
      expect(meta.year).toBe(2026);
      expect(meta.month).toBe(3);
      expect(meta.generatedAt).toBeTruthy();
    });

    it('should produce valid XLSX with headers only when no transactions', async () => {
      mockDB._setRows([]);

      const { buffer, meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
      expect(meta.rows).toBe(0);

      // Should still have two sheets with headers
      const wb = parseXLSX(buffer);
      expect(wb.SheetNames.length).toBe(2);

      const txSheet = wb.Sheets['Transaksi'];
      const txData = XLSX.utils.sheet_to_json(txSheet, { header: 1 }) as unknown[][];
      // Header row should exist even with no data
      expect(txData.length).toBeGreaterThanOrEqual(1);
      expect(txData[0]).toContain('Tanggal');
      expect(txData[0]).toContain('Jumlah (Rp)');
    });

    it('should include correct columns in Transaksi sheet', async () => {
      mockDB._setRows([
        makeTransaction({
          date: '2026-03-15',
          type: 'expense',
          category: 'food',
          description: 'Nasi goreng',
          amount: 25000,
          source: 'manual',
          notes: 'Enak',
        }),
      ]);

      const { buffer } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      const wb = parseXLSX(buffer);
      const txSheet = wb.Sheets['Transaksi'];
      const data = XLSX.utils.sheet_to_json(txSheet, { header: 1 }) as unknown[][];

      // Check header row
      const headers = data[0] as string[];
      expect(headers).toEqual([
        'Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah (Rp)', 'Sumber', 'Catatan',
      ]);

      // Check data row
      const row = data[1] as string[];
      expect(row[0]).toBe('2026-03-15');        // Tanggal
      expect(row[1]).toBe('Pengeluaran');        // Tipe
      expect(row[2]).toBe('Makanan & Minuman');  // Kategori (label)
      expect(row[3]).toBe('Nasi goreng');        // Deskripsi
      expect(row[5]).toBe('Manual');             // Sumber
      expect(row[6]).toBe('Enak');               // Catatan
    });

    it('should display income transactions as Pemasukan', async () => {
      mockDB._setRows([
        makeTransaction({ type: 'income', category: 'transfer', source: 'gmail_sync' }),
      ]);

      const { buffer } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      const wb = parseXLSX(buffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Transaksi'], { header: 1 }) as unknown[][];
      expect(data[1][1]).toBe('Pemasukan');
      expect(data[1][5]).toBe('Gmail Sync');
    });
  });

  // ======= Summary Sheet =======

  describe('Ringkasan (summary) sheet', () => {
    it('should calculate correct totals', async () => {
      mockDB._setRows([
        makeTransaction({ type: 'income', amount: 5000000, date: '2026-03-01' }),
        makeTransaction({ type: 'expense', amount: 150000, date: '2026-03-05' }),
        makeTransaction({ type: 'expense', amount: 75000, date: '2026-03-10' }),
      ]);

      const { buffer } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      const wb = parseXLSX(buffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Ringkasan'], { header: 1 }) as unknown[][];

      // Find rows by label
      const findRow = (label: string) => data.find((r) => r[0] === label);

      const income = findRow('Total Pemasukan');
      const expense = findRow('Total Pengeluaran');
      const diff = findRow('Selisih');
      const count = findRow('Jumlah Transaksi');

      expect(income).toBeDefined();
      expect(expense).toBeDefined();
      expect(diff).toBeDefined();
      expect(count).toBeDefined();

      // 5000000 formatted as "5.000.000"
      expect(income![1]).toBe('5.000.000');
      // 150000 + 75000 = 225000 → "225.000"
      expect(expense![1]).toBe('225.000');
      // 5000000 - 225000 = 4775000 → "4.775.000"
      expect(diff![1]).toBe('4.775.000');
      expect(count![1]).toBe(3);
    });

    it('should show category breakdown sorted by total descending', async () => {
      mockDB._setRows([
        makeTransaction({ category: 'food', amount: 50000, date: '2026-03-01' }),
        makeTransaction({ category: 'transport', amount: 200000, date: '2026-03-02' }),
        makeTransaction({ category: 'food', amount: 30000, date: '2026-03-03' }),
      ]);

      const { buffer } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      const wb = parseXLSX(buffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Ringkasan'], { header: 1 }) as unknown[][];

      // Find the category breakdown header
      const breakdownIdx = data.findIndex((r) => r[0] === 'Breakdown per Kategori');
      expect(breakdownIdx).toBeGreaterThan(-1);

      // Next row is column headers, then data rows
      const catHeaderRow = data[breakdownIdx + 1];
      expect(catHeaderRow).toEqual(['Kategori', 'Jumlah Transaksi', 'Total (Rp)']);

      // Transport should be first (200.000 > 80.000)
      const transportRow = data[breakdownIdx + 2];
      expect(transportRow[0]).toBe('Transportasi');
      expect(transportRow[1]).toBe(1);

      const foodRow = data[breakdownIdx + 3];
      expect(foodRow[0]).toBe('Makanan & Minuman');
      expect(foodRow[1]).toBe(2);
    });

    it('should handle zero totals correctly', async () => {
      mockDB._setRows([]);

      const { buffer } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      const wb = parseXLSX(buffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Ringkasan'], { header: 1 }) as unknown[][];

      const findRow = (label: string) => data.find((r) => r[0] === label);
      expect(findRow('Total Pemasukan')![1]).toBe('0');
      expect(findRow('Total Pengeluaran')![1]).toBe('0');
      expect(findRow('Selisih')![1]).toBe('0');
      expect(findRow('Jumlah Transaksi')![1]).toBe(0);
    });
  });

  // ======= RLS (Row-Level Security) =======

  describe('RLS filtering', () => {
    it('should only include transactions for the specified user', async () => {
      mockDB._setRows([
        makeTransaction({ user_id: 'user-1', description: 'Mine', date: '2026-03-01' }),
        makeTransaction({ user_id: 'user-2', description: 'Theirs', date: '2026-03-01' }),
        makeTransaction({ user_id: 'user-1', description: 'Also mine', date: '2026-03-15' }),
      ]);

      const { buffer, meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      // Should only have user-1's 2 transactions
      expect(meta.rows).toBe(2);

      const wb = parseXLSX(buffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Transaksi'], { header: 1 }) as unknown[][];
      // Header + 2 data rows
      expect(data.length).toBe(3);
    });

    it('should filter by date range correctly', async () => {
      mockDB._setRows([
        makeTransaction({ date: '2026-02-28' }), // February — excluded
        makeTransaction({ date: '2026-03-01' }), // March 1 — included
        makeTransaction({ date: '2026-03-31' }), // March 31 — included
        makeTransaction({ date: '2026-04-01' }), // April — excluded
      ]);

      const { meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      expect(meta.rows).toBe(2);
    });
  });

  // ======= Validation — Negative Tests =======

  describe('validation', () => {
    it('should reject year below 2000', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 1999, 3
        )
      ).rejects.toThrow(AppError);

      try {
        await exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 1999, 3
        );
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('VALIDATION_ERROR');
        expect((err as AppError).message).toContain('Year must be between 2000 and 2100');
      }
    });

    it('should reject year above 2100', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 2101, 3
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject year = 0', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 0, 3
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject month = 0', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 2026, 0
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject month = 13', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 2026, 13
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject month = -1', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 2026, -1
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject non-integer year', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 2026.5, 3
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject non-integer month', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 2026, 3.5
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject NaN year', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', NaN, 3
        )
      ).rejects.toThrow(AppError);
    });

    it('should reject NaN month', async () => {
      await expect(
        exportService.generateMonthlyExport(
          mockDB as unknown as D1Database, 'user-1', 2026, NaN
        )
      ).rejects.toThrow(AppError);
    });
  });

  // ======= Edge Cases =======

  describe('edge cases', () => {
    it('should handle February correctly (28 days non-leap)', async () => {
      mockDB._setRows([
        makeTransaction({ date: '2025-02-28' }),
        makeTransaction({ date: '2025-03-01' }), // excluded — March
      ]);

      const { meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2025,
        2
      );

      expect(meta.rows).toBe(1);
      expect(meta.filename).toBe('DuitKu-2025-02.xlsx');
    });

    it('should handle February in a leap year (29 days)', async () => {
      mockDB._setRows([
        makeTransaction({ date: '2024-02-29' }),
      ]);

      const { meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2024,
        2
      );

      expect(meta.rows).toBe(1);
    });

    it('should handle single-digit month in filename', async () => {
      const { meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        1
      );

      expect(meta.filename).toBe('DuitKu-2026-01.xlsx');
    });

    it('should handle a month with many transactions', async () => {
      const manyTxs = Array.from({ length: 100 }, (_, i) =>
        makeTransaction({
          id: `tx-${i}`,
          date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
          amount: (i + 1) * 10000,
        })
      );
      mockDB._setRows(manyTxs);

      const { buffer, meta } = await exportService.generateMonthlyExport(
        mockDB as unknown as D1Database,
        'user-1',
        2026,
        3
      );

      expect(meta.rows).toBe(100);
      expect(buffer.byteLength).toBeGreaterThan(0);

      // Verify it's still parseable
      const wb = parseXLSX(buffer);
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Transaksi'], { header: 1 }) as unknown[][];
      // 1 header + 100 data rows
      expect(data.length).toBe(101);
    });
  });
});
