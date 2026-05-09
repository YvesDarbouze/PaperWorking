'use client';

import { useState } from 'react';
import { X, Lock, ShieldCheck, CheckCircle2, ArrowRight, Loader2, CreditCard } from 'lucide-react';
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
    setLoading(true);
    setError(null);

    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingInterval: interval,
          userId: user?.uid,
          userEmail: user?.email,
          idToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to initialize checkout.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pw-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-bg-surface/95 backdrop-blur-xl w-full max-w-md shadow-2xl border border-border-accent/50 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 ease-out transition-all my-8">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-border-accent/30">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
              Secure Checkout <Lock className="w-4 h-4 text-pw-accent" />
            </h2>
            <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase mt-1">
              {plan} Plan — {displayPrice}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-transform hover:rotate-90 duration-300 rounded-full hover:bg-border-subtle"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Summary */}
        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-bg-primary to-bg-surface border border-border-accent/60 rounded-xl p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:border-pw-accent/30">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-text-primary text-lg">{plan}</p>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed max-w-[200px]">{info.tagline}</p>
                  </div>
                  <span className="text-2xl font-bold text-text-primary tabular-nums whitespace-nowrap ml-4 drop-shadow-sm">
                    {displayPrice}
                  </span>
                </div>
                {interval === 'annual' && (
                  <div className="mt-4 pt-3 border-t border-border-subtle/50">
                    <p className="text-xs font-medium text-pw-accent flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Billed annually — equivalent to 2 months free
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 px-1">
                {user ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border-subtle text-sm text-text-primary">
                    <div className="bg-pw-accent/10 p-2 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-pw-accent flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Logged in as</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border-subtle text-sm text-text-primary">
                    <div>
                      <p className="font-medium">Guest Checkout (Express)</p>
                      <p className="text-xs text-text-secondary mt-0.5">Pay quickly with Link, Apple Pay, or Google Pay.</p>
                    </div>
                    <button
                      onClick={() => router.push('/login?redirect=/pricing')}
                      className="text-xs font-semibold text-pw-accent hover:text-pw-black transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {error && (
                  <div className="animate-in slide-in-from-top-2 text-sm text-red-600 bg-red-50/80 border border-red-200 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* 2026 Trust Signals */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-text-secondary bg-bg-primary/30 py-2 px-3 rounded-md border border-border-subtle/40">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>256-bit Encryption</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-text-secondary bg-bg-primary/30 py-2 px-3 rounded-md border border-border-subtle/40">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span>1-Click Payments</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="p-6 pt-2 border-t border-border-accent/30 bg-bg-surface/50">
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="group relative w-full flex items-center justify-center bg-pw-black text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Preparing Checkout…</>
                ) : (
                  <>
                    <span className="relative z-10">Proceed to Payment</span>
                    <ArrowRight className="w-5 h-5 ml-2 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
              
              <div className="mt-4 flex flex-col items-center gap-1">
                <p className="text-[11px] text-center text-text-secondary font-medium flex items-center gap-1.5 justify-center">
                  <Lock className="w-3 h-3" /> Secure checkout by Stripe
                </p>
                <p className="text-[10px] text-center text-text-tertiary max-w-[280px] leading-relaxed">
                  Taxes and fees calculated at next step. You can cancel your plan at any time from your account settings.
                </p>
              </div>
            </div>
      </div>
    </div>
  );
}
