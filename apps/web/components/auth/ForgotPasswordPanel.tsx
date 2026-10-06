'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuthCard, { AuthBackLink, AuthFieldError, AuthNotice } from '@/components/auth/AuthCard';
import { forgotPasswordSchema } from '@/lib/auth/schemas';
import { AUTH_ROUTES } from '@/lib/auth/routes';

export default function ForgotPasswordPanel() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrors({ email: data.error || 'Failed to send password reset link.' });
        setSubmitting(false);
        return;
      }

      setSubmittedEmail(email);
      setSuccess(true);
    } catch {
      setErrors({ email: 'Network error occurred. Please try again.' });
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
            A password reset link was dispatched to <span className="font-medium text-[#fdfffc]">{submittedEmail}</span>.
            Please check your inbox and follow the direct link to choose a new password.
          </p>
          <AuthNotice>We never confirm whether an email exists in the system to prevent account enumeration.</AuthNotice>
          <div className="mt-6 space-y-3">
            <button type="button" className="auth-button-secondary" onClick={() => setSuccess(false)}>
              Try a different email
            </button>
            <Link href={AUTH_ROUTES.login} className="auth-button-secondary inline-flex items-center justify-center no-underline">
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

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="auth-input" autoComplete="email" />
          <AuthFieldError message={errors.email} />
        </div>
        <button type="submit" className="auth-button-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <AuthBackLink href={AUTH_ROUTES.login}>← Back to sign in</AuthBackLink>
      </div>
    </AuthCard>
  );
}
