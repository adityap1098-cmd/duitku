/**
 * Export service — generates monthly Excel reports.
 * Queries transactions for a given month and produces an XLSX workbook
 * with a transaction sheet and a summary sheet.
 * Money = INTEGER (Rupiah). Timestamps = TEXT (ISO 8601).
 */

import * as XLSX from 'xlsx';
import type { Transaction, ExportMeta, CategoryHint } from '@duitku/shared';
import { DEFAULT_CATEGORIES } from '@duitku/shared';
import { Errors } from '../lib/errors';

// --------------- Validation ---------------

function validateYear(year: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw Errors.VALIDATION('Year must be between 2000 and 2100');
  }
}

function validateMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw Errors.VALIDATION('Month must be between 1 and 12');
  }
}

// --------------- Helpers ---------------

/** Get the last day of a given month (handles leap years). */
function getLastDayOfMonth(year: number, month: number): number {
  // month is 1-indexed; Date constructor month is 0-indexed
  // Day 0 of next month = last day of current month
  return new Date(year, month, 0).getDate();
}

/** Format Rupiah amount for display: 150000 → "150.000" */
function formatRupiah(amount: number): string {
  return amount.toLocaleString('id-ID');
}

/** Map category ID to Indonesian label */
function getCategoryLabel(categoryId: CategoryHint): string {
  const cat = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.label ?? categoryId;
}

// --------------- XLSX Generation ---------------

/**
 * Build the "Transaksi" (transaction list) sheet data.
 * Columns: Tanggal, Tipe, Kategori, Deskripsi, Jumlah (Rp), Sumber, Catatan
 */
function buildTransactionSheetData(transactions: Transaction[]): unknown[][] {
  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah (Rp)', 'Sumber', 'Catatan'];
  const rows = transactions.map((tx) => [
    tx.date,
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    getCategoryLabel(tx.category),
    tx.description,
    formatRupiah(tx.amount),
    tx.source === 'gmail_sync' ? 'Gmail Sync' : 'Manual',
    tx.notes ?? '',
  ]);
  return [headers, ...rows];
}

/**
 * Build the "Ringkasan" (summary) sheet data.
 * Shows totals and per-category breakdown.
 */
function buildSummarySheetData(transactions: Transaction[]): unknown[][] {
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const rows: unknown[][] = [
    ['Ringkasan Bulanan'],
    [],
    ['Total Pemasukan', formatRupiah(totalIncome)],
    ['Total Pengeluaran', formatRupiah(totalExpense)],
    ['Selisih', formatRupiah(totalIncome - totalExpense)],
    ['Jumlah Transaksi', transactions.length],
    [],
    ['Breakdown per Kategori'],
    ['Kategori', 'Jumlah Transaksi', 'Total (Rp)'],
  ];

  // Group by category
  const categoryMap = new Map<CategoryHint, { count: number; total: number }>();
  for (const tx of transactions) {
    const entry = categoryMap.get(tx.category) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += tx.amount;
    categoryMap.set(tx.category, entry);
  }

  // Sort by total descending
  const sortedCategories = Array.from(categoryMap.entries()).sort(
    (a, b) => b[1].total - a[1].total
  );

  for (const [catId, { count, total }] of sortedCategories) {
    rows.push([getCategoryLabel(catId), count, formatRupiah(total)]);
  }

  return rows;
}

// --------------- Main Export Function ---------------

/**
 * Generate a monthly XLSX export for the given user.
 * Returns an ArrayBuffer (compatible with Cloudflare Workers — no Node Buffer needed)
 * and metadata about the generated file.
 */
export async function generateMonthlyExport(
  db: D1Database,
  userId: string,
  year: number,
  month: number
): Promise<{ buffer: ArrayBuffer; meta: ExportMeta }> {
  // Validate inputs
  validateYear(year);
  validateMonth(month);

  // Build date range: first day to last day of month
  const monthStr = String(month).padStart(2, '0');
  const lastDay = getLastDayOfMonth(year, month);
  const dateFrom = `${year}-${monthStr}-01`;
  const dateTo = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // Query transactions for the month — manual RLS via user_id filter
  const result = await db
    .prepare(
      'SELECT * FROM transactions WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC'
    )
    .bind(userId, dateFrom, dateTo)
    .all<Transaction>();

  const transactions = result.results ?? [];

  // Build workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Transaksi (transaction list)
  const txData = buildTransactionSheetData(transactions);
  const txSheet = XLSX.utils.aoa_to_sheet(txData);

  // Set column widths for readability
  txSheet['!cols'] = [
    { wch: 12 },  // Tanggal
    { wch: 14 },  // Tipe
    { wch: 20 },  // Kategori
    { wch: 30 },  // Deskripsi
    { wch: 15 },  // Jumlah
    { wch: 12 },  // Sumber
    { wch: 25 },  // Catatan
  ];
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transaksi');

  // Sheet 2: Ringkasan (summary)
  const summaryData = buildSummarySheetData(transactions);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 25 },  // Label
    { wch: 20 },  // Value 1
    { wch: 20 },  // Value 2
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan');

  // Generate XLSX as ArrayBuffer (not Buffer — Workers has no Buffer)
  const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  const filename = `DuitKu-${year}-${monthStr}.xlsx`;

  return {
    buffer: arrayBuffer,
    meta: {
      filename,
      rows: transactions.length,
      year,
      month,
      generatedAt: new Date().toISOString(),
    },
  };
}
