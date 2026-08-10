'use client';

import React from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   SubscribeCTA (AQ-27)
   
   Glass-card CTA shown to non-subscribers on the public
   listing page. Directs to pricing page. Zero payment UI
   — no prices, no checkout, just a subscribe prompt.
   ═══════════════════════════════════════════════════════ */

interface SubscribeCTAProps {
  className?: string;
  listingId?: string;
}

export default function SubscribeCTA({ className = '', listingId }: SubscribeCTAProps) {
  const returnUrl = listingId ? `/deals/${listingId}` : '/dashboard/deals';
  const registerUrl = `/register?redirect=${encodeURIComponent(returnUrl)}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(returnUrl)}`;

  return (
    <div
      className={`
        glass-card rounded-2xl border border-pw-border p-8 text-center
        relative overflow-hidden
        ${className}
      `}
      data-testid="subscribe-cta"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent pointer-events-none" />
      
      <div className="relative z-10 space-y-4">
        {/* Lock icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-2xl">
            lock
          </span>
        </div>

        <h3 className="text-lg font-bold text-[var(--color-on-surface)]" data-testid="auth-gate-title">
          Create a free account to see full deal details
        </h3>
        
        <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto leading-relaxed">
          Create a free account or sign in to unlock full underwriting financials (ARV, fees, cap rates, rent rolls), lead investor profiles, document downloads, and direct messaging.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={registerUrl}
            className="
              luminous-button inline-flex items-center gap-2
              px-6 py-3 rounded-xl text-sm font-semibold
              transition-all duration-200
            "
            data-testid="create-free-account-btn"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Create Free Account
          </Link>

          <Link
            href={loginUrl}
            className="
              px-6 py-3 rounded-xl text-sm font-semibold border border-pw-border
              text-[var(--color-on-surface)] hover:bg-white/5 transition-all
            "
            data-testid="sign-in-btn"
          >
            Sign In
          </Link>
        </div>

        <p className="text-[11px] text-[var(--color-muted)]/60 mt-2">
          Join investors actively discovering and funding real estate deals.
        </p>
      </div>
    </div>
  );
}
