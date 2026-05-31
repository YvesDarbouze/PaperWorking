'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════
   PlatformOverview — Stitch Obsidian Edition

   4-phase REIL overview cards matching the Stitch landing
   design. Each card uses glass-card with phase number
   watermark, icon circle, and conversion-oriented copy.
   ═══════════════════════════════════════════════════════ */

const PHASES = [
  {
    number: '01',
    title: 'Acquisition',
    subtitle: 'The Capital Gateway',
    body: 'Source deals, generate offer letters, and collect capital commitments from your syndicate. No more toggling between CRMs, email threads, and shared drives.',
    icon: 'search',
  },
  {
    number: '02',
    title: 'Purchase',
    subtitle: 'The Compliance Vault',
    body: 'Loan docs, attorney sign-offs, title commitments, and contingency deadlines live in one place. Stop chasing PDFs through email.',
    icon: 'gavel',
  },
  {
    number: '03',
    title: 'Hold',
    subtitle: 'Margin Protection',
    body: 'The platform tracks your daily burn rate down to the penny so you know exactly what each extra week on market does to your ROI.',
    icon: 'shield',
  },
  {
    number: '04',
    title: 'Exit',
    subtitle: 'Financial Reconciliation',
    body: 'Calculates your actual ROI, IRR, and cash-on-cash return. Export a one-page deal summary or tax-ready CSV for your CPA.',
    icon: 'account_balance',
  },
];

export default function PlatformOverview() {
  return (
    <section
      id="how-it-works"
      className="max-w-container-max mx-auto px-5 md:px-6 lg:px-8 py-24 md:py-32 scroll-mt-24 relative"
    >
      {/* Section header — left-aligned per Stitch */}
      <div className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
        <h2 className="text-[28px] md:text-[32px] leading-tight font-bold tracking-tight text-on-surface mb-4">
          Platform Overview
        </h2>
        <p className="text-base text-on-surface-variant leading-relaxed">
          Most investors manage six- and seven-figure deals on spreadsheets
          that break when you add a column. PaperWorking replaces that mess
          with one system organized around how deals actually work: four
          phases, acquisition through exit, with every dollar tracked along
          the way.
        </p>
      </div>

      {/* 4-Phase cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 relative">
        {PHASES.map((phase) => (
          <div
            key={phase.number}
            className="glass-card rounded-xl p-4 md:p-6 group relative overflow-hidden hover:-translate-y-1 transition-transform duration-300"
          >
            {/* Watermark number */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-[48px] leading-[56px] font-bold tracking-tight">
                {phase.number}
              </span>
            </div>

            {/* Icon circle */}
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-primary">
                {phase.icon}
              </span>
            </div>

            {/* Text content */}
            <h3 className="text-2xl font-semibold text-on-surface mb-1">
              {phase.title}
            </h3>
            <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-primary mb-3">
              {phase.subtitle}
            </h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {phase.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
