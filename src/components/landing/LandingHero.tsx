import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingHero — Stitch-aligned centered hero.

   Matches "PaperWorking Landing Page (Desktop Redesign)"
   screen from Stitch project 11643693106955298243.
   
   Centered text-only layout with CTA buttons.
   ═══════════════════════════════════════════════════════ */

export default function LandingHero() {
  return (
    <section className="dark relative flex items-center justify-center pt-stack-xl md:pt-32 pb-stack-lg md:pb-24 bg-background overflow-hidden w-full terminal-grid">
      {/* Ambient glow */}
      <div className="ambient-glow" />

      {/* Content — centered single column */}
      <div className="relative z-20 max-w-md md:max-w-container-max mx-auto px-margin-mobile md:px-gutter-desktop w-full text-center mt-0 md:mt-20 mb-32">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            The Real Estate Investment Operating System
          </span>
        </div>

        {/* Title */}
        <h1 className="font-headline-xl text-headline-xl max-w-4xl mx-auto mb-6 text-on-surface leading-tight tracking-tight">
          Stop losing sleep over <br className="hidden md:block" />
          <span className="luminous-text font-extrabold">disorganized deals.</span>
        </h1>

        {/* Sub-copy */}
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 px-2 md:px-0">
          Every day a project sits idle, holding costs eat your profits. PaperWorking professionalizes your entire operation—centralizing your pipeline, tracking rehab costs in real-time, and automating docs. Save money, manage projects effortlessly, and free up your time to find more deals.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4">
          <Link
            href="/register"
            className="luminous-button px-8 py-4 rounded-lg font-label-md text-label-md text-lg inline-flex items-center gap-2"
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
            14-day trial. Credit card required. No charge until day 15.
          </span>
        </div>
      </div>
    </section>
  );
}
