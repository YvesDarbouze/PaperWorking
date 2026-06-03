'use client';

import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingHero — Stitch Obsidian Edition.

   Sections rendered in order:
   1. Hero  — badge, headline, subtitle, CTA
   2. REIL Phases Grid  — 4-column lifecycle cards (#how-it-works)
   3. Stop Profit Erosion — elevated glass callout
   ═══════════════════════════════════════════════════════ */

const phases = [
  {
    icon: 'hub',
    title: 'Acquisition',
    body: 'Source & secure capital.',
  },
  {
    icon: 'verified_user',
    title: 'Purchase',
    body: 'Automated compliance.',
  },
  {
    icon: 'speed',
    title: 'Hold',
    body: 'Real-time margin tracking.',
  },
  {
    icon: 'account_balance',
    title: 'Exit',
    body: 'Instant ROI reporting.',
  },
] as const;

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
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-5">
            Scale Your Real Estate Portfolio{' '}
            <span className="text-primary luminous-text">Without the Chaos.</span>
          </h1>

          {/* Subtitle */}
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-10">
            Centralize your pipeline, automate documentation, and track margins in real-time.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
            <Link
              href="/register"
              className="luminous-button px-8 py-4 rounded-lg inline-flex items-center gap-2 group"
            >
              Start Your 14-Day Trial
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

      {/* ── 2. REIL Phases Grid ─────────────────────────────── */}
      <section
        id="how-it-works"
        className="w-full max-w-container-max mx-auto px-5 md:px-6 pb-16 md:pb-24"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {phases.map(({ icon, title, body }) => (
            <div
              key={title}
              className="glass-panel p-8 rounded-xl border border-primary/10 hover:border-primary/30 transition-all group"
            >
              {/* Icon wrapper */}
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">
                  {icon}
                </span>
              </div>

              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                {title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Stop Profit Erosion ──────────────────────────── */}
      <section className="w-full max-w-container-max mx-auto px-5 md:px-6 pb-24 md:pb-32">
        <div className="glass-panel-elevated p-12 rounded-2xl text-center border-t-2 border-t-primary/40 relative overflow-hidden">
          <h2 className="font-headline-lg text-headline-lg text-primary mb-4">
            Stop Profit Erosion.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface">
            Replace fragmented spreadsheets with a single, high-fidelity operating system.
          </p>
        </div>
      </section>
    </>
  );
}
