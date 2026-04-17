'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Login Page
   
   High-trust, document-centric login form.
   Email/Password + Google SSO.
   ═══════════════════════════════════════════════════════ */


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-pw-white" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { login, loginWithGoogle, error: authError, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    clearError();
    try {
      await loginWithGoogle();
      router.push(redirectTo);
    } catch {
      // Error is set via AuthContext
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      {/* ─── Header (Directive 25) ─── */}
      <div className="mb-8 text-center">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: '#0a0a0a' }}
        >
          Welcome back
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#737373' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold transition-colors hover:text-black"
            style={{ color: '#0a0a0a' }}
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* ─── Auth Error Banner ─── */}
      {authError && (
        <div
          className="mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
          style={{
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            color: '#991b1b',
          }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* ─── Google SSO ─── */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isSubmitting}
        className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderColor: '#d4d4d4', color: '#262626' }}
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
        )}
        Continue with Google
      </button>

      {/* ─── Divider ─── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: '#e5e5e5' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span
            className="px-3"
            style={{ backgroundColor: '#ffffff', color: '#a3a3a3' }}
          >
            or continue with email
          </span>
        </div>
      </div>

      {/* ─── Login Form ─── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#262626' }}
          >
            Email address
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-hidden="true"
            />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register('email')}
              className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-black"
              style={{
                borderColor: errors.email ? '#ef4444' : '#d4d4d4',
                color: '#262626',
              }}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="login-email-error" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium"
              style={{ color: '#262626' }}
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium transition-colors hover:text-black"
              style={{ color: '#737373' }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-hidden="true"
            />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-black"
              style={{
                borderColor: errors.password ? '#ef4444' : '#d4d4d4',
                color: '#262626',
              }}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {/* ─── Register Link ─── */}
      <p className="mt-6 text-center text-sm" style={{ color: '#737373' }}>
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold transition-colors hover:text-black"
          style={{ color: '#0a0a0a' }}
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
