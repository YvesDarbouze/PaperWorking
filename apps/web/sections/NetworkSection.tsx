'use client';

import React from 'react';
import Link from 'next/link';

export default function NetworkSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 border-t border-white/5 bg-[#0d0a0b]">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Come for the Execution Tools. Stay for the Network.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-white/70">
            PaperWorking subscribers get exclusive access to an active network engineered for serious real estate operators, capital partners, and specialized vendors.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Deal Marketplace */}
          <div className="glass-card flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-[12px] transition-all duration-300 hover:border-white/20">
            <div>
              <div className="mb-6 flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="material-symbols-outlined text-[28px] text-[#00DD94]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  handshake
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">The Deal Marketplace</h3>
              <p className="text-sm leading-relaxed text-white/60 mb-6">
                helps investors crowdfund deals and gauge opportunities to partner with other real investors.
              </p>
            </div>
            <div>
              <Link
                href="/login?mode=signup&accountType=investor&redirectTo=/dashboard/deals"
                className="inline-flex items-center gap-2 rounded-full border border-[#00DD94]/45 px-6 py-3 text-sm font-semibold text-[#00DD94] transition-all duration-200 hover:bg-[#00DD94]/10"
              >
                Browse Deal Marketplace
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Vendor Marketplace */}
          <div className="glass-card flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-[12px] transition-all duration-300 hover:border-white/20">
            <div>
              <div className="mb-6 flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="material-symbols-outlined text-[28px] text-[#00DD94]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  storefront
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">The Vendor Marketplace</h3>
              <p className="text-sm leading-relaxed text-white/60 mb-6">
                helps real estate investors find vendors when they need them. Appraisers, contractors, lawyers, and even bankers can list their services, and PaperWorking will recommend them to investors at the moment they need them.
              </p>
            </div>
            <div>
              <Link
                href="/login?mode=signup&accountType=vendor&redirectTo=/vendor-portal"
                className="inline-flex items-center gap-2 rounded-full bg-[#00DD94] px-6 py-3 text-sm font-semibold text-[#0a0a0f] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)] transition-all duration-200 hover:opacity-90"
              >
                List Services as a Vendor ($39/mo)
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-xs leading-relaxed text-white/40 font-[family-name:var(--font-jetbrains-mono)]">
            Note: Automatic access included for all Investor and Investment Team accounts.
          </p>
        </div>
      </div>
    </section>
  );
}
