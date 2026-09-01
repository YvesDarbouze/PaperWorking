import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { authFetch } from '@/lib/auth/auth-fetch';

let browserClient: SupabaseClient | null = null;
let browserClientPromise: Promise<SupabaseClient> | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('placeholder'));
}

/** Lazy browser-only client — avoids bundling @supabase/supabase-js into SSR (OTEL conflict). */
export async function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client is only available in the browser');
  }
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  if (browserClient) return browserClient;
  if (!browserClientPromise) {
    browserClientPromise = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      browserClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return browserClient;
    })();
  }
  return browserClientPromise;
}

function authErrorMessage(message: string | undefined, fallback?: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Incorrect email or password.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (m.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (m.includes('popup')) {
    return 'Sign-in popup was closed or blocked. Allow popups and try again.';
  }
  return fallback || message || 'Sign-in failed. Please try again.';
}

function toAuthError(err: unknown): Error {
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(authErrorMessage(String((err as { message: unknown }).message)));
  }
  if (err instanceof Error) return new Error(authErrorMessage(err.message));
  return new Error('Sign-in failed. Please try again.');
}

export function requireSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
}

/** Exchange Supabase access token for same-origin Next httpOnly session cookies. */
export async function syncNestSession(
  accessToken: string | null,
  accountType?: string,
): Promise<void> {
  try {
    if (accessToken) {
      const res = await authFetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, idToken: accessToken, accountType }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Session sync failed (${res.status})`);
      }
      return;
    }
    await authFetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
  } catch (err) {
    // Logout/session-clear is best-effort when the auth BFF is offline.
    if (!accessToken) return;
    throw err;
  }
}

export async function syncSessionFromSupabase(accountType?: string): Promise<Session | null> {
  requireSupabaseConfigured();
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAuthError(error);
  const session = data.session;
  if (session?.access_token) {
    await syncNestSession(session.access_token, accountType);
  }
  return session;
}

export async function supabaseLogin(email: string, password: string): Promise<User> {
  requireSupabaseConfigured();
  try {
    const supabase = await getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) throw error || new Error('Sign-in failed');
    await syncNestSession(data.session.access_token);
    return data.user;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function supabaseRegister(
  email: string,
  password: string,
  displayName: string,
  accountType = 'investor',
): Promise<User> {
  requireSupabaseConfigured();
  try {
    const supabase = await getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          account_type: accountType,
        },
      },
    });
    if (error || !data.user) throw error || new Error('Registration failed');
    window.localStorage.setItem('pw_pending_account_type', accountType);
    if (data.session?.access_token) {
      await syncNestSession(data.session.access_token, accountType);
    }
    return data.user;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

/** Starts Google OAuth (redirect). */
export async function supabaseLoginWithGoogle(accountType = 'investor'): Promise<void> {
  requireSupabaseConfigured();
  try {
    window.localStorage.setItem('pw_pending_account_type', accountType);
    const supabase = await getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function supabaseLoginWithFacebook(_accountType = 'investor'): Promise<boolean> {
  throw new Error('Facebook sign-in is not enabled. Use Google or email/password.');
}

export async function supabaseSendMagicLink(email: string): Promise<void> {
  requireSupabaseConfigured();
  try {
    const supabase = await getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login/finish`,
      },
    });
    if (error) throw error;
    window.localStorage.setItem('emailForSignIn', email);
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function supabaseResetPassword(email: string): Promise<void> {
  requireSupabaseConfigured();
  try {
    const supabase = await getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function supabaseLogout(): Promise<void> {
  try {
    await syncNestSession(null);
  } finally {
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseBrowserClient();
      await supabase.auth.signOut().catch(() => undefined);
    }
  }
}
