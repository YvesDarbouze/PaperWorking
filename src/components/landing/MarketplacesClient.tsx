'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   MarketplacesClient — Verbatim approved COPY-M copy.
   antigravity.google design system: medium-weight (500-600) display,
   pill CTAs, 24px card radii, 6-9rem section padding.
   Option 1 Subnavigation: Anchor-based subnav (#deals & #vendors)
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
    const el = document.getElementById(tab);
    if (el) {
      el.scrollIntoView?.({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-12 md:space-y-16 max-w-[1200px] mx-auto py-8 md:py-12">
      {/* ==========================================
          BLOCK 1 — Hero (COPY-M1)
         ========================================== */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-6 md:pt-8">
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

        {/* ── Marketplace Subnavigation (Option 1: Anchor Tab Row) ── */}
        <div className="pt-4 flex justify-center">
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
      </section>

      {/* ==========================================
          BLOCK 2 — Deal Marketplace (COPY-M2)
         ========================================== */}
      <section id="deals" className="scroll-mt-28 glass-card rounded-[24px] p-8 sm:p-12 space-y-8 border border-white/10 bg-white/[0.02]">
        <div className="space-y-4">
          <span className="text-[10px] font-medium uppercase tracking-widest text-primary font-mono type-eyebrow">
            Deal Marketplace
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.02em] text-white leading-tight type-h2">
            Put your Project in front of investors who are looking.
          </h2>
          <div className="space-y-4 text-sm sm:text-base text-on-surface-variant leading-[1.65] type-body">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-semibold text-white font-mono">Analyzer-backed listings</h3>
            <p className="text-xs text-on-surface-variant/80">Every deal shows its underwriting.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-semibold text-white font-mono">Interest, visualized</h3>
            <p className="text-xs text-on-surface-variant/80">Pledges tracked against your target in real time.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-semibold text-white font-mono">Inbox matchmaking</h3>
            <p className="text-xs text-on-surface-variant/80">Deals that fit your criteria come to you.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-semibold text-white font-mono">Close off-platform, log the result</h3>
            <p className="text-xs text-on-surface-variant/80">The Project keeps a complete history.</p>
          </div>
        </div>

        {/* Exception D — Mandatory 3-Sentence Compliance Block (Verbatim directly below Deal Marketplace section) */}
        <div className="pt-6 border-t border-white/10">
          <p className="text-xs text-on-surface-variant/70 leading-relaxed font-mono select-none">
            PaperWorking facilitates introductions and interest tracking only. No funds, securities, or ownership interests are offered, sold, or transferred through the platform. All transactions occur outside PaperWorking, directly between the parties.
          </p>
        </div>
      </section>

      {/* ==========================================
          BLOCK 3 — Vendor Marketplace (COPY-M3)
         ========================================== */}
      <section id="vendors" className="scroll-mt-28 glass-card rounded-[24px] p-8 sm:p-12 space-y-6 border border-white/10 bg-white/[0.02]">
        <span className="text-[10px] font-medium uppercase tracking-widest text-primary font-mono type-eyebrow">
          Vendor Marketplace
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.02em] text-white leading-tight type-h2">
          Find the right professional when the deal needs them.
        </h2>
        <div className="space-y-4 text-sm sm:text-base text-on-surface-variant leading-[1.65] type-body">
          <p>
            A deal needs different professionals at different phases. The Vendor Marketplace lists professionals by trade and service area, so when your project reaches the phase that needs an appraiser, attorney, or general contractor as examples, you find one right when the Project needs one.
          </p>
          <p>
            Vendors work inside PaperWorking with access limited to assigned work: they see the scope they&apos;re hired for, not your portfolio.
          </p>
        </div>
      </section>

      {/* ==========================================
          BLOCK 4 — Vendor categories (COPY-M4)
         ========================================== */}
      <section className="glass-card rounded-[24px] p-8 sm:p-12 space-y-6 border border-white/10 bg-white/[0.02]">
        <h3 className="text-xl font-semibold text-white tracking-tight">
          Vendor Categories
        </h3>
        <ol className="space-y-4 text-sm text-on-surface-variant leading-[1.65]">
          <li className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">1.</span>
            <div>
              <strong className="text-white font-semibold">Transactional &amp; Financial:</strong> mortgage lenders and brokers, title and escrow companies, appraisers, insurance providers.
            </div>
          </li>
          <li className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">2.</span>
            <div>
              <strong className="text-white font-semibold">Legal &amp; Advisory:</strong> real estate attorneys, 1031 exchange accommodators, CPAs and accountants.
            </div>
          </li>
          <li className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">3.</span>
            <div>
              <strong className="text-white font-semibold">Construction, Trades &amp; Maintenance:</strong> general contractors, specialty trades, inspectors and assessors, exterior and grounds crews.
            </div>
          </li>
          <li className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">4.</span>
            <div>
              <strong className="text-white font-semibold">Marketing, Staging &amp; Media:</strong> photographers and videographers, home stagers, signage and print.
            </div>
          </li>
          <li className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">5.</span>
            <div>
              <strong className="text-white font-semibold">Property Operations:</strong> cleaning, handyman services, security, waste management.
            </div>
          </li>
        </ol>
        <p className="text-xs sm:text-sm text-on-surface-variant/90 font-medium pt-2">
          Are you one of these professionals? A Vendor account puts your services in front of active investor projects in your area.
        </p>
      </section>

      {/* ==========================================
          BLOCK 5 — CTA (COPY-M5)
         ========================================== */}
      <section className="text-center space-y-6 pt-4 pb-12">
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
