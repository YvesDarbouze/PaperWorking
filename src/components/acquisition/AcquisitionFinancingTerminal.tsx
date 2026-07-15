"use client";

import React, { useState } from "react";

export default function AcquisitionFinancingTerminal() {
  const [purchasePrice, setPurchasePrice] = useState<number>(12500000);
  const [closingCostPct, setClosingCostPct] = useState<number>(1.5);
  const [capexReserves, setCapexReserves] = useState<number>(450000);
  
  const [ltv, setLtv] = useState<number>(65);
  const [interestRate, setInterestRate] = useState<number>(6.75);
  const [loanTerm, setLoanTerm] = useState<number>(10);
  const [amortization, setAmortization] = useState<string>("30 Year Amortization");
  const [originationFeePct, setOriginationFeePct] = useState<number>(1);

  // Calculations
  const closingCostAmt = (purchasePrice * closingCostPct) / 100;
  const totalAcquisitionCost = purchasePrice + closingCostAmt + capexReserves;
  
  const loanAmount = (purchasePrice * ltv) / 100;
  const originationFeeAmt = (loanAmount * originationFeePct) / 100;
  
  // Approximate debt service
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = 30 * 12; // Assume 30 year am
  const monthlyPayment = monthlyRate > 0 
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  
  const annualDebtService = monthlyPayment * 12;
  const equityRequired = totalAcquisitionCost - loanAmount;

  const estimatedNOI = purchasePrice * 0.07345;
  const dscr = annualDebtService > 0 ? estimatedNOI / annualDebtService : 0;
  const debtYield = loanAmount > 0 ? (estimatedNOI / loanAmount) * 100 : 0;

  const circumference = 251.32; // 2 * pi * 40
  const debtStrokeDasharray = `${(ltv / 100) * circumference} ${circumference}`;
  const equityStrokeDasharray = `${((100 - ltv) / 100) * circumference} ${circumference}`;
  const equityStrokeDashoffset = -((ltv / 100) * circumference);

  const formatCurrency = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="text-on-surface dark flex flex-col w-full pb-32">
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <nav className="flex text-[12px] font-semibold text-primary mb-2 gap-2 items-center">
            <span>Portfolio</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface-variant">Acquisition Terminal</span>
          </nav>
          <h2 className="text-[32px] md:text-[48px] font-bold text-on-surface tracking-tight leading-tight">Acquisition &amp; Financing Terminal</h2>
          <p className="text-on-surface-variant opacity-70 mt-1">Project ID: PW-2024-0892 | Status: Underwriting</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg border border-white/10 text-on-surface text-[14px] font-medium flex items-center gap-2 hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">ios_share</span> Export PDF
          </button>
          <button className="px-4 py-2 rounded-lg border border-white/10 text-on-surface text-[14px] font-medium flex items-center gap-2 hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">history</span> Revision Logs
          </button>
        </div>
      </div>

      {/* TERMINAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_340px] gap-6">
        
        {/* COLUMN 1: ACQUISITION */}
        <div className="space-y-6">
          <section className="bg-[#0d0a0b]/60 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="p-2 bg-primary/10 rounded-lg">
                <span className="material-symbols-outlined text-primary">payments</span>
              </span>
              <h3 className="text-[20px] font-semibold text-on-surface">Acquisition Details</h3>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-on-surface-variant block">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                  <input 
                    type="number"
                    className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 pl-8 pr-4 text-on-surface font-bold text-lg transition-all outline-none" 
                    value={purchasePrice} 
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Closing Costs (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 px-4 text-on-surface transition-all outline-none" 
                    value={closingCostPct}
                    onChange={(e) => setClosingCostPct(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Closing Est. ($)</label>
                  <input 
                    type="text"
                    className="w-full bg-[#262328]/20 border border-white/5 rounded-lg py-3 px-4 text-on-surface-variant cursor-not-allowed" 
                    disabled 
                    value={formatCurrency(closingCostAmt)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-on-surface-variant block">CapEx Reserves</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                  <input 
                    type="number"
                    className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 pl-8 pr-4 text-on-surface transition-all outline-none" 
                    value={capexReserves}
                    onChange={(e) => setCapexReserves(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] font-medium text-on-surface-variant">Total Acquisition Cost</span>
                  <span className="text-[20px] font-bold text-primary">${formatCurrency(totalAcquisitionCost)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#0d0a0b]/60 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[14px] font-medium text-on-surface-variant uppercase tracking-wider">Due Diligence Timeline</h4>
              <span className="material-symbols-outlined text-on-surface-variant opacity-50">calendar_month</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d0a0b] border border-white/5">
                <span className="text-[14px] text-on-surface-variant">Inspection Period Ends</span>
                <span className="text-[14px] font-medium text-on-surface">Oct 24, 2024</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d0a0b] border border-white/5">
                <span className="text-[14px] text-on-surface-variant">Hard Money Deposit</span>
                <span className="text-[14px] font-medium text-on-surface">Oct 28, 2024</span>
              </div>
            </div>
          </section>
        </div>

        {/* COLUMN 2: DEBT SETUP */}
        <div className="space-y-6">
          <section className="bg-[#0d0a0b]/60 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="p-2 bg-[#7A9EAA]/10 rounded-lg">
                <span className="material-symbols-outlined text-[#7A9EAA]">account_balance</span>
              </span>
              <h3 className="text-[20px] font-semibold text-on-surface">Debt Structure</h3>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Loan-to-Value (LTV)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 px-4 text-on-surface font-bold transition-all outline-none" 
                      value={ltv}
                      onChange={(e) => setLtv(Number(e.target.value))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Loan Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                    <input 
                      type="text"
                      className="w-full bg-[#262328]/20 border border-white/5 rounded-lg py-3 pl-8 pr-4 text-on-surface-variant cursor-not-allowed" 
                      value={formatCurrency(loanAmount)}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Interest Rate</label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 px-4 text-on-surface transition-all outline-none" 
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Loan Term (Years)</label>
                  <input 
                    type="number"
                    className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 px-4 text-on-surface transition-all outline-none" 
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-on-surface-variant block">Amortization Period</label>
                <select 
                  className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 px-4 text-on-surface appearance-none transition-all outline-none"
                  value={amortization}
                  onChange={(e) => setAmortization(e.target.value)}
                >
                  <option>25 Year Amortization</option>
                  <option>30 Year Amortization</option>
                  <option>Interest Only (Full Term)</option>
                  <option>Custom Schedule</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Origination Fee (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="w-full bg-[#0d0a0b]/80 border border-[#859490]/30 focus:border-primary focus:shadow-[inset_0_0_8px_rgba(69,73,85,0.15)] rounded-lg py-3 px-4 text-on-surface transition-all outline-none" 
                    value={originationFeePct}
                    onChange={(e) => setOriginationFeePct(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-on-surface-variant block">Origination Fee ($)</label>
                  <input 
                    type="text"
                    className="w-full bg-[#262328]/20 border border-white/5 rounded-lg py-3 px-4 text-on-surface-variant cursor-not-allowed" 
                    disabled 
                    value={formatCurrency(originationFeeAmt)} 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] font-medium text-on-surface-variant">Debt Service (Annual)</span>
                  <span className="text-[20px] font-bold text-[#7A9EAA]">${formatCurrency(annualDebtService)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* COLUMN 3: CAPITAL STACK ANALYTICS */}
        <div className="space-y-6">
          <section className="bg-[#0d0a0b]/60 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl p-6 flex flex-col items-center">
            <h4 className="text-[14px] font-medium text-on-surface-variant uppercase tracking-wider mb-8 w-full">Capital Stack Analysis</h4>
            
            {/* Donut Chart Visualization */}
            <div className="relative w-48 h-48 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Debt Section */}
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#7A9EAA" strokeDasharray={debtStrokeDasharray} strokeWidth="12"></circle>
                {/* Equity Section */}
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#454955" strokeDasharray={equityStrokeDasharray} strokeDashoffset={equityStrokeDashoffset} strokeWidth="12"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[12px] font-medium text-on-surface-variant uppercase">Total Basis</span>
                <span className="text-[20px] font-bold text-on-surface">${(totalAcquisitionCost / 1000000).toFixed(1)}M</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#7A9EAA]"></div>
                  <span className="text-[14px] text-on-surface-variant">Senior Debt</span>
                </div>
                <span className="text-[14px] font-medium text-on-surface">${(loanAmount / 1000000).toFixed(3)}M ({Math.round(ltv)}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#454955]"></div>
                  <span className="text-[14px] text-on-surface-variant">Equity Required</span>
                </div>
                <span className="text-[14px] font-medium text-on-surface">${(equityRequired / 1000000).toFixed(3)}M ({100 - Math.round(ltv)}%)</span>
              </div>
            </div>
          </section>

          <section className="bg-[#0d0a0b]/60 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl p-6">
            <h4 className="text-[14px] font-medium text-on-surface-variant uppercase tracking-wider mb-4">Leverage Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0d0a0b] border border-white/5 rounded-lg">
                <p className="text-[12px] text-on-surface-variant opacity-60 mb-1">DSCR (Est.)</p>
                <p className="text-[20px] font-bold text-on-surface">{dscr.toFixed(2)}x</p>
              </div>
              <div className="p-4 bg-[#0d0a0b] border border-white/5 rounded-lg">
                <p className="text-[12px] text-on-surface-variant opacity-60 mb-1">Debt Yield</p>
                <p className="text-[20px] font-bold text-on-surface">{debtYield.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-1">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="text-[14px] font-medium">Leverage Compliant</span>
              </div>
              <p className="text-[14px] text-on-surface-variant leading-tight">Current LTV is within lender risk parameters for Class-A industrial assets.</p>
            </div>
          </section>
        </div>

      </div>

      {/* FOOTER ACTION BAR */}
      <div className="mt-12 flex flex-col md:flex-row justify-between items-center p-6 bg-[#0d0a0b]/60 backdrop-blur-3xl rounded-xl border border-primary/20 gap-4">
        <div className="flex items-center gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined text-primary">info</span>
          <p className="text-[14px]">All changes are saved to the <span className="text-on-surface font-medium">Underwriting Scratchpad</span> in real-time.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <button className="px-6 py-3 rounded-xl border border-white/10 text-on-surface text-[14px] font-medium hover:bg-white/5 transition-colors w-full sm:w-auto">
            Discard Changes
          </button>
          <button className="bg-primary hover:brightness-110 text-[#454955] shadow-[0_0_20px_-5px_rgba(69,73,85,0.5)] px-10 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all w-full sm:w-auto">
            Save Acquisition Data &amp; Continue
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
