'use client';

import Link from 'next/link';
import MetricsCarouselShell from '@/components/landing/MetricsCarouselShell';

export default function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden" style={{ paddingTop: 72 }}>

      {/* Ambient glow — right side, behind carousel */}
      <div
        className="absolute top-0 right-0 w-[700px] h-[700px] bg-primary/8 blur-[180px] rounded-full pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-[40%] left-[-10%] w-[500px] h-[400px] bg-primary/4 blur-[140px] rounded-full pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8 py-16 md:py-24 lg:py-20 grid grid-cols-1 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px] gap-10 lg:gap-16 items-start">

        {/* ── LEFT: marketing copy ─────────────────────────── */}
        <div className="flex flex-col items-start text-left lg:pt-4">

          {/* Eyebrow */}
          <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full mb-8 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-on-surface-variant">
              Real Estate Investment OS
            </span>
          </span>

          {/* H1 — verbatim marketing copy */}
          <h1 className="text-[36px] md:text-[46px] lg:text-[54px] leading-[42px] md:leading-[54px] lg:leading-[62px] font-bold tracking-[-0.03em] text-on-surface mb-6">
            Manage the Project.{' '}
            <span className="text-primary luminous-text">
              PaperWorking Automates the Profits
            </span>
          </h1>

          {/* Caption — verbatim marketing copy */}
          <p className="text-[15px] md:text-[16px] leading-[24px] md:leading-[26px] font-normal text-on-surface-variant mb-8 max-w-[560px]">
            Real estate is complex, and true profitability easily gets buried under daily
            operational chaos. To move past a vague understanding of your margins and speak
            the language that banks and lenders demand, you need precision. PaperWorking
            seamlessly bridges the gap between daily project management and sophisticated
            portfolio analytics. By simply organizing your project tasks and costs as they
            happen, you automatically generate the 10 vital KPIs (key performance
            indicators) used by top-tier real estate developers.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-9">
            <Link
              href="/pricing"
              className="luminous-button relative overflow-hidden px-8 py-4 rounded-xl font-semibold text-[15px] tracking-[-0.01em] inline-flex items-center gap-2.5 group cursor-pointer"
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                aria-hidden
              />
              Start Free 14 Day Trial
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
            <span className="text-[13px] text-on-surface-variant/50">
              Credit card required · Cancel before day 15 to avoid charge
            </span>
          </div>

          {/* Social proof */}
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

        {/* ── RIGHT: metrics carousel ─────────────────────── */}
        <div className="relative w-full lg:w-auto lg:sticky lg:top-[88px]">
          {/* Glow behind the panel */}
          <div
            className="absolute inset-0 bg-primary/6 blur-[80px] rounded-3xl pointer-events-none scale-105"
            aria-hidden
          />
          <div className="relative">
            <MetricsCarouselShell />
          </div>
        </div>

      </div>
    </section>
  );
}
