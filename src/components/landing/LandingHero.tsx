'use client';

import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingHero — Stitch Obsidian Edition.

   Sections rendered in order:
   1. Hero  — badge, headline, subtitle, CTA
   2. REIL Phases Grid  — 4-column lifecycle cards (#how-it-works)
   3. Stop Profit Erosion — elevated glass callout
   ═══════════════════════════════════════════════════════ */

export default function LandingHero() {
  return (
    <>
      {/* ── 1. Hero ─────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center pt-28 md:pt-40 pb-16 md:pb-24 overflow-hidden w-full">
        {/* Ambient radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/10 blur-[120px] rounded-full z-0 pointer-events-none" />

        {/* Centered content column */}
        <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-6 w-full flex flex-col items-center text-center">

          {/* Glass-pill badge */}
          <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              THE REAL ESTATE INVESTMENT OPERATING SYSTEM
            </span>
          </span>

          {/* H1 */}
          <h1 className="font-display-hero text-display-hero text-on-surface mb-6 md:text-[72px] md:leading-[80px] text-[42px] leading-[50px]">
            Scale Your Real Estate Portfolio{' '}
            <span className="text-primary luminous-text">Without the Chaos.</span>
          </h1>

          {/* Subtitle */}
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-10 text-[18px] leading-[28px]">
            Centralize your pipeline, automate documentation, and track margins in real-time.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
            <Link
              href="/pricing"
              className="luminous-button px-8 py-4 rounded-lg inline-flex items-center gap-2 group"
            >
              Start 14 Day Trial
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Sub-note */}
          <p className="font-body-sm text-body-sm text-on-surface-variant/60">
            No credit card required. Free forever for 1 active deal.
          </p>
        </div>
      </section>
    </>
  );
}
