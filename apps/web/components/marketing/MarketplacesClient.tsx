'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  twoMarketplacesTitle,
  twoMarketplacesBody,
  dealMarketplaceBlurb,
  vendorMarketplaceBlurb,
  legalDisclaimer,
} from '@/lib/marketing/copy';
import { ArrowRight } from '@/components/icons/PhosphorIcons';
import { Button } from '@/components/ui/Button';

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
    <div className="w-full bg-background" id={activeTab === 'vendors' ? 'vendors' : 'deals'}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20">
        <section className="mx-auto max-w-3xl space-y-6 text-center w-full">
          <div>
            <span className="inline-block font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Two marketplaces, one network
            </span>
          </div>

          <h1 className="landing-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl leading-[1.1]">
            {twoMarketplacesTitle}
          </h1>

          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <p className="text-base font-normal leading-relaxed text-muted-foreground sm:text-lg">
              {twoMarketplacesBody}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {activeTab === 'deals' ? dealMarketplaceBlurb : vendorMarketplaceBlurb}
            </p>
          </div>

          <div className="flex justify-center pt-2 max-w-full overflow-hidden">
            <div
              role="tablist"
              aria-label="Marketplace options"
              className="inline-flex max-w-full items-center overflow-x-auto rounded-none border border-border bg-muted/40 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'deals'}
                aria-controls="deals"
                onClick={() => handleTabClick('deals')}
                className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-none px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  activeTab === 'deals'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
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
                className={`flex min-h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-none px-6 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  activeTab === 'vendors'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Vendor Marketplace
              </button>
            </div>
          </div>

          <div className="space-y-6 pb-2 pt-4">
            <div className="flex flex-col items-stretch sm:items-center justify-center gap-3 sm:gap-4 sm:flex-row">
              <Button asChild variant="default" size="default" className="min-h-[44px] px-6 text-xs font-medium gap-2">
                <Link href={activeTab === 'deals' ? '/dashboard/deals' : '/dashboard/marketplace'}>
                  Browse the marketplaces
                  <ArrowRight size={14} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="default" className="min-h-[44px] px-6 text-xs font-medium gap-2">
                <Link href="/pricing">
                  List your services as a vendor
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
            <p className="mx-auto max-w-lg font-mono text-[11px] leading-relaxed text-muted-foreground">
              {legalDisclaimer}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
