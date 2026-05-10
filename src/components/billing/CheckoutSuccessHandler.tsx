'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   CheckoutSuccessHandler

   Reads `?checkout=success&session_id=cs_xxx` from the URL
   after a Stripe Checkout redirect. Calls the session-status
   API to confirm the subscription was created, then shows a
   celebration overlay before dismissing.

   Mount this component inside the dashboard layout.

   Architecture note (Autumn pattern):
     This is the client-side equivalent of Autumn's
     handleConfirmCheckout — it resolves the session
     and refreshes the local auth context. The actual
     subscription state is already synced by the webhook,
     so this is purely a UX confirmation layer.
   ═══════════════════════════════════════════════════════ */

interface SessionData {
  status: string;
  paymentStatus: string;
  plan: string | null;
  planId: string | null;
  billingInterval: string | null;
  subscriptionStatus: string | null;
  trialEnd: string | null;
}

export default function CheckoutSuccessHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'success' | 'hidden'>('hidden');
  const hasResolved = useRef(false);

  const checkoutStatus = searchParams.get('checkout');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (checkoutStatus !== 'success' || !sessionId || hasResolved.current) return;
    hasResolved.current = true;

    setPhase('loading');

    (async () => {
      try {
        const res = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
        const data = await res.json();

        if (res.ok && data.status === 'complete') {
          setSessionData(data);
          setPhase('success');

          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            setPhase('hidden');
            // Clean query params without navigation
            const url = new URL(window.location.href);
            url.searchParams.delete('checkout');
            url.searchParams.delete('session_id');
            window.history.replaceState({}, '', url.pathname);
          }, 5000);
        } else {
          // Session not complete — webhook will handle state sync
          setPhase('hidden');
        }
      } catch {
        // Fail silently — webhook is the primary sync mechanism
        setPhase('hidden');
      }
    })();
  }, [checkoutStatus, sessionId]);

  if (phase === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-bg-surface rounded-2xl shadow-2xl border border-border-accent p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-500"
        style={{ animationDelay: '100ms' }}
      >
        {phase === 'loading' && (
          <>
            <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Confirming Your Subscription…
            </h3>
            <p className="text-sm text-text-secondary">
              Please wait while we activate your account.
            </p>
          </>
        )}

        {phase === 'success' && sessionData && (
          <>
            {/* Celebration icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>

            <h3 className="text-xl font-bold text-text-primary mb-2">
              Welcome to PaperWorking!
            </h3>

            <p className="text-sm text-text-secondary mb-5 leading-relaxed">
              {sessionData.subscriptionStatus === 'trialing' ? (
                <>
                  Your <strong>{sessionData.plan}</strong> free trial is active.
                  {sessionData.trialEnd && (
                    <> Full access until{' '}
                      <strong>
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
                <>
                  Your <strong>{sessionData.plan}</strong> subscription is now active.
                  You have full access to all features.
                </>
              )}
            </p>

            {/* Quick actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setPhase('hidden');
                  const url = new URL(window.location.href);
                  url.searchParams.delete('checkout');
                  url.searchParams.delete('session_id');
                  window.history.replaceState({}, '', url.pathname);
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <div className="mt-4 h-1 w-full bg-border-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{
                  animation: 'shrink 5s linear forwards',
                }}
              />
            </div>
            <style jsx>{`
              @keyframes shrink {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}
