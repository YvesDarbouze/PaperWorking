'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, Wand2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-shimmer bg-bg-primary h-[400px] w-full rounded-[24px]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || searchParams.get('redirect') || '/dashboard';
  
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

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  
  // Magic Link State
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>('password');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmitPassword = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await login(data.email, data.password);
      router.push(redirectTo);
    } catch {
      // Error is set via AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail) return;
    
    setIsSubmitting(true);
    clearError();
    try {
      await sendMagicLink(magicEmail);
      setMagicLinkSent(true);
    } catch {
      // Error is set via AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    clearError();
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithFacebook();
      router.replace(redirectTo);
    } catch {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* ─── Header ─── */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-tighter text-text-primary">Welcome back.</h1>
        <p className="mt-4 text-sm text-text-secondary font-normal">
          Access the operations desk to manage your pipeline.
        </p>
      </div>

      {/* ─── Error State ─── */}
      {authError && (
        <div className="mb-8 p-4 bg-pw-black text-white rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed uppercase tracking-wider">{authError}</p>
        </div>
      )}

      {/* ─── Social SSO Stack ─── */}
      <div className="flex items-center gap-3 mb-10">
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          disabled={!!loadingProvider || isSubmitting}
          className="flex-1 flex items-center justify-center h-14 bg-bg-primary hover:bg-pw-border/20 border border-border-accent/10 rounded-full transition-all duration-300 group disabled:opacity-50"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="w-5 h-5 animate-spin text-text-primary" />
          ) : (
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin('facebook')}
          disabled={!!loadingProvider || isSubmitting}
          className="flex-1 flex items-center justify-center h-14 bg-bg-primary hover:bg-pw-border/20 border border-border-accent/10 rounded-full transition-all duration-300 group disabled:opacity-50"
        >
          {loadingProvider === 'facebook' ? (
            <Loader2 className="w-5 h-5 animate-spin text-text-primary" />
          ) : (
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.384C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
        </button>
      </div>

      {/* ─── Mode Toggles ─── */}
      <div className="flex bg-bg-primary/50 p-1 rounded-full mb-8">
        <button
          onClick={() => setLoginMode('password')}
          className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
            loginMode === 'password' ? 'bg-bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Password
        </button>
        <button
          onClick={() => setLoginMode('magic-link')}
          className={`flex-1 h-10 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
            loginMode === 'magic-link' ? 'bg-bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* ─── Forms ─── */}
      <div className="relative overflow-hidden w-full transition-all duration-500 min-h-[220px]">
        {loginMode === 'password' ? (
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-6 absolute w-full animate-in fade-in slide-in-from-left-4 duration-300">
            <div>
              <label className="ag-label mb-3 block opacity-60">Corporate Email</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@company.com"
                  className="w-full h-14 bg-bg-primary/30 border border-border-accent/10 rounded-full pl-14 pr-6 text-sm font-medium focus:bg-bg-surface focus:border-pw-black transition-all outline-none"
                />
              </div>
              {errors.email && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="ag-label opacity-60">Security Key</label>
                <Link href="/forgot-password" className="text-[10px] font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Enter password"
                  className="w-full h-14 bg-bg-primary/30 border border-border-accent/10 rounded-full pl-14 pr-14 text-sm font-medium focus:bg-bg-surface focus:border-pw-black transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-2 ml-6 text-[10px] font-bold text-red-500 uppercase tracking-widest">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!loadingProvider}
              className="w-full h-14 bg-pw-black text-white rounded-full font-bold uppercase tracking-[0.2em] text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 shadow-xl"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authorize Access'}
            </button>
          </form>
        ) : (
          <div className="absolute w-full animate-in fade-in slide-in-from-right-4 duration-300">
            {magicLinkSent ? (
              <div className="text-center p-8 bg-bg-primary/50 rounded-3xl border border-border-accent/10">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium text-text-primary mb-2 tracking-tight">Check your inbox</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  We've sent a secure single-use login link to <strong className="text-text-primary">{magicEmail}</strong>.
                </p>
                <button 
                  onClick={() => setMagicLinkSent(false)}
                  className="mt-6 text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={onSendMagicLink} className="space-y-6">
                <div>
                  <label className="ag-label mb-3 block opacity-60">Send Magic Link to</label>
                  <div className="relative group">
                    <Wand2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
                    <input
                      type="email"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      className="w-full h-14 bg-bg-primary/30 border border-border-accent/10 rounded-full pl-14 pr-6 text-sm font-medium focus:bg-bg-surface focus:border-pw-black transition-all outline-none"
                    />
                  </div>
                  <p className="mt-3 ml-6 text-[10px] uppercase tracking-widest text-text-secondary leading-relaxed max-w-[280px]">
                    We'll email you a secure link so you can sign in without a password.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !!loadingProvider || !magicEmail}
                  className="w-full h-14 bg-pw-black text-white rounded-full font-bold uppercase tracking-[0.2em] text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 shadow-xl"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Magic Link'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ─── Signup Footer ─── */}
      <div className="mt-14 text-center pt-8 border-t border-border-accent/10">
        <p className="text-xs text-text-secondary">
          New to the platform?{' '}
          <Link href="/register" className="text-text-primary font-bold hover:underline transition-all">
            Initialize Account
          </Link>
        </p>
      </div>
    </div>
  );
}
