'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/** Ported from PaperWorking `components/landing/MarketplacesClient.tsx`. */
export default function MarketplacesClient() {
  const [activeTab, setActiveTab] = useState<'deals' | 'vendors'>('deals');

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#vendors') setActiveTab('vendors');
      else if (hash === '#deals') setActiveTab('deals');
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  function handleTabClick(tab: 'deals' | 'vendors') {
    setActiveTab(tab);
    window.history.pushState(null, '', `#${tab}`);
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[1200px] flex-col justify-center py-8 md:py-14">
      <section className="mx-auto max-w-3xl space-y-6 pt-4 text-center md:pt-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)]" />
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
            Two marketplaces, one network
          </span>
        </span>

        <h1 className="landing-display font-semibold leading-[1.05] tracking-[-0.025em] text-white">
          Come for the tools. Stay for the community.
        </h1>

        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-base font-medium leading-[1.65] text-white/70 sm:text-lg">
            PaperWorking subscribers have exclusive access to powerful tools for serious real estate
            investors.
          </p>
          <p className="text-sm leading-[1.65] text-white/60 sm:text-base">
            The &ldquo;Deal Marketplace&rdquo; helps investors crowdfund deals and gauge
            opportunities to partner with other real investors. The &ldquo;Vendor Marketplace&rdquo;
            helps real estate investors find vendors when they need them. Appraisers, contractors,
            lawyers, and even bankers can list their services, and PaperWorking will recommend them to
            investors at the moment they need them.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <div
            role="tablist"
            aria-label="Marketplace options"
            className="inline-flex max-w-full items-center overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'deals'}
              aria-controls="deals"
              onClick={() => handleTabClick('deals')}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                activeTab === 'deals'
                  ? 'bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-md'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              Deal Marketplace
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vendors'}
              aria-controls="vendors"
              onClick={() => handleTabClick('vendors')}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                activeTab === 'vendors'
                  ? 'bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-md'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              Vendor Marketplace
            </button>
          </div>
        </div>

        <div className="space-y-6 pb-2 pt-6">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={activeTab === 'deals' ? '/dashboard/deals' : '/dashboard/marketplace'}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[14px] font-semibold tracking-wide text-[#0d0a0b] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)] transition-all duration-150 active:scale-95"
            >
              Browse the marketplaces
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-[14px] font-semibold text-white transition-all duration-150 hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-primary)]"
            >
              List your services as a vendor
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          <p className="mx-auto max-w-lg font-[family-name:var(--font-jetbrains-mono)] text-xs leading-relaxed text-white/40">
            PaperWorking is project management software, not investment advice. Marketplace listings
            are not offers to sell securities.
          </p>
        </div>
      </section>
    </div>
  );
}
