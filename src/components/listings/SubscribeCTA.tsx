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
}

export default function SubscribeCTA({ className = '' }: SubscribeCTAProps) {
  return (
    <div
      className={`
        glass-card rounded-2xl border border-pw-border p-8 text-center
        relative overflow-hidden
        ${className}
      `}
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

        <h3 className="text-lg font-bold text-[var(--color-on-surface)]">
          Full Deal Details Available to Subscribers
        </h3>
        
        <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto leading-relaxed">
          Subscribe to see the full property address, exact financial terms,
          lead investor profile, and respond directly to this deal.
        </p>

        <Link
          href="/pricing"
          className="
            luminous-button inline-flex items-center gap-2
            px-6 py-3 rounded-xl text-sm font-semibold
            transition-all duration-200
          "
        >
          <span className="material-symbols-outlined text-lg">verified</span>
          Subscribe to See Full Deal
        </Link>

        <p className="text-[11px] text-[var(--color-muted)]/60 mt-2">
          Join investors actively discovering and funding real estate deals.
        </p>
      </div>
    </div>
  );
}
