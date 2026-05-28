'use client';

import React from 'react';
import Link from 'next/link';

export default function HowItWorks() {
  return (
    <div className="relative z-10 pt-32 pb-24 px-6 max-w-[1200px] mx-auto antialiased">
      {/* Hero Section */}
      <header className="text-center mb-24">
        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded border border-primary/20 bg-primary/5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          <span className="font-mono text-[11px] font-semibold text-primary uppercase tracking-[0.1em]">v2.4.0_STABLE_RELEASE</span>
        </div>
        <h1 className="text-[48px] font-bold text-white mb-6 leading-[1.1] tracking-tight" style={{ textShadow: '0 0 15px rgba(45, 212, 191, 0.4)' }}>
          The Real Estate Investment<br />
          <span className="text-primary italic">Operating System</span>
        </h1>
        <p className="text-[18px] text-on-surface-variant max-w-2xl mx-auto opacity-80 leading-relaxed font-sans">
          Stop chasing down deal documents in endless email threads. We architected a system that organizes your deal flow from finding the property to cashing out. Every dollar tracked. Every risk mitigated. Save time and close more deals.
        </p>
      </header>

      {/* Four-Phase Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
        {/* Phase 1: Acquisition */}
        <div className="bg-gradient-to-br from-[#141d23b3] to-[#060f1566] backdrop-blur-md border border-primary/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] hover:border-primary/30 hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.15)] hover:-translate-y-0.5 transition-all duration-300 p-6 rounded-lg flex flex-col h-full border-l-2 border-l-primary/40">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-primary text-[11px] font-bold">01_ACQUISITION</span>
            <span className="material-symbols-outlined text-primary/40 text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>add_box</span>
          </div>
          <h3 className="font-mono text-sm font-bold text-white mb-3 tracking-wide">FIND & FUND</h3>
          <div className="flex-grow space-y-3 mb-6">
            <p className="text-[13px] text-on-surface-variant leading-relaxed font-sans">
              Centralize deal sourcing and syndicate commitments. Stop losing leads to competitors and eliminate email-based document chasing.
            </p>
            <ul className="text-[11px] font-mono text-primary/70 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary/40 rounded-full"></span>
                OFFER_GEN_AUTO
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-primary/40 rounded-full"></span>
                LP_COMMIT_TRACKER
              </li>
            </ul>
          </div>
          {/* UI Snippet */}
          <div className="bg-black/40 rounded border border-white/5 p-3 font-mono text-[10px]">
            <div className="flex justify-between text-white/30 mb-2 border-b border-white/5 pb-1 uppercase">
              <span>Source</span>
              <span>Confidence</span>
            </div>
            <div className="flex justify-between text-primary/80 mb-1">
              <span>Direct_Mail</span>
              <span>84.2%</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary/40 w-[84%]"></div>
            </div>
          </div>
        </div>

        {/* Phase 2: Purchase */}
        <div className="bg-gradient-to-br from-[#141d23b3] to-[#060f1566] backdrop-blur-md border border-primary/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] hover:border-primary/30 hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.15)] hover:-translate-y-0.5 transition-all duration-300 p-6 rounded-lg flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-white/40 text-[11px] font-bold">02_PURCHASE</span>
            <span className="material-symbols-outlined text-white/20 text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>account_balance</span>
          </div>
          <h3 className="font-mono text-sm font-bold text-white mb-3 tracking-wide">COMPLIANCE VAULT</h3>
          <div className="flex-grow space-y-3 mb-6">
            <p className="text-[13px] text-on-surface-variant leading-relaxed font-sans">
              Secure loan docs and title commitments in a single source of truth. Manage closing deadlines and avoid costly delays.
            </p>
            <ul className="text-[11px] font-mono text-white/40 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                CONTINGENCY_ALERTS
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                HUD1_RECONCILIATION
              </li>
            </ul>
          </div>
          {/* UI Snippet */}
          <div className="bg-black/40 rounded border border-white/5 p-3 flex items-center justify-between">
            <div className="space-y-1">
              <div className="w-16 h-1.5 bg-white/10 rounded"></div>
              <div className="w-10 h-1.5 bg-white/5 rounded"></div>
            </div>
            <div className="flex gap-1">
              <span className="material-symbols-outlined text-primary text-[14px]">check_circle</span>
              <span className="material-symbols-outlined text-white/20 text-[14px]">pending</span>
            </div>
          </div>
        </div>

        {/* Phase 3: Hold */}
        <div className="bg-gradient-to-br from-[#141d23b3] to-[#060f1566] backdrop-blur-md border border-primary/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] hover:border-primary/30 hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.15)] hover:-translate-y-0.5 transition-all duration-300 p-6 rounded-lg flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-white/40 text-[11px] font-bold">03_HOLD</span>
            <span className="material-symbols-outlined text-white/20 text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>query_stats</span>
          </div>
          <h3 className="font-mono text-sm font-bold text-white mb-3 tracking-wide">MARGIN PROTECTION</h3>
          <div className="flex-grow space-y-3 mb-6">
            <p className="text-[13px] text-on-surface-variant leading-relaxed font-sans">
              Track rehab costs and daily burn rates in real time. Never go over budget blindly and protect your projected ROI.
            </p>
            <ul className="text-[11px] font-mono text-white/40 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                BURN_RATE_CALC
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                TIME_VALUE_MAP
              </li>
            </ul>
          </div>
          {/* UI Snippet */}
          <div className="bg-black/40 rounded border border-white/5 p-3">
            <div className="flex justify-between font-mono text-[9px] text-white/30 mb-2">
              <span>EST_HOLD</span>
              <span className="text-white/60">42D / 60D</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary/30 w-[70%]"></div>
            </div>
          </div>
        </div>

        {/* Phase 4: Exit */}
        <div className="bg-gradient-to-br from-[#141d23b3] to-[#060f1566] backdrop-blur-md border border-primary/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)] hover:border-primary/30 hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.15)] hover:-translate-y-0.5 transition-all duration-300 p-6 rounded-lg flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-white/40 text-[11px] font-bold">04_EXIT</span>
            <span className="material-symbols-outlined text-white/20 text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>payments</span>
          </div>
          <h3 className="font-mono text-sm font-bold text-white mb-3 tracking-wide">RECONCILIATION</h3>
          <div className="flex-grow space-y-3 mb-6">
            <p className="text-[13px] text-on-surface-variant leading-relaxed font-sans">
              Instant calculation of actual ROI, IRR, and cash-on-cash. Automatic, clean tax documentation and partner distributions.
            </p>
            <ul className="text-[11px] font-mono text-white/40 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                AUTO_RECON_ENGINE
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                DIST_K1_AUTO
              </li>
            </ul>
          </div>
          {/* UI Snippet */}
          <div className="bg-black/40 rounded border border-white/5 p-3 flex justify-between items-center">
            <span className="font-mono text-[10px] text-white/40">ROI_ACTUAL</span>
            <span className="font-mono text-[12px] font-bold text-primary tracking-tight">28.4% ↑</span>
          </div>
        </div>
      </section>

      {/* Risk Mitigation Section */}
      <section className="bg-[#141d23] rounded-xl overflow-hidden border border-white/5 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-center">
          <div className="p-12 lg:w-3/5">
            <h2 className="text-[32px] font-bold text-white mb-6 leading-tight">
              Not a project management tool.<br />
              <span className="text-primary/90">A risk mitigation platform.</span>
            </h2>
            <p className="text-[16px] text-on-surface-variant mb-8 max-w-xl leading-relaxed opacity-80 font-sans">
              Spreadsheets break. PaperWorking scales. By centralizing every data point from acquisition to exit, we eliminate the blind spots that eat into your margins. Stop bleeding money and start treating your investments like a professional business.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Link href="/register" className="bg-primary text-[#003731] font-mono text-[13px] font-bold px-8 py-3 rounded hover:bg-primary/90 transition-all shadow-[0_0_15px_-3px_rgba(45,212,191,0.5)] active:scale-[0.98]">
                DEPLOY_SYSTEM
              </Link>
              <div className="font-mono text-[11px] text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary/60 text-[16px]">shield_locked</span>
                SECURE_ACCESS_14D_TRIAL
              </div>
            </div>
          </div>
          <div className="lg:w-2/5 h-full min-h-[300px] bg-black/30 border-l border-white/5 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-64 h-64 border border-primary/40 rounded-full animate-[spin_20s_linear_infinite]"></div>
              <div className="absolute w-48 h-48 border border-white/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
            </div>
            <div className="relative z-10 w-40 h-40 bg-[#0b141a] rounded-full border border-primary/20 flex items-center justify-center shadow-[0_0_50px_-10px_rgba(45,212,191,0.2)]">
              <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
