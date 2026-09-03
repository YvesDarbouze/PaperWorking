'use client';

import Link from 'next/link';
import {
  marketplaceSectionBody,
  dealMarketplaceDescription,
  vendorMarketplaceDescription,
} from '@/lib/marketing/copy';

export default function MarketplaceSection() {
  return (
    <section id="marketplace" className="relative overflow-hidden border-b border-white/5 py-16 md:py-24">
      {/* Subtle radial gradient centered behind the cards */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,221,148,0.02)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-8">
        {/* Centered text block, max-width 720px */}
        <div className="mx-auto mb-16 max-w-[720px] text-center">
          <span className="mb-4 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-[#00DD94]">
            MARKETPLACE
          </span>
          <h2 className="text-xl leading-relaxed text-white/90 md:text-2xl font-light">
            {marketplaceSectionBody}
          </h2>
        </div>

        {/* Two glass cards: side-by-side (desktop), stacked (mobile) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Card: Deal Marketplace */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-[12px] transition-all duration-300 hover:border-[#00DD94]/30">
            <div>
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#00DD94]/10 text-[#00DD94]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Deal Marketplace</h3>
              <p className="mb-8 text-sm leading-[1.65] text-white/60">
                {dealMarketplaceDescription}
              </p>
            </div>
            <div>
              <Link
                href="/marketplaces#deals"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-xs font-semibold text-white transition-all duration-150 hover:border-[#00DD94]/40 hover:text-[#00DD94]"
              >
                Browse deals
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Right Card: Vendor Marketplace */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-[12px] transition-all duration-300 hover:border-[#00DD94]/30">
            <div>
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#00DD94]/10 text-[#00DD94]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 14.15v4.25c0 .966-.784 1.75-1.75 1.75H5.5a1.75 1.75 0 0 1-1.75-1.75v-4.25m16.5 0a2.25 2.25 0 0 0-2.25-2.25H5.5A2.25 2.25 0 0 0 3.25 14.15m17 0V9.43c0-.885-.572-1.667-1.428-1.921l-3.9-1.159c-.588-.175-1.205-.175-1.793 0l-3.9 1.159c-.856.254-1.428 1.036-1.428 1.921v4.72m17 0H3.25m0 0V9.43c0-.885.572-1.667 1.428-1.921l3.9-1.159c.588-.175 1.205-.175 1.793 0l3.9 1.159c.856.254 1.428 1.036 1.428 1.921v4.72"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Vendor Marketplace</h3>
              <p className="mb-8 text-sm leading-[1.65] text-white/60">
                {vendorMarketplaceDescription}
              </p>
            </div>
            <div>
              <Link
                href="/marketplaces#vendors"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-xs font-semibold text-white transition-all duration-150 hover:border-[#00DD94]/40 hover:text-[#00DD94]"
              >
                List services
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
