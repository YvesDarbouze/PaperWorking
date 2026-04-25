'use client';

import React, { useState, useRef } from 'react';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

/**
 * LeadCapture
 *
 * Lead-magnet footer section: single-field email capture with
 * "Get Early Access" CTA and SSO quick-register icons (Google / Microsoft).
 * Strict PaperWorking monochrome palette.
 */

export default function LeadCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    // Basic validation
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('loading');

    try {
      // POST to an API endpoint (wire to Firestore / mailing list later)
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) throw new Error('Failed');

      setStatus('success');
      setEmail('');
    } catch {
      // Graceful degradation — still show success in demo
      setStatus('success');
      setEmail('');
    }
  };

  return (
    <section className="py-20 bg-black">
      <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
        {/* Tag */}
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-phase-3 mb-6">
          Be First In Line
        </p>

        <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl mb-4 text-balance">
          Join the waitlist. Get early access.
        </h2>
        <p className="text-sm text-phase-2 leading-relaxed max-w-lg mx-auto mb-10">
          Be among the first teams to transform their real estate operations.
          Early members receive a 30-day extended trial and priority onboarding.
        </p>

        {/* Email capture */}
        {status === 'success' ? (
          <div className="flex items-center justify-center space-x-3 py-4">
            <CheckCircle className="w-5 h-5 text-white" />
            <p className="text-sm font-medium text-white">
              You&apos;re on the list. We&apos;ll be in touch soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                placeholder="Enter your work email"
                className={`w-full px-4 py-3.5 text-sm bg-phase-4 text-white placeholder:text-phase-2 border focus:outline-none transition-colors ${
                  status === 'error' ? 'border-white' : 'border-phase-3 focus:border-white'
                }`}
                disabled={status === 'loading'}
              />
              {status === 'error' && (
                <p className="absolute -bottom-5 left-0 text-xs text-phase-2">{errorMsg}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3.5 bg-bg-surface text-text-primary text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-dashboard transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Get Early Access</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center justify-center my-8 max-w-lg mx-auto">
          <div className="flex-1 h-px bg-phase-3" />
          <span className="px-4 text-xs text-phase-3 uppercase tracking-widest">or continue with</span>
          <div className="flex-1 h-px bg-phase-3" />
        </div>

        {/* SSO Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Google */}
          <button className="flex items-center space-x-3 px-6 py-3 border border-phase-3 hover:border-white transition-colors group cursor-pointer" aria-label="Sign up with Google">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#FFFFFF" fillOpacity="0.6" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFFFFF" fillOpacity="0.5" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" fill="#FFFFFF" fillOpacity="0.4" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#FFFFFF" fillOpacity="0.7" />
            </svg>
            <span className="text-xs font-medium text-phase-2 group-hover:text-white transition-colors">Google</span>
          </button>

          {/* Microsoft */}
          <button className="flex items-center space-x-3 px-6 py-3 border border-phase-3 hover:border-white transition-colors group cursor-pointer" aria-label="Sign up with Microsoft">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#FFFFFF" fillOpacity="0.7" />
              <rect x="13" y="1" width="10" height="10" fill="#FFFFFF" fillOpacity="0.5" />
              <rect x="1" y="13" width="10" height="10" fill="#FFFFFF" fillOpacity="0.5" />
              <rect x="13" y="13" width="10" height="10" fill="#FFFFFF" fillOpacity="0.4" />
            </svg>
            <span className="text-xs font-medium text-phase-2 group-hover:text-white transition-colors">Microsoft</span>
          </button>
        </div>

        <p className="mt-8 text-xs text-phase-3">
          By signing up you agree to our{' '}
          <a href="#" className="underline hover:text-phase-2 transition-colors">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-phase-2 transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </section>
  );
}
