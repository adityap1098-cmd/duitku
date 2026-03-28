/**
 * Settings store — persists user preferences for biometric lock,
 * theme selection, and onboarding state.
 *
 * Follows the same Zustand + AsyncStorage pattern as notification-store.ts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------- Types ---------------

export type ThemePreference = 'dark' | 'light' | 'system';

interface SettingsState {
  /** Whether biometric lock is enabled */
  biometricEnabled: boolean;
  /** User's theme preference */
  theme: ThemePreference;
  /** Whether the user has completed the onboarding flow */
  hasSeenOnboarding: boolean;
}

interface SettingsActions {
  /** Enable or disable biometric lock */
  setBiometricEnabled: (enabled: boolean) => void;
  /** Set the theme preference */
  setTheme: (theme: ThemePreference) => void;
  /** Mark onboarding as seen */
  setHasSeenOnboarding: (seen: boolean) => void;
}

type SettingsStore = SettingsState & SettingsActions;

// --------------- Store ---------------

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State — defaults
      biometricEnabled: false,
      theme: 'dark',
      hasSeenOnboarding: false,

      // Actions
      setBiometricEnabled: (enabled: boolean) =>
        set({ biometricEnabled: enabled }),

      setTheme: (theme: ThemePreference) => set({ theme }),

      setHasSeenOnboarding: (seen: boolean) =>
        set({ hasSeenOnboarding: seen }),
    }),
    {
      name: 'duitku-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
