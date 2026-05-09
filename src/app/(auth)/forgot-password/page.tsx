'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validations/auth';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword, error: authError, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [isSuccess, setIsSuccess]           = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    clearError();
    try { await resetPassword(data.email); } catch { /* fail silently — prevent email enumeration */ }
    setSubmittedEmail(data.email);
    setIsSuccess(true);
    setIsSubmitting(false);
  };

  /* ── Success state ── */
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-950/60 border border-green-800/30">
          <CheckCircle2 className="h-7 w-7 text-green-400" />
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight text-white">Check your inbox</h1>
        <p className="mt-3 text-[14px] text-[#888] leading-relaxed max-w-[300px]">
          A reset link was sent to{' '}
          <span className="text-white font-medium">{submittedEmail}</span>.
          Check your spam folder if it doesn&apos;t arrive within a minute.
        </p>

        <div className="mt-8 w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { setIsSuccess(false); clearError(); }}
            className="w-full h-[52px] bg-[#1a1a1a] hover:bg-[#232323] border border-[#2e2e2e] rounded-xl text-[14px] font-semibold text-white transition-colors"
          >
            Try a different email
          </button>
          <Link
            href="/login"
            className="w-full h-[52px] bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-xl text-[14px] font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  /* ── Form state ── */
  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-white">Reset your password</h1>
        <p className="mt-2 text-[14px] text-[#888]">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {authError && (
        <div className="w-full mb-5 px-4 py-3 bg-red-950/60 border border-red-800/40 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs font-medium text-red-300 leading-relaxed">{authError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full space-y-3">
        <div>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            {...register('email')}
            className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="mt-1 text-[11px] text-red-400 pl-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-[52px] bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-xl text-[14px] font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center gap-1.5 text-[13px] text-[#555] hover:text-[#aaa] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
