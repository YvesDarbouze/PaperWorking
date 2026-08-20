'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import AuthCard, { AuthFieldError, AuthNotice } from '@/components/auth/AuthCard';
import { loginSchema, registerSchema } from '@/lib/auth/schemas';
import { AUTH_ROUTES } from '@/lib/auth/routes';
import { createDevSession, resolveLoginRedirect } from '@/lib/auth/session-client';

type AuthMode = 'signin' | 'signup';

export default function LoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const accountType = searchParams.get('accountType') ?? 'investor';
  const redirectTo = searchParams.get('redirectTo') ?? searchParams.get('redirect') ?? '';

  const title = useMemo(
    () => (mode === 'signup' ? 'Create your account' : 'Welcome back'),
    [mode],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setNotice(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      fullName: String(formData.get('fullName') ?? ''),
      confirmPassword: String(formData.get('confirmPassword') ?? ''),
      acceptTerms: formData.get('acceptTerms') === 'on',
    };

    const parsed =
      mode === 'signup'
        ? registerSchema.safeParse(payload)
        : loginSchema.safeParse({ email: payload.email, password: payload.password });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setSubmitting(false);
      return;
    }

    const session = await createDevSession(accountType);
    if (!session.ok) {
      setNotice(
        session.body && typeof session.body === 'object' && 'error' in session.body
          ? `Session error: ${String((session.body as { error: unknown }).error)}`
          : 'Unable to establish a dev session. Configure Firebase credentials for production auth.',
      );
      setSubmitting(false);
      return;
    }

    const destination = resolveLoginRedirect({
      isNewUser: mode === 'signup',
      urlRedirectTo: redirectTo,
      hasActiveSubscription: mode !== 'signup',
    });
    router.push(destination);
    setSubmitting(false);
  }

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="text-sm text-[rgba(253,255,252,0.65)]">
          {mode === 'signup'
            ? '14-day trial. No charge until day 15.'
            : 'Sign in to your portfolio command center.'}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border p-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {(['signin', 'signup'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{
              background: mode === value ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: mode === value ? '#fdfffc' : 'rgba(253,255,252,0.55)',
            }}
            onClick={() => setMode(value)}
          >
            {value === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </div>

      {notice ? <div className="mb-4"><AuthNotice>{notice}</AuthNotice></div> : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <div>
            <label className="auth-label" htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" className="auth-input" autoComplete="name" />
            <AuthFieldError message={errors.fullName} />
          </div>
        ) : null}

        <div>
          <label className="auth-label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="auth-input" autoComplete="email" />
          <AuthFieldError message={errors.email} />
        </div>

        <div>
          <label className="auth-label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="auth-input" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          <AuthFieldError message={errors.password} />
        </div>

        {mode === 'signup' ? (
          <>
            <div>
              <label className="auth-label" htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" className="auth-input" autoComplete="new-password" />
              <AuthFieldError message={errors.confirmPassword} />
            </div>
            <label className="flex items-start gap-3 text-sm text-[rgba(253,255,252,0.72)]">
              <input name="acceptTerms" type="checkbox" className="mt-1" />
              <span>
                I agree to the{' '}
                <Link href="/terms" className="text-[#fdfffc] underline-offset-2 hover:underline">
                  Terms of Service
                </Link>
              </span>
            </label>
            <AuthFieldError message={errors.acceptTerms} />
          </>
        ) : (
          <div className="flex justify-end">
            <Link href={AUTH_ROUTES.forgotPassword} className="text-sm text-[rgba(253,255,252,0.65)] no-underline hover:text-[#fdfffc]">
              Forgot password?
            </Link>
          </div>
        )}

        <button type="submit" className="auth-button-primary" disabled={submitting}>
          {submitting ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <button type="button" className="auth-button-secondary" disabled>
          Continue with Google (Firebase — post-cutover)
        </button>
        <button
          type="button"
          className="auth-button-secondary"
          onClick={() => setNotice('Magic link delivery connects when Firebase auth is wired.')}
        >
          Email me a sign-in link
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-[rgba(253,255,252,0.55)]">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <button type="button" className="border-0 bg-transparent p-0 text-[#fdfffc] underline-offset-2 hover:underline" onClick={() => setMode('signin')}>
              Sign in
            </button>
          </>
        ) : (
          <>
            New to PaperWorking?{' '}
            <button
              type="button"
              className="border-0 bg-transparent p-0 text-[#fdfffc] underline-offset-2 hover:underline"
              onClick={() => router.push(`${AUTH_ROUTES.signup}${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`)}
            >
              Start your trial
            </button>
          </>
        )}
      </p>

      {mode === 'signup' ? (
        <p className="mt-3 text-center text-xs text-[rgba(253,255,252,0.45)]">
          Account type: <span className="text-[#fdfffc]">{accountType}</span>
        </p>
      ) : null}
    </AuthCard>
  );
}
