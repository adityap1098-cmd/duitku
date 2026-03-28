/**
 * Currency formatting utilities for Indonesian Rupiah.
 */

/**
 * Format an integer amount in Rupiah with thousand separators.
 * Uses dot as thousands separator (Indonesian convention).
 *
 * @example formatRupiah(150000) → "Rp 150.000"
 * @example formatRupiah(1500000) → "Rp 1.500.000"
 * @example formatRupiah(0) → "Rp 0"
 */
export function formatRupiah(amount: number): string {
  const formatted = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${formatted}`;
}

/**
 * Format a signed amount for display (positive = income, negative = expense).
 * Adds + or - prefix.
 *
 * @example formatSignedRupiah(150000, 'income') → "+ Rp 150.000"
 * @example formatSignedRupiah(50000, 'expense') → "- Rp 50.000"
 */
export function formatSignedRupiah(
  amount: number,
  type: 'income' | 'expense'
): string {
  const prefix = type === 'income' ? '+' : '-';
  return `${prefix} ${formatRupiah(amount)}`;
}
