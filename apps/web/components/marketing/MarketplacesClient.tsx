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
      {/* ── 1. Hero ── */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-4 md:pt-6 mb-10">
        <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary type-eyebrow font-mono">
            Two marketplaces, one network
          </span>
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-[-0.025em] leading-[1.05] type-display font-semibold">
          Come for the tools. Stay for the community.
        </h1>
        <p className="text-base sm:text-lg text-on-surface-variant font-normal leading-[1.65] type-body-lg max-w-3xl mx-auto">
          PaperWorking subscribers run real deals through the same four phases you do. The marketplaces connect them: Projects that need capital and Projects that need real estate professionals when they need them.
        </p>

        {/* ── Marketplace Subnavigation Tab Row ── */}
        <div className="pt-4 flex justify-center">
          <div
            role="tablist"
            aria-label="Marketplace options"
            className="inline-flex items-center p-1 rounded-full glass-panel border border-white/10 bg-surface-container-low/40 max-w-full overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              id="tab-deals"
              aria-selected={activeTab === 'deals'}
              aria-controls="panel-deals"
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
              id="tab-vendors"
              aria-selected={activeTab === 'vendors'}
              aria-controls="panel-vendors"
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
      </section>

      {/* ── 2. Marketplace Tab Content Panels ── */}
      <div className="mb-14">
        {/* Deal Marketplace Panel */}
        <div
          id="panel-deals"
          role="tabpanel"
          aria-labelledby="tab-deals"
          className={activeTab === 'deals' ? 'block' : 'hidden'}
        >
          <div className="glass-card rounded-[24px] p-8 sm:p-12 border border-white/10 bg-surface-container-low/30 backdrop-blur-xl text-left space-y-8 max-w-4xl mx-auto">
            <div>
              <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary font-medium mb-3 block type-caption">
                DEAL MARKETPLACE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-on-surface leading-tight mb-4 type-h2">
                Put your Project in front of investors who are looking.
              </h2>
              <div className="space-y-4 text-base text-on-surface-variant leading-[1.65] type-body">
                <p>
                  Create a Project, run it through the Deal Analyzer, and list it. Every listed deal carries its own underwriting (cap rate, cash-on-cash, projected IRR), so interested investors see the numbers, not a pitch deck.
                </p>
                <p>
                  Set your funding target and watch pledges accumulate against it. Deals that match your criteria arrive in your inbox.
                </p>
                <p>
                  When a deal comes together, the closing happens where it always has: between the parties, outside PaperWorking. Log the outcome and your Project record stays complete.
                </p>
              </div>
            </div>

            {/* Bullets */}
            <div className="border-t border-white/10 pt-6">
              <ul className="space-y-3.5 text-sm sm:text-base text-on-surface-variant">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">check_circle</span>
                  <span>Analyzer-backed listings: every deal shows its underwriting.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">check_circle</span>
                  <span>Interest, visualized: pledges tracked against your target in real time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">check_circle</span>
                  <span>Inbox matchmaking: deals that fit your criteria come to you.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">check_circle</span>
                  <span>Close off-platform, log the result: the Project keeps a complete history.</span>
                </li>
              </ul>
            </div>

            {/* Compliance Block */}
            <div className="rounded-2xl p-5 sm:p-6 bg-surface-container-high/40 border border-white/10 text-xs sm:text-sm text-on-surface-variant/90 leading-relaxed font-mono">
              <p>
                PaperWorking facilitates introductions and interest tracking only. No funds, securities, or ownership interests are offered, sold, or transferred through the platform. All transactions occur outside PaperWorking, directly between the parties.
              </p>
            </div>
          </div>
        </div>

        {/* Vendor Marketplace Panel */}
        <div
          id="panel-vendors"
          role="tabpanel"
          aria-labelledby="tab-vendors"
          className={activeTab === 'vendors' ? 'block' : 'hidden'}
        >
          <div className="glass-card rounded-[24px] p-8 sm:p-12 border border-white/10 bg-surface-container-low/30 backdrop-blur-xl text-left space-y-8 max-w-4xl mx-auto">
            <div>
              <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary font-medium mb-3 block type-caption">
                VENDOR MARKETPLACE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-on-surface leading-tight mb-4 type-h2">
                Find the right professional when the deal needs them.
              </h2>
              <div className="space-y-4 text-base text-on-surface-variant leading-[1.65] type-body">
                <p>
                  A deal needs different professionals at different phases. The Vendor Marketplace lists professionals by trade and service area, so when your project reaches the phase that needs an appraiser, attorney, or general contractor as examples, you find one right when the Project needs one.
                </p>
                <p>
                  Vendors work inside PaperWorking with access limited to assigned work: they see the scope they&apos;re hired for, not your portfolio.
                </p>
                <p className="font-medium text-on-surface pt-2">
                  Vendor categories:
                </p>
              </div>
            </div>

            {/* Numbered Category List */}
            <ol className="space-y-4 text-sm sm:text-base text-on-surface-variant list-decimal list-inside pl-1">
              <li className="pl-2 leading-relaxed">
                <strong className="text-on-surface font-semibold">Transactional &amp; Financial:</strong> mortgage lenders and brokers, title and escrow companies, appraisers, insurance providers.
              </li>
              <li className="pl-2 leading-relaxed">
                <strong className="text-on-surface font-semibold">Legal &amp; Advisory:</strong> real estate attorneys, 1031 exchange accommodators, CPAs and accountants.
              </li>
              <li className="pl-2 leading-relaxed">
                <strong className="text-on-surface font-semibold">Construction, Trades &amp; Maintenance:</strong> general contractors, specialty trades, inspectors and assessors, exterior and grounds crews.
              </li>
              <li className="pl-2 leading-relaxed">
                <strong className="text-on-surface font-semibold">Marketing, Staging &amp; Media:</strong> photographers and videographers, home stagers, signage and print.
              </li>
              <li className="pl-2 leading-relaxed">
                <strong className="text-on-surface font-semibold">Property Operations:</strong> cleaning, handyman services, security, waste management.
              </li>
            </ol>

            {/* Closing Vendor Note */}
            <p className="text-base text-on-surface-variant leading-[1.65] type-body pt-2">
              Are you one of these professionals? A Vendor account puts your services in front of active investor projects in your area.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Action CTAs & Compliance Microcopy ── */}
      <section className="text-center pt-2 pb-6 space-y-6">
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
      </section>
    </div>
  );
}
