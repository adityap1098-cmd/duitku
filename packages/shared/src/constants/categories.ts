/**
 * Category system — single source of truth.
 * CategoryHint is the canonical union; DEFAULT_CATEGORIES provides display metadata.
 */

export type CategoryHint =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'subscription'
  | 'topup'
  | 'transfer'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'gift'
  | 'other';

export interface Category {
  id: CategoryHint;
  label: string;
  /** Emoji icon for mobile display */
  icon: string;
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'food', label: 'Makanan & Minuman', icon: '🍔' },
  { id: 'transport', label: 'Transportasi', icon: '🚗' },
  { id: 'shopping', label: 'Belanja', icon: '🛍️' },
  { id: 'subscription', label: 'Langganan', icon: '📱' },
  { id: 'topup', label: 'Top Up', icon: '💳' },
  { id: 'transfer', label: 'Transfer', icon: '💸' },
  { id: 'bills', label: 'Tagihan', icon: '🧾' },
  { id: 'entertainment', label: 'Hiburan', icon: '🎬' },
  { id: 'health', label: 'Kesehatan', icon: '🏥' },
  { id: 'education', label: 'Pendidikan', icon: '📚' },
  { id: 'salary', label: 'Gaji', icon: '💰' },
  { id: 'freelance', label: 'Freelance', icon: '💻' },
  { id: 'investment', label: 'Investasi', icon: '📈' },
  { id: 'gift', label: 'Hadiah', icon: '🎁' },
  { id: 'other', label: 'Lainnya', icon: '📦' },
] as const;
