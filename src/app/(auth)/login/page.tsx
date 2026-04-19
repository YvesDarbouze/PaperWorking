'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-pw-bg h-[400px] w-full rounded-[48px]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { login, loginWithGoogle, loginWithFacebook, error: authError, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
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

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    clearError();
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithFacebook();
      router.push(redirectTo);
    } catch {
      // Error is set via AuthContext
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* ─── Header ─── */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-tighter text-pw-black">Welcome back.</h1>
        <p className="mt-4 text-sm text-pw-muted font-normal">
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
          className="flex-1 flex items-center justify-center h-14 bg-pw-bg hover:bg-pw-border/20 border border-pw-border/10 rounded-full transition-all duration-300 group"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="w-5 h-5 animate-spin text-pw-black" />
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
          className="flex-1 flex items-center justify-center h-14 bg-pw-bg hover:bg-pw-border/20 border border-pw-border/10 rounded-full transition-all duration-300 group"
        >
          {loadingProvider === 'facebook' ? (
            <Loader2 className="w-5 h-5 animate-spin text-pw-black" />
          ) : (
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.384C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
        </button>
      </div>

      {/* ─── Divider ─── */}
      <div className="relative mb-10 flex items-center gap-4">
        <div className="flex-1 h-[1px] bg-pw-border/10" />
        <p className="ag-label opacity-40">or use credentials</p>
        <div className="flex-1 h-[1px] bg-pw-border/10" />
      </div>

      {/* ─── Form ─── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="ag-label mb-3 block opacity-60">Corporate Email</label>
          <div className="relative group">
            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted group-hover:text-pw-black transition-colors" />
            <input
              type="email"
              {...register('email')}
              placeholder="name@company.com"
              className="w-full h-14 bg-pw-bg/30 border border-pw-border/10 rounded-full pl-14 pr-6 text-sm font-medium focus:bg-pw-surface focus:border-pw-black transition-all outline-none"
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
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted group-hover:text-pw-black transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Enter password"
              className="w-full h-14 bg-pw-bg/30 border border-pw-border/10 rounded-full pl-14 pr-14 text-sm font-medium focus:bg-pw-surface focus:border-pw-black transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-pw-muted hover:text-pw-black transition-colors"
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

      {/* ─── Signup Footer ─── */}
      <div className="mt-12 text-center pt-8 border-t border-pw-border/10">
        <p className="text-xs text-pw-muted">
          New to the platform?{' '}
          <Link href="/register" className="text-pw-black font-bold hover:underline transition-all">
            Initialize Account
          </Link>
        </p>
      </div>
    </div>
  );
}
