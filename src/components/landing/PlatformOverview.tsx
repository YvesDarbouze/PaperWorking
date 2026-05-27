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
    label: 'Acquisition',
    body: 'Source & secure capital.',
    icon: 'hub',
  },
  {
    label: 'Purchase',
    body: 'Automated compliance.',
    icon: 'verified_user',
  },
  {
    label: 'Hold',
    body: 'Real-time margin tracking.',
    icon: 'speed',
  },
  {
    label: 'Exit',
    body: 'Instant ROI reporting.',
    icon: 'account_balance',
  },
];

export default function PlatformOverview() {
  return (
    <>
      {/* ── REIL Phases Section ── */}
      <section
        id="how-it-works"
        className="max-w-container-max mx-auto px-gutter-desktop mb-32"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {PHASES.map((phase) => (
            <div
              key={phase.label}
              className="glass-panel p-8 rounded-xl border-primary/10 hover:border-primary/30 transition-all group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-primary text-2xl"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  {phase.icon}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-headline-md text-on-surface mb-2">
                {phase.label}
              </h3>

              {/* Description */}
              <p className="font-body-sm text-on-surface-variant">
                {phase.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Risk Mitigation Callout ── */}
      <section className="max-w-4xl mx-auto px-gutter-desktop mb-32">
        <div className="glass-panel-elevated p-12 rounded-2xl text-center border-t-2 border-t-primary/40 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

          <h2 className="font-headline-lg text-primary mb-6 relative z-10">
            Stop Profit Erosion.
          </h2>
          <p className="font-body-lg text-on-surface max-w-2xl mx-auto relative z-10">
            Replace fragmented spreadsheets with a single, high-fidelity operating system.
          </p>
        </div>
      </section>
    </>
  );
}
