'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuthCard, { AuthBackLink, AuthFieldError, AuthNotice } from '@/components/auth/AuthCard';
import { useAuth } from '@/context/AuthContext';
import { forgotPasswordSchema } from '@/lib/auth/schemas';
import { AUTH_ROUTES } from '@/lib/auth/routes';

export default function ForgotPasswordPanel() {
  const { resetPassword, firebaseReady, supabaseReady, error: authError, clearError } = useAuth();
  const authProviderReady = firebaseReady || supabaseReady;
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    clearError();
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const parsed = forgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0]?.message ?? 'Invalid email' });
      setSubmitting(false);
      return;
    }

    try {
      await resetPassword(parsed.data.email);
      setSubmittedEmail(parsed.data.email);
      setSuccess(true);
    } catch {
      /* authError set in context */
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">Check your inbox</h1>
          <p className="mb-6 text-sm leading-relaxed text-[rgba(253,255,252,0.65)]">
            A reset link was sent to <span className="font-medium text-[#fdfffc]">{submittedEmail}</span>.
          </p>
          <AuthNotice>
            We never confirm whether an email exists in the system to prevent account enumeration.
          </AuthNotice>
          <div className="mt-6 space-y-3">
            <button type="button" className="auth-button-secondary" onClick={() => setSuccess(false)}>
              Try a different email
            </button>
            <Link
              href={AUTH_ROUTES.login}
              className="auth-button-secondary inline-flex items-center justify-center no-underline"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-[rgba(253,255,252,0.65)]">
          Enter the email tied to your account and we&apos;ll send a secure reset link.
        </p>
      </div>

      {authError ? (
        <div className="mb-4 rounded-xl border border-red-800/30 bg-red-950/40 px-4 py-3 text-xs text-red-300">
          {authError}
        </div>
      ) : null}

      {!authProviderReady ? (
        <div className="mb-4">
          <AuthNotice>
            Authentication is not configured yet. Enable Firebase or add NEXT_PUBLIC_SUPABASE_* env
            vars to send reset emails.
          </AuthNotice>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="auth-input" autoComplete="email" />
          <AuthFieldError message={errors.email} />
        </div>
        <button type="submit" className="auth-button-luminous" disabled={submitting || !authProviderReady}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <AuthBackLink href={AUTH_ROUTES.login}>← Back to sign in</AuthBackLink>
      </div>
    </AuthCard>
  );
}
