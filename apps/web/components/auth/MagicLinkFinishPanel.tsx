'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import AuthCard, { AuthFieldError, AuthNotice } from '@/components/auth/AuthCard';
import { AUTH_ROUTES } from '@/lib/auth/routes';
import { resolveLoginRedirect } from '@/lib/auth/session-client';
import { syncSessionCookie } from '@/lib/firebase/auth-client';
import { auth, isFirebaseConfigured } from '@/lib/firebase/config';

export default function MagicLinkFinishPanel() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('emailForSignIn');
    if (stored) setEmail(stored);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Enter the email address that received the magic link.');
      return;
    }
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured. Cannot complete magic-link sign-in.');
      return;
    }
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setError('This page is not a valid magic-link destination.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signInWithEmailLink(auth, email.trim(), window.location.href);
      await syncSessionCookie(result.user);
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

      {!isFirebaseConfigured() ? (
        <div className="mb-4">
          <AuthNotice>
            Firebase public config is missing. Magic-link completion requires NEXT_PUBLIC_FIREBASE_*.
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
