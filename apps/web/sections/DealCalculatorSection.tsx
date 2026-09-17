'use client';

import React from 'react';

export default function DealCalculatorSection() {
  return (
    <section
      id="deal-calculator"
      className="relative overflow-hidden bg-[#0a0a0f] border-b border-white/5 py-16 md:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text Column (Left on Desktop) */}
          <div className="flex flex-col items-start space-y-5 text-left">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-primary)]">
              DEAL CALCULATOR
            </span>
            <h2 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl md:text-5xl">
              Analyze deals with professional precision.
            </h2>
            <p className="text-[16px] leading-[1.7] text-white/60 sm:text-lg">
              Before deciding to make a major acquisition, spending thousands, even millions of dollars on an
              investment, use the PaperWorking integrated &ldquo;Deal Calculator&rdquo; to calculate the
              critical numbers real estate investors need to make critical decisions on a new investment.
            </p>
          </div>

          {/* Visual Column (Right on Desktop) */}
          <div className="relative flex flex-col items-center lg:items-end justify-center">
            {/* Subtle primary color glow */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[80px]"
              aria-hidden
            />

            <div className="relative z-10 w-full max-w-[540px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a] shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Terminal Frame Top Bar */}
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#141624] px-4 py-2.5 select-none">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] opacity-85" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] opacity-85" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f] opacity-85" />
                </div>
                <div className="flex h-6 w-3/5 max-w-[260px] items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/40 px-3 text-[11px] font-[family-name:var(--font-jetbrains-mono)] text-white/50 truncate">
                  <span className="material-symbols-outlined text-[12px] text-white/30">lock</span>
                  <span className="truncate">paperworking.co/deal-calculator</span>
                </div>
                <span
                  data-testid="landing-demo-data-badge"
                  className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-wider text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20 rounded bg-[color:var(--color-primary)]/10 px-2 py-0.5 font-semibold"
                >
                  ILLUSTRATIVE DEMO DATA
                </span>
              </div>

              {/* Graphic Asset with Exact Required Alt Text */}
              <div className="relative w-full overflow-hidden bg-[#0a0a0f]">
                <img
                  src="/images/deal-calculator-preview.png"
                  alt="PaperWorking Deal Calculator — projected cap rate, IRR and cash-on-cash"
                  width={1200}
                  height={896}
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto object-cover block transition-transform duration-300 hover:scale-[1.01]"
                />
              </div>

              {/* Underwriting Summary Strip */}
              <div className="border-t border-white/[0.08] bg-[#11131e] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                    <span className="material-symbols-outlined text-[15px] text-[color:var(--color-primary)]">
                      location_on
                    </span>
                    <span>1247 Elm Street, Austin TX</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-jetbrains-mono)]">
                    <span className="text-white/45 uppercase tracking-wider text-[9px]">Confidence</span>
                    <span className="text-[color:var(--color-primary)] font-bold">84%</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center font-[family-name:var(--font-jetbrains-mono)]">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-white/40">Price</span>
                    <span className="text-[11px] font-bold text-white">$485,000</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-white/40">ARV</span>
                    <span className="text-[11px] font-bold text-white">$620,000</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-white/40">Rehab</span>
                    <span className="text-[11px] font-bold text-white">$68,000</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-white/40" title="Cap Rate on Cost: Year-1 NOI divided by Total Cost Basis">Cap Rate on Cost</span>
                    <span className="text-[11px] font-bold text-[color:var(--color-primary)]">6.2%</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-white/40">Proj IRR</span>
                    <span className="text-[11px] font-bold text-[color:var(--color-primary)]">24.8%</span>
                  </div>
                </div>

                {/* Alert Badge */}
                <div className="flex items-center gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-2.5 py-1.5 text-[11px] text-white/70">
                  <span
                    className="material-symbols-outlined text-[13px] text-amber-300/90 shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden
                  >
                    notifications_active
                  </span>
                  <span className="truncate">
                    <strong className="text-amber-300 font-semibold">Alert:</strong> Appraisal contingency expires in 3 days
                  </span>
                </div>

                {/* Statutory Landing Demo Disclaimer Label */}
                <p
                  data-testid="landing-demo-data-label"
                  className="text-center text-[10px] text-white/45 italic pt-1"
                >
                  Illustrative demo data — not a real deal or performance history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
