'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
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
      <div className="auth-card-container auth-glass-card rounded-xl p-6 md:p-10 relative overflow-hidden animate-in fade-in duration-500">
        <div 
          className="absolute top-0 right-0 w-16 h-16 border-t border-r rounded-tr-xl pointer-events-none" 
          style={{ borderColor: 'rgba(87, 241, 219, 0.2)' }}
        />
        <div 
          className="absolute bottom-0 left-0 w-16 h-16 border-b border-l rounded-bl-xl pointer-events-none" 
          style={{ borderColor: 'rgba(87, 241, 219, 0.2)' }}
        />

        <div className="flex flex-col items-center text-center w-full relative z-10">
          <div 
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border"
            style={{ backgroundColor: 'rgba(5, 46, 22, 0.4)', borderColor: 'rgba(22, 101, 52, 0.3)' }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: '#57f1db' }} />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2 font-headline-md">
            Check your inbox
          </h1>
          <p 
            className="text-xs md:text-sm leading-relaxed font-body-sm"
            style={{ color: 'var(--pw-muted)', maxWidth: '300px' }}
          >
            A reset link was sent to{' '}
            <span className="text-white font-medium">{submittedEmail}</span>.
            Check your spam folder if it doesn&apos;t arrive within a minute.
          </p>

          <div className="mt-8 w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { setIsSuccess(false); clearError(); }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-semibold text-pw-black transition-colors"
            >
              Try a different email
            </button>
            <NextLink
              href="/login"
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-semibold text-pw-black transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to sign in
            </NextLink>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form state ── */
  return (
    <div className="auth-card-container auth-glass-card rounded-xl p-6 md:p-10 relative overflow-hidden animate-in fade-in duration-500">
      <div 
        className="absolute top-0 right-0 w-16 h-16 border-t border-r rounded-tr-xl pointer-events-none" 
        style={{ borderColor: 'rgba(87, 241, 219, 0.2)' }}
      />
      <div 
        className="absolute bottom-0 left-0 w-16 h-16 border-b border-l rounded-bl-xl pointer-events-none" 
        style={{ borderColor: 'rgba(87, 241, 219, 0.2)' }}
      />

      <div className="flex flex-col items-center w-full relative z-10">
        <div className="mb-6 text-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2 font-headline-md">
            Reset your password
          </h1>
          <p className="text-xs md:text-sm text-pw-muted font-body-sm">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {authError && (
          <div 
            className="w-full mb-5 px-4 py-3 border rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
            style={{ backgroundColor: 'rgba(66, 32, 32, 0.4)', borderColor: 'rgba(153, 27, 27, 0.3)', color: '#fca5a5' }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <p className="text-xs font-medium leading-relaxed">{authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-xs font-medium text-pw-muted mb-2 uppercase tracking-wider">
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              {...register('email')}
              className="w-full auth-input px-4 py-3 text-sm placeholder-text-secondary transition-all duration-300"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="mt-1.5 text-[11px] auth-error-text pl-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full luminous-button py-4 rounded-full font-semibold text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <NextLink
          href="/login"
          className="mt-6 flex items-center gap-1.5 text-xs text-pw-muted hover:text-pw-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </NextLink>
      </div>
    </div>
  );
}

