/**
 * DuitKu Design Tokens
 * Central theme constants matching CLAUDE.md design spec.
 *
 * Dark-first design. Light theme exists but dark is the primary experience.
 * All screens/components use useTheme() to access these tokens.
 */

import type { TextStyle } from 'react-native';

// --------------- Theme Type ---------------

export type ThemeType = 'dark' | 'light' | 'system';

// --------------- Dark Colors (primary) ---------------

export const DarkColors = {
  // ─── Base ──────────────────────────────
  background: '#0B0F1E',
  surface: '#131A2E',        // card
  surfaceLight: '#1A2240',   // cardAlt / nested card
  border: '#1E2A4A',         // cardBorder

  // ─── Text ──────────────────────────────
  text: '#FFFFFF',
  textSecondary: '#8B9DC3',
  textMuted: '#4A5C80',

  // ─── Accent & Semantic ─────────────────
  primary: '#00D09C',        // accent — primary action, income, success
  primaryDark: '#00B386',
  primaryLight: '#00D09C',
  accent: '#00D09C',
  accentDim: 'rgba(0,208,156,0.12)',

  success: '#00D09C',
  warning: '#FFB347',
  error: '#FF5A7E',
  info: '#5B8DEF',

  red: '#FF5A7E',
  redDim: 'rgba(255,90,126,0.12)',
  orange: '#FFB347',
  orangeDim: 'rgba(255,179,71,0.12)',
  blue: '#5B8DEF',
  blueDim: 'rgba(91,141,239,0.12)',
  purple: '#A78BFA',
  pink: '#F472B6',
  yellow: '#FBBF24',

  // ─── Income / Expense (tiered) ─────────
  income: '#00D09C',
  expense: '#FF5A7E',
  expenseNormal: '#C4C9D4',   // muted silver — calm, informative
  expenseLarge: '#FFB347',     // orange — attention, not alarm (>500K)
  expenseOver: '#FF5A7E',      // red — only when over-budget

  // ─── Hero Gradient ─────────────────────
  hero1: '#4A3ABA',
  hero2: '#6C5CE7',
  hero3: '#8B7CF0',

  // ─── Platform Colors ───────────────────
  grab: '#00B14F',
  gojek: '#00AA13',
  shopee: '#EE4D2D',
  tokopedia: '#42B549',
  ovo: '#4C2A86',
  dana: '#108EE9',

  // ─── UI ────────────────────────────────
  divider: '#1E2A4A',
  overlay: 'rgba(0, 0, 0, 0.5)',
  tabBarBackground: '#0B0F1E',
  tabBarActive: '#00D09C',
  tabBarInactive: '#4A5C80',
} as const;

// --------------- Light Colors ---------------

export const LightColors = {
  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9',
  border: '#E2E8F0',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Accent & Semantic
  primary: '#00B386',
  primaryDark: '#009973',
  primaryLight: '#00D09C',
  accent: '#00B386',
  accentDim: 'rgba(0,179,134,0.12)',

  success: '#00B386',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  red: '#DC2626',
  redDim: 'rgba(220,38,38,0.08)',
  orange: '#D97706',
  orangeDim: 'rgba(217,119,6,0.08)',
  blue: '#2563EB',
  blueDim: 'rgba(37,99,235,0.08)',
  purple: '#7C3AED',
  pink: '#DB2777',
  yellow: '#D97706',

  // Income / Expense (tiered)
  income: '#00B386',
  expense: '#DC2626',
  expenseNormal: '#64748B',
  expenseLarge: '#D97706',
  expenseOver: '#DC2626',

  // Hero Gradient
  hero1: '#4A3ABA',
  hero2: '#6C5CE7',
  hero3: '#8B7CF0',

  // Platform Colors
  grab: '#00B14F',
  gojek: '#00AA13',
  shopee: '#EE4D2D',
  tokopedia: '#42B549',
  ovo: '#4C2A86',
  dana: '#108EE9',

  // UI
  divider: '#F1F5F9',
  overlay: 'rgba(0, 0, 0, 0.3)',
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#00B386',
  tabBarInactive: '#94A3B8',
} as const;

/** Backward-compatible alias */
export const Colors = DarkColors;

// --------------- Color palette type ---------------

export type ColorPalette = {
  readonly background: string;
  readonly surface: string;
  readonly surfaceLight: string;
  readonly border: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly primary: string;
  readonly primaryDark: string;
  readonly primaryLight: string;
  readonly accent: string;
  readonly accentDim: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
  readonly red: string;
  readonly redDim: string;
  readonly orange: string;
  readonly orangeDim: string;
  readonly blue: string;
  readonly blueDim: string;
  readonly purple: string;
  readonly pink: string;
  readonly yellow: string;
  readonly income: string;
  readonly expense: string;
  readonly expenseNormal: string;
  readonly expenseLarge: string;
  readonly expenseOver: string;
  readonly hero1: string;
  readonly hero2: string;
  readonly hero3: string;
  readonly grab: string;
  readonly gojek: string;
  readonly shopee: string;
  readonly tokopedia: string;
  readonly ovo: string;
  readonly dana: string;
  readonly divider: string;
  readonly overlay: string;
  readonly tabBarBackground: string;
  readonly tabBarActive: string;
  readonly tabBarInactive: string;
};

// --------------- Spacing (matches spec) ---------------

export const Spacing = {
  xs: 4,     // gap kecil (antar badge)
  sm: 8,     // padding internal kecil
  md: 12,    // gap antar items dalam list
  base: 16,  // padding card, gap standar
  lg: 20,    // padding section/hero
  xl: 24,    // gap antar sections
  xxl: 32,   // gap besar antar major sections
} as const;

// --------------- Border Radius (matches spec) ---------------

export const BorderRadius = {
  sm: 8,     // badge, tag
  md: 12,    // input, small card, button
  lg: 16,    // card, list container
  xl: 20,    // hero card, modal
  xxl: 22,   // main hero/banner
  full: 9999, // pill button, avatar
} as const;

// --------------- Typography (matches spec) ---------------

/** Typography styles for dark theme */
export const DarkTypography = {
  h1: {
    fontSize: 32,
    fontWeight: '900' as TextStyle['fontWeight'],
    letterSpacing: -1,
    lineHeight: 38,
    color: DarkColors.text,
  },
  h2: {
    fontSize: 24,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    lineHeight: 30,
    color: DarkColors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 24,
    color: DarkColors.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
    color: DarkColors.text,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 20,
    color: DarkColors.text,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
    color: DarkColors.textSecondary,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 16,
    color: DarkColors.textSecondary,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 1,
    lineHeight: 14,
    color: DarkColors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  xs: {
    fontSize: 10,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 14,
    color: DarkColors.textMuted,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 20,
    color: DarkColors.text,
  },
  amountLg: {
    fontSize: 28,
    fontWeight: '900' as TextStyle['fontWeight'],
    lineHeight: 34,
    color: DarkColors.text,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 12,
    color: DarkColors.text,
  },
} as const;

/** Typography styles for light theme */
export const LightTypography = {
  h1: { ...DarkTypography.h1, color: LightColors.text },
  h2: { ...DarkTypography.h2, color: LightColors.text },
  h3: { ...DarkTypography.h3, color: LightColors.text },
  body: { ...DarkTypography.body, color: LightColors.text },
  bodyBold: { ...DarkTypography.bodyBold, color: LightColors.text },
  caption: { ...DarkTypography.caption, color: LightColors.textSecondary },
  captionBold: { ...DarkTypography.captionBold, color: LightColors.textSecondary },
  label: { ...DarkTypography.label, color: LightColors.textSecondary },
  xs: { ...DarkTypography.xs, color: LightColors.textMuted },
  amount: { ...DarkTypography.amount, color: LightColors.text },
  amountLg: { ...DarkTypography.amountLg, color: LightColors.text },
  badge: { ...DarkTypography.badge, color: LightColors.text },
} as const;

/** Backward-compatible alias */
export const Typography = DarkTypography;

/** A single typography style entry compatible with RN TextStyle */
type TypoEntry = {
  readonly fontSize: number;
  readonly fontWeight: TextStyle['fontWeight'];
  readonly lineHeight: number;
  readonly color: string;
  readonly letterSpacing?: number;
  readonly textTransform?: TextStyle['textTransform'];
};

/** Structural type for typography sets */
export type TypographySet = {
  readonly h1: TypoEntry;
  readonly h2: TypoEntry;
  readonly h3: TypoEntry;
  readonly body: TypoEntry;
  readonly bodyBold: TypoEntry;
  readonly caption: TypoEntry;
  readonly captionBold: TypoEntry;
  readonly label: TypoEntry;
  readonly xs: TypoEntry;
  readonly amount: TypoEntry;
  readonly amountLg: TypoEntry;
  readonly badge: TypoEntry;
};

// --------------- Shadows ---------------

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  fab: {
    shadowColor: '#4A3ABA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

// --------------- Amount Color Helper ---------------

/**
 * Get the correct color for a transaction amount.
 * Follows the "Jangan Bikin User Takut" principle:
 * - Normal expenses → muted silver (calm, informative)
 * - Large expenses (>500K) → orange (attention, not alarm)
 * - Over-budget → red (only when action needed)
 * - Income → green (always positive)
 */
export function getAmountColor(
  colors: ColorPalette,
  amount: number,
  type: 'expense' | 'income',
  isOverBudget?: boolean,
): string {
  if (type === 'income') return colors.income;
  if (isOverBudget) return colors.expenseOver;
  if (amount >= 500000) return colors.expenseLarge;
  return colors.expenseNormal;
}

/**
 * Get progress bar color based on budget usage percentage.
 */
export function getProgressColor(
  colors: ColorPalette,
  percentage: number,
): string {
  if (percentage > 90) return colors.red;
  if (percentage > 70) return colors.orange;
  return colors.accent;
}
