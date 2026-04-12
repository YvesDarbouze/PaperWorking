'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   ProcessTimeline — Simplifying the Complex

   Horizontal 4-phase progress line:
   Find → Acquire → Renovate → Exit

   Responsive: horizontal on sm+, stacked vertical on mobile.
   ═══════════════════════════════════════════════════════════════ */

interface Phase {
  number: number;
  label: string;
  description: string;
}

const phases: Phase[] = [
  {
    number: 1,
    label: 'Find',
    description: 'Source and evaluate deals with real-time market data.',
  },
  {
    number: 2,
    label: 'Acquire',
    description: 'Execute closings with automated document workflows.',
  },
  {
    number: 3,
    label: 'Renovate',
    description: 'Track budgets, contractors, and timelines in one place.',
  },
  {
    number: 4,
    label: 'Exit',
    description: 'List, sell, or refi — with full audit trail and tax exports.',
  },
];

export default function ProcessTimeline() {
  return (
    <section className="py-20 sm:py-28 bg-pw-surface border-t border-b border-pw-border" id="process">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16 sm:mb-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-pw-muted mb-4">
            Simplifying the complex
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-pw-fg">
            Four phases. One platform.
          </h2>
        </div>

        {/* ─── Desktop: Horizontal timeline ─── */}
        <div className="hidden sm:block">
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-[28px] left-[60px] right-[60px] h-[2px] bg-pw-border" />
            <div
              className="absolute top-[28px] left-[60px] h-[2px] bg-pw-fg"
              style={{ width: 'calc(100% - 120px)' }}
            />

            {/* Phase nodes */}
            <div className="relative grid grid-cols-4 gap-4">
              {phases.map((phase) => (
                <div key={phase.number} className="flex flex-col items-center text-center">
                  {/* Circle node */}
                  <div className="relative z-10 w-14 h-14 rounded-full bg-pw-fg text-pw-white
                                  flex items-center justify-center text-lg font-bold
                                  shadow-sm transition-transform duration-300 hover:scale-110">
                    {phase.number}
                  </div>

                  {/* Label */}
                  <h3 className="mt-5 text-base font-semibold text-pw-fg tracking-tight">
                    {phase.label}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-sm text-pw-muted leading-relaxed max-w-[200px]">
                    {phase.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Mobile: Vertical timeline ─── */}
        <div className="sm:hidden">
          <div className="relative pl-16">
            {/* Vertical line — centered on circles */}
            <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-pw-border" />

            {phases.map((phase, idx) => (
              <div
                key={phase.number}
                className={`relative flex items-start ${idx < phases.length - 1 ? 'pb-10' : ''}`}
              >
                {/* Circle node — positioned to align with vertical line */}
                <div className="absolute -left-[36px] z-10 w-10 h-10 rounded-full bg-pw-fg text-pw-white
                                flex items-center justify-center text-sm font-bold shadow-sm">
                  {phase.number}
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base font-semibold text-pw-fg tracking-tight">
                    {phase.label}
                  </h3>
                  <p className="mt-1 text-sm text-pw-muted leading-relaxed">
                    {phase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
