import React from 'react';
import { REIL_PHASE_MODULES } from '@/lib/marketing/reilModules';

export interface ReilPhaseCardData {
  phaseNumber: string;
  title: string;
  copy: string;
  bullets?: string[];
}

export const REIL_LIFECYCLE_PHASES: ReilPhaseCardData[] = [
  {
    phaseNumber: 'PHASE 01',
    title: 'Acquisition',
    copy: 'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
    bullets: REIL_PHASE_MODULES[0]?.bullets ?? [],
  },
  {
    phaseNumber: 'PHASE 02',
    title: 'Fund',
    copy: 'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
    bullets: REIL_PHASE_MODULES[1]?.bullets ?? [],
  },
  {
    phaseNumber: 'PHASE 03',
    title: 'Hold',
    copy: 'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
    bullets: REIL_PHASE_MODULES[2]?.bullets ?? [],
  },
  {
    phaseNumber: 'PHASE 04',
    title: 'Exit',
    copy: 'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
    bullets: REIL_PHASE_MODULES[3]?.bullets ?? [],
  },
];

export default function ReilLifecycleCards() {
  return (
    <div data-testid="reil-lifecycle-cards" className="w-full text-left">
      {/* 2-Column Section Header Anchor */}
      <div className="mb-10 sm:mb-12 border-t border-border pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-baseline">
          {/* Left Column: Eyebrow + H2 */}
          <div className="lg:col-span-5 text-left">
            <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              BUILT ON THE REAL ESTATE INVESTMENT LIFE CYCLE
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground">
              Acquisition, Fund, Hold, Exit. Four phases. One system.
            </h2>
          </div>

          {/* Right Column: Detailed Narrative Paragraph */}
          <div className="lg:col-span-7 text-left">
            <p className="text-sm sm:text-[15px] leading-[1.75] text-muted-foreground">
              Real estate investments follow a distinct lifecycle unlike standard work-related projects, moving through phases unique to the property industry. PaperWorking streamlines these stages into a unified ecosystem, driving operational efficiency and practical solutions for investors. By ingesting your project data points, PaperWorking generates 33 visualized KPIs (Key Performance Indicators) that provide the critical insights needed for smarter decision-making. We built PaperWorking to equip serious real estate investors with the intelligence required to measure and maximize investment performance.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Phase Cards */}
      <div data-testid="reil-phase-modules" className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
        {REIL_LIFECYCLE_PHASES.map((phase) => (
          <div
            key={phase.title}
            data-testid={`reil-card-${phase.title.toLowerCase()}`}
            className="group flex flex-col justify-between rounded-none border border-border bg-card p-5 sm:p-6 shadow-sm ring-1 ring-foreground/10 text-card-foreground transition-all duration-200 hover:border-foreground/30 hover:shadow-md"
          >
            <div>
              <div className="border-b border-border/50 pb-3 mb-3.5">
                <span className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                  {phase.phaseNumber}
                </span>
                <h4 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  {phase.title}
                </h4>
              </div>

              <p className="text-[13px] sm:text-[13.5px] leading-[1.65] text-muted-foreground">
                {phase.copy}
              </p>

              {phase.bullets && phase.bullets.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border/50 pt-3.5 pl-4 text-xs sm:text-[13px] leading-relaxed text-muted-foreground list-disc marker:text-muted-foreground/60">
                  {phase.bullets.map((bullet, idx) => (
                    <li key={idx} className="pl-0.5">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
