'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuthCard, { AuthFieldError, AuthNotice } from '@/components/auth/AuthCard';
import { AUTH_ROUTES } from '@/lib/auth/routes';

export default function MagicLinkFinishPanel() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter the email address that received the magic link.');
      return;
    }
    setNotice('Magic link delivery connects when Firebase auth is live. Email captured for preview.');
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Finish signing in</h1>
        <p className="text-sm text-[rgba(253,255,252,0.65)]">
          Confirm the email address that requested the secure sign-in link.
        </p>
      </div>

      {notice ? <div className="mb-4"><AuthNotice>{notice}</AuthNotice></div> : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label" htmlFor="email">Email</label>
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
        <button type="submit" className="auth-button-primary">Verify and continue</button>
      </form>

      <div className="mt-6 text-center">
        <Link href={AUTH_ROUTES.login} className="text-sm text-[rgba(253,255,252,0.65)] no-underline hover:text-[#fdfffc]">
          ← Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
