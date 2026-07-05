'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   HowItWorks — The REIL System

   Structure:
   1. Hero block (kicker + headline + body + sub-line — verbatim copy)
   2. Kanban-style 4-column board: Acquisition → Fund → Hold → Exit
      with cards drawn from the seeded demo dataset
   3. The 4 Phase Steps (Step 01 - 04) verbatim copy and taglines
   4. Closer text & Mid-scroll CTA
   ═══════════════════════════════════════════════════════════════ */

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

const STEPS = [
  {
    phase: 'Step 01 · Acquisition',
    color: 'primary',
    icon: 'search',
    title: 'Underwrite the Deal. Not Your Patience.',
    body: "Before you buy, you need to know if the deal works. PaperWorking's Deal Analyzer lets you drop in an address and get instant projected returns based on real, live property data.",
    bullets: [
      'Live property lookup',
      'Automated valuation (AVM)',
      'Instant projected Cap Rate & IRR',
    ]
  },
  {
    phase: 'Step 02 · Fund',
    color: 'secondary',
    icon: 'account_balance',
    title: 'Get the Capital. Keep the Control.',
    body: "Lenders don't approve spreadsheets; they approve professional packages. PaperWorking organizes your contracts, title docs, and entity papers into an audit-ready vault. When you're ready, list your project on the Deal Marketplace to track soft interest from verified investors — with zero capital changes hands on our platform.",
    bullets: [
      'Audit-ready document vault',
      'Interest-tracking marketplace',
      'Institutional lender packages',
    ]
  },
  {
    phase: 'Step 03 · Hold',
    color: 'tertiary',
    icon: 'construction',
    title: 'Manage the Renovation. Protect the Yield.',
    body: "Hold is where budgets go to die. PaperWorking links every project milestone — inspection, rehab, staging, leasing — to your live budget. Track contractor bids in context, log project expenses as they happen, and watch your metrics adjust in real time.",
    bullets: [
      'Milestone-budget linking',
      'Contractor quote-bids in context',
      'Rent payments logged automatically',
    ]
  },
  {
    phase: 'Step 04 · Exit',
    color: 'outline',
    icon: 'trending_up',
    title: 'Prove the Return. Sell or Refinance.',
    body: "When the hold ends, the proof begins. Whether you're refinancing or selling, PaperWorking generates the exact performance reports your buyers or commercial lenders need. Turn your daily workflow into a verified record of return.",
    bullets: [
      'Verified ROI reporting',
      'Frictionless bank handoffs',
      'Complete project archives',
    ]
  }
];

function phaseAccent(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    primary:   { bg: 'bg-primary/8',   border: 'border-primary/20',   text: 'text-primary',   badge: 'bg-primary/15 text-primary' },
    secondary: { bg: 'bg-secondary/8', border: 'border-secondary/20', text: 'text-secondary', badge: 'bg-secondary/15 text-secondary' },
    tertiary:  { bg: 'bg-tertiary/8',  border: 'border-tertiary/20',  text: 'text-tertiary',  badge: 'bg-tertiary/15 text-tertiary' },
    outline:   { bg: 'bg-outline/8',   border: 'border-outline/20',   text: 'text-outline',   badge: 'bg-outline/15 text-outline' },
  };
  return map[color] ?? map.primary;
}

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

      {/* ════════════ HERO (REIL System Intro) ════════════ */}
      <section className="relative flex items-center justify-center py-24 sm:py-32 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Kicker */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest mb-8">
            <span className="material-symbols-rounded text-sm">hub</span>
            The REIL System
          </div>

          {/* Headline — verbatim */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1] mb-8">
            You Manage the Project. PaperWorking Does the Math.
          </h1>

          {/* Body — verbatim */}
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-3xl mx-auto mb-6">
            PaperWorking isn't another project management tool, another calculator, or another CRM. It's the first platform built on the Real Estate Investment Lifecycle — the four phases every investment property moves through: Acquisition, Fund, Hold, Exit. Every investment lives in a Project: the organizing system that holds the Deal, its current phase, and every activity of the lifecycle...
          </p>

          {/* Sub-line — verbatim */}
          <p className="text-sm sm:text-base text-on-surface-variant/70 leading-relaxed max-w-2xl mx-auto italic">
            Run it solo on an Investor account — or as an Investment Team, where the Lead Investor invites team members, assigns them to specific phases, and controls exactly what each one can see and edit.
          </p>
        </div>
      </section>

      {/* ════════════ KANBAN BOARD ════════════ */}
      <section className="relative py-16 sm:py-24 border-t border-white/5 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          {/* Section label — verbatim stats */}
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Never miss a deadline. Never blow a budget.
            </h2>
            <p className="text-sm font-semibold tracking-wide text-primary font-jetbrains uppercase">
              From the demo deal: $48.8K net profit · 24.8% projected IRR
            </p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Demo Data View
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

                        <div className="text-[13px] font-semibold text-on-surface leading-tight mb-0.5 pr-16 font-hanken">
                          {card.name}
                        </div>
                        <div className="text-[10px] text-on-surface-variant/60 mb-2.5 font-medium">
                          {card.address}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-on-surface-variant/40 uppercase tracking-widest font-mono">
                            {card.strategy}
                          </span>
                          {card.metric && (
                            <div className="text-right">
                              <div className="text-[9px] text-on-surface-variant/40 uppercase tracking-wider font-mono">{card.metric}</div>
                              <div className={`text-sm font-bold ${accent.text} font-mono`}>{card.metricValue}</div>
                            </div>
                          )}
                        </div>

                        {/* Illustrative demo data footer */}
                        <div className="mt-2 pt-2 border-t border-white/5">
                          <div className="text-[8px] text-on-surface-variant/30 uppercase tracking-wider select-none font-mono">
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

      {/* ════════════ THE 4 PHASE STEPS ════════════ */}
      <section className="relative py-20 sm:py-28 border-t border-white/5 overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3A34E]/10 border border-[#E3A34E]/20 text-xs font-semibold text-[#E3A34E] mb-4">
              <span>Step-by-Step Execution</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Built for Every Phase of the Lifecycle
            </h2>
            <p className="text-sm text-on-surface-variant/70 max-w-lg mx-auto">
              Features anchored exactly where they belong in the lifecycle to give you total control.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {STEPS.map((step, idx) => {
              const accent = phaseAccent(step.color);
              return (
                <motion.div
                  key={step.phase}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="glass-card rounded-2xl p-6 sm:p-8 border border-white/8 hover:border-white/15 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Phase badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-5 ${accent.badge} border ${accent.border}`}>
                      <span className="material-symbols-rounded text-xs">{step.icon}</span>
                      {step.phase}
                    </div>

                    <h3 className="text-xl font-bold text-on-surface mb-3 leading-tight font-hanken">
                      {step.title}
                    </h3>

                    <p className="text-sm text-on-surface-variant leading-relaxed mb-6 font-normal">
                      {step.body}
                    </p>
                  </div>

                  <ul className="space-y-2 border-t border-white/5 pt-4">
                    {step.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-2 text-xs text-on-surface-variant/90">
                        <span className={`w-1.5 h-1.5 rounded-full ${accent.text} bg-current`} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════ CLOSER & FINAL CTA ════════════ */}
      <section className="relative py-24 sm:py-32 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-lg sm:text-xl text-on-surface-variant font-medium mb-12 leading-relaxed italic max-w-2xl mx-auto">
            "Then you do it again — smarter. Every completed Project sharpens the picture of your whole portfolio. That's the lifecycle. That's PaperWorking."
          </p>

          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant/60">
              Already convinced? Start now — or keep reading to see what happens after you close.
            </p>
            <div className="flex justify-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-on-primary font-bold text-sm tracking-wide hover:brightness-110 transition-all duration-200 shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-rounded text-lg">arrow_forward</span>
                Start Free 14 Day Trial
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
