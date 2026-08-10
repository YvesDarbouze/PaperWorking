'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   MarketplacesClient — Clean above-the-fold hero layout.
   antigravity.google design system: medium-weight display,
   pill CTAs, glass-panel tabs, elegant spacing rhythm.
   ═══════════════════════════════════════════════════════ */

export default function MarketplacesClient() {
  const [activeTab, setActiveTab] = useState<'deals' | 'vendors'>('deals');

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#vendors') {
        setActiveTab('vendors');
      } else if (hash === '#deals') {
        setActiveTab('deals');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleTabClick = (tab: 'deals' | 'vendors') => {
    setActiveTab(tab);
    window.history.pushState(null, '', `#${tab}`);
  };

  return (
    <div className="max-w-[1200px] mx-auto py-8 md:py-14 min-h-[60vh] flex flex-col justify-center">
      {/* ── Hero (COPY-M1) ── */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-4 md:pt-6">
        <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary type-eyebrow font-mono">
            Two marketplaces, one network
          </span>
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-[-0.025em] leading-[1.05] type-display font-semibold">
          Come for the tools. Stay for the community.
        </h1>
        <div className="space-y-4 max-w-3xl mx-auto text-center">
          <p className="text-base sm:text-lg text-on-surface-variant font-medium leading-[1.65] type-body-lg">
            PaperWorking subscribers have exclusive access to powerful tools for serious real estate investors.
          </p>
          <p className="text-sm sm:text-base text-on-surface-variant/90 leading-[1.65] type-body">
            The &ldquo;Deal Marketplace&rdquo; helps investors crowdfund deals and gauge opportunities to partner with other real investors. The &ldquo;Vendor Marketplace&rdquo; helps real estate investors find vendors when they need them. Appraisers, contractors, lawyers, and even bankers can list their services, and PaperWorking will recommend them to investors at the moment they need them.
          </p>
        </div>

        {/* ── Marketplace Subnavigation Tab Row ── */}
        <div className="pt-2 flex justify-center">
          <div
            role="tablist"
            aria-label="Marketplace options"
            className="inline-flex items-center p-1 rounded-full glass-panel border border-white/10 bg-surface-container-low/40 max-w-full overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'deals'}
              aria-controls="deals"
              onClick={() => handleTabClick('deals')}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer min-h-[44px] flex items-center justify-center whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === 'deals'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
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
              className={`px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer min-h-[44px] flex items-center justify-center whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === 'vendors'
                  ? 'bg-primary text-background shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Vendor Marketplace
            </button>
          </div>
        </div>

        {/* ── Action CTAs & Compliance Microcopy ── */}
        <div className="pt-6 pb-2 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link
              href="/pricing"
              className="luminous-button inline-flex items-center gap-2 px-8 py-4 rounded-full font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150 type-cta"
            >
              Browse the marketplaces
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/15 text-on-surface font-label-md text-label-md hover:border-primary/40 hover:text-primary transition-all duration-150 type-cta"
            >
              List your services as a vendor
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          <p className="text-xs text-on-surface-variant/60 max-w-lg mx-auto leading-relaxed font-mono">
            PaperWorking is project management software, not investment advice. Marketplace listings are not offers to sell securities.
          </p>
        </div>
      </section>
    </div>
  );
}
