/**
 * DuitKu Design Tokens
 * Central theme constants for the mobile app.
 * All screens/components import colors, spacing, and typography from here.
 *
 * Supports dark and light themes. `Colors` is aliased to `DarkColors`
 * for backward compatibility during migration.
 */

// --------------- Theme Type ---------------

export type ThemeType = 'dark' | 'light' | 'system';

// --------------- Dark Colors (default) ---------------

export const DarkColors = {
  // Brand
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',

  // Background
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',

  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Income / Expense
  income: '#22C55E',
  expense: '#EF4444',

  // UI
  border: '#334155',
  divider: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Tab bar
  tabBarBackground: '#0F172A',
  tabBarActive: '#22C55E',
  tabBarInactive: '#64748B',
} as const;

// --------------- Light Colors ---------------

export const LightColors = {
  // Brand — same green identity
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',

  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Semantic
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  // Income / Expense
  income: '#16A34A',
  expense: '#DC2626',

  // UI
  border: '#E2E8F0',
  divider: '#F1F5F9',
  overlay: 'rgba(0, 0, 0, 0.3)',

  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#22C55E',
  tabBarInactive: '#94A3B8',
} as const;

/** Backward-compatible alias — existing code imports `Colors` */
export const Colors = DarkColors;

// --------------- Color palette type ---------------

/** Structural type that both DarkColors and LightColors satisfy */
export type ColorPalette = {
  readonly primary: string;
  readonly primaryDark: string;
  readonly primaryLight: string;
  readonly background: string;
  readonly surface: string;
  readonly surfaceLight: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
  readonly income: string;
  readonly expense: string;
  readonly border: string;
  readonly divider: string;
  readonly overlay: string;
  readonly tabBarBackground: string;
  readonly tabBarActive: string;
  readonly tabBarInactive: string;
};

// --------------- Spacing ---------------

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// --------------- Border Radius ---------------

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// --------------- Typography ---------------

/** Typography styles for dark theme */
export const DarkTypography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: DarkColors.text,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: DarkColors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: DarkColors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: DarkColors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: DarkColors.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: DarkColors.textSecondary,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    color: DarkColors.text,
  },
} as const;

/** Typography styles for light theme */
export const LightTypography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: LightColors.text,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: LightColors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: LightColors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: LightColors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: LightColors.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: LightColors.textSecondary,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    color: LightColors.text,
  },
} as const;

/** Backward-compatible alias — existing code imports `Typography` */
export const Typography = DarkTypography;

/** Structural type for typography that both dark and light sets satisfy */
export type TypographySet = {
  readonly h1: { readonly fontSize: number; readonly fontWeight: string; readonly lineHeight: number; readonly color: string };
  readonly h2: { readonly fontSize: number; readonly fontWeight: string; readonly lineHeight: number; readonly color: string };
  readonly h3: { readonly fontSize: number; readonly fontWeight: string; readonly lineHeight: number; readonly color: string };
  readonly body: { readonly fontSize: number; readonly fontWeight: string; readonly lineHeight: number; readonly color: string };
  readonly caption: { readonly fontSize: number; readonly fontWeight: string; readonly lineHeight: number; readonly color: string };
  readonly label: { readonly fontSize: number; readonly fontWeight: string; readonly lineHeight: number; readonly color: string };
  readonly amount: { readonly fontSize: number; readonly fontWeight: string; readonly lineHeight: number; readonly color: string };
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
} as const;
