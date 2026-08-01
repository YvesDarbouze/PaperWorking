'use client';

import React from 'react';
import Link from 'next/link';

export default function MarketplacesClient() {
  return (
    <div className="space-y-24 max-w-5xl mx-auto">
      {/* ==========================================
          BLOCK 1 — Hero
         ========================================== */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary type-eyebrow font-mono">
            Two marketplaces, one network
          </span>
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight type-display text-4xl sm:text-5xl font-extrabold">
          Come for the tools. Stay for the community.
        </h1>
        <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed type-body-lg">
          PaperWorking subscribers run real deals through the same four phases you do. The marketplaces connect them: projects that need capital and projects that need professionals, all on live project data.
        </p>
      </section>

      {/* ==========================================
          BLOCK 2 — Deal Marketplace
         ========================================== */}
      <section className="glass-card rounded-2xl p-8 sm:p-12 space-y-8 border border-white/10 bg-white/[0.02]">
        <div className="space-y-4">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary font-mono type-eyebrow">
            Deal Marketplace
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight type-h2">
            Put your deal in front of investors who are looking.
          </h2>
          <div className="space-y-4 text-sm sm:text-base text-on-surface-variant leading-relaxed type-body">
            <p>
              Create a Project, run it through the Deal Analyzer, and list it. Every listed deal carries its own underwriting (cap rate, cash-on-cash, projected IRR), so interested investors see the numbers, not a pitch.
            </p>
            <p>
              Set your funding target and watch pledges accumulate against it. Deals that match your criteria arrive in your inbox.
            </p>
            <p>
              Closings happen where they always have: between the parties, outside PaperWorking. Log the outcome and the Project record stays complete.
            </p>
          </div>
        </div>

        {/* Bullets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-bold text-white font-mono">Analyzer-backed listings</h3>
            <p className="text-xs text-on-surface-variant/80">Every deal shows its underwriting.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-bold text-white font-mono">Interest, visualized</h3>
            <p className="text-xs text-on-surface-variant/80">Pledges tracked against your target in real time.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-bold text-white font-mono">Inbox matchmaking</h3>
            <p className="text-xs text-on-surface-variant/80">Deals that fit your criteria come to you.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <h3 className="text-xs font-bold text-white font-mono">Close off-platform, log the result</h3>
            <p className="text-xs text-on-surface-variant/80">The Project keeps a complete history.</p>
          </div>
        </div>

        {/* Mandatory 3-Sentence Compliance Block (Verbatim directly below Deal Marketplace section) */}
        <div className="pt-6 border-t border-white/10">
          <p className="text-xs text-on-surface-variant/70 leading-relaxed font-mono select-none">
            PaperWorking facilitates introductions and interest tracking only. No funds, securities, or ownership interests are offered, sold, or transferred through the platform. All transactions occur outside PaperWorking, directly between the parties.
          </p>
        </div>
      </section>

      {/* ==========================================
          BLOCK 3 — Vendor Marketplace
         ========================================== */}
      <section className="glass-card rounded-2xl p-8 sm:p-12 space-y-6 border border-white/10 bg-white/[0.02]">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary font-mono type-eyebrow">
          Vendor Marketplace
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight type-h2">
          Find the right professional when the deal needs them.
        </h2>
        <div className="space-y-4 text-sm sm:text-base text-on-surface-variant leading-relaxed type-body">
          <p>
            A deal needs different professionals at different phases. The Vendor Marketplace lists them by trade and service area. When a Project reaches the phase that calls for an appraiser, an attorney, or a general contractor, you find one without leaving the platform.
          </p>
          <p>
            Vendors work inside PaperWorking with access limited to assigned work: they see the scope they&apos;re hired for, not your portfolio.
          </p>
        </div>
      </section>

      {/* ==========================================
          BLOCK 4 — Vendor categories
         ========================================== */}
      <section className="glass-card rounded-2xl p-8 sm:p-12 space-y-6 border border-white/10 bg-white/[0.02]">
        <h3 className="text-xl font-bold text-white tracking-tight">
          Vendor Categories
        </h3>
        <ol className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">1.</span>
            <div>
              <strong className="text-white font-semibold">Transactional &amp; Financial:</strong> mortgage lenders and brokers, title and escrow companies, appraisers, insurance providers.
            </div>
          </li>
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">2.</span>
            <div>
              <strong className="text-white font-semibold">Legal &amp; Advisory:</strong> real estate attorneys, 1031 exchange accommodators, CPAs and accountants.
            </div>
          </li>
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">3.</span>
            <div>
              <strong className="text-white font-semibold">Construction, Trades &amp; Maintenance:</strong> general contractors, specialty trades, inspectors and assessors, exterior and grounds crews.
            </div>
          </li>
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
            <span className="font-mono text-primary font-bold">4.</span>
            <div>
              <strong className="text-white font-semibold">Marketing, Staging &amp; Media:</strong> photographers and videographers, home stagers, signage and print.
            </div>
          </li>
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
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
          BLOCK 5 — CTA
         ========================================== */}
      <section className="text-center space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link
            href="/pricing"
            className="luminous-button inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150 type-cta"
          >
            Browse the marketplaces
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 text-on-surface font-label-md text-label-md hover:border-primary/40 hover:text-primary transition-all duration-150 type-cta"
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
