'use client';

import Link from 'next/link';

export default function PricingTeaserSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden border-b border-white/5 bg-surface-container-low/20">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-bold">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            Plans for solo investors, teams, and vendors.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-8 type-body">
            Investor: <span className="font-mono font-bold text-on-surface type-metric">$499</span> a year, solo. Investment Team: <span className="font-mono font-bold text-on-surface type-metric">$999</span> a year, up to 10 seats. Vendor: <span className="font-mono font-bold text-on-surface type-metric">$390</span> a year. Billed annually. Every plan includes the four-phase lifecycle, the 33 KPIs, and the 14-day trial.
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link
              href="/pricing"
              className="luminous-button inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[14px] font-semibold tracking-wide cursor-pointer type-cta"
            >
              See pricing
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
            <p className="text-[12.5px] text-on-surface-variant/70 leading-relaxed type-caption">
              Cancel anytime from Settings. Annual plans include a 30-day refund window.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
