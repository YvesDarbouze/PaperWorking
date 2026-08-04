'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Lock, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId?: string;
  propertyName?: string;
}

export function AuthGateModal({
  isOpen,
  onClose,
  listingId,
  propertyName,
}: AuthGateModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const returnUrl = listingId ? `/deals/${listingId}` : '/dashboard/deals';
  const registerUrl = `/register?redirect=${encodeURIComponent(returnUrl)}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(returnUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" data-testid="auth-gate-modal">
      <div className="relative w-full max-w-md glass-card border border-pw-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9E9DA0] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon Header */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Lock className="w-7 h-7" />
        </div>

        {/* Text Body */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white leading-tight">
            Create a free account to see full deal details
          </h2>
          {propertyName && (
            <p className="text-xs font-semibold text-amber-400/90 truncate max-w-xs mx-auto">
              {propertyName}
            </p>
          )}
          <p className="text-sm text-[#9E9DA0] leading-relaxed pt-1">
            Unlock full underwriting financials (ARV, fees, cap rates, rent rolls), lister identities, document downloads, and direct messaging.
          </p>
        </div>

        {/* Features Bullet List */}
        <div className="text-left bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2 text-xs text-[#9E9DA0]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Complete financial models & sensitivity analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Verified lead investor bio & direct contact</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Document room access & title disclosures</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(registerUrl)}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg"
            data-testid="create-free-account-btn"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => router.push(loginUrl)}
            className="w-full py-2.5 px-4 rounded-xl border border-white/10 text-white font-semibold text-xs hover:bg-white/5 transition-all"
            data-testid="sign-in-btn"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
