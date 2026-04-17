import React from 'react';

/**
 * ReinforcingStatement
 *
 * Full-width contrasting background section with a bold, centered
 * data-driven quote. Uses phase-4 (dark) background for maximum
 * contrast within the monochrome palette.
 */

export default function ReinforcingStatement() {
  return (
    <section className="py-20 sm:py-24 bg-phase-4 border-b border-phase-4">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-phase-2 mb-6">
          The Numbers Don&apos;t Lie
        </p>
        <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white leading-tight tracking-tight text-balance">
          PaperWorking saves the average small business{' '}
          <span className="text-dashboard">12 hours a week</span>{' '}
          — that&apos;s 624 hours a year you&apos;re buying back.
        </blockquote>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
          <div>
            <span className="text-3xl font-medium text-white tabular-nums">12 hrs</span>
            <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mt-1">Saved per Week</p>
          </div>
          <div className="w-px h-8 bg-phase-3 hidden sm:block" />
          <div>
            <span className="text-3xl font-medium text-white tabular-nums">$4,800</span>
            <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mt-1">Avg. Monthly Value</p>
          </div>
          <div className="w-px h-8 bg-phase-3 hidden sm:block" />
          <div>
            <span className="text-3xl font-medium text-white tabular-nums">3.2×</span>
            <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mt-1">ROI First Quarter</p>
          </div>
        </div>
      </div>
    </section>
  );
}
