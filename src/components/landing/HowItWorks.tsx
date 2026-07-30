'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   HowItWorks — The REIL System
   Marketing pages only — verbatim approved copy and .type-* typography.
   ═══════════════════════════════════════════════════════════════ */

interface DealCard {
  name: string;
  address: string;
  strategy: string;
  metric?: string;
  metricValue?: string;
}

// TODO(VERIFY): Production note 5: confirm demo KPIs show real, non-zero values before promoting demo content.
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
  const [, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="bg-background text-on-background">

      {/* ════════════ HERO ════════════ */}
      <section className="relative flex items-center justify-center py-24 sm:py-32 overflow-hidden border-b border-white/5">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest mb-8 type-eyebrow">
            <span className="material-symbols-rounded text-sm">hub</span>
            The REIL
          </div>

          {/* Headline — ONLY .type-display on this page */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1] mb-8 text-on-surface type-display">
            Four phases. One record. Thirty-three numbers that matter.
          </h1>

          {/* Body */}
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-3xl mx-auto type-body-lg">
            Every investment property runs the same lifecycle: Acquisition, Fund, Hold, Exit. PaperWorking is built on that lifecycle — not adapted from generic project software. Here&apos;s what happens at each phase.
          </p>
        </div>
      </section>

      {/* ════════════ KANBAN DEMO BOARD ════════════ */}
      <section className="relative py-16 sm:py-24 border-b border-white/5 overflow-hidden bg-surface-container-low/10">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 type-h2 text-on-surface">
              Never miss a deadline. Never blow a budget.
            </h2>
            <p className="text-sm font-semibold tracking-wide text-primary font-jetbrains uppercase type-eyebrow">
              From the demo deal: <span className="type-metric">$48.8K</span> net profit · <span className="type-metric">24.8%</span> projected IRR
            </p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest select-none type-caption">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Demo Data View
              </span>
            </div>
          </div>

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
                  <div className={`flex items-center gap-2.5 px-4 py-3 rounded-t-xl ${accent.bg} border ${accent.border} border-b-0`}>
                    <span className={`material-symbols-rounded text-lg ${accent.text}`}>{col.icon}</span>
                    <span className={`text-sm font-bold ${accent.text} uppercase tracking-wider type-caption`}>{col.phase}</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${accent.badge} type-metric`}>
                      {col.cards.length}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-3 p-3 rounded-b-xl border border-white/8 bg-surface-container-low/30 backdrop-blur-sm min-h-[260px]">
                    {col.cards.map((card, cIdx) => (
                      <div
                        key={`${col.phase}-${cIdx}`}
                        className="relative glass-card rounded-xl p-4 border border-white/6 hover:border-white/12 transition-all duration-200 group"
                      >
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-medium text-on-surface-variant/50 uppercase tracking-widest select-none type-caption">
                          <span className="w-1 h-1 rounded-full bg-primary/50" />
                          Demo Data
                        </div>

                        <div className="text-[13px] font-semibold text-on-surface leading-tight mb-0.5 pr-16 type-body">
                          {card.name}
                        </div>
                        <div className="text-[10px] text-on-surface-variant/60 mb-2.5 font-medium type-small">
                          {card.address}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-on-surface-variant/40 uppercase tracking-widest font-mono type-caption">
                            {card.strategy}
                          </span>
                          {card.metric && (
                            <div className="text-right">
                              <div className="text-[9px] text-on-surface-variant/40 uppercase tracking-wider font-mono type-caption">{card.metric}</div>
                              <div className={`text-sm font-bold ${accent.text} font-mono type-metric`}>{card.metricValue}</div>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/5">
                          <div className="text-[8px] text-on-surface-variant/30 uppercase tracking-wider select-none font-mono type-caption">
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

      {/* ════════════ WHAT A PROJECT IS ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            A Project is the home base for one investment.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-6 type-body">
            It holds the Deal — the property and its numbers — plus the phase it&apos;s in, the tasks and deadlines ahead, the documents, the budget, and a ledger of every dollar in and out. You work in the Project. PaperWorking calculates your metrics from it.
          </p>
          <p className="text-lg sm:text-xl font-semibold text-primary/95 leading-relaxed type-body-lg">
            The work you already do becomes the numbers you need.
          </p>
        </div>
      </section>

      {/* ════════════ PHASES 1–4 ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 md:px-10 space-y-16">

          {/* Phase 1 — Acquisition */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary font-bold mb-3 block type-caption">
              PHASE 01
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Decide if the deal works before you buy.
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Drop in an address. The Deal Analyzer pulls live property data and an automated valuation, then projects cap rate, IRR, and cash-on-cash before you spend a dollar on diligence. Save the deals worth chasing to your pipeline. Let the rest go — with a record of why.
            </p>
            <p className="text-sm text-on-surface-variant/75 pt-4 border-t border-white/8 leading-relaxed type-small">
              What you log here — purchase price, projected rents, rehab estimate — becomes the baseline your actuals are measured against later.
            </p>
          </div>

          {/* Phase 2 — Fund */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-secondary font-bold mb-3 block type-caption">
              PHASE 02
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Get the money and the paperwork lined up.
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Fund is where deals die on deadlines. PaperWorking tracks contingency dates and earnest money, and alerts you before they expire. Contracts, title, and entity papers go into the document vault, organized by deal.
            </p>
            <p className="text-sm text-on-surface-variant/75 pt-4 border-t border-white/8 leading-relaxed type-small">
              Raising money from partners? List the deal on the Deal Marketplace to track interest and pledges. Interest is tracked here; closings happen between the parties, off-platform.
            </p>
          </div>

          {/* Phase 3 — Hold */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-tertiary font-bold mb-3 block type-caption">
              PHASE 03
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Own it and improve it.
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Hold is where budgets go to die — unless someone watches the variance. Link each milestone to your line-item budget: inspection, rehab draw, staging, lease-up. Log expenses as they happen.{/* TODO(VERIFY): Confirm Plaid is live; if not, remove the sentence below before launch. */}{' '}
              Or connect your accounts through Plaid to track rent payments and recurring costs automatically.{' '}
              The Holding Cost Clock shows what every extra day costs. A drifting rehab shows up in week three, not at closing.
            </p>
            <p className="text-sm text-on-surface-variant/75 pt-4 border-t border-white/8 leading-relaxed type-small">
              The Vendor Marketplace earns its keep here: find the contractor, appraiser, or attorney when the project needs them.
            </p>
          </div>

          {/* Phase 4 — Exit */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-outline font-bold mb-3 block type-caption">
              PHASE 04
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Prove what it made.
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Sell it, or keep it as a rental. Either way, Exit is where the record pays off. PaperWorking generates performance reports from your actual project data — the documentation a buyer, lender, or appraiser expects. Walk into your refi with the file your lender wants, not a folder you&apos;ll apologize for.
            </p>
          </div>

        </div>
      </section>

      {/* ════════════ RHYTHM LINE STRIP ════════════ */}
      <section className="w-full py-6 bg-surface-container-low/40 border-b border-white/5 text-center">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="font-jetbrains text-[13px] sm:text-[14px] uppercase tracking-widest text-on-surface-variant/80 type-caption font-semibold">
            Every deadline tracked. Every dollar logged. Every metric live.
          </p>
        </div>
      </section>

      {/* ════════════ ONE DEAL, ALL THE WAY THROUGH ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-8 leading-tight type-h2">
            One deal, all the way through
          </h2>
          <div className="space-y-6 text-base sm:text-lg text-on-surface-variant leading-relaxed type-body">
            <p>
              Take one deal. You find a duplex and run the address through the Deal Analyzer. The projected cap rate and cash-on-cash clear your bar, so you save it to the pipeline. Those projections become your baseline.
            </p>
            <p>
              You go under contract and the Project moves to Fund. Inspection deadline, appraisal contingency, earnest money date — tracked, with alerts. Contracts and title work go into the vault.
            </p>
            <p>
              At Hold, you build the rehab budget line by line and link each milestone to it. Every contractor draw and invoice logs against a line item. Rent comes in through your connected accounts. You never open a spreadsheet, but cost basis, holding costs, and cash-on-cash stay current. The ledger is the work.
            </p>
            <p>
              When you sell or refinance, the Exit report reads from that same ledger: actual NOI, DSCR, equity multiple. Your CPA gets the P&L export. The Project closes, the history stays, and your portfolio numbers update the day it happens.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════ LEAD INVESTOR AND TEAM ROLES ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            Lead Investor and team roles
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-6 type-body">
            An Investor account runs solo. An Investment Team account has a Lead Investor — the person running the team — who invites members, assigns tasks and phases, and controls what each person can view or edit.
          </p>
          <ul className="space-y-3 mb-6 pl-5 list-disc text-base sm:text-lg text-on-surface-variant type-body">
            <li>Partners work the phases they&apos;re assigned.</li>
            <li>Your CPA reads the books without being able to touch them.</li>
            <li>Contractors and vendors see only the work they&apos;re assigned.</li>
          </ul>
          <p className="text-base sm:text-lg font-semibold text-on-surface leading-relaxed type-body">
            Two investors can also team up on a single Project without merging accounts.
          </p>
        </div>
      </section>

      {/* ════════════ DEMO CTA ════════════ */}
      {/* TODO(VERIFY): Production note 5: confirm demo KPIs show real values before promoting this CTA. */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-surface-container-low/30">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-4 leading-tight type-h2">
            Want to see it first?
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-8 type-body-lg">
            Walk through a live demo deal — pipeline, budgets, deadlines, and metrics included.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/pricing"
              className="luminous-button inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-[15px] font-semibold tracking-wide cursor-pointer type-cta"
            >
              Start 14-Day Trial
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>

            <Link
              href="/demo"
              className="px-6 py-4 rounded-xl border border-white/10 text-on-surface text-[15px] font-semibold hover:border-primary/40 hover:text-primary transition-all inline-flex items-center gap-2 type-cta"
            >
              Explore the demo
              <span className="material-symbols-outlined text-[18px]">
                open_in_new
              </span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
