'use client';

import { useState } from 'react';
import { X, Lock, ShieldCheck, CheckCircle2, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface CheckoutModalProps {
  planIdentifier: string; // e.g. "Individual Monthly", "Team Annual"
  onClose: () => void;
}

function parsePlanIdentifier(identifier: string): { plan: string; interval: 'monthly' | 'annual' } {
  const interval = identifier.toLowerCase().includes('annual') ? 'annual' : 'monthly';
  const parts = identifier.split(' ');
  const plan = parts.slice(0, -1).join(' ');
  return { plan, interval };
}

const PRICE_DISPLAY: Record<string, { monthly: string; annual: string; tagline: string }> = {
  'Individual':     { monthly: '$59/mo',  annual: '$499/yr', tagline: 'Solo investor tools & full lifecycle tracking' },
  'Investor Team':  { monthly: '$99/mo',  annual: '$999/yr', tagline: 'Team collaboration with full data isolation' },
  'Team':           { monthly: '$99/mo',  annual: '$999/yr', tagline: 'Team collaboration with full data isolation' },
  'Lawyer':         { monthly: '$59/mo',  annual: '$499/yr', tagline: 'Professional network access & deal requests' },
};

export default function CheckoutModal({ planIdentifier, onClose }: CheckoutModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { plan, interval } = parsePlanIdentifier(planIdentifier);
  const info = PRICE_DISPLAY[plan] ?? { monthly: '', annual: '', tagline: '' };
  const displayPrice = interval === 'annual' ? info.annual : info.monthly;

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingInterval: interval,
          userId: user.uid,
          userEmail: user.email,
          idToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session.');
      }

      // Hand off to Stripe's hosted checkout page
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-bg-surface w-full max-w-md shadow-2xl border border-border-accent overflow-hidden animate-in slide-in-from-bottom-6 duration-300">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-border-accent">
          <div>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight flex items-center gap-2">
              Secure Checkout <Lock className="w-4 h-4 text-text-secondary" />
            </h2>
            <p className="text-xs font-medium text-text-secondary tracking-widest uppercase mt-1">
              {plan} Plan — {displayPrice}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Summary */}
        <div className="p-6 space-y-5">
          <div className="bg-bg-primary border border-border-accent p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-text-primary">{plan}</p>
                <p className="text-sm text-text-secondary mt-0.5 leading-snug max-w-[200px]">{info.tagline}</p>
              </div>
              <span className="text-2xl font-medium text-text-primary tabular-nums whitespace-nowrap ml-4">
                {displayPrice}
              </span>
            </div>
            {interval === 'annual' && (
              <p className="text-xs text-text-secondary mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Billed annually — equivalent to 2 months free
              </p>
            )}
          </div>

          {/* Auth-gated body */}
          {!user ? (
            <div className="text-center py-3 space-y-4">
              <p className="text-sm text-text-secondary">Sign in to complete your purchase.</p>
              <button
                onClick={() => router.push('/login?redirect=/pricing')}
                className="flex items-center gap-2 mx-auto bg-pw-black text-white px-6 py-2.5 text-sm font-medium hover:opacity-90 transition"
              >
                <LogIn className="w-4 h-4" /> Sign in to continue
              </button>
              <p className="text-xs text-text-secondary">
                New here?{' '}
                <button
                  onClick={() => router.push('/register?redirect=/pricing')}
                  className="underline hover:text-text-primary transition-colors"
                >
                  Create an account
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <CheckCircle2 className="w-4 h-4 text-pw-accent flex-shrink-0" />
                Subscribing as <strong>{user.email}</strong>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-5 text-xs font-medium text-text-secondary">
                <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> 256-bit SSL</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Cancel Anytime</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {user && (
          <div className="p-6 border-t border-border-accent bg-bg-primary">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center bg-pw-black text-white font-medium py-3.5 hover:opacity-90 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to Stripe…</>
              ) : (
                <>Subscribe to {plan} <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </button>
            <p className="text-xs text-center text-text-secondary mt-4 leading-relaxed max-w-xs mx-auto">
              You'll be redirected to Stripe's secure checkout. Card data never touches our servers.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
