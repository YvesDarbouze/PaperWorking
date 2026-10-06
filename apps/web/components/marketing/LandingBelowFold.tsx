'use client';

import Link from 'next/link';
import { ArrowRight } from '@/components/icons/PhosphorIcons';
import { Button } from '@/components/ui/Button';

/** Below-fold landing sections: updated with shadcn buFzlTs Radix Lyra tokens. */
export default function LandingBelowFold() {
  return (
    <div className="relative z-10 w-full bg-background">
      <section className="w-full border-y border-border bg-muted/20 py-6 text-center">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
            Every deadline tracked. Every dollar logged. Every metric live.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-border bg-background py-12 md:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-6 max-w-2xl">
              <p className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                The metrics
              </p>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                One project record. Thirty-three investor KPIs.
              </h2>
              <p className="mb-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                NOI. Cap rate. Cash-on-cash. DSCR. IRR. Equity multiple. Occupancy. The full list, with
                formulas, is public in the{' '}
                <Link
                  href="/support/metrics"
                  className="font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
                >
                  Playbook
                </Link>
                .
              </p>
              <p className="mb-8 text-base leading-relaxed text-muted-foreground sm:text-lg">
                These aren&apos;t estimates you type in; they&apos;re calculated automatically from the
                work you&apos;re already doing: purchase price, rehab costs, rent received. Stock
                investors get dashboards. Real estate investors deserve the same.
              </p>
              <Button
                asChild
                variant="default"
                size="default"
                className="h-10 px-5 text-xs font-medium gap-2"
              >
                <Link href="/support/metrics">
                  Explore the Playbook: all 33 metrics
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>

            {/* Authentic Screen Capture of Portfolio Insights & 33 Datapoints */}
            <div className="lg:col-span-6 w-full">
              <div className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-none border border-border bg-card shadow-lg ring-1 ring-foreground/10">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3.5 py-2 text-[11px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-none bg-primary" />
                    <span className="font-semibold text-foreground">Portfolio Insights</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    33 Visualized KPIs
                  </span>
                </div>
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-background">
                  <img
                    src="/images/mockups/insights-desktop.png"
                    alt="PaperWorking Portfolio Insights screen showing live 33 Datapoints, Net Operating Income, IRR, Cap Rate, and Return On Equity"
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
