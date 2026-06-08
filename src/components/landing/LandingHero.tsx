'use client';

import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingHero — Outcome-first redesign.

   Design principles applied:
   1. Lead with outcome: "Stop losing money on deals you should've caught"
      not "Real Estate Investment OS"
   2. ONE primary CTA above the fold — everything else visually quieter
   3. Product proof above fold: DealAnalyzerCard shows the actual product
   4. Skeptic-targeted: social proof + honest language, no fluff
   5. Split layout: copy left / product right (desktop); stacked (mobile)
   ═══════════════════════════════════════════════════════ */

/* ─── Above-fold product preview card ───────────────────── */
function HeroDealCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden w-full">

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div>
          <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-0.5">
            Deal Analyzer
          </div>
          <div className="text-[13px] font-semibold text-on-surface">1247 Elm Street, Austin TX</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Metrics 2×2 */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {[
          { label: 'Purchase Price',    value: '$485,000' },
          { label: 'After Repair Value', value: '$620,000' },
          { label: 'Rehab Budget',      value: '$68,000'  },
          { label: 'Cap Rate',          value: '6.2%'     },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-container-low/60 rounded-xl px-4 py-3">
            <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-1.5">
              {label}
            </div>
            <div className="text-[17px] font-bold text-on-surface">{value}</div>
          </div>
        ))}
      </div>

      {/* IRR highlight */}
      <div className="px-4">
        <div className="bg-primary/8 border border-primary/15 rounded-xl px-4 py-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="font-jetbrains text-[9px] text-primary/50 uppercase tracking-widest mb-1">
                Projected IRR
              </div>
              <div className="text-[38px] font-extrabold text-primary luminous-text tracking-tighter leading-none">
                24.8%
              </div>
            </div>
            <div className="text-right">
              <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase mb-2">
                Confidence
              </div>
              <div className="font-jetbrains text-[16px] font-bold text-primary">84%</div>
            </div>
          </div>
          {/* Static bar — no JS needed for above-fold proof */}
          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full w-[84%] rounded-full bg-primary/70" />
          </div>
        </div>
      </div>

      {/* Deadline alert — shows "smart monitoring" without extra copy */}
      <div className="p-4">
        <div className="bg-tertiary/6 border border-tertiary/15 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[14px] text-tertiary/80 flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden
          >
            notifications_active
          </span>
          <span className="text-[12px] text-on-surface-variant leading-tight">
            <span className="font-semibold text-tertiary">Alert:</span> Appraisal contingency expires in 3 days
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────── */

export default function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden" style={{ paddingTop: 72 }}>

      {/* Ambient glow — right side, behind product card */}
      <div
        className="absolute top-0 right-0 w-[700px] h-[600px] bg-primary/8 blur-[160px] rounded-full pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8 py-16 md:py-24 lg:py-28 grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-10 lg:gap-16 items-center">

        {/* ── LEFT: Outcome-focused copy ────────────────── */}
        <div className="flex flex-col items-start text-left">

          {/* Eyebrow — honest category signal */}
          <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full mb-8 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-on-surface-variant">
              Real Estate Investment OS
            </span>
          </span>

          {/* H1 — names the outcome, not the product category.
              The investor doesn't want "OS" — they want protected margin. */}
          <h1 className="text-[40px] md:text-[52px] lg:text-[60px] leading-[46px] md:leading-[58px] lg:leading-[68px] font-bold tracking-[-0.04em] text-on-surface mb-6">
            Stop losing money<br />
            on deals you{' '}
            <span className="text-primary luminous-text">should've caught.</span>
          </h1>

          {/* Subhead — honest, direct. Names the exact fears. */}
          <p className="text-[17px] md:text-[18px] leading-[27px] md:leading-[29px] font-normal text-on-surface-variant mb-8 max-w-[520px]">
            Missed contingency deadlines. Contractor draws that blow your budget.
            A tax season that takes six weeks. PaperWorking watches all of it —
            so you don't have to.
          </p>

          {/* ONE primary CTA — visually dominant, nothing competing */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-9">
            <Link
              href="/pricing"
              className="luminous-button relative overflow-hidden px-8 py-4 rounded-xl font-semibold text-[15px] tracking-[-0.01em] inline-flex items-center gap-2.5 group cursor-pointer"
            >
              {/* Shimmer on hover */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                aria-hidden
              />
              Start Free 14 Day Trial
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
            {/* Secondary option — visually quiet */}
            <span className="text-[13px] text-on-surface-variant/50">
              No credit card · 1 deal free forever
            </span>
          </div>

          {/* Social proof — three specific numbers, not marketing claims.
              Skeptics need evidence, not superlatives. */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { icon: 'people',      text: '2,400+ active investors' },
              { icon: 'trending_up', text: '$2.1B deal volume tracked' },
              { icon: 'verified',    text: '83% fewer missed deadlines' },
            ].map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 text-[12px] text-on-surface-variant/50">
                <span
                  className="material-symbols-outlined text-[13px] text-primary/70"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden
                >
                  {icon}
                </span>
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Product proof — shows the product working, above fold ── */}
        <div className="relative w-full lg:w-auto">
          <div
            className="absolute inset-0 bg-primary/6 blur-[60px] rounded-3xl pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            <HeroDealCard />
          </div>
        </div>

      </div>
    </section>
  );
}
