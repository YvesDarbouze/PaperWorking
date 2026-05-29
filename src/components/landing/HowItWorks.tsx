'use client';

import React from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   HowItWorks — Stitch Obsidian "How It Works" Page

   Four-phase bento grid matching the Stitch design token:
     Phase 1 — Acquisition  (#57f1db / primary)
     Phase 2 — Purchase     (#adc6ff / secondary)
     Phase 3 — Hold         (#ffd1aa / tertiary)
     Phase 4 — Exit         (#859490 / outline)

   Uses glass-card, glass-chip, and luminous-button
   utility classes defined in globals.css.
   ═══════════════════════════════════════════════════════ */

const PHASES = [
  {
    phase: 1,
    title: 'Acquisition',
    subtitle: 'The Capital Gateway',
    body: 'Source deals, generate offer letters, and collect capital commitments from your syndicate. No more toggling between CRMs, email threads, and shared drives to figure out where a deal stands.',
    icon: 'target',
    color: 'primary',
  },
  {
    phase: 2,
    title: 'Purchase',
    subtitle: 'The Compliance Vault',
    body: 'Loan docs, attorney sign-offs, title commitments, and contingency deadlines live in one place. You stop chasing PDFs through email and start closing on time.',
    icon: 'gavel',
    color: 'secondary',
  },
  {
    phase: 3,
    title: 'Hold',
    subtitle: 'Margin Protection',
    body: 'Every day you hold a property, it costs you money. The platform tracks your daily burn rate down to the penny so you know exactly what each extra week on market does to your ROI.',
    icon: 'hourglass_empty',
    color: 'tertiary',
  },
  {
    phase: 4,
    title: 'Exit',
    subtitle: 'Financial Reconciliation',
    body: 'Sale or refi, the platform pulls every cost from Phases 1 through 3 and calculates your actual ROI, IRR, and cash-on-cash return. Export a one-page deal summary or tax-ready CSV for your CPA.',
    icon: 'logout',
    color: 'outline',
  },
];

/* Tailwind dynamic classes can't be composed at runtime.
   Pre-map every color token we need per phase. */
const COLOR_MAP: Record<string, {
  text: string;
  chipText: string;
  hoverBg: string;
  playIcon: string;
}> = {
  primary: {
    text: 'text-primary',
    chipText: 'text-primary',
    hoverBg: 'group-hover:bg-primary/5',
    playIcon: 'text-primary',
  },
  secondary: {
    text: 'text-secondary',
    chipText: 'text-secondary',
    hoverBg: 'group-hover:bg-secondary/5',
    playIcon: 'text-secondary',
  },
  tertiary: {
    text: 'text-tertiary',
    chipText: 'text-tertiary',
    hoverBg: 'group-hover:bg-tertiary/5',
    playIcon: 'text-tertiary',
  },
  outline: {
    text: 'text-outline',
    chipText: 'text-outline',
    hoverBg: 'group-hover:bg-outline/5',
    playIcon: 'text-outline',
  },
};

export default function HowItWorks() {
  return (
    <div className="relative z-10 w-full max-w-container-max mx-auto px-gutter-mobile md:px-margin-desktop py-stack-lg antialiased space-y-stack-lg pt-28 md:pt-32">
      {/* ── Header Section ── */}
      <header className="text-center space-y-stack-md py-stack-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">
          The Real Estate Investment Operating System
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Most investors manage six- and seven-figure deals on spreadsheets that
          break when you add a column. PaperWorking replaces that mess with one
          system organized around how deals actually work: four phases,
          acquisition through exit, with every dollar tracked along the way.
        </p>
      </header>

      {/* ── REIL Lifecycle Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter-desktop">
        {PHASES.map((phase) => {
          const c = COLOR_MAP[phase.color];
          return (
            <section
              key={phase.phase}
              id={phase.title.toLowerCase()}
              className="glass-card rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group scroll-mt-24 hover:-translate-y-1 transition-transform duration-300"
            >
              {/* Hover overlay */}
              <div
                className={`absolute inset-0 opacity-0 ${c.hoverBg} transition-opacity duration-300 pointer-events-none`}
              />

              {/* Phase badge + Icon */}
              <div className="flex items-center justify-between relative z-10">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full font-label-sm text-label-sm border border-white/20 bg-white/10 ${c.chipText}`}
                >
                  Phase {phase.phase}
                </span>
                <span
                  className={`material-symbols-outlined ${c.text}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {phase.icon}
                </span>
              </div>

              {/* Title + Subtitle */}
              <h3
                className={`font-headline-md text-headline-md ${c.text} relative z-10`}
              >
                {phase.title}
              </h3>
              <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider relative z-10">
                {phase.subtitle}
              </h4>

              {/* Body */}
              <p className="font-body-sm text-body-sm text-on-surface flex-grow relative z-10">
                {phase.body}
              </p>

              {/* Video Placeholder */}
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 mt-auto cursor-pointer group/video">
                <div className="absolute inset-0 bg-surface-container/50 backdrop-blur-sm z-10 flex items-center justify-center group-hover/video:bg-surface-container/30 transition-colors">
                  <span
                    className={`material-symbols-outlined text-4xl ${c.playIcon}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_circle
                  </span>
                </div>
                <div className="w-full h-full bg-surface-container-high" />
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Bottom CTA ── */}
      <section className="glass-card rounded-xl p-12 text-center flex flex-col items-center gap-6 mt-16">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">
          Stop bleeding margins to disorganized deals.
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
          PaperWorking centralizes your pipeline, tracks real-time costs, and
          automates closing docs so you can close faster and scale without the
          chaos.
        </p>
        <Link
          className="luminous-button px-8 py-4 rounded-full font-label-md text-label-md mt-4 flex items-center gap-2"
          href="/#pricing"
        >
          Build Your Pipeline Today
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <p className="font-body-sm text-body-sm text-on-surface-variant/60">
          14-day trial · Credit card required · No charge until day 15
        </p>
      </section>
    </div>
  );
}
