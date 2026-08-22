'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthCard, { AuthFieldError } from '@/components/auth/AuthCard';
import { useAuth } from '@/context/AuthContext';
import { AUTH_ROUTES } from '@/lib/auth/routes';
import { loginSchema, registerSchema } from '@/lib/auth/schemas';
import { resolveLoginRedirect } from '@/lib/auth/session-client';

type LoginMode = 'password' | 'magic-link';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.384C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/**
 * Login / Sign up — visual + flow parity with PaperWorking v0
 * (Google, Facebook, Password / Magic Link).
 */
export default function LoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    register: authRegister,
    loginWithGoogle,
    loginWithFacebook,
    sendMagicLink,
    error: authError,
    clearError,
    authenticated,
    loading: authLoading,
    firebaseReady,
  } = useAuth();

  const urlMode = searchParams.get('mode');
  const accountType = searchParams.get('accountType') ?? 'investor';
  const redirectTo = searchParams.get('redirectTo') ?? searchParams.get('redirect') ?? '';
  const sessionReason = searchParams.get('reason');

  const [isSignUp, setIsSignUp] = useState(urlMode === 'signup');
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (authLoading) return;
    if (authenticated && sessionReason !== 'session_expired' && !isSignUp) {
      router.replace(
        resolveLoginRedirect({
          isNewUser: false,
          urlRedirectTo: redirectTo,
          hasActiveSubscription: true,
        }),
      );
    }
  }, [authenticated, authLoading, isSignUp, redirectTo, router, sessionReason]);

  function redirectAfterAuth(isNewUser: boolean) {
    const dest = resolveLoginRedirect({
      isNewUser,
      urlRedirectTo: redirectTo,
      hasActiveSubscription: !isNewUser,
    });
    window.location.replace(dest);
  }

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setLocalError(null);
    clearError();

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    };
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password, accountType);
      redirectAfterAuth(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setLocalError(null);
    clearError();

    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: String(form.get('fullName') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      confirmPassword: String(form.get('confirmPassword') ?? ''),
      acceptTerms,
    };
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setIsSubmitting(true);
    try {
      await authRegister(
        parsed.data.email,
        parsed.data.password,
        parsed.data.fullName,
        accountType,
      );
      redirectAfterAuth(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!magicEmail.trim()) return;
    setIsSubmitting(true);
    setLocalError(null);
    clearError();
    try {
      await sendMagicLink(magicEmail.trim());
      setMagicLinkSent(true);
    } catch {
      /* error in AuthContext */
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocial(provider: 'google' | 'facebook') {
    setLocalError(null);
    clearError();
    if (isSignUp && !acceptTerms) {
      setLocalError('You must accept the Terms of Service and Privacy Policy to register.');
      return;
    }
    if (!firebaseReady) {
      setLocalError(
        'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to enable Google/Facebook sign-in.',
      );
      return;
    }

    setLoadingProvider(provider);
    try {
      const isNewUser =
        provider === 'google'
          ? await loginWithGoogle(accountType)
          : await loginWithFacebook(accountType);
      redirectAfterAuth(isNewUser || isSignUp);
    } catch {
      /* error in AuthContext */
    } finally {
      setLoadingProvider(null);
    }
  }

  const bannerError = localError || authError;

  return (
    <AuthCard>
      <div className="flex w-full flex-col items-center">
        <div className="mb-6 text-center">
          <h1 className="mb-2 font-thin text-xl tracking-tight text-white md:text-2xl">
            {isSignUp ? 'Sign up' : 'Sign in'}
          </h1>
          <p className="text-xs text-[rgba(253,255,252,0.55)] md:text-sm">
            {isSignUp
              ? 'Create your account and start your first Project. 14-day trial, no charge until day 15.'
              : loginMode === 'magic-link'
                ? 'Enter your email for a secure passwordless sign-in.'
                : 'Welcome back. Your deals kept moving while you were gone.'}
          </p>
        </div>

        {sessionReason === 'session_expired' && !bannerError ? (
          <div className="mb-5 flex w-full items-start gap-3 rounded-xl border border-amber-800/30 bg-amber-950/40 px-4 py-3 text-amber-300">
            <span className="material-symbols-outlined mt-0.5 text-[16px] text-amber-400">
              shield
            </span>
            <p className="text-xs font-medium leading-relaxed">
              Your session expired. Please sign in again to continue.
            </p>
          </div>
        ) : null}

        {bannerError ? (
          <div className="mb-5 flex w-full items-start gap-3 rounded-xl border border-red-800/30 bg-red-950/40 px-4 py-3 text-red-300">
            <span className="material-symbols-outlined mt-0.5 text-[16px] text-red-400">error</span>
            <p className="text-xs font-medium leading-relaxed">{bannerError}</p>
          </div>
        ) : null}

        {/* Social */}
        <div className="mb-5 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => void handleSocial('google')}
            disabled={!!loadingProvider || isSubmitting}
            className="auth-btn-social flex w-full items-center justify-center gap-3 py-3 disabled:opacity-50"
          >
            {loadingProvider === 'google' ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <GoogleIcon />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Continue with Google
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleSocial('facebook')}
            disabled={!!loadingProvider || isSubmitting}
            className="auth-btn-social flex w-full items-center justify-center gap-3 py-3 disabled:opacity-50"
          >
            {loadingProvider === 'facebook' ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            ) : (
              <FacebookIcon />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Continue with Facebook
            </span>
          </button>
        </div>

        {/* Or */}
        <div className="mb-5 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Or</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {/* Password / Magic Link toggle */}
        <div
          className="mb-5 flex w-full rounded-xl border border-white/5 p-1"
          style={{ backgroundColor: 'rgba(13, 10, 11, 0.6)' }}
        >
          {(['password', 'magic-link'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLoginMode(mode)}
              className="h-9 flex-1 rounded-lg border border-transparent text-xs font-semibold transition-all"
              style={
                loginMode === mode
                  ? {
                      backgroundColor: 'rgba(30, 27, 32, 0.8)',
                      color: '#fdfffc',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      borderColor: 'rgba(255,255,255,0.05)',
                    }
                  : { color: '#859490' }
              }
            >
              {mode === 'password' ? 'Password' : 'Magic Link'}
            </button>
          ))}
        </div>

        <div className="relative w-full" style={{ minHeight: 220 }}>
          {/* Sign in — password */}
          {loginMode === 'password' && !isSignUp ? (
            <form onSubmit={handlePasswordLogin} className="w-full space-y-4">
              <div>
                <label htmlFor="login-email" className="auth-label">
                  Email Address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="auth-input"
                />
                <AuthFieldError message={fieldErrors.email} />
              </div>

              <div>
                <label htmlFor="login-password" className="auth-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="auth-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <AuthFieldError message={fieldErrors.password} />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="border-0 bg-transparent p-0 text-xs text-white/55 hover:text-white"
                >
                  Create an account
                </button>
                <Link
                  href={AUTH_ROUTES.forgotPassword}
                  className="text-xs text-white/55 no-underline hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!loadingProvider}
                className="auth-button-luminous disabled:opacity-50"
              >
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          ) : null}

          {/* Sign up — password */}
          {loginMode === 'password' && isSignUp ? (
            <form onSubmit={handleSignup} className="w-full space-y-4">
              <div>
                <label htmlFor="signup-name" className="auth-label">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  className="auth-input"
                />
                <AuthFieldError message={fieldErrors.fullName} />
              </div>

              <div>
                <label htmlFor="signup-email" className="auth-label">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="auth-input"
                />
                <AuthFieldError message={fieldErrors.email} />
              </div>

              <div>
                <label htmlFor="signup-password" className="auth-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className="auth-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <AuthFieldError message={fieldErrors.password} />
              </div>

              <div>
                <label htmlFor="signup-confirm" className="auth-label">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="auth-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <AuthFieldError message={fieldErrors.confirmPassword} />
              </div>

              <div className="mt-2 flex items-start gap-2.5">
                <input
                  id="signup-terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5"
                />
                <label htmlFor="signup-terms" className="cursor-pointer select-none text-xs leading-relaxed text-white/55">
                  I accept the{' '}
                  <Link href="/terms" target="_blank" className="text-white underline hover:opacity-90">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-white underline hover:opacity-90">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
              <AuthFieldError message={fieldErrors.acceptTerms} />

              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="border-0 bg-transparent p-0 text-xs text-white/55 hover:text-white"
              >
                Already have an account? Sign in
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !!loadingProvider}
                className="auth-button-luminous disabled:opacity-50"
              >
                {isSubmitting ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          ) : null}

          {/* Magic link */}
          {loginMode === 'magic-link' ? (
            <div className="w-full">
              {magicLinkSent ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <span className="material-symbols-outlined text-[28px] text-white/80">
                      mark_email_read
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">Check your inbox</h3>
                  <p className="mx-auto mb-6 max-w-[280px] text-xs leading-relaxed text-white/55">
                    Sign-in link sent to <span className="font-medium text-white">{magicEmail}</span>.
                    It expires in 15 minutes.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMagicLinkSent(false)}
                    className="border-0 bg-transparent p-0 text-xs text-white/55 hover:text-white"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label htmlFor="magic-email" className="auth-label">
                      Email Address
                    </label>
                    <input
                      id="magic-email"
                      type="email"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="auth-input"
                    />
                    <p className="mt-2 pl-1 text-xs leading-relaxed text-white/45">
                      We&apos;ll email you a one-time sign-in link. No password needed.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !!loadingProvider || !magicEmail.trim()}
                    className="auth-button-luminous disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending…' : 'Send Magic Link'}
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-center text-xs text-white/55">
          New to PaperWorking?{' '}
          <Link href="/pricing" className="font-semibold text-white no-underline hover:opacity-90">
            Start your 14-day trial
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
