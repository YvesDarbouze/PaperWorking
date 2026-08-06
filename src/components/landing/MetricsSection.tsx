'use client';

import Link from 'next/link';

export default function MetricsSection() {
  return (
    <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden border-b border-white/5 bg-surface-container-low/20">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-medium">
            The metrics
          </p>
          <h2 className="font-semibold tracking-[-0.02em] text-on-surface mb-6 leading-tight type-h2">
            One project record. Thirty-three investor KPIs.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] mb-4 type-body">
            NOI. Cap rate. Cash-on-cash. DSCR. IRR. Equity multiple. Occupancy. The full list, with formulas, is public in the <Link href="/support/metrics" className="text-primary hover:underline font-semibold">Playbook</Link>.
          </p>
          <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] mb-8 type-body">
            These aren&apos;t estimates you type in; they&apos;re calculated automatically from the work you&apos;re already doing: purchase price, rehab costs, rent received. Stock investors get dashboards. Real estate investors deserve the same.
          </p>
          <Link
            href="/support/metrics"
            className="luminous-button inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-[14px] font-semibold tracking-wide cursor-pointer type-cta"
          >
            Explore the Playbook: all 33 metrics
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
