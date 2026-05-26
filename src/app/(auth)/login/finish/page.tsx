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

  const handleVerification = async (email: string) => {
    setStatus('verifying');
    clearError();
    try {
      await verifyMagicLink(email, window.location.href);
      setStatus('success');
      // Honour any checkout intent stored before the magic link was sent.
      // Mirrors the getRedirectDestination logic in the login page.
      let dest = '/dashboard';
      if (typeof window !== 'undefined') {
        if (sessionStorage.getItem('pw_pending_plan')) {
          sessionStorage.removeItem('pw_auth_redirect');
          dest = '/pricing';
        } else {
          const saved = sessionStorage.getItem('pw_auth_redirect');
          if (saved && saved.startsWith('/')) {
            sessionStorage.removeItem('pw_auth_redirect');
            dest = saved;
          }
        }
      }
      router.push(dest);
    } catch { setStatus('error'); }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.href.includes('apiKey=')) {
      const storedEmail = window.localStorage.getItem('emailForSignIn');
      if (storedEmail) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleVerification(storedEmail);
      } else {
        setStatus('email-needed');
      }
    } else {
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) handleVerification(emailInput);
  };

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
        {/* ── Heading ── */}
        <div className="mb-6 text-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2 font-headline-md">
            Authenticating
          </h1>
          <p className="text-xs md:text-sm text-pw-muted font-body-sm">
            Connecting your session securely.
          </p>
        </div>

        <div className="w-full flex flex-col items-center justify-center py-4">

          {/* Verifying */}
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-400 py-6">
              <Loader2 className="w-10 h-10 animate-spin text-white" />
              <p className="text-xs text-pw-muted uppercase tracking-widest font-semibold">Verifying token…</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-400 py-4">
              <div 
                className="flex h-14 w-14 items-center justify-center rounded-full border"
                style={{ backgroundColor: 'rgba(5, 46, 22, 0.4)', borderColor: 'rgba(22, 101, 52, 0.3)' }}
              >
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white font-headline-md">Login Successful</h2>
                <p className="mt-1 text-xs text-pw-muted font-body-sm">Redirecting you now…</p>
              </div>
            </div>
          )}

          {/* Email needed (opened on different device) */}
          {status === 'email-needed' && (
            <div className="w-full text-left animate-in fade-in duration-300">
              <div className="mb-5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-pw-muted" />
                <p className="text-xs text-pw-muted leading-relaxed font-body-sm">
                  This link was opened on a different device. Confirm your email to continue.
                </p>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full auth-input px-4 py-3 text-sm placeholder-text-secondary transition-all duration-300"
                />
                <button
                  type="submit"
                  className="w-full luminous-button py-4 rounded-full font-semibold text-xs tracking-wider uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Confirm &amp; Sign In
                </button>
              </form>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="w-full flex flex-col items-center gap-5 animate-in fade-in duration-300">
              <div 
                className="flex h-14 w-14 items-center justify-center rounded-full border"
                style={{ backgroundColor: 'rgba(66, 32, 32, 0.4)', borderColor: 'rgba(153, 27, 27, 0.3)' }}
              >
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white font-headline-md">Link Invalid</h2>
                <p 
                  className="mt-2 text-xs text-pw-muted leading-relaxed mx-auto font-body-sm"
                  style={{ maxWidth: '280px' }}
                >
                  {authError || 'This sign-in link is invalid, expired, or has already been used.'}
                </p>
              </div>
              <Link
                href="/login"
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-semibold text-pw-black transition-colors flex items-center justify-center"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
