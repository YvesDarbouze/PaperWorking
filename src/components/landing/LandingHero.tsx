import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingHero — Stitch-aligned centered hero.

   Matches "PaperWorking Landing Page (Desktop Redesign)"
   screen from Stitch project 11643693106955298243.
   
   Centered text-only layout with CTA buttons.
   ═══════════════════════════════════════════════════════ */

export default function LandingHero() {
  return (
    <section className="dark relative flex items-center justify-center pt-32 pb-24 bg-background overflow-hidden w-full">
      {/* Ambient glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Content — centered single column */}
      <div className="relative z-20 max-w-container-max mx-auto px-gutter-desktop w-full text-center mt-20 mb-8">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            The Real Estate Investment Operating System
          </span>
        </div>

        {/* Title */}
        <h1 className="font-headline-xl text-headline-xl max-w-4xl mx-auto mb-6 text-on-surface">
          Scale Your Real Estate Portfolio <br />
          <span className="font-extrabold text-primary">Without the Chaos.</span>
        </h1>

        {/* Sub-copy */}
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
          Centralize your pipeline, automate documentation, and track margins in real-time.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-4 rounded-lg font-label-md text-label-md text-lg inline-flex items-center gap-2 bg-primary text-on-primary hover:opacity-90 transition-opacity"
          >
            Start Your 14-Day Trial
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              arrow_forward
            </span>
          </Link>
          <span className="font-body-sm text-body-sm text-on-surface-variant/60">
            No credit card required. Free forever for 1 active deal.
          </span>
        </div>
      </div>
    </section>
  );
}
