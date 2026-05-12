'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

/* ═══════════════════════════════════════════════════════
   Checkout Success Page

   This is a STANDALONE page (not behind dashboard auth)
   so it works for both:
     • Authenticated users returning from Stripe
     • Guest checkouts who haven't created an account yet

   Flow:
     1. Stripe redirects here with ?session_id=cs_xxx
     2. We verify the session status via /api/stripe/session-status
     3. If user is logged in → refresh token + show "Go to Dashboard"
     4. If user is NOT logged in → show "Create your account" CTA
        (links to /register with plan context)
   ═══════════════════════════════════════════════════════ */

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#555]" />
        </div>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  );
}

interface SessionData {
  status: string;
  paymentStatus: string;
  plan: string | null;
  planId: string | null;
  billingInterval: string | null;
  customerEmail: string | null;
  subscriptionStatus: string | null;
  trialEnd: string | null;
}

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'success' | 'error'>('loading');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [tokenRefreshed, setTokenRefreshed] = useState(false);
  const hasResolved = useRef(false);

  // Check auth state without blocking
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsub();
  }, []);

  // Verify the checkout session
  useEffect(() => {
    if (!sessionId || hasResolved.current) return;
    hasResolved.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
        const data = await res.json();

        if (res.ok && data.status === 'complete') {
          setSessionData(data);
          setPhase('success');
        } else {
          setPhase('error');
        }
      } catch {
        setPhase('error');
      }
    })();
  }, [sessionId]);

  // For logged-in users: refresh token + sync session cookie
  useEffect(() => {
    if (phase !== 'success' || !isLoggedIn || tokenRefreshed) return;

    (async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(true);
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: freshToken }),
          });
          setTokenRefreshed(true);
        }
      } catch (err) {
        console.warn('[CheckoutSuccess] Token refresh failed (non-fatal):', err);
      }
    })();
  }, [phase, isLoggedIn, tokenRefreshed]);

  // No session_id — redirect to pricing
  if (!sessionId) {
    return (
      <PageShell>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#555] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No session found</h2>
          <p className="text-sm text-[#888] mb-6">
            It looks like you got here without completing a checkout.
          </p>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors">
            View Plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Loading State */}
      {phase === 'loading' && (
        <div className="text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Confirming your subscription…
          </h2>
          <p className="text-sm text-[#888]">
            Please wait while we verify your payment.
          </p>
        </div>
      )}

      {/* Error State */}
      {phase === 'error' && (
        <div className="text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-950/60 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-[#888] mb-6">
            We couldn&apos;t verify your checkout session. If you were charged, your subscription will still be activated automatically.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/support"
              className="text-sm text-[#555] hover:text-[#aaa] transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      )}

      {/* Success State */}
      {phase === 'success' && sessionData && (
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          {/* Celebration icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-950/40 border border-green-800/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Welcome to PaperWorking!
          </h2>

          {/* Plan details */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg mb-4">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">
              {sessionData.plan ?? 'Subscription'}{' '}
              {sessionData.billingInterval === 'annual' ? '(Annual)' : '(Monthly)'}
            </span>
          </div>

          <p className="text-sm text-[#888] mb-8 leading-relaxed max-w-sm mx-auto">
            {sessionData.subscriptionStatus === 'trialing' ? (
              <>
                Your free trial is active.
                {sessionData.trialEnd && (
                  <>
                    {' '}Full access until{' '}
                    <strong className="text-white">
                      {new Date(sessionData.trialEnd).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>.
                  </>
                )}
              </>
            ) : (
              <>Your subscription is now active. You have full access to all features.</>
            )}
          </p>

          {/* CTA — different for logged-in vs guest */}
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            {isLoggedIn ? (
              /* Authenticated user → go straight to dashboard */
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all active:scale-[0.97]"
              >
                <Sparkles className="w-4 h-4" />
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              /* Guest → create account to claim subscription */
              <>
                <Link
                  href={`/register${sessionData.customerEmail ? `?email=${encodeURIComponent(sessionData.customerEmail)}` : ''}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all active:scale-[0.97]"
                >
                  Create Your Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-[#555] hover:text-[#aaa] transition-colors"
                >
                  Already have an account? Sign in
                </Link>
              </>
            )}
          </div>

          {/* Security badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#444]">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by Stripe · 256-bit encryption</span>
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ─── Page Shell (reuses auth layout aesthetic) ─── */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
      {/* Dot-grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #2b2b2b 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Logo — top-left */}
      <div className="absolute top-6 left-8 z-20">
        <Logo href="/" size="sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {children}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-[#4a4a4a]">
        <Link href="/terms" className="hover:text-[#888] transition-colors">Terms of service</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-[#888] transition-colors">Privacy policy</Link>
        <span className="mx-2">·</span>
        <span>©{new Date().getFullYear()} PaperWorking</span>
      </div>
    </div>
  );
}
