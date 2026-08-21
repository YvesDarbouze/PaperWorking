'use client';

import Link from 'next/link';

const PHASES = [
  {
    label: 'PHASE 01',
    name: 'Acquisition',
    copy: 'Acquisition: Decide if the deal works before you buy. The Deal Analyzer pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
  },
  {
    label: 'PHASE 02',
    name: 'Fund',
    copy: 'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
  },
  {
    label: 'PHASE 03',
    name: 'Hold',
    copy: 'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
  },
  {
    label: 'PHASE 04',
    name: 'Exit',
    copy: 'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
  },
];

const pad = 'w-full min-w-0 px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16';

/** Below-fold landing sections — full-bleed width, responsive padding. */
export default function LandingBelowFold() {
  return (
    <div className="relative z-10 w-full min-w-0">
      <section className="w-full border-y border-white/5 bg-white/[0.02] py-6 text-center">
        <div className={pad}>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-semibold uppercase tracking-widest text-white/70 sm:text-[14px]">
            Every deadline tracked. Every dollar logged. Every metric live.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/5 py-12 md:py-16 lg:py-20">
        <div className={pad}>
          <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl">
            <p className="mb-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
              The problem
            </p>
            <h2 className="mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl">
              Your deals live in too many places
            </h2>
            <h3 className="mb-4 text-lg font-semibold leading-snug text-[color:var(--color-primary)]/90 md:text-xl">
              The spreadsheet isn&apos;t the problem. The scattered record is.
            </h3>
            <p className="mb-6 text-base leading-[1.65] text-white/65 sm:text-lg">
              The budget is in one spreadsheet. The inspection deadline is in an email. The contractor
              draw is in a text thread. The closing statement is a PDF in a folder named &quot;final
              FINAL.&quot; Scattered, they can&apos;t answer a simple question: which project is off
              budget right now?
            </p>
            <p className="text-lg font-medium leading-relaxed text-white sm:text-xl">
              If your spreadsheet system works, keep it.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/5 bg-white/[0.02] py-12 md:py-16 lg:py-20">
        <div className={pad}>
          <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl">
            <p className="mb-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
              What it does
            </p>
            <h2 className="mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl">
              One home for the whole deal, every deal.
            </h2>
            <p className="text-base leading-[1.65] text-white/65 sm:text-lg">
              Each investment gets a Project: one workspace for the deal and everything that happens
              to it. Tasks, deadlines, documents, budgets, and expenses live there. Log the work;
              PaperWorking calculates your investor metrics from it.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/5 py-12 md:py-16 lg:py-20">
        <div className={pad}>
          <div className="mb-10 max-w-3xl lg:max-w-4xl xl:max-w-5xl">
            <p className="mb-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
              Built on the Real Estate Investment Life Cycle
            </p>
            <h2 className="mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl">
              Acquisition, Fund, Hold, Exit. Four phases. One system.
            </h2>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PHASES.map((p) => (
              <div
                key={p.name}
                className="glass-card flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-7 backdrop-blur-xl"
              >
                <div>
                  <span className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]/80">
                    {p.label}
                  </span>
                  <h3 className="mb-3 text-xl font-semibold text-white">{p.name}</h3>
                  <p className="text-sm leading-[1.65] text-white/60">{p.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/5 bg-white/[0.02] py-12 md:py-16 lg:py-20">
        <div className={pad}>
          <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl">
            <p className="mb-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
              The metrics
            </p>
            <h2 className="mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl">
              One project record. Thirty-three investor KPIs.
            </h2>
            <p className="mb-4 text-base leading-[1.65] text-white/65 sm:text-lg">
              NOI. Cap rate. Cash-on-cash. DSCR. IRR. Equity multiple. Occupancy. The full list, with
              formulas, is public in the{' '}
              <Link
                href="/support/metrics"
                className="font-semibold text-[color:var(--color-primary)] hover:underline"
              >
                Playbook
              </Link>
              .
            </p>
            <p className="mb-8 text-base leading-[1.65] text-white/65 sm:text-lg">
              These aren&apos;t estimates you type in; they&apos;re calculated automatically from the
              work you&apos;re already doing: purchase price, rehab costs, rent received. Stock
              investors get dashboards. Real estate investors deserve the same.
            </p>
            <Link
              href="/support/metrics"
              className="inline-flex items-center gap-2.5 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[14px] font-semibold tracking-wide text-[#0d0a0b] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]"
            >
              Explore the Playbook: all 33 metrics
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
