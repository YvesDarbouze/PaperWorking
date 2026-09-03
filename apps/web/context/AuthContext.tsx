'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createDevSession,
  destroySession,
  fetchSessionProfile,
} from '@/lib/auth/session-client';
import {
  firebaseLogin,
  firebaseLoginWithFacebook,
  firebaseLoginWithGoogle,
  firebaseLogout,
  firebaseRegister,
  firebaseResetPassword,
  firebaseSendMagicLink,
  shouldUseFirebaseAuthClient,
  syncSessionFromFirebase,
} from '@/lib/firebase/auth-client';
import { useMockAuth } from '@/lib/data';
import type { NavigationContext } from '@/lib/navigation/nav-contract';

export interface AuthProfile {
  accountType: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

interface AuthContextValue {
  loading: boolean;
  authenticated: boolean;
  profile: AuthProfile | null;
  navContext: NavigationContext;
  error: string | null;
  /** True when Firebase Auth is enabled via feature flag and configured. */
  firebaseReady: boolean;
  /** Deprecated — Supabase removed in Phase E; always false. */
  supabaseReady: boolean;
  clearError: () => void;
  login: (email: string, password: string, accountType?: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    accountType?: string,
  ) => Promise<void>;
  loginWithGoogle: (accountType?: string) => Promise<boolean>;
  loginWithFacebook: (accountType?: string) => Promise<boolean>;
  sendMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithDevSession: (accountType?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firebaseReady = shouldUseFirebaseAuthClient();
  const supabaseReady = false;

  const clearError = useCallback(() => setError(null), []);

  const refresh = useCallback(async () => {
    let session = await fetchSessionProfile();
    if (!session.authenticated && firebaseReady) {
      try {
        await syncSessionFromFirebase();
        session = await fetchSessionProfile();
      } catch {
        // Session re-sync failed — remain unauthenticated until explicit login.
      }
    }
    setAuthenticated(session.authenticated);
    if (session.authenticated) {
      setProfile({
        accountType: session.accountType ?? 'investor',
        subscriptionPlan: session.subscriptionPlan ?? 'Individual',
        subscriptionStatus: session.subscriptionStatus ?? 'active',
      });
    } else {
      setProfile(null);
    }
  }, [firebaseReady]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (firebaseReady) {
          const pending =
            typeof window !== 'undefined'
              ? window.localStorage.getItem('pw_pending_account_type') || undefined
              : undefined;
          await syncSessionFromFirebase(pending || undefined);
        }
        if (!cancelled) await refresh();
      } catch {
        if (!cancelled) await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, firebaseReady]);

  const loginWithDevSession = useCallback(
    async (accountType = 'investor') => {
      if (!useMockAuth()) {
        return { ok: false, error: 'Dev session requires mock auth mode' };
      }
      const result = await createDevSession(accountType);
      if (!result.ok) {
        const message =
          result.body && typeof result.body === 'object' && 'error' in result.body
            ? String((result.body as { error: unknown }).error)
            : 'Unable to establish session';
        return { ok: false, error: message };
      }
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const login = useCallback(
    async (email: string, password: string, accountType = 'investor') => {
      setError(null);
      try {
        if (firebaseReady) {
          await firebaseLogin(email, password);
        } else if (useMockAuth()) {
          const result = await createDevSession(accountType);
          if (!result.ok) throw new Error('Unable to establish a dev session');
        } else {
          throw new Error('Authentication provider is not configured');
        }
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign-in failed';
        setError(message);
        throw err;
      }
    },
    [firebaseReady, refresh],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string, accountType = 'investor') => {
      setError(null);
      try {
        if (firebaseReady) {
          await firebaseRegister(email, password, displayName, accountType);
        } else if (useMockAuth()) {
          const result = await createDevSession(accountType);
          if (!result.ok) throw new Error('Unable to establish a dev session');
        } else {
          throw new Error('Authentication provider is not configured');
        }
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      }
    },
    [firebaseReady, refresh],
  );

  const loginWithGoogle = useCallback(
    async (accountType = 'investor') => {
      setError(null);
      try {
        if (firebaseReady) {
          await firebaseLoginWithGoogle(accountType);
          await refresh();
          return true;
        }
        throw new Error('Authentication provider is not configured');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign-in failed';
        setError(message);
        throw err;
      }
    },
    [firebaseReady, refresh],
  );

  const loginWithFacebook = useCallback(async (accountType = 'investor') => {
    setError(null);
    try {
      if (firebaseReady) {
        await firebaseLoginWithFacebook(accountType);
        await refresh();
        return true;
      }
      throw new Error('Authentication provider is not configured');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Facebook sign-in failed';
      setError(message);
      throw err;
    }
  }, [firebaseReady, refresh]);

  const sendMagicLink = useCallback(async (email: string) => {
    setError(null);
    try {
      if (firebaseReady) {
        await firebaseSendMagicLink(email);
        return;
      }
      throw new Error('Magic link requires Firebase Auth configuration');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link';
      setError(message);
      throw err;
    }
  }, [firebaseReady]);

  const resetPassword = useCallback(
    async (email: string) => {
      setError(null);
      try {
        if (firebaseReady) {
          await firebaseResetPassword(email);
          return;
        }
        throw new Error('Password reset requires Firebase Auth configuration');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Password reset failed';
        setError(message);
        throw err;
      }
    },
    [firebaseReady],
  );

  const logout = useCallback(async () => {
    try {
      if (firebaseReady) {
        await firebaseLogout();
      } else {
        await destroySession();
      }
    } catch {
      // Still clear local auth state if session clear fails.
    }
    setAuthenticated(false);
    setProfile(null);
  }, [firebaseReady]);

  const navContext = useMemo<NavigationContext>(() => {
    const plan = (profile?.subscriptionPlan ?? 'Individual').toLowerCase();
    const status = (profile?.subscriptionStatus ?? '').toLowerCase();
    const statusActive = status === 'active' || status === 'trialing';
    const planActive =
      !!plan && !plan.includes('free') && !plan.includes('none') && !plan.includes('unsubscribed');

    return {
      accountType: profile?.accountType ?? 'investor',
      subscriptionPlan: profile?.subscriptionPlan ?? 'Individual',
      isSubscribed: loading ? true : statusActive || planActive,
    };
  }, [profile, loading]);

  const value = useMemo(
    () => ({
      loading,
      authenticated,
      profile,
      navContext,
      error,
      supabaseReady,
      firebaseReady,
      clearError,
      login,
      register,
      loginWithGoogle,
      loginWithFacebook,
      sendMagicLink,
      resetPassword,
      loginWithDevSession,
      logout,
      refresh,
    }),
    [
      loading,
      authenticated,
      profile,
      navContext,
      error,
      firebaseReady,
      clearError,
      login,
      register,
      loginWithGoogle,
      loginWithFacebook,
      sendMagicLink,
      resetPassword,
      loginWithDevSession,
      logout,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
