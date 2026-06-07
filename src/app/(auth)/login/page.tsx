'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues, registerSchema, type RegisterFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full rounded-xl bg-pw-surface animate-pulse" style={{ height: '480px', backgroundColor: '#141414' }} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRedirectTo = searchParams.get('redirectTo') || searchParams.get('redirect') || '';
  const urlPlan       = searchParams.get('plan') || '';
  const sessionReason = searchParams.get('reason');
  const urlAccountType = (searchParams.get('accountType') || 'investor') as 'investor' | 'vendor';
  const urlMode       = searchParams.get('mode'); // 'signup' when arriving from /register

  const {
    login,
    register: authRegister,
    logout,
    loginWithGoogle,
    loginWithFacebook,
    sendMagicLink,
    error: authError,
    clearError,
    user,
    loading,
    isAuthenticating,
    sessionReady,
  } = useAuth();

  // Prevents double router.replace: set to true by whichever code path
  // (handleSocialLogin or the user-watcher useEffect) fires first.
  const navigatingRef = useRef(false);

  const [handledExpired, setHandledExpired] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (sessionReason === 'session_expired' && !handledExpired) {
      if (user) {
        logout().catch(console.error).finally(() => {
          setHandledExpired(true);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('reason');
          router.replace(newUrl.pathname + newUrl.search);
        });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHandledExpired(true);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('reason');
        router.replace(newUrl.pathname + newUrl.search);
      }
    }
  }, [sessionReason, user, loading, handledExpired, logout, router]);

  // Backward-compat: old live-site links used /login?plan=Individual%20Investor&redirectTo=/pricing.
  // If that param arrives and there's no newer sessionStorage intent, mint one now so the
  // post-auth redirect lands at /pricing and auto-resumes the Stripe checkout.
  useEffect(() => {
    if (typeof window === 'undefined' || !urlPlan) return;
    if (!sessionStorage.getItem('pw_pending_plan')) {
      sessionStorage.setItem('pw_pending_plan', JSON.stringify({
        plan: urlPlan,
        interval: 'monthly',
        identifier: `${urlPlan} Monthly`,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute the best redirect destination (priority order):
  // 1. If pw_pending_plan exists in sessionStorage → go to /pricing (checkout resume)
  // 2. If redirectTo URL param exists → use it
  // 3. If pw_auth_redirect exists in sessionStorage (saved before social OAuth) → use it
  // 4. Default → /dashboard
  const getRedirectDestination = (): string => {
    if (typeof window === 'undefined') return urlRedirectTo || '/dashboard';

    // Highest priority: pending checkout intent
    if (sessionStorage.getItem('pw_pending_plan')) {
      sessionStorage.removeItem('pw_auth_redirect'); // clean up
      return '/pricing';
    }

    // URL param (available for email/password login)
    if (urlRedirectTo) {
      sessionStorage.removeItem('pw_auth_redirect'); // clean up
      return urlRedirectTo;
    }

    // Saved redirect from before social auth (survives the OAuth round-trip)
    const savedRedirect = sessionStorage.getItem('pw_auth_redirect');
    if (savedRedirect) {
      sessionStorage.removeItem('pw_auth_redirect'); // one-time use
      return savedRedirect;
    }

    return '/dashboard';
  };

  // Clear any stale auth errors from previous pages
  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // sessionReady: /api/auth/session POST confirmed — __session cookie is set.
    if (!loading && user && sessionReady && !sessionReason && !isAuthenticating && !navigatingRef.current) {
      navigatingRef.current = true;
      const dest = getRedirectDestination();
      window.location.replace(dest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, sessionReady, sessionReason, isAuthenticating]);

  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [loginMode, setLoginMode]             = useState<'password' | 'magic-link'>('password');
  const [isSignUp, setIsSignUp]               = useState(urlMode === 'signup');
  const signupStartedFiredRef = useRef(false);
  useEffect(() => {
    if (isSignUp && !signupStartedFiredRef.current) {
      signupStartedFiredRef.current = true;
      try {
        const ph = (window as any).posthog;
        if (ph?.capture) ph.capture('signup_started', { source: urlMode === 'signup' ? 'direct' : 'toggle' });
      } catch { /* non-fatal */ }
    }
  }, [isSignUp, urlMode]);
  const [magicLinkSent, setMagicLinkSent]     = useState(false);
  const [magicEmail, setMagicEmail]           = useState('');

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const { register: registerSignup, handleSubmit: handleSignupSubmit, watch: watchSignup, formState: { errors: signupErrors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const onSubmitPassword = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await login(data.email, data.password);
      navigatingRef.current = true;
      const dest = getRedirectDestination();
      window.location.replace(dest);
    } catch { /* error set via AuthContext */ }
    finally { setIsSubmitting(false); }
  };

  const onSubmitSignup = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await authRegister(data.email, data.password, data.fullName, urlAccountType);
      navigatingRef.current = true;
      const dest = getRedirectDestination();
      window.location.replace(dest);
    } catch { /* error set via AuthContext */ }
    finally { setIsSubmitting(false); }
  };

  const onSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail) return;
    setIsSubmitting(true);
    clearError();
    try {
      await sendMagicLink(magicEmail);
      setMagicLinkSent(true);
    } catch { /* error set via AuthContext */ }
    finally { setIsSubmitting(false); }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (isSignUp) {
      const isAccepted = watchSignup('acceptTerms');
      if (!isAccepted) {
        toast.error('You must accept the Terms of Service and Privacy Policy to register.');
        return;
      }
      
      // Pre-fetch IP from /api/auth/ip and save to localStorage
      try {
        const ipRes = await fetch('/api/auth/ip');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          window.localStorage.setItem('pw_pending_consent_ip', ipData.ip || '127.0.0.1');
        }
      } catch (e) {
        window.localStorage.setItem('pw_pending_consent_ip', '127.0.0.1');
      }
      window.localStorage.setItem('pw_pending_consent_version', 'v1.0');
    }

    setLoadingProvider(provider);
    clearError();
    // Persist account type for provisionSocialUser() to read
    if (typeof window !== 'undefined' && urlAccountType) {
      window.localStorage.setItem('pw_pending_account_type', urlAccountType);
    }
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithFacebook();
      navigatingRef.current = true;
      const dest = getRedirectDestination();
      window.location.replace(dest);
    } catch (err) {
      const msg = (err instanceof Error ? err.message : null) || authError || 'Sign-in failed. Please try again.';
      toast.error(msg, { id: 'social-login-error', duration: 6000 });
      setLoadingProvider(null);
    }
  };

  return (
    <div className="auth-card-container auth-glass-card p-6 md:p-10 relative overflow-hidden animate-in fade-in duration-500">
      <div className="absolute top-0 right-0 w-16 h-16 border-t border-r rounded-tr-xl pointer-events-none" style={{ borderColor: 'rgba(69, 73, 85, 0.2)' }} />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l rounded-bl-xl pointer-events-none" style={{ borderColor: 'rgba(69, 73, 85, 0.2)' }} />

      <div className="flex flex-col items-center w-full relative z-10">
        {/* ── Heading ── */}
        <div className="mb-6 text-center">
          <h1 className="text-xl md:text-2xl font-thin tracking-tight text-white mb-2 font-headline-md">
            {isSignUp ? 'Sign up' : 'Sign in'}
          </h1>
          <p className="text-xs md:text-sm text-pw-muted font-body-sm">
            {isSignUp
              ? `Create your ${urlAccountType} account.`
              : loginMode === 'magic-link'
              ? 'Enter your email for a secure passwordless sign-in.'
              : 'Access your PaperWorking portfolio.'}
          </p>
        </div>

        {/* ── Session expired notice (from proxy redirect) ── */}
        {sessionReason === 'session_expired' && !authError && (
          <div className="w-full mb-5 px-4 py-3 bg-amber-950/40 border border-amber-800/30 text-amber-300 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <p className="text-xs font-medium text-amber-300 leading-relaxed">
              Your session expired. Please sign in again to continue.
            </p>
          </div>
        )}

        {/* ── Error banner ── */}
        {authError && (
          <div className="w-full mb-5 px-4 py-3 bg-red-950/40 border border-red-800/30 text-red-300 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <p className="text-xs font-medium text-red-300 leading-relaxed">{authError}</p>
          </div>
        )}

        {/* ── Social Buttons (stacked) ── */}
        <div className="w-full flex flex-col gap-3 mb-5">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={!!loadingProvider || isSubmitting}
            className="pw-interactive-custom w-full py-3 px-4 btn-social flex items-center justify-center gap-3 disabled:opacity-50 text-white"
          >
            {loadingProvider === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span className="font-semibold text-xs tracking-wider uppercase text-white">
              Continue with Google
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('facebook')}
            disabled={!!loadingProvider || isSubmitting}
            className="pw-interactive-custom w-full py-3 px-4 btn-social flex items-center justify-center gap-3 disabled:opacity-50 text-white"
          >
            {loadingProvider === 'facebook' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <svg className="w-5 h-5 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.384C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            <span className="font-semibold text-xs tracking-wider uppercase text-white">
              Continue with Facebook
            </span>
          </button>
        </div>

        {/* ── Or divider ── */}
        <div className="w-full flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/5" />
          <span className="uppercase tracking-widest font-semibold text-pw-muted/60" style={{ fontSize: '10px' }}>Or</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* ── Mode toggle ── */}
        <div className="w-full flex border border-white/5 rounded-xl p-1 mb-5" style={{ backgroundColor: 'rgba(13, 10, 11, 0.6)' }}>
          <button
            type="button"
            onClick={() => setLoginMode('password')}
            className={`pw-interactive-custom flex-1 h-9 rounded-lg text-xs font-semibold transition-all border border-transparent ${
              loginMode === 'password' ? 'border-white/5 hover:text-white' : 'hover:text-white'
            }`}
            style={
              loginMode === 'password'
                ? { backgroundColor: 'rgba(30, 27, 32, 0.8)', color: 'var(--color-primary, #454955)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }
                : { color: 'var(--pw-muted, #859490)' }
            }
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('magic-link')}
            className={`pw-interactive-custom flex-1 h-9 rounded-lg text-xs font-semibold transition-all border border-transparent ${
              loginMode === 'magic-link' ? 'border-white/5 hover:text-white' : 'hover:text-white'
            }`}
            style={
              loginMode === 'magic-link'
                ? { backgroundColor: 'rgba(30, 27, 32, 0.8)', color: 'var(--color-primary, #454955)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }
                : { color: 'var(--pw-muted, #859490)' }
            }
          >
            Magic Link
          </button>
        </div>

        {/* ── Forms ── */}
        <div className="w-full relative" style={{ minHeight: '220px' }}>
          {/* Password form */}
          {loginMode === 'password' && !isSignUp && (
            <form
              // eslint-disable-next-line react-hooks/refs
              onSubmit={handleLoginSubmit(onSubmitPassword)}
              className="w-full space-y-4 animate-in fade-in duration-200"
            >
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  {...registerLogin('email')}
                  placeholder="name@example.com"
                  autoComplete="email"
                  aria-invalid={!!loginErrors.email}
                  className="w-full auth-input px-4 py-3 text-sm placeholder-text-secondary transition-all duration-300"
                />
                {loginErrors.email && (
                  <p className="mt-1.5 text-[11px] auth-error-text pl-1">{loginErrors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                     id="login-password"
                     type={showPassword ? 'text' : 'password'}
                     {...registerLogin('password')}
                     placeholder="Enter password"
                     autoComplete="current-password"
                     aria-invalid={!!loginErrors.password}
                     className="w-full auth-input px-4 py-3 pr-12 text-sm placeholder-text-secondary transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pw-interactive-custom absolute right-4 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="mt-1.5 text-[11px] auth-error-text pl-1">{loginErrors.password.message}</p>
                )}
              </div>

              <div className="flex justify-between items-center mt-2">
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="pw-interactive-custom text-xs text-pw-muted hover:text-pw-primary transition-colors"
                >
                  Create an account
                </button>
                <Link
                  href="/forgot-password"
                  className="text-xs text-pw-muted hover:text-pw-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!loadingProvider}
                className="w-full luminous-button py-4 rounded-full font-semibold text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </button>
            </form>
          )}

          {/* Signup Password form */}
          {loginMode === 'password' && isSignUp && (
            <form
              // eslint-disable-next-line react-hooks/refs
              onSubmit={handleSignupSubmit(onSubmitSignup)}
              className="w-full space-y-4 animate-in fade-in duration-200"
            >
              <div>
                <label htmlFor="signup-name" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  {...registerSignup('fullName')}
                  placeholder="John Doe"
                  autoComplete="name"
                  aria-invalid={!!signupErrors.fullName}
                  className="w-full auth-input px-4 py-3 text-sm placeholder-text-secondary transition-all duration-300"
                />
                {signupErrors.fullName && (
                  <p className="mt-1.5 text-[11px] auth-error-text pl-1">{signupErrors.fullName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  {...registerSignup('email')}
                  placeholder="name@example.com"
                  autoComplete="email"
                  aria-invalid={!!signupErrors.email}
                  className="w-full auth-input px-4 py-3 text-sm placeholder-text-secondary transition-all duration-300"
                />
                {signupErrors.email && (
                  <p className="mt-1.5 text-[11px] auth-error-text pl-1">{signupErrors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    {...registerSignup('password')}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    aria-invalid={!!signupErrors.password}
                    className="w-full auth-input px-4 py-3 pr-12 text-sm placeholder-text-secondary transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pw-interactive-custom absolute right-4 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupErrors.password && (
                  <p className="mt-1.5 text-[11px] auth-error-text pl-1">{signupErrors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...registerSignup('confirmPassword')}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    aria-invalid={!!signupErrors.confirmPassword}
                    className="w-full auth-input px-4 py-3 pr-12 text-sm placeholder-text-secondary transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="pw-interactive-custom absolute right-4 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupErrors.confirmPassword && (
                  <p className="mt-1.5 text-[11px] auth-error-text pl-1">{signupErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex items-start gap-2.5 mt-4">
                <input
                  id="signup-accept-terms"
                  type="checkbox"
                  {...registerSignup('acceptTerms')}
                  className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="signup-accept-terms" className="text-xs text-pw-muted leading-relaxed cursor-pointer select-none">
                  I accept the{' '}
                  <Link href="/terms" target="_blank" className="text-white hover:text-primary underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-white hover:text-primary underline">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
              {signupErrors.acceptTerms && (
                <p className="mt-1.5 text-[11px] auth-error-text pl-1">{signupErrors.acceptTerms.message}</p>
              )}

              <div className="flex justify-between items-center mt-2">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="pw-interactive-custom text-xs text-pw-muted hover:text-pw-primary transition-colors"
                >
                  Already have an account? Sign in
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!loadingProvider}
                className="w-full luminous-button py-4 rounded-full font-semibold text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </button>
            </form>
          )}

          {/* Magic link form */}
          {loginMode === 'magic-link' && (
            <div className="w-full animate-in fade-in duration-200">
              {magicLinkSent ? (
                <div className="text-center py-6">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10 mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-white/80" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-headline-md">Check your inbox</h3>
                  <p className="text-xs text-pw-muted leading-relaxed mx-auto font-body-sm mb-6" style={{ maxWidth: '280px' }}>
                    Sign-in link sent to{' '}
                    <span className="text-white font-medium">{magicEmail}</span>.
                    It expires in 15 minutes.
                  </p>
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="pw-interactive-custom text-xs text-pw-muted hover:text-pw-primary transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={onSendMagicLink} className="space-y-4">
                  <div>
                    <label htmlFor="magic-email" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      id="magic-email"
                      type="email"
                      value={magicEmail}
                      onChange={e => setMagicEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full auth-input px-4 py-3 text-sm placeholder-text-secondary transition-all duration-300"
                    />
                    <p className="mt-2 text-xs text-pw-muted/80 pl-1 leading-relaxed">
                      We&apos;ll email you a one-time sign-in link. No password needed.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !!loadingProvider || !magicEmail}
                    className="w-full luminous-button py-4 rounded-full font-semibold text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Magic Link'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── Sign-up footer ── */}
        <p className="mt-8 text-xs text-pw-muted font-body-sm text-center">
          New to PaperWorking?{' '}
          <Link href="/#pricing" className="text-white font-semibold hover:text-pw-primary transition-colors">
            Start your 14-day trial
          </Link>
        </p>
      </div>
    </div>
  );
}

