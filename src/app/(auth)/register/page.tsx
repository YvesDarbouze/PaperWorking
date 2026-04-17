'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Register Page
   
   High-trust registration with:
   • Full name, email, password + confirmation
   • Inline password strength indicators
   • Terms acceptance checkbox
   • Google SSO alternative
   ═══════════════════════════════════════════════════════ */

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, loginWithGoogle, error: authError, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  // Auto-dismiss toast after 6 seconds
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
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as any,
    },
  });

  const watchedPassword = watch('password', '');

  // Password strength rules for inline display
  const passwordRules = [
    { label: 'At least 8 characters', met: watchedPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(watchedPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(watchedPassword) },
    { label: 'One number', met: /[0-9]/.test(watchedPassword) },
  ];

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await registerUser(data.email, data.password, data.fullName);
      // Directive 24: Cookie is auto-synced via onAuthStateChanged → syncSessionCookie
      router.push('/dashboard');
    } catch (err: any) {
      // Directive 23: Show toast for email-already-in-use
      if (err?.code === 'auth/email-already-in-use') {
        setToast({
          message: 'This email is already registered. Please log in.',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true);
    clearError();
    try {
      await loginWithGoogle();
      // Directive 24: Cookie is auto-synced via onAuthStateChanged → syncSessionCookie
      router.push('/dashboard');
    } catch {
      // Error is set via AuthContext
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      {/* ─── Toast Notification (Directive 23) ─── */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg"
          style={{
            backgroundColor: toast.type === 'error' ? '#fef2f2' : '#f0f9ff',
            borderColor: toast.type === 'error' ? '#fecaca' : '#bae6fd',
            color: toast.type === 'error' ? '#991b1b' : '#0c4a6e',
            animation: 'slideInRight 0.3s ease-out',
            maxWidth: '400px',
          }}
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── Header (Directive 18) ─── */}
      <div className="mb-8 text-center">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: '#0a0a0a' }}
        >
          Create your PaperWorking account
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#737373' }}>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold transition-colors hover:text-black"
            style={{ color: '#0a0a0a' }}
          >
            Log in
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
        onClick={handleGoogleRegister}
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
            or register with email
          </span>
        </div>
      </div>

      {/* ─── Registration Form ─── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="register-name"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#262626' }}
          >
            Full name
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-hidden="true"
            />
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              {...register('fullName')}
              className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-black"
              style={{
                borderColor: errors.fullName ? '#ef4444' : '#d4d4d4',
                color: '#262626',
              }}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'register-name-error' : undefined}
            />
          </div>
          {errors.fullName && (
            <p id="register-name-error" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="register-email"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#262626' }}
          >
            Work email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-hidden="true"
            />
            <input
              id="register-email"
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
              aria-describedby={errors.email ? 'register-email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="register-email-error" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="register-password"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#262626' }}
          >
            Password
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-hidden="true"
            />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-black"
              style={{
                borderColor: errors.password ? '#ef4444' : '#d4d4d4',
                color: '#262626',
              }}
              aria-invalid={!!errors.password}
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

          {/* Password strength indicators */}
          {watchedPassword.length > 0 && (
            <ul className="mt-2 space-y-1">
              {passwordRules.map((rule) => (
                <li
                  key={rule.label}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: rule.met ? '#16a34a' : '#a3a3a3' }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="register-confirm"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#262626' }}
          >
            Confirm password
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-hidden="true"
            />
            <input
              id="register-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              className="w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-black"
              style={{
                borderColor: errors.confirmPassword ? '#ef4444' : '#d4d4d4',
                color: '#262626',
              }}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#a3a3a3' }}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="register-confirm-error" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="register-terms"
            type="checkbox"
            {...register('acceptTerms')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-black"
            aria-describedby={errors.acceptTerms ? 'register-terms-error' : undefined}
          />
          <label
            htmlFor="register-terms"
            className="text-xs leading-relaxed"
            style={{ color: '#737373' }}
          >
            I agree to the{' '}
            <Link href="/terms" className="underline hover:text-black">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-black">
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.acceptTerms && (
          <p id="register-terms-error" className="-mt-2 text-xs" style={{ color: '#ef4444' }}>
            {errors.acceptTerms.message}
          </p>
        )}

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
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      {/* ─── Login Link ─── */}
      <p className="mt-6 text-center text-sm" style={{ color: '#737373' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold transition-colors hover:text-black"
          style={{ color: '#0a0a0a' }}
        >
          Log in
        </Link>
      </p>

      {/* Toast slide-in animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
