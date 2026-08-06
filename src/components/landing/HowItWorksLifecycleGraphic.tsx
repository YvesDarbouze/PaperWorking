'use client';

const STEPS = [
  {
    phase: 'PHASE 01',
    name: 'Acquisition',
    sublabel: 'Underwrite & Analyze',
    icon: 'analytics',
    description: 'Underwrite deals, model cap rate & IRR, pull live market data.',
    color: 'var(--color-primary, #00dd94)',
  },
  {
    phase: 'PHASE 02',
    name: 'Fund',
    sublabel: 'Capital & Paperwork',
    icon: 'account_balance',
    description: 'Manage earnest money, contract deadlines, and document vault.',
    color: '#60a5fa',
  },
  {
    phase: 'PHASE 03',
    name: 'Hold',
    sublabel: 'Execute & Track',
    icon: 'home_work',
    description: 'Track rehab budget, milestone draws, and daily holding cost burn.',
    color: '#fbbf24',
  },
  {
    phase: 'PHASE 04',
    name: 'Exit',
    sublabel: 'Realize & Prove',
    icon: 'payments',
    description: 'Generate lender-ready performance reports and CPA tax exports.',
    color: '#c084fc',
  },
];

export default function HowItWorksLifecycleGraphic() {
  return (
    <section className="py-12 md:py-16 lg:py-20 border-b border-white/5 relative overflow-hidden bg-surface-container-low/20">
      {/* Background Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary uppercase tracking-widest mb-4 type-eyebrow">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Lifecycle Workflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-on-surface mb-4 leading-tight type-h2">
            The 4-Phase Deal Flow Diagram
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] type-body">
            Every property moves strictly through four stages. Each phase builds the data for the next.
          </p>
        </div>

        {/* Desktop / Tablet Horizontal Flow Grid (hidden on small mobile, visible sm+) */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STEPS.map((step, idx) => (
            <div key={step.name} className="relative flex flex-col">
              {/* Connector arrow for desktop (lg:grid-cols-4) */}
              {idx < STEPS.length - 1 && (
                <div
                  className="hidden lg:flex absolute top-12 -right-3 translate-x-1/2 z-20 items-center justify-center w-7 h-7 rounded-full bg-surface-container-high border border-white/15 text-primary/80"
                  aria-hidden
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              )}

              <div className="glass-card rounded-[24px] p-7 border border-white/8 bg-surface-container-low/40 backdrop-blur-xl flex flex-col justify-between h-full group hover:border-primary/40 hover:shadow-[0_8px_32px_rgba(0,221,148,0.1)] transition-all duration-300 transform hover:-translate-y-1">
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary/80 font-medium type-caption">
                      {step.phase}
                    </span>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-transform duration-300"
                    >
                      <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                    </div>
                  </div>

                  {/* Title & Sublabel */}
                  <h3 className="text-xl font-semibold text-on-surface mb-1 type-h3">
                    {step.name}
                  </h3>
                  <div className="text-xs font-semibold text-primary mb-3 type-caption">
                    {step.sublabel}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-on-surface-variant leading-[1.6] type-small">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Vertical Stepper Timeline (visible on mobile < sm) */}
        <div className="sm:hidden space-y-6 relative pl-6 border-l-2 border-primary/20 ml-3">
          {STEPS.map((step) => (
            <div key={step.name} className="relative">
              {/* Stepper Dot */}
              <div
                className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center"
                aria-hidden
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/8 bg-surface-container-low/40 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20 text-primary">
                    <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                  </div>
                  <div>
                    <span className="font-jetbrains text-[9px] uppercase tracking-widest text-primary/80 font-medium block">
                      {step.phase}
                    </span>
                    <h3 className="text-lg font-semibold text-on-surface leading-none">
                      {step.name}
                    </h3>
                  </div>
                </div>

                <div className="text-xs font-semibold text-primary mb-2">
                  {step.sublabel}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
