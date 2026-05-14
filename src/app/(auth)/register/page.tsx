'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, User, X, CheckCircle2, Building2, Hammer, ArrowLeft } from 'lucide-react';

type AccountType = 'investor' | 'vendor';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-[480px] w-full rounded-xl bg-[#141414] animate-pulse" />}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType       = searchParams.get('type');
  const urlRedirectTo = searchParams.get('redirectTo') || '';
  const initialType = (urlType === 'vendor' || urlType === 'investor') ? urlType : null;

  const { register: registerUser, loginWithGoogle, loginWithFacebook, error: authError, clearError, user, loading } = useAuth();

  // Clear any stale auth errors from previous pages (e.g. failed login attempt)
  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [accountType, setAccountType] = useState<AccountType | null>(initialType);

  // If initialType wasn't in URL, try to recover from pending plan intent
  useEffect(() => {
    if (!accountType) {
      try {
        const raw = sessionStorage.getItem('pw_pending_plan');
        if (raw) {
          const pendingPlan = JSON.parse(raw);
          const derivedType = pendingPlan.plan === 'Vendor Marketplace' ? 'vendor' : 'investor';
          setAccountType(derivedType);
          window.localStorage.setItem('pw_pending_account_type', derivedType);
        }
      } catch (err) {
        // ignore JSON parse errors
      }
    }
    // Also ensure initialType from URL gets pushed to localStorage if it's set
    if (initialType && typeof window !== 'undefined') {
      window.localStorage.setItem('pw_pending_account_type', initialType);
    }
  }, [accountType, initialType]);

  // Compute the best redirect destination (same priority as login page):
  // 1. pw_pending_plan in sessionStorage → /pricing (checkout resume)
  // 2. pw_auth_redirect in sessionStorage (saved before social OAuth) → use it
  // 3. redirectTo URL param → use it (fallback when sessionStorage was cleared)
  // 4. Default → /dashboard (or /vendor-portal for vendors)
  const getRedirectDestination = (): string => {
    if (typeof window === 'undefined') return '/dashboard';

    // Highest priority: pending checkout intent
    if (sessionStorage.getItem('pw_pending_plan')) {
      sessionStorage.removeItem('pw_auth_redirect');
      return '/pricing';
    }

    // Saved redirect from before social auth
    const savedRedirect = sessionStorage.getItem('pw_auth_redirect');
    if (savedRedirect) {
      sessionStorage.removeItem('pw_auth_redirect');
      return savedRedirect;
    }

    // URL param fallback — covers the case where sessionStorage was cleared
    // but the user still has redirectTo=/pricing in the URL
    if (urlRedirectTo && urlRedirectTo.startsWith('/')) {
      return urlRedirectTo;
    }

    return accountType === 'vendor' ? '/vendor-portal' : '/dashboard';
  };

  useEffect(() => {
    if (!loading && user) {
      const dest = getRedirectDestination();
      router.replace(dest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router]);


  // Persist account type to localStorage so social SSO provisioning
  // in AuthContext can read it via pw_pending_account_type
  const selectAccountType = (type: AccountType) => {
    setAccountType(type);
    window.localStorage.setItem('pw_pending_account_type', type);
  };
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false as any },
  });

  const watchedPassword = watch('password', '');
  const passwordRules = [
    { label: '8+ Characters', met: watchedPassword.length >= 8 },
    { label: 'Uppercase',     met: /[A-Z]/.test(watchedPassword) },
    { label: 'Lowercase',     met: /[a-z]/.test(watchedPassword) },
    { label: 'Digit',         met: /[0-9]/.test(watchedPassword) },
  ];

  const onSubmit = async (data: RegisterFormValues) => {
    if (!accountType) return;
    setIsSubmitting(true);
    clearError();
    try {
      await registerUser(data.email, data.password, data.fullName, accountType);
      const dest = getRedirectDestination();
      router.push(dest);
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setToast({ message: 'Email already registered. Try logging in.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    clearError();
    try {
      // Persist redirect intent before the page unloads for OAuth.
      // signInWithRedirect causes a full page navigation — all React state is lost.
      // pw_pending_plan (checkout intent) takes priority in getRedirectDestination,
      // so pw_auth_redirect only matters when there's no pending plan.
      if (typeof window !== 'undefined') {
        const dest = urlRedirectTo || (accountType === 'vendor' ? '/vendor-portal' : '/dashboard');
        sessionStorage.setItem('pw_auth_redirect', dest);
      }
      if (provider === 'google') await loginWithGoogle();
      else await loginWithFacebook();
      // signInWithRedirect navigates away — the page unloads.
      // On return, getRedirectResult (in AuthContext) handles the result
      // and onAuthStateChanged fires, which triggers the useEffect redirect above.
    } catch (err: any) {
      const msg = err?.message || authError || 'Sign-in failed. Please try again.';
      setToast({ message: msg, type: 'error' });
      // Clean up on failure
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pw_auth_redirect');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const ToastBanner = () => toast ? (
    <div className="fixed top-8 right-8 z-50 flex items-center gap-4 bg-pw-black text-white px-6 py-4 rounded-[32px] shadow-2xl animate-in slide-in-from-right-8 duration-500">
      <AlertCircle className="w-5 h-5 text-red-500" />
      <p className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</p>
      <button onClick={() => setToast(null)} className="ml-4 opacity-40 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
    </div>
  ) : null;

  // ── Step 0: Account type selection ──────────────────────────
  if (!accountType) {
    return (
      <div className="flex flex-col">
        <ToastBanner />

        <div className="text-center mb-10">
          <h1 className="text-3xl font-normal tracking-tighter" style={{ color: '#ffffff' }}>Select Account Type.</h1>
          <p className="mt-4 text-sm text-[#888] font-normal">
            Choose the role that describes how you&apos;ll use PaperWorking.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-10">
          <button
            type="button"
            onClick={() => selectAccountType('investor')}
            className="group relative flex items-start gap-5 p-6 border-2 border-[#2e2e2e] rounded-2xl bg-[#141414] hover:border-white hover:bg-[#1a1a1a] transition-all duration-200 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest mb-1">Real Estate Investor</p>
              <p className="text-xs text-[#888] leading-relaxed">
                Create and manage deals, track acquisitions, run financials, and oversee your full investment portfolio.
              </p>
            </div>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-[#555] group-hover:border-white group-hover:bg-white transition-all" />
          </button>

          <button
            type="button"
            onClick={() => selectAccountType('vendor')}
            className="group relative flex items-start gap-5 p-6 border-2 border-[#2e2e2e] rounded-2xl bg-[#141414] hover:border-white hover:bg-[#1a1a1a] transition-all duration-200 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#595959] flex items-center justify-center shrink-0">
              <Hammer className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest mb-1">Service Provider / Vendor</p>
              <p className="text-xs text-[#888] leading-relaxed">
                List your services, receive quote requests from investors, submit bids, and manage your vendor profile.
              </p>
            </div>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-[#555] group-hover:border-white group-hover:bg-white transition-all" />
          </button>
        </div>

        <div className="mt-4 text-center pt-8 border-t border-[#2a2a2a]">
          <p className="text-xs text-[#888]">
            Already have an account?{' '}
            <Link href="/login" className="text-white font-bold hover:underline transition-all">Log In</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1: Registration form ────────────────────────────────
  return (
    <div className="flex flex-col">
      <ToastBanner />

      <div className="text-center mb-10">
        <button
          type="button"
          onClick={() => { setAccountType(null); window.localStorage.removeItem('pw_pending_account_type'); }}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#666] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Change Account Type
        </button>
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest">
            {accountType === 'vendor' ? <Hammer className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            {accountType === 'vendor' ? 'Vendor Account' : 'Investor Account'}
          </span>
        </div>
        <h1 className="text-3xl font-normal tracking-tighter" style={{ color: '#ffffff' }}>Secure Onboarding.</h1>
        <p className="mt-4 text-sm text-[#888] font-normal">Set up your account to get started.</p>
      </div>

      {authError && (
        <div className="mb-8 p-4 bg-red-950/60 border border-red-800/40 text-white rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs font-medium leading-relaxed text-red-300">{authError}</p>
        </div>
      )}

      {/* Social SSO — available for both account types */}
      <>
        <div className="flex items-center gap-3 mb-10">
          <button
            type="button"
            onClick={() => handleSocialRegister('google')}
            disabled={!!loadingProvider || isSubmitting}
            className="flex-1 flex items-center justify-center h-14 bg-[#1a1a1a] hover:bg-[#232323] border border-[#2e2e2e] rounded-full transition-all duration-300 group"
          >
            {loadingProvider === 'google' ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSocialRegister('facebook')}
            disabled={!!loadingProvider || isSubmitting}
            className="flex-1 flex items-center justify-center h-14 bg-[#1a1a1a] hover:bg-[#232323] border border-[#2e2e2e] rounded-full transition-all duration-300 group"
          >
            {loadingProvider === 'facebook' ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.384C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
          </button>
        </div>
        <div className="relative mb-8 flex items-center gap-4">
          <div className="flex-1 h-[1px] bg-[#2a2a2a]" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#555]">or register with email</p>
          <div className="flex-1 h-[1px] bg-[#2a2a2a]" />
        </div>
      </>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="reg-fullname" className="text-[10px] font-bold uppercase tracking-widest text-[#666] mb-3 block">Full Identity</label>
          <div className="relative group">
            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] group-hover:text-white transition-colors" />
            <input id="reg-fullname" type="text" autoComplete="name" {...register('fullName')} placeholder="Legal Full Name"
              className="w-full h-14 bg-[#1a1a1a] border border-[#2e2e2e] rounded-full pl-14 pr-6 text-sm font-medium text-white placeholder-[#555] focus:bg-[#232323] focus:border-[#555] transition-all outline-none" />
          </div>
          {errors.fullName && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.fullName.message}</p>}
        </div>

        <div>
          <label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-widest text-[#666] mb-3 block">Professional Email</label>
          <div className="relative group">
            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] group-hover:text-white transition-colors" />
            <input id="reg-email" type="email" autoComplete="email" {...register('email')} placeholder="direct@firm.com"
              className="w-full h-14 bg-[#1a1a1a] border border-[#2e2e2e] rounded-full pl-14 pr-6 text-sm font-medium text-white placeholder-[#555] focus:bg-[#232323] focus:border-[#555] transition-all outline-none" />
          </div>
          {errors.email && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="reg-password" className="text-[10px] font-bold uppercase tracking-widest text-[#666] mb-3 block">Authentication Secret</label>
          <div className="relative group">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] group-hover:text-white transition-colors" />
            <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('password')} placeholder="Complexity Required"
              className="w-full h-14 bg-[#1a1a1a] border border-[#2e2e2e] rounded-full pl-14 pr-14 text-sm font-medium text-white placeholder-[#555] focus:bg-[#232323] focus:border-[#555] transition-all outline-none" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {watchedPassword.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-6">
              {passwordRules.map((rule) => (
                <div key={rule.label} className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-opacity duration-300 ${rule.met ? 'text-white opacity-100' : 'text-[#555] opacity-30'}`}>
                  <CheckCircle2 className="w-3 h-3" />{rule.label}
                </div>
              ))}
            </div>
          )}
          {errors.password && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="reg-confirm-password" className="text-[10px] font-bold uppercase tracking-widest text-[#666] mb-3 block">Validate Security Key</label>
          <div className="relative group">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] group-hover:text-white transition-colors" />
            <input id="reg-confirm-password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" {...register('confirmPassword')} placeholder="Repeat Secret"
              className="w-full h-14 bg-[#1a1a1a] border border-[#2e2e2e] rounded-full pl-14 pr-14 text-sm font-medium text-white placeholder-[#555] focus:bg-[#232323] focus:border-[#555] transition-all outline-none" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.confirmPassword.message}</p>}
        </div>

        <div className="flex items-start gap-4 px-6 py-3">
          <div className="relative flex items-center h-6 shrink-0">
            <input type="checkbox" {...register('acceptTerms')} className="w-6 h-6 border-2 border-[#555] rounded cursor-pointer accent-white bg-[#1a1a1a]" />
          </div>
          <p className="text-[11px] font-medium text-[#888] leading-relaxed">
            By initializing account, I confirm adherence to{' '}
            <Link href="/terms" className="text-white underline decoration-[#555] underline-offset-4 hover:decoration-white transition-colors">Governance Protocols</Link> &amp;{' '}
            <Link href="/privacy" className="text-white underline decoration-[#555] underline-offset-4 hover:decoration-white transition-colors">Privacy Mandates</Link>.
          </p>
        </div>
        {errors.acceptTerms && <p className="ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">{errors.acceptTerms.message}</p>}

        <button type="submit" disabled={isSubmitting || !!loadingProvider}
          className="w-full h-14 bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 shadow-2xl">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Account'}
        </button>
      </form>

      <div className="mt-12 text-center pt-8 border-t border-[#2a2a2a]">
        <p className="text-xs text-[#888]">
          Existing credentials found?{' '}
          <Link href="/login" className="text-white font-bold hover:underline transition-all">Authorize Log In</Link>
        </p>
      </div>
    </div>
  );
}
