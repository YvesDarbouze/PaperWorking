import { DASHBOARD_ROUTE, resolvePostAuthDestination } from '@/lib/auth/post-auth-redirect';
import { DEV_MOCK_SESSION_TOKEN } from '@/lib/auth/session-cookies';
import { apiFetch } from '@/lib/api/client';
import { useMockAuth } from '@/lib/data';

export interface CreateSessionResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export async function fetchSessionProfile(): Promise<{
  authenticated: boolean;
  accountType?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}> {
  const response = await apiFetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
  if (!response.ok) return { authenticated: false };
  return response.json();
}

export async function createDevSession(accountType = 'investor'): Promise<CreateSessionResult> {
  if (!useMockAuth()) {
    throw new Error('Firebase is required');
  }

  const response = await apiFetch('/api/auth/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: DEV_MOCK_SESSION_TOKEN, accountType }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { ok: response.ok, status: response.status, body };
}

export async function destroySession(): Promise<boolean> {
  const response = await apiFetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.ok;
}

export function resolveLoginRedirect(options?: {
  isNewUser?: boolean;
  urlRedirectTo?: string;
  hasActiveSubscription?: boolean;
}): string {
  if (typeof window === 'undefined') return DASHBOARD_ROUTE;
  return resolvePostAuthDestination(options ?? {}, window.sessionStorage);
}
