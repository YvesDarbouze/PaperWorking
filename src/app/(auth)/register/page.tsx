'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, loginWithGoogle, loginWithFacebook, error: authError, clearError, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [toast, setToast]                     = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false as any },
  });

  const watchedPassword = watch('password', '');
  const passwordRules = [
    { label: '8+ characters', met: watchedPassword.length >= 8 },
    { label: 'Uppercase',     met: /[A-Z]/.test(watchedPassword) },
    { label: 'Lowercase',     met: /[a-z]/.test(watchedPassword) },
    { label: 'Number',        met: /[0-9]/.test(watchedPassword) },
  ];

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await registerUser(data.email, data.password, data.fullName);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setToast({ message: 'Email already registered. Try signing in.' });
      }
    } finally { setIsSubmitting(false); }
  };

  const handleSocialRegister = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    clearError();
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithFacebook();
      router.replace('/dashboard');
    } catch { setLoadingProvider(null); }
  };

  return (
    <div className="flex flex-col items-center">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-4 bg-[#1a1a1a] border border-[#3a3a3a] text-white px-5 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right-8 duration-400">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-[13px] font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 text-[#555] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Heading ── */}
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-white">Create your account</h1>
        <p className="mt-2 text-sm text-[#888]">14-day free trial. No credit card required.</p>
      </div>

      {/* ── Auth error ── */}
      {authError && (
        <div className="w-full mb-5 px-4 py-3 bg-red-950/60 border border-red-800/40 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs font-medium text-red-300 leading-relaxed">{authError}</p>
        </div>
      )}

      {/* ── Social buttons ── */}
      <div className="w-full flex flex-col gap-3 mb-5">
        <button
          type="button"
          onClick={() => handleSocialRegister('google')}
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
          onClick={() => handleSocialRegister('facebook')}
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

      {/* ── Registration form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-3">

        {/* Full name */}
        <div>
          <input
            type="text"
            {...register('fullName')}
            placeholder="Jane Smith"
            autoComplete="name"
            className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
          />
          {errors.fullName && <p className="mt-1 text-[11px] text-red-400 pl-1">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <input
            type="email"
            {...register('email')}
            placeholder="jane@firm.com"
            autoComplete="email"
            className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
          />
          {errors.email && <p className="mt-1 text-[11px] text-red-400 pl-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="8+ characters"
              autoComplete="new-password"
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
          {/* Strength matrix */}
          {watchedPassword.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 pl-1">
              {passwordRules.map(rule => (
                <div
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-[11px] transition-colors ${rule.met ? 'text-green-400' : 'text-[#444]'}`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {rule.label}
                </div>
              ))}
            </div>
          )}
          {errors.password && <p className="mt-1 text-[11px] text-red-400 pl-1">{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Repeat your password"
              autoComplete="new-password"
              className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 pr-12 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa] transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-[11px] text-red-400 pl-1">{errors.confirmPassword.message}</p>}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            {...register('acceptTerms')}
            className="mt-0.5 w-4 h-4 rounded border border-[#3a3a3a] bg-[#1a1a1a] accent-white cursor-pointer shrink-0"
          />
          <p className="text-[12px] text-[#666] leading-relaxed">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-white hover:underline">Terms of Service</Link>
            {' '}&amp;{' '}
            <Link href="/privacy" className="text-white hover:underline">Privacy Policy</Link>.
          </p>
        </div>
        {errors.acceptTerms && <p className="text-[11px] text-red-400 pl-1">{errors.acceptTerms.message}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !!loadingProvider}
          className="w-full h-[52px] bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-xl text-[14px] font-semibold text-white transition-colors flex items-center justify-center disabled:opacity-50 mt-1"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
        </button>
      </form>

      {/* ── Sign-in footer ── */}
      <p className="mt-8 text-[13px] text-[#555]">
        Already have an account?{' '}
        <Link href="/login" className="text-white font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
