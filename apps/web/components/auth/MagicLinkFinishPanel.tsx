'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthCard, { AuthFieldError, AuthNotice } from '@/components/auth/AuthCard';
import { AUTH_ROUTES } from '@/lib/auth/routes';
import { resolveLoginRedirect } from '@/lib/auth/session-client';
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  syncNestSession,
} from '@/lib/supabase/auth-client';

export default function MagicLinkFinishPanel() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('emailForSignIn');
    if (stored) setEmail(stored);

    // Prefer auto-complete when Supabase already established a session from the link.
    void (async () => {
      if (!isSupabaseConfigured()) return;
      const supabase = await getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        const pending = window.localStorage.getItem('pw_pending_account_type') || undefined;
        try {
          await syncNestSession(data.session.access_token, pending);
          window.localStorage.removeItem('emailForSignIn');
          window.location.replace(
            resolveLoginRedirect({ isNewUser: false, hasActiveSubscription: true }),
          );
        } catch {
          /* fall through to manual confirm */
        }
      }
    })();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Enter the email address that received the magic link.');
      return;
    }
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Cannot complete magic-link sign-in.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = await getSupabaseBrowserClient();
      const { data, error: verifyError } = await supabase.auth.getSession();
      if (verifyError || !data.session?.access_token) {
        throw new Error(
          verifyError?.message ||
            'No active magic-link session. Open the link from your email again.',
        );
      }
      const pending = window.localStorage.getItem('pw_pending_account_type') || undefined;
      await syncNestSession(data.session.access_token, pending);
      window.localStorage.removeItem('emailForSignIn');
      window.location.replace(
        resolveLoginRedirect({
          isNewUser: false,
          hasActiveSubscription: true,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Magic-link verification failed.');
      setSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Finish signing in</h1>
        <p className="text-sm text-[rgba(253,255,252,0.65)]">
          Confirm the email address that requested the secure sign-in link.
        </p>
      </div>

      {!isSupabaseConfigured() ? (
        <div className="mb-4">
          <AuthNotice>
            Supabase public config is missing. Magic-link completion requires NEXT_PUBLIC_SUPABASE_*.
          </AuthNotice>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          <AuthFieldError message={error ?? undefined} />
        </div>
        <button type="submit" className="auth-button-luminous" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify and continue'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={AUTH_ROUTES.login}
          className="text-sm text-[rgba(253,255,252,0.65)] no-underline hover:text-[#fdfffc]"
        >
          ← Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
