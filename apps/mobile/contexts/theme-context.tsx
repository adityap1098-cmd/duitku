/**
 * ThemeProvider — resolves the active color scheme (dark/light/system)
 * and provides all design tokens (Colors, Typography, Spacing, etc.)
 * to the component tree via React Context.
 *
 * Usage:
 *   <ThemeProvider> ... </ThemeProvider>
 *
 *   const { Colors, Typography, isDark, setTheme } = useTheme();
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  DarkColors,
  LightColors,
  DarkTypography,
  LightTypography,
  Spacing,
  BorderRadius,
  Shadows,
  type ColorPalette,
  type TypographySet,
  type ThemeType,
} from '../constants/theme';
import { useSettingsStore, type ThemePreference } from '../stores/settings-store';

// --------------- Context Type ---------------

interface ThemeContextValue {
  /** Active color palette */
  Colors: ColorPalette;
  /** Active typography set */
  Typography: TypographySet;
  /** Spacing tokens (theme-independent) */
  Spacing: typeof Spacing;
  /** Border radius tokens (theme-independent) */
  BorderRadius: typeof BorderRadius;
  /** Shadow tokens (theme-independent) */
  Shadows: typeof Shadows;
  /** Whether the active theme is dark */
  isDark: boolean;
  /** Current theme preference */
  theme: ThemePreference;
  /** Update theme preference */
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// --------------- Provider ---------------

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const themePref = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const value = useMemo<ThemeContextValue>(() => {
    // Resolve effective theme
    let isDark: boolean;
    if (themePref === 'system') {
      isDark = systemScheme !== 'light'; // default to dark if null
    } else {
      isDark = themePref === 'dark';
    }

    return {
      Colors: isDark ? DarkColors : LightColors,
      Typography: isDark ? DarkTypography : LightTypography,
      Spacing,
      BorderRadius,
      Shadows,
      isDark,
      theme: themePref,
      setTheme,
    };
  }, [themePref, systemScheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// --------------- Hook ---------------

/**
 * Access the active theme tokens. Must be called inside <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used within a <ThemeProvider>');
  }
  return ctx;
}
