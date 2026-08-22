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
} from '@/lib/firebase/auth-client';
import { isFirebaseConfigured } from '@/lib/firebase/config';
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
  firebaseReady: boolean;
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
  /** Migration fallback when Firebase public config is absent. */
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
  const firebaseReady = isFirebaseConfigured();

  const clearError = useCallback(() => setError(null), []);

  const refresh = useCallback(async () => {
    const session = await fetchSessionProfile();
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
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const loginWithDevSession = useCallback(
    async (accountType = 'investor') => {
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
        } else {
          const result = await createDevSession(accountType);
          if (!result.ok) throw new Error('Unable to establish a dev session');
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
        } else {
          const result = await createDevSession(accountType);
          if (!result.ok) throw new Error('Unable to establish a dev session');
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
        const isNew = await firebaseLoginWithGoogle(accountType);
        await refresh();
        return isNew;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign-in failed';
        setError(message);
        throw err;
      }
    },
    [refresh],
  );

  const loginWithFacebook = useCallback(
    async (accountType = 'investor') => {
      setError(null);
      try {
        const isNew = await firebaseLoginWithFacebook(accountType);
        await refresh();
        return isNew;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Facebook sign-in failed';
        setError(message);
        throw err;
      }
    },
    [refresh],
  );

  const sendMagicLink = useCallback(async (email: string) => {
    setError(null);
    try {
      await firebaseSendMagicLink(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link';
      setError(message);
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      if (firebaseReady) {
        await firebaseResetPassword(email);
      } else {
        throw new Error('Password reset requires Firebase configuration.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setError(message);
      throw err;
    }
  }, [firebaseReady]);

  const logout = useCallback(async () => {
    if (firebaseReady) {
      await firebaseLogout();
    } else {
      await destroySession();
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
