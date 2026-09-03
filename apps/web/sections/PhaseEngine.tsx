'use client';

import { useState } from 'react';

const PHASES = [
  {
    num: '01.',
    name: 'Acquisition',
    focus: 'Underwrite deals with live property data, model IRR, and gauge investor interest via the Deal Marketplace.',
    outputLabel: 'Baseline KPIs',
    outputVal: 'Projected Cap Rate, Cash-on-Cash, Pro Forma Baseline.',
  },
  {
    num: '02.',
    name: 'Fund',
    focus: 'Lock down earnest money dates, track inspection contingency windows, and store contracts in a secure vault.',
    outputLabel: 'Risk Audits',
    outputVal: 'Active Contingency Countdowns, Earnest Money Exposure, Legal Vault.',
  },
  {
    num: '03.',
    name: 'Hold',
    focus: 'Execute rehabs, log contractor draws line-by-line, source pros via the Vendor Marketplace, and auto-collect rents.',
    outputLabel: 'Live Dashboards',
    outputVal: 'Real-Time Cost Basis, Budget-vs-Actual, Daily Holding Burn, Live NOI.',
  },
  {
    num: '04.',
    name: 'Exit',
    focus: 'Liquidate or hold as a long-term rental with verified operational history for buyers, appraisers, and CPAs.',
    outputLabel: 'Tax & Investor Reporting',
    outputVal: 'Lender-Grade DSCR/Equity Multiple Packages, CPA P&L Exports.',
  },
];

export default function PhaseEngine() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative border-b border-white/5 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        {/* Title / Description */}
        <div className="mb-12 max-w-3xl">
          <span className="mb-4 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
            OPERATIONAL ENGINE
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            The 4-Phase Operational Engine
          </h2>
          <p className="mt-3 text-sm text-white/60 sm:text-base">
            PaperWorking structures the chaotic real estate lifecycle into four distinct operational phases.
            Each phase maps raw day-to-day actions to automated, auditable financial metrics.
          </p>
        </div>

        {/* Desktop View (Table-style layout) - Hidden on Mobile */}
        <div className="hidden md:flex flex-col gap-4">
          {/* Header Row */}
          <div className="grid grid-cols-12 px-6 py-3 font-[family-name:var(--font-jetbrains-mono)] text-xs font-semibold uppercase tracking-wider text-white/40">
            <div className="col-span-3">Phase</div>
            <div className="col-span-5">Operational Focus</div>
            <div className="col-span-4">Financial &amp; Risk Outputs</div>
          </div>

          {/* Phase Rows */}
          {PHASES.map((p, idx) => (
            <div
              key={p.name}
              className="grid grid-cols-12 items-center rounded-xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-[8px] transition-all duration-300 hover:border-[#00DD94]/15"
            >
              {/* Phase Column */}
              <div className="col-span-3 flex items-baseline gap-3">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-2xl font-medium text-[#00DD94]">
                  {p.num}
                </span>
                <span className="text-lg font-semibold text-white">
                  {p.name}
                </span>
              </div>

              {/* Focus Column */}
              <div className="col-span-5 pr-8">
                <p className="text-sm leading-relaxed text-white/70">
                  {p.focus}
                </p>
              </div>

              {/* Outputs Column */}
              <div className="col-span-4 rounded-lg bg-white/[0.01] border border-white/5 p-4">
                <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold text-[#00DD94] uppercase tracking-wide">
                  {p.outputLabel}
                </p>
                <p className="mt-1 text-sm text-white leading-snug">
                  {p.outputVal}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View (Accordion layout) - Hidden on Desktop */}
        <div className="flex flex-col gap-3 md:hidden">
          {PHASES.map((p, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={p.name}
                className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-[8px] overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => toggleAccordion(idx)}
                  className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-medium text-[#00DD94]">
                      {p.num}
                    </span>
                    <span className="text-base font-semibold text-white">
                      {p.name}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-white/50 text-[20px] transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                    keyboard_arrow_down
                  </span>
                </button>

                {/* Content */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 space-y-4 border-t border-white/5">
                    <p className="text-sm leading-relaxed text-white/70 mt-4">
                      {p.focus}
                    </p>
                    <div className="rounded-lg bg-white/[0.01] border border-white/5 p-4">
                      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold text-[#00DD94] uppercase tracking-wide">
                        {p.outputLabel}
                      </p>
                      <p className="mt-1 text-xs text-white leading-normal">
                        {p.outputVal}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
