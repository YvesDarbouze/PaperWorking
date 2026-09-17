'use client';

import Link from 'next/link';

/** Below-fold landing sections — ported from PaperWorking v0 page composition. */
export default function LandingBelowFold() {
  return (
    <div className="relative z-10 w-full">
      <section className="w-full border-y border-white/5 bg-white/[0.02] py-6 text-center">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-semibold uppercase tracking-widest text-white/70 sm:text-[14px]">
            Every deadline tracked. Every dollar logged. Every metric live.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/5 bg-white/[0.02] py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="max-w-3xl">
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
