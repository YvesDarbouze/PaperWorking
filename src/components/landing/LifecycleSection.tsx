'use client';

const PHASES = [
  {
    label: 'PHASE 01',
    name: 'Acquisition',
    copy: 'Acquisition — Decide if the deal works before you buy. The Deal Analyzer pulls live property data and an automated valuation, then projects cap rate, IRR, and cash-on-cash.',
  },
  {
    label: 'PHASE 02',
    name: 'Fund',
    copy: 'Fund — Get the money and paperwork lined up. Track contingency deadlines and earnest money. Contracts live in one vault. Alerts fire before dates go hard.',
  },
  {
    label: 'PHASE 03',
    name: 'Hold',
    copy: 'Hold — Own it and improve it. Link milestones to your line-item budget. Log expenses as they happen. Holding costs and budget-vs-actual stay visible in real time.',
  },
  {
    label: 'PHASE 04',
    name: 'Exit',
    copy: 'Exit — Sell it or keep it as a rental — and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
  },
];

export default function LifecycleSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden border-b border-white/5">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        <div className="max-w-3xl mb-12">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-bold">
            Built on the Real Estate Investment Life Cycle
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4 leading-tight type-h2">
            Acquisition, Fund, Hold, Exit. Four phases. One system.
          </h2>
        </div>

        {/* 4 Phase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {PHASES.map((p) => (
            <div
              key={p.name}
              className="glass-card rounded-xl p-6 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary/80 mb-2 block type-caption">
                  {p.label}
                </span>
                <h3 className="text-xl font-bold text-on-surface mb-3 type-h3">
                  {p.name}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed type-small">
                  {p.copy}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing line */}
        <p className="text-base sm:text-lg font-semibold text-on-surface text-center max-w-2xl mx-auto type-body">
          Deals move in order, Kanban-style. Phase gates keep the pipeline reviewable.
        </p>
      </div>
    </section>
  );
}
