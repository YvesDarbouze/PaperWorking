'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Forgot Password Page
   
   Single-field email form → Firebase sendPasswordResetEmail.
   Success state replaces the form with a confirmation card.
   ═══════════════════════════════════════════════════════ */

export default function ForgotPasswordPage() {
  const { resetPassword, error: authError, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    clearError();
    try {
      await resetPassword(data.email);
    } catch {
      // Directive 38: Fail silently — always show success to prevent
      // email enumeration. Bad actors cannot verify registered emails.
    }
    // Always show success regardless of whether email exists
    setSubmittedEmail(data.email);
    setIsSuccess(true);
    setIsSubmitting(false);
  };

  // ─── Success State (Directive 37) ───
  if (isSuccess) {
    return (
      <>
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f0fdf4' }}
          >
            <CheckCircle2 className="h-6 w-6" style={{ color: '#16a34a' }} />
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: '#0a0a0a' }}
          >
            Check your inbox
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: '#737373' }}>
            A password reset link has been sent to{' '}
            <strong style={{ color: '#262626' }}>{submittedEmail}</strong>.
          </p>
          <p className="mt-1 text-xs" style={{ color: '#a3a3a3' }}>
            Didn&apos;t receive it? Check your spam folder or try again.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              clearError();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: '#d4d4d4', color: '#262626' }}
          >
            Try a different email
          </button>
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-800"
            style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Login
          </Link>
        </div>
      </>
    );
  }

  // ─── Form State ───
  return (
    <>
      {/* ─── Header (Directive 33) ─── */}
      <div className="mb-8 text-center">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: '#0a0a0a' }}
        >
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#737373' }}>
          Enter your email and we will send you a reset link.
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

      {/* ─── Form ─── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="reset-email"
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
              id="reset-email"
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
              aria-describedby={errors.email ? 'reset-email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="reset-email-error" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      {/* ─── Back to Login ─── */}
      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors hover:text-black"
        style={{ color: '#737373' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </>
  );
}
