'use client';

import React from 'react';
import {
  ArrowRight,
  ChartLineUp,
  Buildings,
  House,
  CurrencyDollar,
} from '@/components/icons/PhosphorIcons';

const STEPS = [
  {
    phase: 'PHASE 01',
    name: 'Acquisition',
    sublabel: 'Underwrite & Analyze',
    icon: ChartLineUp,
    description: 'Underwrite deals, model cap rate & IRR, pull live market data.',
  },
  {
    phase: 'PHASE 02',
    name: 'Fund',
    sublabel: 'Capital & Paperwork',
    icon: Buildings,
    description: 'Manage earnest money, contract deadlines, and document vault.',
  },
  {
    phase: 'PHASE 03',
    name: 'Hold',
    sublabel: 'Execute & Track',
    icon: House,
    description: 'Track rehab budget, milestone draws, and daily holding cost burn.',
  },
  {
    phase: 'PHASE 04',
    name: 'Exit',
    sublabel: 'Realize & Prove',
    icon: CurrencyDollar,
    description: 'Generate lender-ready performance reports and CPA tax exports.',
  },
] as const;

/** Ported from PaperWorking `HowItWorksLifecycleGraphic.tsx`. */
export default function HowItWorksLifecycleGraphic() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-muted/20 py-12 md:py-16 lg:py-20 text-foreground">
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-none border border-border bg-muted px-3.5 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-none bg-foreground" />
            Lifecycle Workflow
          </div>
          <h2 className="mb-4 text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
            The 4-Phase Deal Flow Diagram
          </h2>
          <p className="text-base leading-[1.65] text-muted-foreground sm:text-lg">
            Every property moves strictly through four stages. Each phase builds the data for the next.
          </p>
        </div>

        <div className="relative hidden grid-cols-2 gap-6 sm:grid lg:grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.name} className="relative flex flex-col">
                {idx < STEPS.length - 1 ? (
                  <div
                    className="absolute -right-3 top-12 z-20 hidden h-7 w-7 translate-x-1/2 items-center justify-center rounded-none border border-border bg-background text-muted-foreground lg:flex"
                    aria-hidden
                  >
                    <ArrowRight className="h-4 w-4" />
                  </div>
                ) : null}

                <div className="flex h-full flex-col justify-between rounded-none border border-border bg-card p-6 md:p-7 shadow-sm ring-1 ring-foreground/10 text-card-foreground transition-all duration-200 hover:border-foreground/30">
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        {step.phase}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mb-1 text-xl font-semibold text-card-foreground">{step.name}</h3>
                    <div className="mb-3 text-xs font-semibold text-muted-foreground">
                      {step.sublabel}
                    </div>
                    <p className="text-xs leading-[1.6] text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative ml-3 space-y-6 border-l-2 border-border pl-6 sm:hidden">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.name} className="relative">
                <div
                  className="absolute -left-[31px] top-4 flex h-4 w-4 items-center justify-center rounded-none border-2 border-foreground bg-background"
                  aria-hidden
                >
                  <div className="h-1.5 w-1.5 rounded-none bg-foreground" />
                </div>
                <div className="rounded-none border border-border bg-card p-6 shadow-sm ring-1 ring-foreground/10 text-card-foreground">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
                        {step.phase}
                      </span>
                      <h3 className="text-lg font-semibold leading-none text-card-foreground">{step.name}</h3>
                    </div>
                  </div>
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">
                    {step.sublabel}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
