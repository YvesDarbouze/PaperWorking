'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-[1280px] px-5 md:px-8">
        <div className="glass-card rounded-2xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden">
          {/* Inner gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

          <div className="max-w-2xl relative z-10">
            {/* Headline */}
            <h2 className="text-[28px] md:text-[40px] leading-tight font-bold tracking-tight text-on-surface mb-5 type-h2">
              Move your deals into one place.
            </h2>

            {/* Body */}
            <p className="text-base md:text-lg text-on-surface-variant mb-8 leading-relaxed max-w-xl type-body-lg">
              Every document, dollar, and deadline from Acquisition to Exit — one Project, with the metrics calculated as you work. Start with one deal and your real numbers.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
              <Link
                href="/pricing"
                className="luminous-button px-8 py-4 rounded-xl text-[15px] font-semibold flex items-center gap-2 group type-cta"
              >
                <span>Start 14-Day Trial</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/how-it-works"
                className="px-6 py-4 rounded-xl border border-white/10 text-on-surface text-[15px] font-semibold hover:border-primary/40 hover:text-primary transition-all inline-flex items-center gap-2 type-cta"
              >
                <span>See how it works</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </div>

            {/* Verbatim compliance microcopy */}
            <p className="text-[12.5px] text-on-surface-variant/70 leading-relaxed type-caption">
              14-day trial · Card required, no charge until day 15 · One-click data export · Cancel anytime · 30-day refund window on annual plans · SOC 2-ready infrastructure
            </p>
          </div>

          {/* Glowing Shield Icon decoration */}
          <div className="hidden md:flex w-48 h-48 rounded-full bg-primary/10 items-center justify-center border border-primary/30 relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <span
              className="material-symbols-outlined text-6xl text-primary relative z-10"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              shield_locked
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
