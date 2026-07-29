'use client';

/* ═══════════════════════════════════════════════════════
   /search — DM-7 Pre-paywall Address Search

   PUBLIC route (no auth required).
   Single prominent address search input with autocomplete.
   Results respect DM-D9 visibility modes exactly.
   Zero results → DM-D10 cold start conversion surface.
   ═══════════════════════════════════════════════════════ */

import React from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import PublicAddressSearch from '@/components/search/PublicAddressSearch';

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <LandingHeader />

      <main className="flex-1 flex flex-col">
        {/* ── Hero Section ────────────────────────────── */}
        <section className="relative px-4 sm:px-6 pt-20 sm:pt-28 pb-12 sm:pb-16">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative max-w-3xl mx-auto text-center">
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight leading-[1.1] mb-4">
              Search any property
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant/60 max-w-lg mx-auto mb-10 leading-relaxed">
              Find active deals by street address. No account required.
            </p>

            {/* Search Input */}
            <PublicAddressSearch />
          </div>
        </section>

        {/* ── Bottom spacer ───────────────────────────── */}
        <div className="flex-1" />
      </main>

      <LandingFooter />
    </div>
  );
}
