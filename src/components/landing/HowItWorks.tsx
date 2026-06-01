'use client';

import React from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   HowItWorks — Redesigned public "How It Works" page.
   Matches the Stitch "Marketing: How It Works (Redesign)" spec.
   ═══════════════════════════════════════════════════════ */

interface PhaseData {
  phase: number;
  title: string;
  subtitle: string;
  body: string;
  icon: string;
  colorClass: string;
}

const PHASES: PhaseData[] = [
  {
    phase: 1,
    title: 'Acquisition',
    subtitle: 'The Capital Gateway',
    body: 'Source and evaluate projects, generate offer letters, and collect capital commitments from your syndicate. Replaces the mess of email threads and folders.',
    icon: 'account_balance',
    colorClass: 'text-primary border-primary/10 hover:border-primary/30',
  },
  {
    phase: 2,
    title: 'Transaction',
    subtitle: 'The Diligence Vault',
    body: 'Track escrow deposits, title work, insurance binders, and diligence checklists. Enforce critical deadlines before earnest money goes hard.',
    icon: 'lock',
    colorClass: 'text-secondary border-secondary/10 hover:border-secondary/30',
  },
  {
    phase: 3,
    title: 'Rehab',
    subtitle: 'Margin Protection',
    body: 'Track renovation budget vs. actual costs, manage contractor draw requests, and log receipts per milestone in one real-time workspace.',
    icon: 'trending_down',
    colorClass: 'text-tertiary border-tertiary/10 hover:border-tertiary/30',
  },
  {
    phase: 4,
    title: 'Hold/Exit',
    subtitle: 'Portfolio Operations',
    body: 'Track monthly carries, tenant leases, STR/LTR rental revenues, and property valuations. Generate tax-ready P&L exports for your CPA.',
    icon: 'payments',
    colorClass: 'text-outline border-white/5 hover:border-white/10',
  },
];

export default function HowItWorks() {
  return (
    <div className="relative z-10 w-full max-w-container-max mx-auto px-gutter-mobile md:px-margin-desktop py-stack-lg antialiased space-y-stack-lg pt-28 md:pt-32">
      
      {/* ── Hero Section ── */}
      <section className="mb-stack-lg text-center md:text-left max-w-3xl mx-auto md:mx-0 pt-8 pb-12">
        <h1 className="font-headline-xl text-headline-xl md:text-5xl lg:text-6xl text-on-surface mb-stack-md tracking-tight leading-tight">
          Stop bleeding margins to <br className="hidden md:block" />
          <span className="luminous-text font-extrabold">disorganized deals.</span>
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg max-w-2xl">
          Every day a deal is delayed, holding costs eat your profits. PaperWorking centralizes your pipeline, tracks real-time costs, and automates closing docs so you can close faster and scale without the chaos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center md:items-start">
          <Link
            className="luminous-button px-8 py-4 rounded-full font-label-md text-label-md text-center w-full sm:w-auto"
            href="/register"
          >
            Start Your 14-Day Trial
          </Link>
          <span className="font-body-sm text-body-sm text-on-surface-variant/60 flex items-center h-full pt-2">
            14-day trial. Credit card required. No charge until day 15.
          </span>
        </div>
      </section>

      {/* ── Platform Overview Header ── */}
      <section className="mb-stack-lg">
        <div className="mb-stack-lg md:mb-stack-xl max-w-3xl">
          <span className="text-primary font-label-md text-label-md uppercase tracking-wider mb-2 block">
            Platform Overview
          </span>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">
            The Real Estate Investment Operating System
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Most investors manage six- and seven-figure deals on spreadsheets that break when you add a column. PaperWorking replaces that mess with one system organized around how deals actually work: four phases, acquisition through exit, with every dollar tracked along the way.
          </p>
        </div>

        {/* ── 4-Phase Bento Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack-md relative">
          <div className="hidden lg:block absolute top-[150px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent z-0 pointer-events-none" />
          
          {PHASES.map((p) => (
            <div
              key={p.phase}
              id={p.title.toLowerCase().replace('/', '-')}
              className="glass-card rounded-xl p-stack-md flex flex-col relative z-10 hover:-translate-y-2 transition-all duration-300 scroll-mt-24 group overflow-hidden"
            >
              {/* Phase number badge */}
              <div className="bg-surface-container-high rounded-full w-12 h-12 flex items-center justify-center mb-6 border border-white/5">
                <span className="font-headline-md text-primary font-semibold">{p.phase}</span>
              </div>
              
              <div className="mb-4 flex-grow">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{p.title}</h3>
                <h4 className="font-label-md text-label-md text-primary mb-4 block">{p.subtitle}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-6">{p.body}</p>
              </div>

              {/* Dynamic UI card snippets to match the high-fidelity mock details */}
              <div className="mb-6 relative z-20">
                {p.phase === 1 && (
                  <div className="bg-black/40 rounded border border-white/5 p-3 font-mono text-[10px] w-full">
                    <div className="flex justify-between text-white/30 mb-2 border-b border-white/5 pb-1 uppercase">
                      <span>Source</span>
                      <span>Confidence</span>
                    </div>
                    <div className="flex justify-between text-primary/80 mb-1">
                      <span>Direct_Mail</span>
                      <span>84.2%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/45" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                )}

                {p.phase === 2 && (
                  <div className="bg-black/40 rounded border border-white/5 p-3 flex items-center justify-between w-full">
                    <div className="space-y-1">
                      <div className="w-16 h-1.5 bg-white/10 rounded"></div>
                      <div className="w-10 h-1.5 bg-white/5 rounded"></div>
                    </div>
                    <div className="flex gap-1">
                      <span className="material-symbols-outlined text-secondary text-[14px]">check_circle</span>
                      <span className="material-symbols-outlined text-white/20 text-[14px]">pending</span>
                    </div>
                  </div>
                )}

                {p.phase === 3 && (
                  <div className="bg-black/40 rounded border border-white/5 p-3 w-full">
                    <div className="flex justify-between font-mono text-[9px] text-white/30 mb-2">
                      <span>EST_HOLD</span>
                      <span className="text-white/60">42D / 60D</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary/45" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                )}

                {p.phase === 4 && (
                  <div className="bg-black/40 rounded border border-white/5 p-3 flex justify-between items-center w-full">
                    <span className="font-mono text-[10px] text-white/40">ROI_ACTUAL</span>
                    <span className="font-mono text-[12px] font-bold text-primary tracking-tight">28.4% ↑</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-white/5">
                <span className="material-symbols-outlined text-outline-variant text-3xl" style={{ fontVariationSettings: "'FILL' 0" }}>
                  {p.icon}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Risk Mitigation Section ── */}
      <section className="glass-card rounded-xl p-stack-lg md:p-16 mb-stack-lg flex flex-col md:flex-row items-center gap-stack-lg justify-between border-primary/20 border relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl relative z-10 text-left">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4">
            Real-estate-native project management. Built for serious investors.
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">
            Lost documents. Untracked holding costs. Last-minute closings where nobody can find the right version of the HUD-1. That&apos;s what happens when your deal management lives in five different places. PaperWorking puts it all under one roof so you can scale without the chaos. You&apos;re running a business. Your tools should reflect that.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link
              className="luminous-button px-8 py-3 rounded-full font-label-md text-label-md text-center w-full sm:w-auto"
              href="/register"
            >
              Start Your 14-Day Trial
            </Link>
            <span className="font-body-sm text-body-sm text-on-surface-variant/60">
              Credit card required · No charge for 14 days
            </span>
          </div>
        </div>
        
        <div className="hidden md:flex w-48 h-48 rounded-full bg-primary/10 items-center justify-center border border-primary/30 relative shrink-0">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <span className="material-symbols-outlined text-6xl text-primary relative z-10" style={{ fontVariationSettings: "'FILL' 0" }}>
            shield_locked
          </span>
        </div>
      </section>

    </div>
  );
}
