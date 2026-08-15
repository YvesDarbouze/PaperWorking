'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';

function AuthActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams?.get('mode') ?? null;
  const oobCode = searchParams?.get('oobCode') ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  // Password reset fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode || !mode) {
      setError('Invalid or expired authentication link.');
      setLoading(false);
      return;
    }

    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[AuthAction] Verify code error:', err);
          setError('This password reset link is invalid or has expired.');
          setLoading(false);
        });
    } else if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setSuccess('Your email address has been verified successfully.');
          setLoading(false);
        })
        .catch((err) => {
          console.error('[AuthAction] Apply code error:', err);
          setError('This email verification link is invalid or has expired.');
          setLoading(false);
        });
    } else {
      setError(`Unsupported action mode: ${mode}`);
      setLoading(false);
    }
  }, [mode, oobCode]);

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!oobCode) return;

    setSubmitting(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess('Your password has been reset successfully. You can now sign in with your new password.');
    } catch (err: any) {
      console.error('[AuthAction] Confirm reset error:', err);
      setError(err.message || 'Failed to reset password. Please request a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#0D0D12] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-2xl font-bold tracking-tight text-[#0D0D12] dark:text-[#FDFFFC]">
          Paper<span className="font-light">Working</span>
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#16161D] py-8 px-6 shadow-sm border border-[#EAEBF0] dark:border-[#262630] rounded-xl sm:px-10">
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6E7180]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D0D12] dark:border-white mx-auto mb-4" />
              Verifying security credentials...
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 text-xl">
                ✕
              </div>
              <h3 className="text-lg font-semibold text-[#0D0D12] dark:text-white mb-2">Link Expired or Invalid</h3>
              <p className="text-sm text-[#6E7180] mb-6">{error}</p>
              <Link
                href="/login"
                className="inline-block w-full py-2.5 px-4 rounded-lg bg-[#0D0D12] dark:bg-white text-white dark:text-[#0D0D12] text-sm font-semibold hover:opacity-90 transition-opacity text-center"
              >
                Return to Sign In
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 text-xl">
                ✓
              </div>
              <h3 className="text-lg font-semibold text-[#0D0D12] dark:text-white mb-2">Action Complete</h3>
              <p className="text-sm text-[#6E7180] mb-6">{success}</p>
              <Link
                href="/login"
                className="inline-block w-full py-2.5 px-4 rounded-lg bg-[#0D0D12] dark:bg-white text-white dark:text-[#0D0D12] text-sm font-semibold hover:opacity-90 transition-opacity text-center"
              >
                Proceed to Sign In &rarr;
              </Link>
            </div>
          ) : mode === 'resetPassword' ? (
            <div>
              <h3 className="text-lg font-semibold text-[#0D0D12] dark:text-white mb-1">Set New Password</h3>
              <p className="text-sm text-[#6E7180] mb-6">
                Enter a new password for <span className="font-medium text-[#0D0D12] dark:text-white">{email}</span>.
              </p>

              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E7180] mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EAEBF0] dark:border-[#262630] bg-transparent text-sm text-[#0D0D12] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D0D12] dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E7180] mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EAEBF0] dark:border-[#262630] bg-transparent text-sm text-[#0D0D12] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D0D12] dark:focus:ring-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-6 py-2.5 px-4 rounded-lg bg-[#0D0D12] dark:bg-white text-white dark:text-[#0D0D12] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Resetting Password...' : 'Save New Password'}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#0D0D12] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D0D12] dark:border-white" />
        </div>
      }
    >
      <AuthActionHandler />
    </Suspense>
  );
}
