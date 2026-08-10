'use client';

import Link from 'next/link';

export default function MarketplaceTeaserSection() {
  return (
    <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden border-b border-white/5">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-jetbrains text-[10px] uppercase tracking-widest text-primary mb-4 type-eyebrow font-bold">
            Two marketplaces
          </p>
          <h2 className="font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            Deals that need capital. Projects that need pros.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-8 type-body">
            List a deal in the Deal Marketplace and track interest from investors who are looking. Or find the appraiser, attorney, or contractor when your project reaches the phase that needs one. Interest and pledges are tracked here. Every closing happens between the parties, off-platform. No money moves through PaperWorking.
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link
              href="/marketplaces"
              className="luminous-button inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[14px] font-semibold tracking-wide cursor-pointer type-cta"
            >
              Explore marketplaces
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
            <p className="text-[12.5px] text-on-surface-variant/70 leading-relaxed type-caption">
              PaperWorking is project management software, not investment advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
