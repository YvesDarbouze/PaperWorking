'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * FinalCTA — Stitch Obsidian Edition
 *
 * Bottom-of-page conversion section.
 * Positions PaperWorking as real-estate-native project management (Amendment 1).
 * Uses glass-card aesthetic with luminous CTA button and ambient glow.
 */

export default function FinalCTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-container-max px-5 md:px-6 lg:px-8">
        <div className="glass-card rounded-xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden">
          {/* Inner gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

          <div className="max-w-2xl relative z-10">
            {/* Headline reframe */}
            <h2 className="text-[28px] md:text-[32px] leading-tight font-bold tracking-tight text-on-surface mb-4">
              Real-estate-native project management.{' '}
              <span className="text-primary text-glow">
                Built for serious investors.
              </span>
            </h2>

            {/* Pain-point driven subtext */}
            <p className="text-base text-on-surface-variant mb-8 leading-relaxed max-w-xl">
              Lost documents. Untracked holding costs. Last-minute closings
              where nobody can find the right version of the HUD-1. That&apos;s
              what happens when your deal management lives in five different
              places. PaperWorking puts it all under one roof so you can scale
              without the chaos.
            </p>

            {/* Product truths row */}
            <div className="grid grid-cols-3 gap-px mb-8 max-w-md">
              <div className="glass-card rounded-l-lg py-4 px-3 text-center">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Deadlines</p>
                <p className="text-[10px] text-on-surface-variant mt-1 font-medium leading-tight">
                  Every date tracked
                </p>
              </div>
              <div className="glass-card py-4 px-3 text-center">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Ledger</p>
                <p className="text-[10px] text-on-surface-variant mt-1 font-medium leading-tight">
                  Every dollar logged
                </p>
              </div>
              <div className="glass-card rounded-r-lg py-4 px-3 text-center">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">History</p>
                <p className="text-[10px] text-on-surface-variant mt-1 font-medium leading-tight">
                  Fully archived
                </p>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Link
                href="/pricing"
                className="luminous-button px-8 py-3.5 rounded-full text-sm font-semibold flex items-center gap-2 group"
              >
                <span>Start 14 Day Trial</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <span className="text-sm text-on-surface-variant/60 self-center">
                Credit card required · No charge for 14 days
              </span>
            </div>
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
