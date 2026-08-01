'use client';

import Link from 'next/link';

const UPDATES = [
  {
    date: 'Jun 2026',
    category: 'Product',
    categoryColor: 'text-primary bg-primary/10',
    headline: 'REIL Lifecycle now enforces Acquisition → Fund → Hold → Exit phase gates',
    body: 'Deals can no longer skip phases. Each gate requires the previous phase to be marked complete, keeping your pipeline reviewable at every step.',
  },
  {
    date: 'May 2026',
    category: 'Integrations',
    categoryColor: 'text-secondary bg-secondary/10',
    headline: 'Deal Marketplace now live — list and discover deals across the investor network',
    body: 'List a deal with its underwriting — Cap Rate, CoC, projected IRR — and track investor interest in real time. All introductions happen inside PaperWorking; all closings happen outside it.',
  },
  {
    date: 'May 2026',
    category: 'Platform',
    categoryColor: 'text-tertiary bg-tertiary/10',
    headline: 'Demo mode available — explore a live deal pipeline without signing up',
    body: 'Visit /demo to walk through a fully-loaded read-only workspace with sample properties, rehab budgets, and ROI projections. No account required.',
  },
];

export default function LandingNews() {
  return (
    <section
      id="news"
      className="w-full max-w-container-max mx-auto px-5 md:px-gutter-desktop py-24 md:py-32"
    >
      {/* Header row */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-primary mb-3 type-eyebrow">
            What&apos;s New
          </p>
          <h2 className="font-headline-lg text-headline-lg text-on-surface type-h2">
            Latest from PaperWorking
          </h2>
        </div>
        <Link
          href="/changelog"
          className="hidden md:flex items-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors type-cta"
        >
          Full changelog
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </div>

      {/* Update cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {UPDATES.map((item) => (
          <div
            key={item.headline}
            className="glass-panel rounded-xl p-6 flex flex-col gap-4 hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full type-eyebrow ${item.categoryColor}`}>
                {item.category}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant/60 type-small">
                {item.date}
              </span>
            </div>
            <h3 className="font-headline-md text-[16px] leading-snug text-on-surface type-h3">
              {item.headline}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex-grow type-body">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile changelog link */}
      <div className="md:hidden text-center">
        <Link
          href="/changelog"
          className="font-label-md text-label-md text-primary inline-flex items-center gap-2 type-cta"
        >
          View full changelog
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}
