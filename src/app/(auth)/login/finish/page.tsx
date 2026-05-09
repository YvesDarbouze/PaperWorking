'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function MagicLinkFinishPage() {
  return (
    <Suspense fallback={<div className="h-[320px] w-full rounded-xl bg-[#141414] animate-pulse" />}>
      <MagicLinkFinishInner />
    </Suspense>
  );
}

function MagicLinkFinishInner() {
  const router = useRouter();
  const [status, setStatus]       = useState<'verifying' | 'success' | 'email-needed' | 'error'>('verifying');
  const [emailInput, setEmailInput] = useState('');
  const { verifyMagicLink, error: authError, clearError } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.href.includes('apiKey=')) {
      const storedEmail = window.localStorage.getItem('emailForSignIn');
      if (storedEmail) handleVerification(storedEmail);
      else setStatus('email-needed');
    } else {
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerification = async (email: string) => {
    setStatus('verifying');
    clearError();
    try {
      await verifyMagicLink(email, window.location.href);
      setStatus('success');
      router.push('/dashboard');
    } catch { setStatus('error'); }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) handleVerification(emailInput);
  };

  return (
    <div className="flex flex-col items-center text-center">

      {/* ── Heading ── */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-white">Authenticating</h1>
        <p className="mt-2 text-[14px] text-[#888]">Connecting your session securely.</p>
      </div>

      <div className="w-full flex flex-col items-center justify-center py-6">

        {/* Verifying */}
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-400">
            <Loader2 className="w-12 h-12 animate-spin text-white" />
            <p className="text-[13px] text-[#666] uppercase tracking-widest">Verifying token…</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-400">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-950/60 border border-green-800/30">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-white">Login Successful</h2>
              <p className="mt-1 text-[13px] text-[#666]">Redirecting you now…</p>
            </div>
          </div>
        )}

        {/* Email needed (opened on different device) */}
        {status === 'email-needed' && (
          <div className="w-full text-left animate-in fade-in duration-300">
            <div className="mb-5 px-4 py-3 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#888]" />
              <p className="text-[13px] text-[#888] leading-relaxed">
                This link was opened on a different device. Confirm your email to continue.
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full h-[52px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 text-[14px] text-white placeholder-[#555] focus:outline-none focus:border-[#555] transition-colors"
              />
              <button
                type="submit"
                className="w-full h-[52px] bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-xl text-[14px] font-semibold text-white transition-colors"
              >
                Confirm &amp; Sign In
              </button>
            </form>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="w-full flex flex-col items-center gap-5 animate-in fade-in duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-950/60 border border-red-800/30">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-[18px] font-semibold text-white">Link Invalid</h2>
              <p className="mt-2 text-[13px] text-[#888] leading-relaxed max-w-[280px] mx-auto">
                {authError || 'This sign-in link is invalid, expired, or has already been used.'}
              </p>
            </div>
            <Link
              href="/login"
              className="w-full h-[52px] bg-[#1a1a1a] hover:bg-[#232323] border border-[#2e2e2e] rounded-xl text-[14px] font-semibold text-white transition-colors flex items-center justify-center"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
