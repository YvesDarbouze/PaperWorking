'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function MagicLinkFinishPage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-pw-bg h-[400px] w-full rounded-[48px]" />}>
      <MagicLinkFinishInner />
    </Suspense>
  );
}

function MagicLinkFinishInner() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'email-needed' | 'error'>('verifying');
  const [emailInput, setEmailInput] = useState('');
  const { verifyMagicLink, error: authError, clearError } = useAuth();
  
  useEffect(() => {
    // If the URL has an apiKey and oobCode, it's a valid link payload
    if (typeof window !== 'undefined' && window.location.href.includes('apiKey=')) {
      const storedEmail = window.localStorage.getItem('emailForSignIn');
      if (storedEmail) {
        handleVerification(storedEmail);
      } else {
        // We have the link but opened it on a different device/browser without local storage
        setStatus('email-needed');
      }
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
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setStatus('error');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) handleVerification(emailInput);
  };

  return (
    <div className="flex flex-col text-center">
      <div className="mb-10">
        <h1 className="text-3xl font-light tracking-tighter text-pw-black">Authenticating</h1>
        <p className="mt-4 text-sm text-pw-muted font-normal">
          Connecting your session securely.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-10">
        {status === 'verifying' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <Loader2 className="w-12 h-12 animate-spin text-pw-black mb-6" />
            <p className="text-sm font-medium text-pw-muted uppercase tracking-widest">Verifying Token...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
            <h2 className="text-xl font-medium tracking-tight mb-2">Login Successful</h2>
            <p className="text-sm font-medium text-pw-muted uppercase tracking-widest">Redirecting to operations...</p>
          </div>
        )}

        {status === 'email-needed' && (
          <div className="w-full text-left animate-in fade-in duration-300">
            <div className="mb-6 p-4 bg-pw-bg text-pw-black rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs font-medium leading-relaxed uppercase tracking-wider">
                This link was opened on a different device. Please confirm your email to continue.
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label className="ag-label mb-3 block opacity-60">Corporate Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-14 bg-pw-bg/30 border border-pw-border/10 rounded-full px-6 text-sm font-medium focus:bg-pw-surface focus:border-pw-black transition-all outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-14 bg-pw-black text-white rounded-full font-bold uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl hover:scale-[1.02]"
              >
                Confirm & Login
              </button>
            </form>
          </div>
        )}

        {status === 'error' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <AlertCircle className="w-12 h-12 text-red-500 mb-6" />
            <h2 className="text-xl font-medium tracking-tight mb-2">Authentication Failed</h2>
            <p className="text-sm text-pw-muted mb-8 max-w-[280px]">
              {authError || 'The sign in link is invalid, expired, or has already been used.'}
            </p>
            <Link 
              href="/login"
              className="w-full h-14 border border-pw-border/10 text-pw-black rounded-full font-bold uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center hover:bg-pw-bg"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
