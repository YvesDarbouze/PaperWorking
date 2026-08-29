'use client';

import { useEffect, useState } from 'react';
import { resolveLoginRedirect } from '@/lib/auth/session-client';
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  syncNestSession,
} from '@/lib/supabase/auth-client';

/**
 * OAuth / magic-link return URL.
 * Exchanges Supabase session → Nest httpOnly __session cookie.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        if (!isSupabaseConfigured()) {
          throw new Error('Supabase is not configured');
        }
        const supabase = await getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session?.access_token) {
          throw new Error('No Supabase session after OAuth callback');
        }

        const pending = window.localStorage.getItem('pw_pending_account_type') || 'investor';
        await syncNestSession(data.session.access_token, pending);
        const isNew =
          Boolean(data.session.user?.created_at) &&
          Date.now() - new Date(data.session.user.created_at).getTime() < 60_000;

        window.location.replace(
          resolveLoginRedirect({
            isNewUser: isNew,
            hasActiveSubscription: true,
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication callback failed');
      }
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0B0E] px-4 text-[#F3F1EC]">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <h1 className="mb-2 text-xl font-semibold">Sign-in failed</h1>
            <p className="mb-4 text-sm text-red-300">{error}</p>
            <a href="/login" className="text-sm text-[#00DD94] underline">
              Return to login
            </a>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold">Completing sign-in…</h1>
            <p className="text-sm text-[rgba(243,241,236,0.65)]">
              Establishing your secure session.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
