'use client';

const STEPS = [
  {
    phase: 'PHASE 01',
    name: 'Acquisition',
    sublabel: 'Underwrite & Analyze',
    icon: 'analytics',
    description: 'Underwrite deals, model cap rate & IRR, pull live market data.',
  },
  {
    phase: 'PHASE 02',
    name: 'Fund',
    sublabel: 'Capital & Paperwork',
    icon: 'account_balance',
    description: 'Manage earnest money, contract deadlines, and document vault.',
  },
  {
    phase: 'PHASE 03',
    name: 'Hold',
    sublabel: 'Execute & Track',
    icon: 'home_work',
    description: 'Track rehab budget, milestone draws, and daily holding cost burn.',
  },
  {
    phase: 'PHASE 04',
    name: 'Exit',
    sublabel: 'Realize & Prove',
    icon: 'payments',
    description: 'Generate lender-ready performance reports and CPA tax exports.',
  },
] as const;

/** Ported from PaperWorking `HowItWorksLifecycleGraphic.tsx`. */
export default function HowItWorksLifecycleGraphic() {
  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-white/[0.02] py-12 md:py-16 lg:py-20">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
            Lifecycle Workflow
          </div>
          <h2 className="mb-4 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
            The 4-Phase Deal Flow Diagram
          </h2>
          <p className="text-base leading-[1.65] text-white/65 sm:text-lg">
            Every property moves strictly through four stages. Each phase builds the data for the next.
          </p>
        </div>

        <div className="relative hidden grid-cols-2 gap-6 sm:grid lg:grid-cols-4">
          {STEPS.map((step, idx) => (
            <div key={step.name} className="relative flex flex-col">
              {idx < STEPS.length - 1 ? (
                <div
                  className="absolute -right-3 top-12 z-20 hidden h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-[#1a171c] text-[color:var(--color-primary)]/80 lg:flex"
                  aria-hidden
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              ) : null}

              <div className="glass-card group flex h-full flex-col justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--color-primary)]/40 hover:shadow-[0_8px_32px_rgba(0,221,148,0.1)]">
                <div>
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]/80">
                      {step.phase}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] transition-transform duration-300 group-hover:scale-110">
                      <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                    </div>
                  </div>
                  <h3 className="mb-1 text-xl font-semibold text-white">{step.name}</h3>
                  <div className="mb-3 text-xs font-semibold text-[color:var(--color-primary)]">
                    {step.sublabel}
                  </div>
                  <p className="text-xs leading-[1.6] text-white/60">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative ml-3 space-y-6 border-l-2 border-[color:var(--color-primary)]/20 pl-6 sm:hidden">
          {STEPS.map((step) => (
            <div key={step.name} className="relative">
              <div
                className="absolute -left-[31px] top-4 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[color:var(--color-primary)] bg-[#0d0a0b]"
                aria-hidden
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)]" />
              </div>
              <div className="glass-card rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                    <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                  </div>
                  <div>
                    <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]/80">
                      {step.phase}
                    </span>
                    <h3 className="text-lg font-semibold leading-none text-white">{step.name}</h3>
                  </div>
                </div>
                <div className="mb-2 text-xs font-semibold text-[color:var(--color-primary)]">
                  {step.sublabel}
                </div>
                <p className="text-xs leading-relaxed text-white/60">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
