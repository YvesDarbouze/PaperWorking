'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import AuthCard, { AuthFieldError, AuthNotice } from '@/components/auth/AuthCard';
import { passwordResetSchema } from '@/lib/auth/schemas';
import { AUTH_ROUTES, isAuthActionMode } from '@/lib/auth/routes';

export default function AuthActionPanel() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const invalidLink = !oobCode || !isAuthActionMode(mode);
  const title = useMemo(() => {
    if (invalidLink) return 'Link expired or invalid';
    if (mode === 'resetPassword') return 'Set new password';
    return 'Verify your email';
  }, [invalidLink, mode]);

  function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = passwordResetSchema.safeParse({
      password: String(formData.get('password') ?? ''),
      confirmPassword: String(formData.get('confirmPassword') ?? ''),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSuccess('Password reset form validated. Firebase action handler connects at cutover.');
  }

  if (invalidLink) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
          <p className="mb-6 text-sm text-[rgba(253,255,252,0.65)]">
            This authentication link is missing required parameters or has expired.
          </p>
          <Link href={AUTH_ROUTES.login} className="auth-button-primary inline-flex items-center justify-center no-underline">
            Return to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (success) {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">Action complete</h1>
          <AuthNotice>{success}</AuthNotice>
          <Link href={AUTH_ROUTES.login} className="auth-button-primary mt-6 inline-flex items-center justify-center no-underline">
            Proceed to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (mode === 'verifyEmail') {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
          <AuthNotice>
            Email verification for code <span className="font-mono text-[#fdfffc]">{oobCode.slice(0, 8)}…</span> will
            Firebase verification runs when action codes are wired at cutover.
          </AuthNotice>
          <Link href={AUTH_ROUTES.login} className="auth-button-primary mt-6 inline-flex items-center justify-center no-underline">
            Return to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-[rgba(253,255,252,0.65)]">Choose a new password for your account.</p>
      </div>

      <form className="space-y-4" onSubmit={handleResetSubmit}>
        <div>
          <label className="auth-label" htmlFor="password">New password</label>
          <input id="password" name="password" type="password" className="auth-input" autoComplete="new-password" />
          <AuthFieldError message={errors.password} />
        </div>
        <div>
          <label className="auth-label" htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" className="auth-input" autoComplete="new-password" />
          <AuthFieldError message={errors.confirmPassword} />
        </div>
        <button type="submit" className="auth-button-primary">Save new password</button>
      </form>
    </AuthCard>
  );
}
