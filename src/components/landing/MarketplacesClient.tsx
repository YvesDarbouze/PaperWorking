'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, TrendingUp, Layers, Users, Star, MapPin, Building, ShieldCheck } from 'lucide-react';

type Tab = 'deal' | 'vendor';

export default function MarketplacesClient() {
  const [activeTab, setActiveTab] = useState<Tab>('deal');

  return (
    <div className="space-y-12">
      {/* Sleek Tab controls */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('deal')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'deal'
                ? 'bg-primary text-[#FDFFFC] shadow-lg shadow-primary/20'
                : 'bg-transparent text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Deal Marketplace</span>
          </button>
          <button
            onClick={() => setActiveTab('vendor')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'vendor'
                ? 'bg-primary text-[#FDFFFC] shadow-lg shadow-primary/20'
                : 'bg-transparent text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Vendor Marketplace</span>
          </button>
        </div>
      </div>

      {/* Slide Transition Area */}
      <div className="min-h-[550px] relative">
        <AnimatePresence mode="wait">
          {activeTab === 'deal' ? (
            <motion.div
              key="deal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
            >
              {/* Deal Copy (Left side) */}
              <div className="lg:col-span-6 space-y-6">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary px-2.5 py-1 rounded bg-primary/10 border border-primary/20 inline-block font-mono">
                  Intent-Only Network
                </span>
                
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Put Your Deal in Front of Investors Who Are Actually Looking.
                </h2>
                
                <p className="text-sm text-on-surface-variant leading-relaxed font-normal">
                  PaperWorking is building a network of serious real estate investors who are always hunting for the next good Deal. Create a Project, run it through the Deal Analyzer, upload photos of the property — then share it with your colleagues or list it on the Deal Marketplace. Interested investors can signal exactly how much of your Deal they'd want in, and you see the interest build in real time. When a Deal comes together, the closing happens where it always has — between the parties, outside PaperWorking — and you log the outcome so your Project record stays complete. When opportunities match what you're looking for, we deliver them to your inbox.
                </p>

                {/* Bullets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary shrink-0" />
                      Analyzer-Backed Listings
                    </h3>
                    <p className="text-[11px] text-on-surface-variant/70 leading-normal">
                      Every listed Deal carries its underwriting: Cap Rate, COC, projected IRR.
                    </p>
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                      Interest, Visualized
                    </h3>
                    <p className="text-[11px] text-on-surface-variant/70 leading-normal">
                      Set the share of the Deal you're opening up and watch investor interest accumulate against your target.
                    </p>
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      Close Offline, Log the Result
                    </h3>
                    <p className="text-[11px] text-on-surface-variant/70 leading-normal">
                      Deals close between the parties, off-platform; record the outcome and your Project moves forward with a complete history.
                    </p>
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      Matchmaking
                    </h3>
                    <p className="text-[11px] text-on-surface-variant/70 leading-normal">
                      Deals that fit your criteria arrive in your inbox as they're listed.
                    </p>
                  </div>
                </div>

                {/* CTA and Disclosure */}
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/pricing"
                      className="px-6 py-3 bg-primary text-[#FDFFFC] font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 text-center"
                    >
                      Browse Dealflow
                    </Link>
                    <Link
                      href="/login"
                      className="px-6 py-3 bg-white/5 border border-white/5 text-on-surface-variant hover:text-white font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all text-center"
                    >
                      Underwrite & List Deal
                    </Link>
                  </div>

                  {/* Mandatory Disclosure Line (Verbatim) */}
                  <p className="text-[11px] text-on-surface-variant/50 leading-relaxed font-light font-mono select-none">
                    PaperWorking facilitates introductions and interest tracking only. No funds, securities, or ownership interests are offered, sold, or transferred through the platform. All transactions occur outside PaperWorking, directly between the parties.
                  </p>
                </div>
              </div>

              {/* Deal Graphic (Right side) */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-[450px] rounded-2xl border border-white/10 bg-pw-night-bg shadow-2xl p-6 relative overflow-hidden font-hanken">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />
                  
                  {/* Mock card preview */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-white">Skyline Heights Acquisition</h4>
                      <p className="text-xs text-[#6B6870] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> Miami, FL
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded border border-pw-success-border bg-pw-success-container text-[9px] font-bold text-pw-success uppercase tracking-widest">
                      Active Target
                    </span>
                  </div>

                  {/* Underwriting metrics strip */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                      <div className="text-[10px] text-on-surface-variant/40 uppercase">Cap Rate</div>
                      <div className="text-base font-bold text-white mt-1">6.4%</div>
                    </div>
                    <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                      <div className="text-[10px] text-on-surface-variant/40 uppercase">CoC Return</div>
                      <div className="text-base font-bold text-white mt-1">9.8%</div>
                    </div>
                    <div className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                      <div className="text-[10px] text-on-surface-variant/40 uppercase">Proj. IRR</div>
                      <div className="text-base font-bold text-white mt-1">14.5%</div>
                    </div>
                  </div>

                  {/* Non-binding capital pledge tracker */}
                  <div className="space-y-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white">Pledged Interest</span>
                      <span className="font-mono text-primary">$450,000 / $800,000</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: '56.25%' }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-on-surface-variant/60">
                      <span>5 Pledges</span>
                      <span>56% of allocation</span>
                    </div>
                  </div>

                  {/* Illustrative demo data label */}
                  <div className="mt-4 pt-3 border-t border-white/5 text-center">
                    <span className="inline-block text-[9px] text-on-surface-variant/35 uppercase tracking-wider select-none">
                      Illustrative Demo Data
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="vendor"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
            >
              {/* Vendor Copy (Left side) */}
              <div className="lg:col-span-6 space-y-6">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary px-2.5 py-1 rounded bg-primary/10 border border-primary/20 inline-block font-mono">
                  B2B Trade Network
                </span>
                
                <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Investors Need You at Exactly the Right Moment. Be There.
                </h2>
                
                <p className="text-sm text-on-surface-variant leading-relaxed font-normal">
                  PaperWorking's project management tools know when an investor hits the milestone that needs your trade — inspection, rehab, staging, closing. Subscribe as a Vendor and get connected to real estate investors near you at the moment they need your service, inside the same workspace where their Projects live. The same way conversations happen on social platforms, PaperWorking lets you engage serious investors in your area — with context, not cold calls.
                </p>

                {/* Bullets */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-white">Milestone-Matched Leads</h3>
                      <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                        Surface to investors when their Project timeline calls for your trade.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-white">Local by Default</h3>
                      <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                        Reach investors working Deals in your service area.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-white">Quotes in Context</h3>
                      <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                        Receive and respond to quote requests inside the Project, with full bidirectional sync.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-6 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/for-pros"
                      className="px-6 py-3 bg-primary text-[#FDFFFC] font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 text-center"
                    >
                      Join the Marketplace
                    </Link>
                  </div>
                </div>
              </div>

              {/* Vendor Graphic (Right side) */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-[450px] rounded-2xl border border-white/10 bg-pw-night-bg shadow-2xl p-6 relative overflow-hidden font-hanken">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />
                  
                  {/* Mock profile cards grid */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-lg bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-orange-400 text-sm font-extrabold uppercase">
                        C
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-white">Apex Construction Partners</h4>
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 stroke-none" /> 4.9
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant/60 flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" /> Denver Metro Area
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-lg bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400 text-sm font-extrabold uppercase">
                        I
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-white">Rocky Mountain Inspection</h4>
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 stroke-none" /> 4.8
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant/60 flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" /> Boulder & Front Range
                        </p>
                      </div>
                    </div>

                    {/* Active Bid mock */}
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active Quote Request</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">Hold Phase #3</span>
                      </div>
                      <div className="text-xs text-white">Sewer Line Scope & Inspection bid submitted</div>
                      <div className="flex justify-between items-center text-[10px] text-on-surface-variant/70 font-mono">
                        <span>Bid Amount: $1,200</span>
                        <span>Status: Bid Sent (Synced)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
