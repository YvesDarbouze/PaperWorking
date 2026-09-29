'use client';

import React from 'react';
import { Lock, MapPin, Bell } from '@/components/icons/PhosphorIcons';

export default function DealCalculatorSection() {
  return (
    <section
      id="deal-calculator"
      className="relative overflow-hidden bg-background border-b border-border py-12 md:py-16"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Text Column (Left on Desktop) */}
          <div className="flex flex-col items-start space-y-5 text-left">
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              DEAL CALCULATOR
            </span>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Analyze deals with professional precision.
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              Before deciding to make a major acquisition, spending thousands, even millions of dollars on an
              investment, use the PaperWorking integrated &ldquo;Deal Calculator&rdquo; to calculate the
              critical numbers real estate investors need to make critical decisions on a new investment.
            </p>
          </div>

          {/* Visual Column (Right on Desktop) */}
          <div className="relative flex flex-col items-center lg:items-end justify-center">
            <div className="relative z-10 w-full max-w-[540px] overflow-hidden rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/10 text-card-foreground">
              {/* Terminal Frame Top Bar */}
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 select-none">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex h-6 w-3/5 max-w-[260px] items-center justify-center gap-1.5 rounded-none border border-border bg-background px-3 text-[11px] font-mono text-muted-foreground truncate">
                  <Lock size={12} className="text-muted-foreground/60" />
                  <span className="truncate">paperworking.co/deal-calculator</span>
                </div>
                <span
                  data-testid="landing-demo-data-badge"
                  className="font-mono text-[9px] uppercase tracking-wider text-foreground border border-border bg-muted px-2 py-0.5 font-semibold"
                >
                  ILLUSTRATIVE DEMO DATA
                </span>
              </div>

              {/* Graphic Asset with Exact Required Alt Text */}
              <div className="relative w-full overflow-hidden bg-background">
                <img
                  src="/images/deal-calculator-preview.png"
                  alt="PaperWorking Deal Calculator — projected cap rate, IRR and cash-on-cash"
                  width={1200}
                  height={896}
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto object-cover block transition-transform duration-300 hover:scale-[1.01]"
                />
              </div>

              {/* Underwriting Summary Strip */}
              <div className="border-t border-border bg-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                    <MapPin size={14} className="text-primary" />
                    <span>1247 Elm Street, Austin TX</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="text-muted-foreground uppercase tracking-wider text-[9px]">Confidence</span>
                    <span className="text-foreground font-bold">84%</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
                  <div className="rounded-none border border-border bg-muted/30 p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground">Price</span>
                    <span className="text-[11px] font-bold text-foreground">$485,000</span>
                  </div>
                  <div className="rounded-none border border-border bg-muted/30 p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground">ARV</span>
                    <span className="text-[11px] font-bold text-foreground">$620,000</span>
                  </div>
                  <div className="rounded-none border border-border bg-muted/30 p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground">Rehab</span>
                    <span className="text-[11px] font-bold text-foreground">$68,000</span>
                  </div>
                  <div className="rounded-none border border-border bg-muted/30 p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground" title="Cap Rate on Cost: Year-1 NOI divided by Total Cost Basis">Cap Rate on Cost</span>
                    <span className="text-[11px] font-bold text-foreground">6.2%</span>
                  </div>
                  <div className="rounded-none border border-border bg-muted/30 p-1.5">
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground">Proj IRR</span>
                    <span className="text-[11px] font-bold text-foreground">24.8%</span>
                  </div>
                </div>

                {/* Alert Badge */}
                <div className="flex items-center gap-2 rounded-none border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <Bell size={13} className="text-foreground shrink-0" />
                  <span className="truncate">
                    <strong className="text-foreground font-semibold">Alert:</strong> Appraisal contingency expires in 3 days
                  </span>
                </div>

                {/* Statutory Landing Demo Disclaimer Label */}
                <p
                  data-testid="landing-demo-data-label"
                  className="text-center text-[10px] text-muted-foreground italic pt-1"
                >
                  Illustrative demo data — not a real deal or performance history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
