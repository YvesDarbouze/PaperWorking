'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════
   PlatformOverview — REIL Phases + Risk Mitigation

   Matches "PaperWorking Landing Page (Desktop Redesign)"
   Stitch screen. 4-column glass-panel grid with Material
   Symbols, plus "Stop Profit Erosion" callout.
   ═══════════════════════════════════════════════════════ */

const PHASES = [
  {
    label: 'Find More Deals',
    body: 'Stop losing leads to competitors. Track opportunities effortlessly.',
    icon: 'radar',
  },
  {
    label: 'Professionalize',
    body: 'Ditch spreadsheets. Present a polished front to lenders & partners.',
    icon: 'business_center',
  },
  {
    label: 'Manage Projects',
    body: 'Track rehab costs in real-time. Never go over budget blindly.',
    icon: 'construction',
  },
  {
    label: 'Save Money',
    body: 'Automate docs and compliance to close faster with zero friction.',
    icon: 'savings',
  },
];

export default function PlatformOverview() {
  return (
    <>
      {/* ── REIL Phases Section ── */}
      <section
        id="how-it-works"
        className="max-w-container-max mx-auto px-margin-mobile md:px-gutter-desktop py-stack-lg md:py-0 md:mb-32"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {PHASES.map((phase) => (
            <div
              key={phase.label}
              className="glass-panel p-4 md:p-8 rounded-xl border border-white/5 md:border-primary/10 hover:border-primary/30 transition-all group"
            >
              {/* Icon */}
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-primary text-xl md:text-2xl"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  {phase.icon}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-label-md md:font-headline-md text-on-surface mb-1 md:mb-2">
                {phase.label}
              </h3>

              {/* Description */}
              <p className="text-[12px] md:text-base md:font-body-sm leading-tight md:leading-normal text-on-surface-variant">
                {phase.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Risk Mitigation Callout ── */}
      <section className="max-w-4xl mx-auto px-margin-mobile md:px-gutter-desktop py-stack-lg md:py-0 md:mb-32">
        <div className="glass-panel p-stack-lg md:p-12 rounded-2xl text-center border-t-4 md:border-t-2 border-t-primary md:border-t-primary/40 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="hidden md:block absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

          <h2 className="font-headline-md md:font-headline-lg text-primary mb-2 md:mb-6 relative z-10">
            Stop Bleeding Your Margins Dry.
          </h2>
          <p className="font-body-md md:font-body-lg text-on-surface max-w-2xl mx-auto mb-0 relative z-10">
            Every day you rely on fragmented spreadsheets, you risk costly mistakes. Upgrade to a single, high-fidelity operating system built for serious investors.
          </p>
        </div>
      </section>
    </>
  );
}
