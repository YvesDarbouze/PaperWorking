'use client';

import { Suspense, useState, useEffect, useId } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/marketing/Logo';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialAction = searchParams.get('action') || '';
  const emailInputId = useId();

  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'unsubscribed' | 'resubscribed' | 'error'>(
    initialAction === 'resubscribe' ? 'resubscribed' : 'idle',
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleUnsubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setMessage('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error('Failed to process unsubscribe request');
      }

      setStatus('unsubscribed');
      setMessage(`You have been unsubscribed from PaperWorking notifications.`);
    } catch {
      setStatus('error');
      setMessage('Could not complete request. Please try again or contact support@paperworking.co.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="w-full max-w-[540px] mx-auto">
        {/* Header Logo */}
        <div className="mb-8 text-center flex justify-center">
          <Logo variant="full" theme="dark" />
        </div>

        {/* Card */}
        <div className="bg-[#121215] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl">
          {status === 'unsubscribed' ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-xl">
                ✉️
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f4f5]">
                You are unsubscribed
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                We have removed <span className="text-zinc-200 font-medium">{email}</span> from our mailing list. We sent a quick confirmation to your inbox.
              </p>
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-xs text-zinc-400 text-left">
                <strong>Data preservation note:</strong> Your PaperWorking models, calculations, and account data remain secure in your workspace. You can still log in at any time.
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setStatus('resubscribed')}
                  className="min-h-[44px] px-4 py-2.5 rounded-md text-sm font-medium border border-white/20 text-zinc-300 hover:text-white hover:border-white/40 transition-colors"
                >
                  Re-subscribe this email
                </button>
                <Link
                  href="/"
                  className="min-h-[44px] px-4 py-2.5 rounded-md text-sm font-medium bg-white text-zinc-950 hover:bg-zinc-200 transition-colors inline-flex items-center justify-center"
                >
                  Return to Homepage
                </Link>
              </div>
            </div>
          ) : status === 'resubscribed' ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-xl">
                ✨
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f4f5]">
                Welcome back!
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                We have refreshed your communication preferences for <span className="text-zinc-200 font-medium">{email}</span>. You will receive deal and platform updates.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="min-h-[44px] px-6 py-2.5 rounded-md text-sm font-medium bg-white text-zinc-950 hover:bg-zinc-200 transition-colors inline-flex items-center justify-center"
                >
                  Sign In to PaperWorking
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f4f5] mb-2">
                Manage Email Preferences
              </h1>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                Enter your email address to unsubscribe from PaperWorking notifications and marketing updates.
              </p>

              {message && (
                <div
                  className={`p-3 rounded-md text-xs mb-4 ${
                    status === 'error'
                      ? 'bg-rose-950/40 border border-rose-800 text-rose-200'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                  }`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleUnsubscribe} className="space-y-4">
                <div>
                  <label htmlFor={emailInputId} className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id={emailInputId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="investor@example.com"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-md bg-white/[0.04] border border-white/15 text-white placeholder-zinc-500 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-md text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition-colors touch-target"
                  >
                    {submitting ? 'Processing…' : 'Unsubscribe from all emails'}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <Link
                  href="/login"
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Return to account login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-zinc-500">
        &copy; {new Date().getFullYear()} PaperWorking Inc. Institutional real estate investment management.
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400">Loading…</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
