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
  loginWithDevSession: (accountType?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

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

  const loginWithDevSession = useCallback(async (accountType = 'investor') => {
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
  }, [refresh]);

  const logout = useCallback(async () => {
    await destroySession();
    setAuthenticated(false);
    setProfile(null);
  }, []);

  const navContext = useMemo<NavigationContext>(() => {
    const plan = (profile?.subscriptionPlan ?? 'Individual').toLowerCase();
    const status = (profile?.subscriptionStatus ?? '').toLowerCase();
    const statusActive = status === 'active' || status === 'trialing';
    const planActive =
      !!plan && !plan.includes('free') && !plan.includes('none') && !plan.includes('unsubscribed');

    return {
      accountType: profile?.accountType ?? 'investor',
      subscriptionPlan: profile?.subscriptionPlan ?? 'Individual',
      // While auth is still loading, don't treat Deals as locked (avoids paywall flash/redirect).
      isSubscribed: loading ? true : statusActive || planActive,
    };
  }, [profile, loading]);

  const value = useMemo(
    () => ({
      loading,
      authenticated,
      profile,
      navContext,
      loginWithDevSession,
      logout,
      refresh,
    }),
    [loading, authenticated, profile, navContext, loginWithDevSession, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
