/**
 * Currency formatting utilities for Indonesian Rupiah.
 */

/**
 * Format an integer amount in Rupiah with thousand separators.
 * Uses dot as thousands separator (Indonesian convention).
 *
 * Follows CLAUDE.md spec:
 * - Prefix "Rp " (with space)
 * - Dot separator for thousands
 * - No extra space after +/- sign
 *
 * @example formatRupiah(45000) → "Rp 45.000"
 * @example formatRupiah(-45000) → "-Rp 45.000"
 * @example formatRupiah(5000000, 'income') → "+Rp 5.000.000"
 */
export function formatRupiah(
  amount: number,
  type?: 'expense' | 'income' | 'neutral',
): string {
  const abs = Math.abs(amount);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Type takes precedence over sign when provided
  if (type === 'income') return `+Rp ${formatted}`;
  if (type === 'expense') return `-Rp ${formatted}`;
  if (type === 'neutral') return `Rp ${formatted}`;

  // Fallback to sign-based when no type provided
  if (amount > 0) return `+Rp ${formatted}`;
  if (amount < 0) return `-Rp ${formatted}`;
  return `Rp ${formatted}`;
}

/**
 * Compact number formatting for Indonesia.
 * For places with limited space (chart label, pill, summary card).
 *
 * @example formatCompact(1250000) → "1.2jt"
 * @example formatCompact(45000) → "45rb"
 * @example formatCompact(2500000000) → "2.5M"
 */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000)
    return (abs / 1_000_000_000).toFixed(1).replace('.0', '') + 'M';
  if (abs >= 1_000_000)
    return (abs / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
  if (abs >= 1_000) return (abs / 1_000).toFixed(0) + 'rb';
  return abs.toString();
}

/**
 * Backward compatibility alias.
 * @deprecated Use formatRupiah(amount, type) instead.
 */
export function formatSignedRupiah(
  amount: number,
  type: 'income' | 'expense'
): string {
  return formatRupiah(amount, type);
}
