import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingHero — Stitch-synchronized Hero component.
   
   Enforces Plus Jakarta Sans / Hanken Grotesk typography
   via design token classes, container padding, and
   luminous-glow CTA buttons. Scoped to .dark container
   for faithful dark obsidian color theme mapping.
   ═══════════════════════════════════════════════════════ */

export default function LandingHero() {
  return (
    <section className="dark relative min-h-screen flex items-center justify-center pt-24 pb-stack-lg obsidian-bg overflow-hidden w-full">
      {/* Background Image with prompt */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10"></div>
        <img
          alt="Architectural background"
          className="w-full h-full object-cover opacity-30 grayscale contrast-125"
          src="/obsidian-brutalist.jpg"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-container-max mx-auto px-gutter-desktop text-center w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass-panel px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            The Real Estate Investment Operating System
          </span>
        </div>

        {/* Title */}
        <h1 className="font-headline-xl text-headline-xl max-w-4xl mx-auto mb-6 text-on-surface">
          Stop bleeding margins to <br />
          <span className="luminous-text font-extrabold">disorganized deals.</span>
        </h1>

        {/* Paragraph */}
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
          Every day a deal is delayed, holding costs eat your profits. PaperWorking centralizes your pipeline, tracks real-time costs, and automates closing docs so you can close faster and scale without the chaos.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4">
          <Link
            href="/register"
            className="luminous-button px-8 py-4 rounded-lg font-label-md text-label-md text-lg inline-flex items-center gap-2"
          >
            Start Your 14-Day Trial
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_forward
            </span>
          </Link>
          <span className="font-body-sm text-body-sm text-on-surface-variant/60">
            14-day trial. Credit card required. No charge until day 15.
          </span>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="mt-20 max-w-5xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="glass-card p-4 rounded-xl relative overflow-hidden">
            <img
              alt="Platform Interface"
              className="rounded-lg shadow-2xl border border-white/5 grayscale brightness-90 hover:grayscale-0 transition-all duration-700 w-full h-auto"
              src="/platform-interface.png"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
