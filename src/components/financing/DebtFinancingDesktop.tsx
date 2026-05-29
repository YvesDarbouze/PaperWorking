"use client";

import React, { useState } from "react";

export default function DebtFinancingDesktop() {
  const [loanAmount, setLoanAmount] = useState("1,200,000");
  const [annualRate, setAnnualRate] = useState("6.75");
  const [term, setTerm] = useState("15");

  return (
    <div className="flex flex-col gap-6 w-full h-full text-on-surface dark bg-[#0b141a]">
      {/* Summary Banner */}
      <section className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-8">
          <div>
            <h3 className="text-on-surface-variant text-[14px] font-semibold tracking-wide mb-1">REAL-TIME CALCULATION</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-on-surface-variant font-mono text-[24px] font-semibold">$</span>
              <span className="text-primary font-mono font-bold text-[36px] tracking-tighter">1,452,890.00</span>
            </div>
            <p className="text-on-surface-variant text-[14px] font-semibold">Total Cash to Close</p>
          </div>
          <div className="h-12 w-px bg-white/10"></div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <span className="text-on-surface-variant text-[14px] font-semibold">Monthly Payment</span>
            <span className="text-primary font-mono text-[14px] font-semibold">$8,432.12</span>
            <span className="text-on-surface-variant text-[14px] font-semibold">LTV Ratio</span>
            <span className="text-primary font-mono text-[14px] font-semibold">74.2%</span>
          </div>
        </div>
        <div className="relative z-10 flex gap-4">
          <button className="px-6 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-[14px] font-semibold">
            Export PDF
          </button>
          <button className="px-6 py-2 rounded-lg bg-primary text-[#00574d] font-bold shadow-[0_0_20px_-5px_rgba(87,241,219,0.3)] hover:opacity-90 transition-all text-[14px]">
            Finalize Term Sheet
          </button>
        </div>
      </section>

      {/* Configuration Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden min-h-[500px]">
        {/* Left Pane: Primary Inputs */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              <h4 className="text-[20px] font-semibold">Primary Loan Parameters</h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-on-surface-variant flex justify-between">
                  <span>Loan Amount</span>
                  <span className="text-[10px] text-primary/60 font-bold tracking-widest">REQUIRED</span>
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono">$</span>
                  <input
                    type="text"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-[#060f15]/80 border border-white/10 rounded-xl py-4 pl-8 pr-4 font-mono text-primary text-xl focus:border-primary focus:shadow-[inset_0_0_8px_rgba(87,241,219,0.1)] outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-on-surface-variant">Annual Rate (%)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={annualRate}
                      onChange={(e) => setAnnualRate(e.target.value)}
                      className="w-full bg-[#060f15]/80 border border-white/10 rounded-xl py-4 px-4 font-mono text-primary text-xl focus:border-primary focus:shadow-[inset_0_0_8px_rgba(87,241,219,0.1)] outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-on-surface-variant">Term (Years)</label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full bg-[#060f15]/80 border border-white/10 rounded-xl py-4 px-4 font-mono text-primary text-xl focus:border-primary focus:shadow-[inset_0_0_8px_rgba(87,241,219,0.1)] outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="30">30</option>
                    <option value="15">15</option>
                    <option value="10">10</option>
                    <option value="5">5</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-6 h-6 rounded-md border-2 border-primary/30 flex items-center justify-center group-hover:border-primary transition-colors bg-[#182127]">
                    <span className="material-symbols-outlined text-sm text-primary">check</span>
                  </div>
                  <span className="text-on-surface-variant text-[14px] font-semibold">Amortized Structure</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-6 h-6 rounded-md border-2 border-primary/30 flex items-center justify-center group-hover:border-primary transition-colors"></div>
                  <span className="text-on-surface-variant text-[14px] font-semibold">Interest Only Period</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl p-6">
            <h4 className="text-[20px] font-semibold mb-4">Risk Profile</h4>
            <div className="h-32 w-full bg-[#060f15]/50 rounded-xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="text-center">
                  <p className="text-xs text-on-surface-variant">DSCR</p>
                  <p className="font-mono text-primary text-lg">1.25x</p>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div className="text-center">
                  <p className="text-xs text-on-surface-variant">Yield On Cost</p>
                  <p className="font-mono text-primary text-lg">8.4%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Advanced Leverage */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6 overflow-hidden">
          <div className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                <h4 className="text-[20px] font-semibold">Advanced Leverage Mechanics</h4>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest">MODE: GRANULAR</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Fees Disclosure Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between cursor-pointer group">
                  <h5 className="text-[14px] font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm transition-transform">keyboard_arrow_down</span>
                    Lender &amp; Origination Fees
                  </h5>
                  <span className="text-on-surface-variant font-mono">$24,000.00</span>
                </div>
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs text-on-surface-variant">Origination Points (%)</label>
                      <input type="text" defaultValue="1.50" className="w-full bg-[#060f15]/60 border border-white/5 rounded-lg py-3 px-4 font-mono text-on-surface focus:border-primary outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-on-surface-variant">Processing Fee ($)</label>
                      <input type="text" defaultValue="1,500.00" className="w-full bg-[#060f15]/60 border border-white/5 rounded-lg py-3 px-4 font-mono text-on-surface focus:border-primary outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Soft Costs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between cursor-pointer group">
                  <h5 className="text-[14px] font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">keyboard_arrow_right</span>
                    Soft Costs &amp; Third Party Fees
                  </h5>
                  <span className="text-on-surface-variant font-mono">$12,450.00</span>
                </div>
              </div>

              {/* Leverage Optimization Bento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#060f15]/40 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-on-surface-variant mb-2">Lender Credit Allocation</p>
                  <div className="flex items-center gap-4">
                    <input type="range" className="flex-1 accent-primary" />
                    <span className="font-mono text-primary">-$1,200</span>
                  </div>
                </div>
                <div className="bg-[#060f15]/40 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-on-surface-variant mb-2">Interest Rate Buydown</p>
                  <div className="flex items-center gap-4">
                    <input type="range" className="flex-1 accent-primary" />
                    <span className="font-mono text-primary">+0.25 pts</span>
                  </div>
                </div>
              </div>

              {/* Scenario Benchmark */}
              <div className="bg-[#060f15]/20 rounded-xl p-4 border border-white/5">
                <h5 className="text-xs font-bold text-primary mb-4 tracking-widest uppercase">Scenario Benchmark</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-on-surface-variant">Conservative (5.5%)</span>
                    <div className="h-1 flex-1 mx-4 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20 w-[40%]"></div>
                    </div>
                    <span className="text-sm font-mono">$1.2M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-on-surface-variant">Aggressive (7.2%)</span>
                    <div className="h-1 flex-1 mx-4 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/40 w-[85%]"></div>
                    </div>
                    <span className="text-sm font-mono">$1.8M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Footer Stats */}
            <div className="p-6 bg-[#141d23]/40 grid grid-cols-3 gap-4 border-t border-white/10">
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Net Loan Proceeds</p>
                <p className="font-mono text-lg text-on-surface">$1,176,000</p>
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Eff. Borrowing Cost</p>
                <p className="font-mono text-lg text-on-surface">6.92%</p>
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Total Transaction Cost</p>
                <p className="font-mono text-lg text-on-surface">$36,450</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
