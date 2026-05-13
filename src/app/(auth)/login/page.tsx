'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-[480px] w-full rounded-xl bg-[#141414] animate-pulse" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRedirectTo = searchParams.get('redirectTo') || searchParams.get('redirect') || '';
  const sessionReason = searchParams.get('reason');

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

  const {
    login,
    loginWithGoogle,
    loginWithFacebook,
    sendMagicLink,
    error: authError,
    clearError,
    user,
    loading,
  } = useAuth();

  // Clear any stale auth errors from previous pages
  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const dest = getRedirectDestination();
      router.replace(dest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router]);

  const [showPassword, setShowPassword]       = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [loginMode, setLoginMode]             = useState<'password' | 'magic-link'>('password');
  const [magicLinkSent, setMagicLinkSent]     = useState(false);
  const [magicEmail, setMagicEmail]           = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmitPassword = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await login(data.email, data.password);
      const dest = getRedirectDestination();
      router.push(dest);
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
    setLoadingProvider(provider);
    clearError();
    try {
      // Persist redirectTo before the page unloads for OAuth.
      // signInWithRedirect causes a full page navigation, so URL query params are lost.
      // On return, getRedirectResult fires in AuthContext, and the login page useEffect
      // reads this value from sessionStorage to redirect correctly.
      if (typeof window !== 'undefined') {
        const dest = urlRedirectTo || '/dashboard';
        sessionStorage.setItem('pw_auth_redirect', dest);
      }
      if (provider === 'google') await loginWithGoogle();
      else await loginWithFacebook();
      // signInWithRedirect navigates away — the page unloads.
      // On return, getRedirectResult (in AuthContext) handles the result
      // and onAuthStateChanged fires, which triggers the user redirect
      // via the useEffect above.
    } catch (err: any) {
      // Pre-redirect errors: unauthorized domain, network failure, etc.
      const msg = err?.message || authError || 'Sign-in failed. Please try again.';
      toast.error(msg, { id: 'social-login-error', duration: 6000 });
      setLoadingProvider(null);
      // Clean up on failure
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pw_auth_redirect');
      }
    }
  };

  return (
    <div className="flex flex-col items-center">

      {/* ── Heading ── */}
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: '#ffffff' }}>Sign in or sign up</h1>
        <p className="mt-2 text-sm text-[#888]">Access your PaperWorking portfolio.</p>
      </div>

      {/* ── Session expired notice (from proxy redirect) ── */}
      {sessionReason === 'session_expired' && !authError && (
        <div className="w-full mb-5 px-4 py-3 bg-amber-950/60 border border-amber-700/40 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <p className="text-xs font-medium text-amber-300 leading-relaxed">Your session expired. Please sign in again to continue.</p>
        </div>
      )}

      {/* ── Error banner ── */}
      {authError && (
        <div className="w-full mb-5 px-4 py-3 bg-red-950/60 border border-red-800/40 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
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
          className="relative w-full flex items-center h-[52px] bg-[#1a1a1a] hover:bg-[#232323] border border-[#2e2e2e] rounded-xl transition-colors duration-150 disabled:opacity-50"
        >
          <span className="absolute left-4 flex items-center justify-center w-8">
            {loadingProvider === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
          </span>
          <span className="flex-1 text-center text-[14px] font-semibold text-white pr-8">
            Continue with Google
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin('facebook')}
          disabled={!!loadingProvider || isSubmitting}
          className="relative w-full flex items-center h-[52px] bg-[#1a1a1a] hover:bg-[#232323] border border-[#2e2e2e] rounded-xl transition-colors duration-150 disabled:opacity-50"
        >
          <span className="absolute left-4 flex items-center justify-center w-8">
            {loadingProvider === 'facebook' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.384C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
          </span>
          <span className="flex-1 text-center text-[14px] font-semibold text-white pr-8">
            Continue with Facebook
          </span>
        </button>
      </div>

      {/* ── Or divider ── */}
      <div className="w-full flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[#2a2a2a]" />
        <span className="text-[13px] text-[#555]">Or</span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

      {/* ── Mode toggle ── */}
      <div className="w-full flex bg-[#141414] border border-[#2a2a2a] rounded-xl p-1 mb-5">
        <button
          type="button"
          onClick={() => setLoginMode('password')}
          className={`flex-1 h-9 rounded-lg text-[12px] font-semibold transition-all ${
            loginMode === 'password'
              ? 'bg-[#2a2a2a] text-white shadow-sm'
              : 'text-[#666] hover:text-[#aaa]'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setLoginMode('magic-link')}
          className={`flex-1 h-9 rounded-lg text-[12px] font-semibold transition-all ${
            loginMode === 'magic-link'
              ? 'bg-[#2a2a2a] text-white shadow-sm'
              : 'text-[#666] hover:text-[#aaa]'
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* ── Forms ── */}
      <div className="w-full relative overflow-hidden" style={{ minHeight: 210 }}>

        {/* Password form */}
        {loginMode === 'password' && (
          <form
            onSubmit={handleSubmit(onSubmitPassword)}
            className="w-full space-y-3 animate-in fade-in slide-in-from-left-4 duration-250"
          >
            <input
              type="email"
              {...register('email')}
              placeholder="Enter your email address"
              autoComplete="email"
              className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
            />
            {errors.email && (
              <p className="text-[11px] text-red-400 pl-1">{errors.email.message}</p>
            )}

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 pr-12 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-400 pl-1">{errors.password.message}</p>
            )}

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[12px] text-[#555] hover:text-[#aaa] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!loadingProvider}
              className="w-full h-[52px] bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-xl text-[14px] font-semibold text-white transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
            </button>
          </form>
        )}

        {/* Magic link form */}
        {loginMode === 'magic-link' && (
          <div className="w-full animate-in fade-in slide-in-from-right-4 duration-250">
            {magicLinkSent ? (
              <div className="text-center p-8 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">Check your inbox</h3>
                <p className="text-[13px] text-[#888] leading-relaxed">
                  Sign-in link sent to{' '}
                  <span className="text-white font-medium">{magicEmail}</span>.
                  It expires in 15 minutes.
                </p>
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="mt-5 text-[12px] text-[#555] hover:text-[#aaa] transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={onSendMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={magicEmail}
                  onChange={e => setMagicEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
                />
                <p className="text-[12px] text-[#555] pl-1">
                  We&apos;ll email you a one-time sign-in link. No password needed.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || !!loadingProvider || !magicEmail}
                  className="w-full h-[52px] bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-xl text-[14px] font-semibold text-white transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Magic Link'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Sign-up footer ── */}
      <p className="mt-8 text-[13px] text-[#555]">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-white font-semibold hover:underline transition-all">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
