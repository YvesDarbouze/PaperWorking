'use client';

import Link from 'next/link';
import {
  heroHeadline,
  heroSubheadline,
  heroBody,
  heroInsurance,
  heroKicker,
} from '@/lib/marketing/copy';
import HeroProductShowcase from './HeroProductShowcase';

const REIL_PHASES = [
  {
    label: 'PHASE 01',
    name: 'Acquisition',
    copy: 'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
  },
  {
    label: 'PHASE 02',
    name: 'Fund',
    copy: 'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
  },
  {
    label: 'PHASE 03',
    name: 'Hold',
    copy: 'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
  },
  {
    label: 'PHASE 04',
    name: 'Exit',
    copy: 'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
  },
];

export default function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0a0a0f] pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-16 lg:pb-20" aria-label="Hero">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[700px] rounded-full bg-[color:var(--color-primary)]/[0.06] blur-[160px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-10">
          
          {/* Left Text Column */}
          <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1 flex flex-col items-start text-left space-y-6">
            {/* Kicker bar */}
            <span className="inline-block text-[14px] font-medium uppercase tracking-[0.08em] text-[color:var(--color-primary)]">
              {heroKicker}
            </span>

            {/* Headline */}
            <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.05]">
              {heroHeadline}
            </h1>

            {/* Subheadline */}
            <h2 className="text-[20px] leading-relaxed text-white/70">
              {heroSubheadline}
            </h2>

            {/* Body and Insurance paragraphs */}
            <div className="space-y-4">
              <p className="text-[16px] leading-[1.65] text-white/50">
                {heroBody}
              </p>
              <p className="text-[16px] leading-[1.65] text-white/50">
                {heroInsurance}
              </p>
            </div>

            {/* CTA row */}
            <div className="flex w-full flex-col gap-3.5 sm:flex-row sm:w-auto">
              <Link
                href="/pricing"
                className="inline-flex min-h-[44px] items-center justify-center bg-[color:var(--color-primary)] text-[#0a0a0f] px-6 py-3 text-[14px] font-semibold rounded-[10px] hover:brightness-110 transition shadow-[0_0_24px_-4px_rgba(0,221,148,0.35)]"
              >
                Get started
              </Link>
              <Link
                href="#deal-calculator"
                className="inline-flex min-h-[44px] items-center justify-center border border-white/15 hover:border-white/30 text-white px-6 py-3 text-[14px] font-semibold rounded-[10px] transition"
              >
                See how it works
              </Link>
            </div>
          </div>

          {/* REIL 4-Phase Block (Directly beneath hero header on mobile and row-2 span on desktop) */}
          <div className="order-2 lg:order-none lg:col-span-2 lg:row-start-2 w-full mt-6 lg:mt-4 pt-8 border-t border-white/5">
            <div className="mb-6 max-w-3xl">
              <p className="mb-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
                Built on the Real Estate Investment Life Cycle
              </p>
              <h2 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-2xl md:text-3xl">
                Acquisition, Fund, Hold, Exit. Four phases. One system.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {REIL_PHASES.map((p) => (
                <div
                  key={p.name}
                  className="glass-card flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl"
                >
                  <div>
                    <span className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]/80">
                      {p.label}
                    </span>
                    <h3 className="mb-2.5 text-lg sm:text-xl font-semibold text-white">{p.name}</h3>
                    <p className="text-xs sm:text-sm leading-[1.65] text-white/60">{p.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Column (Beside headline on desktop row-1 col-2; stacked after phase block on mobile) */}
          <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-1 relative flex justify-center lg:justify-end w-full">
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[color:var(--color-primary)]/[0.04] blur-[50px]"
              aria-hidden
            />
            <HeroProductShowcase />
          </div>

        </div>
      </div>
    </section>
  );
}
