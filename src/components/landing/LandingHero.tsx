import Link from 'next/link';
import HeroDashboard from './HeroDashboard';

/* ═══════════════════════════════════════════════════════
   LandingHero — Stitch-synchronized Hero component.

   Split layout: headline + CTA on left, live animated
   HeroDashboard preview on right. No static image.
   ═══════════════════════════════════════════════════════ */

export default function LandingHero() {
  return (
    <section className="dark relative min-h-screen flex items-center justify-center pt-24 pb-stack-lg obsidian-bg overflow-hidden w-full">
      {/* Architectural background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10" />
        <img
          alt="Architectural background"
          className="w-full h-full object-cover opacity-30 grayscale contrast-125"
          src="/obsidian-brutalist.jpg"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-container-max mx-auto px-gutter-desktop w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[80vh]">

          {/* ── Left: Headline + CTA ── */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                The Real Estate Investment Operating System
              </span>
            </div>

            {/* Title */}
            <h1 className="font-headline-xl text-headline-xl max-w-xl mb-6 text-on-surface leading-tight">
              Stop bleeding margins to{' '}
              <span className="luminous-text font-extrabold">disorganized deals.</span>
            </h1>

            {/* Sub-copy */}
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mb-10">
              Every day a deal is delayed, holding costs eat your profits. PaperWorking centralizes
              your pipeline, tracks real-time costs, and automates closing docs so you can close
              faster and scale without the chaos.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 w-full">
              <Link
                href="/register"
                className="luminous-button px-8 py-4 rounded-lg font-label-md text-label-md text-lg inline-flex items-center gap-2 whitespace-nowrap"
              >
                Start Your 14-Day Trial
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 rounded-lg font-label-md text-label-md text-lg border border-white/20 text-on-surface-variant hover:border-white/40 hover:text-on-surface transition-all inline-flex items-center gap-2 whitespace-nowrap"
              >
                See Pricing
              </Link>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant/50 mt-4">
              14-day trial · Credit card required · No charge until day 15
            </p>

            {/* Social proof micro-strip */}
            <div className="flex items-center gap-6 mt-8 pt-8 border-t border-white/10 w-full">
              {[
                { value: '$2.4B+', label: 'Capital Tracked' },
                { value: '12,000+', label: 'Active Deals' },
                { value: '4 Phases', label: 'End-to-End' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface luminous-text">
                    {stat.value}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant/60 uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Live animated dashboard preview ── */}
          <div className="relative group hidden lg:block">
            {/* Glow halo */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/25 via-secondary/10 to-transparent rounded-3xl blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none" />

            {/* Dashboard shell */}
            <div className="relative glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-black/40">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-4 font-label-sm text-label-sm text-on-surface-variant/60 uppercase tracking-widest">
                  paperworking.co — Command Center
                </span>
              </div>
              <HeroDashboard />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
