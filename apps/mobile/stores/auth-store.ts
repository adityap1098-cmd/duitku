/**
 * Auth store — Zustand store with expo-secure-store persistence.
 * Manages user session state consumed by _layout.tsx for auth guard routing.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

import type { UserProfile } from '@duitku/shared';
import * as auth from '../lib/auth';

// --------------- Secure Storage Adapter ---------------

/**
 * Custom Zustand storage adapter using expo-secure-store.
 * Data is encrypted at rest on the device.
 */
const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

// --------------- Store Types ---------------

interface AuthState {
  /** Current authenticated user profile, or null if not logged in */
  user: UserProfile | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the auth state is being loaded from storage */
  isLoading: boolean;
  /** Whether a login or refresh operation is in progress */
  isAuthenticating: boolean;
  /** Last auth error message, if any */
  error: string | null;
}

interface AuthActions {
  /** Login with Google OAuth */
  loginWithGoogle: () => Promise<void>;
  /** Logout and clear all auth state */
  logout: () => Promise<void>;
  /** Set loading state (called during hydration) */
  setLoading: (loading: boolean) => void;
  /** Clear any error state */
  clearError: () => void;
  /** Restore session from stored tokens (check if still valid) */
  restoreSession: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// --------------- Store ---------------

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: true, // starts true until hydration completes
      isAuthenticating: false,
      error: null,

      // Actions
      loginWithGoogle: async () => {
        set({ isAuthenticating: true, error: null });
        try {
          const result = await auth.login();
          set({
            user: result.user,
            isAuthenticated: true,
            isAuthenticating: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof auth.AuthError
            ? error.message
            : 'Login gagal. Coba lagi.';
          set({
            isAuthenticating: false,
            error: message,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await auth.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      clearError: () => set({ error: null }),

      restoreSession: async () => {
        const token = await auth.getAccessToken();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        // We have a stored token — try to refresh it to verify it's still valid
        const refreshed = await auth.refreshAccessToken();
        if (!refreshed) {
          // Token expired and refresh failed — clear everything
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        // Token refresh succeeded — keep current user from persisted state
        // The user profile is persisted by zustand, so it survives app restarts
        const currentUser = get().user;
        set({
          isLoading: false,
          isAuthenticated: currentUser !== null,
        });
      },
    }),
    {
      name: 'duitku-auth-store',
      storage: createJSONStorage(() => secureStorage),
      // Only persist user and isAuthenticated — not transient UI state
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          // After hydration, mark loading as false
          if (state) {
            state.setLoading(false);
          }
        };
      },
    }
  )
);
