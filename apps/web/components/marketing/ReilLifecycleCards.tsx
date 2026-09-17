import React from 'react';

export interface ReilPhaseCardData {
  phaseNumber: string;
  title: string;
  copy: string;
}

export const REIL_LIFECYCLE_PHASES: ReilPhaseCardData[] = [
  {
    phaseNumber: 'PHASE 01',
    title: 'Acquisition',
    copy: 'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
  },
  {
    phaseNumber: 'PHASE 02',
    title: 'Fund',
    copy: 'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
  },
  {
    phaseNumber: 'PHASE 03',
    title: 'Hold',
    copy: 'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
  },
  {
    phaseNumber: 'PHASE 04',
    title: 'Exit',
    copy: 'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
  },
];

export default function ReilLifecycleCards() {
  return (
    <div data-testid="reil-lifecycle-cards" className="w-full mt-6 text-left">
      <div className="mb-6 max-w-3xl text-center sm:text-left">
        <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] sm:text-[11px] font-medium uppercase tracking-widest text-[#00DD94]">
          BUILT ON THE REAL ESTATE INVESTMENT LIFE CYCLE
        </p>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight tracking-[-0.02em] text-white">
          Acquisition, Fund, Hold, Exit. Four phases. One system.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {REIL_LIFECYCLE_PHASES.map((phase) => (
          <div
            key={phase.title}
            data-testid={`reil-card-${phase.title.toLowerCase()}`}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0c090b]/80 p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-[#00DD94]/30"
          >
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00DD94]">
                  {phase.phaseNumber}
                </span>
                <span className="h-2 w-2 rounded-full bg-[#00DD94]/40" />
              </div>

              <h4 className="mb-2.5 text-lg font-bold tracking-tight text-white">
                {phase.title}
              </h4>

              <p className="text-xs sm:text-[13px] leading-[1.65] text-white/70">
                {phase.copy}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
