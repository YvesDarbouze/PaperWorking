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
          By The Numbers
        </p>
        <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white leading-tight tracking-tight text-balance">
          PaperWorking keeps your portfolio organized from acquisition to exit —{' '}
          <span className="text-dashboard">no spreadsheets required</span>.
        </blockquote>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
          <div>
            <span className="text-xl font-bold text-white uppercase tracking-wider block">Every Deadline</span>
            <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mt-1">Tracked & Audited</p>
          </div>
          <div className="w-px h-8 bg-phase-3 hidden sm:block" />
          <div>
            <span className="text-xl font-bold text-white uppercase tracking-wider block">Every Dollar</span>
            <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mt-1">Logged & Categorized</p>
          </div>
          <div className="w-px h-8 bg-phase-3 hidden sm:block" />
          <div>
            <span className="text-xl font-bold text-white uppercase tracking-wider block">Every Partner</span>
            <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mt-1">Synced & Connected</p>
          </div>
        </div>
      </div>
    </section>
  );
}
