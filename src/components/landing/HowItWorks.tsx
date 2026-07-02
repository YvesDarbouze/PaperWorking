'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   HowItWorks — The REIL System

   Structure:
   1. Hero block (kicker + headline + body — verbatim copy)
   2. Kanban-style 4-column board: Acquisition → Fund → Hold → Exit
      with cards drawn from the seeded demo dataset
   3. Three feature callouts anchored to their respective phases
   4. Final CTA
   ═══════════════════════════════════════════════════════════════ */

/* ─── Demo data cards (sourced from scripts/seed-demo.ts) ────── */

interface DealCard {
  name: string;
  address: string;
  strategy: string;
  metric?: string;
  metricValue?: string;
}

const KANBAN_DATA: { phase: string; color: string; icon: string; cards: DealCard[] }[] = [
  {
    phase: 'Acquisition',
    color: 'primary',
    icon: 'search',
    cards: [
      { name: 'Skyline Lofts', address: '456 Skyline Dr, Denver CO', strategy: 'Fix & Flip', metric: 'Cap Rate', metricValue: '6.2%' },
      { name: 'Cedar Park Duplex', address: '789 Cedar Ct, Austin TX', strategy: 'Buy & Hold', metric: 'GRM', metricValue: '9.5' },
    ],
  },
  {
    phase: 'Fund',
    color: 'secondary',
    icon: 'account_balance',
    cards: [
      { name: '123 Main Street Flip', address: '123 Main St, Miami FL', strategy: 'Fix & Flip', metric: 'DSCR', metricValue: '1.42' },
      { name: 'Skyline Lofts', address: '456 Skyline Dr, Denver CO', strategy: 'Fix & Flip', metric: 'Cash Invested', metricValue: '$112,500' },
    ],
  },
  {
    phase: 'Hold',
    color: 'tertiary',
    icon: 'construction',
    cards: [
      { name: 'Cedar Park Duplex', address: '789 Cedar Ct, Austin TX', strategy: 'Buy & Hold', metric: 'Occupancy', metricValue: '100%' },
      { name: '123 Main Street Flip', address: '123 Main St, Miami FL', strategy: 'Fix & Flip', metric: 'Budget Used', metricValue: '68%' },
      { name: 'Skyline Lofts', address: '456 Skyline Dr, Denver CO', strategy: 'Fix & Flip', metric: 'Cash Flow', metricValue: '$8,750/mo' },
    ],
  },
  {
    phase: 'Exit',
    color: 'outline',
    icon: 'trending_up',
    cards: [
      { name: '123 Main Street Flip', address: '123 Main St, Miami FL', strategy: 'Fix & Flip', metric: 'IRR', metricValue: '24.8%' },
      { name: 'Cedar Park Duplex', address: '789 Cedar Ct, Austin TX', strategy: 'Buy & Hold', metric: 'Appreciation', metricValue: '4.5%/yr' },
    ],
  },
];

/* ─── Feature callouts ──────────────────────────────────────── */

const CALLOUTS = [
  {
    phase: 'Acquisition',
    title: 'Deal Analyzer',
    body: 'Underwrite from a single address entry; live Cap Rate, COC, and projected IRR.',
    icon: 'calculate',
    color: 'primary',
  },
  {
    phase: 'Fund',
    title: 'Deal Marketplace / Crowdfund',
    body: 'share a Deal with the PaperWorking investor community and track interest.',
    icon: 'storefront',
    color: 'secondary',
  },
  {
    phase: 'Hold',
    title: 'Automated Rent Payment Tracking',
    body: 'Rent receipts tracked automatically; missed-rent alerts before a late month becomes a lost quarter.',
    icon: 'receipt_long',
    color: 'tertiary',
  },
];

/* ─── Phase color map ───────────────────────────────────────── */

function phaseAccent(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    primary:   { bg: 'bg-primary/8',   border: 'border-primary/20',   text: 'text-primary',   badge: 'bg-primary/15 text-primary' },
    secondary: { bg: 'bg-secondary/8', border: 'border-secondary/20', text: 'text-secondary', badge: 'bg-secondary/15 text-secondary' },
    tertiary:  { bg: 'bg-tertiary/8',  border: 'border-tertiary/20',  text: 'text-tertiary',  badge: 'bg-tertiary/15 text-tertiary' },
    outline:   { bg: 'bg-outline/8',   border: 'border-outline/20',   text: 'text-outline',   badge: 'bg-outline/15 text-outline' },
  };
  return map[color] ?? map.primary;
}

/* ─── Component ─────────────────────────────────────────────── */

export default function HowItWorks() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="bg-background text-on-background">

      {/* ════════════ HERO ════════════ */}
      <section className="relative min-h-[60vh] flex items-center justify-center py-24 sm:py-32 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          {/* Kicker */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest mb-8">
            <span className="material-symbols-rounded text-sm">hub</span>
            The REIL System
          </div>

          {/* Headline — verbatim */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1] mb-8">
            Institutional Organization for the Serious Real Estate Investor.
          </h1>

          {/* Body — verbatim */}
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            PaperWorking is project management built specifically for the Real Estate Investment Lifecycle. It organizes your entire investment process — and professionalizes how you manage it. Visualize your real estate the way stocks and commodities are visualized: a full-spectrum view of your portfolio, across all four phases of the lifecycle.
          </p>
        </div>
      </section>

      {/* ════════════ KANBAN BOARD ════════════ */}
      <section className="relative py-16 sm:py-24 border-t border-white/5 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          {/* Section label */}
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Four Phases. One Board.
            </h2>
            <p className="text-sm text-on-surface-variant/70 max-w-lg mx-auto">
              Every Deal moves through Acquisition → Fund → Hold → Exit. Track them all from a single command center.
            </p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Illustrative Demo Data
              </span>
            </div>
          </div>

          {/* Board — horizontal scroll on mobile, grid on desktop */}
          <div
            ref={scrollRef}
            className="flex md:grid md:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto md:overflow-visible pb-6 md:pb-0 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {KANBAN_DATA.map((col, colIdx) => {
              const accent = phaseAccent(col.color);
              return (
                <motion.div
                  key={col.phase}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: colIdx * 0.08 }}
                  className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-auto snap-start flex flex-col"
                >
                  {/* Column Header */}
                  <div className={`flex items-center gap-2.5 px-4 py-3 rounded-t-xl ${accent.bg} border ${accent.border} border-b-0`}>
                    <span className={`material-symbols-rounded text-lg ${accent.text}`}>{col.icon}</span>
                    <span className={`text-sm font-bold ${accent.text} uppercase tracking-wider`}>{col.phase}</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${accent.badge}`}>
                      {col.cards.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 flex flex-col gap-3 p-3 rounded-b-xl border border-white/8 bg-surface-container-low/30 backdrop-blur-sm min-h-[260px]">
                    {col.cards.map((card, cIdx) => (
                      <div
                        key={`${col.phase}-${cIdx}`}
                        className="relative glass-card rounded-xl p-4 border border-white/6 hover:border-white/12 transition-all duration-200 group"
                      >
                        {/* Demo Data label */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-medium text-on-surface-variant/50 uppercase tracking-widest select-none">
                          <span className="w-1 h-1 rounded-full bg-primary/50" />
                          Demo Data
                        </div>

                        <div className="text-[13px] font-semibold text-on-surface leading-tight mb-0.5 pr-16">
                          {card.name}
                        </div>
                        <div className="text-[10px] text-on-surface-variant/60 mb-2.5 font-medium">
                          {card.address}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-on-surface-variant/40 uppercase tracking-widest">
                            {card.strategy}
                          </span>
                          {card.metric && (
                            <div className="text-right">
                              <div className="text-[9px] text-on-surface-variant/40 uppercase tracking-wider">{card.metric}</div>
                              <div className={`text-sm font-bold ${accent.text}`}>{card.metricValue}</div>
                            </div>
                          )}
                        </div>

                        {/* Illustrative demo data footer */}
                        <div className="mt-2 pt-2 border-t border-white/5">
                          <div className="text-[8px] text-on-surface-variant/30 uppercase tracking-wider select-none">
                            Illustrative demo data
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════ FEATURE CALLOUTS ════════════ */}
      <section className="relative py-20 sm:py-28 border-t border-white/5 overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Built for Every Phase
            </h2>
            <p className="text-sm text-on-surface-variant/70 max-w-md mx-auto">
              Features anchored exactly where they belong in the lifecycle.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {CALLOUTS.map((callout, idx) => {
              const accent = phaseAccent(callout.color);
              return (
                <motion.div
                  key={callout.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`glass-card rounded-2xl p-6 sm:p-8 border border-white/8 hover:border-white/15 transition-all duration-300 flex flex-col`}
                >
                  {/* Phase badge */}
                  <div className={`inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-5 ${accent.badge} border ${accent.border}`}>
                    <span className="material-symbols-rounded text-xs">{callout.icon}</span>
                    {callout.phase}
                  </div>

                  <h3 className="text-lg font-bold text-on-surface mb-3 leading-tight">
                    {callout.title}
                  </h3>

                  <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                    {callout.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════ FINAL CTA ════════════ */}
      <section className="relative py-24 sm:py-32 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
            Ready to professionalize your portfolio?
          </h2>
          <p className="text-base text-on-surface-variant mb-10 max-w-lg mx-auto">
            Start managing your real estate investments the way institutions do — organized, measured, and under control.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-on-primary font-bold text-sm tracking-wide hover:brightness-110 transition-all duration-200 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-rounded text-lg">rocket_launch</span>
            Start Your 14-Day Trial
          </Link>
        </div>
      </section>
    </div>
  );
}
