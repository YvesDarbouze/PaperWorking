"use client";

import React, { useState, useEffect } from "react";

export default function DebtFinancingAdvanced() {
  const [loanAmount, setLoanAmount] = useState<number>(450000);
  const [interestRate, setInterestRate] = useState<number>(6.5);
  const [loanTerm, setLoanTerm] = useState<number>(360);
  
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [lenderPoints, setLenderPoints] = useState<number>(1.5);
  const [junkFees, setJunkFees] = useState<number>(1200);

  const pointsValue = loanAmount * (lenderPoints / 100);
  const totalCashToClose = 120000 + pointsValue + junkFees; // Mock calculation for "Total Cash To Close"

  const toggleAdvanced = () => {
    setIsAdvancedOpen(!isAdvancedOpen);
  };

  return (
    <div className="min-h-screen bg-[#0d0a0b] text-on-surface flex flex-col dark selection:bg-primary/30 selection:text-primary pb-32">
      <main className="pt-24 px-4 max-w-4xl mx-auto w-full">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-semibold text-primary tracking-widest uppercase">Operational Terminal // Debt.Sys</span>
          </div>
          <h2 className="text-[36px] font-bold text-on-surface tracking-tight leading-tight">Financing Configuration</h2>
          <p className="text-[16px] text-on-surface-variant mt-2">Adjust capital structure parameters and advanced leverage mechanics.</p>
        </div>

        {/* Main Configuration Panel */}
        <div className="bg-[#161318]/60 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/10 pointer-events-none animate-[scan_8s_linear_infinite]"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Loan Amount */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-on-surface-variant block tracking-wider">LOAN AMOUNT</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-on-surface-variant">$</span>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full bg-[#0d0a0b]/80 border border-[#3c4a46] focus:border-primary focus:shadow-[0_0_0_1px_rgba(69,73,85,0.3)] transition-all pl-8 py-3 rounded-lg font-mono text-on-surface outline-none"
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-on-surface-variant block tracking-wider">ANNUAL RATE (%)</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-on-surface-variant">%</span>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full bg-[#0d0a0b]/80 border border-[#3c4a46] focus:border-primary focus:shadow-[0_0_0_1px_rgba(69,73,85,0.3)] transition-all px-4 py-3 rounded-lg font-mono text-on-surface outline-none"
                />
              </div>
            </div>

            {/* Term */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-on-surface-variant block tracking-wider">TERM (MONTHS)</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-on-surface-variant">MO</span>
                <input
                  type="number"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                  className="w-full bg-[#0d0a0b]/80 border border-[#3c4a46] focus:border-primary focus:shadow-[0_0_0_1px_rgba(69,73,85,0.3)] transition-all px-4 py-3 rounded-lg font-mono text-on-surface outline-none"
                />
              </div>
            </div>
          </div>

          {/* Advanced Toggle Trigger */}
          <button
            onClick={toggleAdvanced}
            className="group flex items-center gap-2 py-3 px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 w-full md:w-auto"
          >
            <span className={`material-symbols-outlined text-primary transition-transform duration-300 ${isAdvancedOpen ? 'rotate-45' : ''}`}>
              add_circle
            </span>
            <span className="text-[14px] font-semibold text-primary uppercase tracking-wider">Add Origination Fees &amp; Points</span>
          </button>

          {/* Advanced Disclosure Panel */}
          <div className={`mt-6 overflow-hidden transition-all duration-500 ${isAdvancedOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-[#1e1b20] rounded-xl p-6 border border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-sm">settings_input_component</span>
                <h3 className="text-[12px] font-semibold text-primary uppercase tracking-widest">Leverage Mechanics</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Points Charged */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[12px] font-semibold text-on-surface-variant tracking-wider">LENDER POINTS</label>
                    <span className="font-mono text-[12px] text-primary">${pointsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-on-surface-variant">PTS</span>
                    <input
                      type="number"
                      step="0.25"
                      value={lenderPoints}
                      onChange={(e) => setLenderPoints(Number(e.target.value))}
                      className="w-full bg-[#0d0a0b]/80 border border-[#3c4a46] focus:border-primary focus:shadow-[0_0_0_1px_rgba(69,73,85,0.3)] transition-all px-4 py-3 rounded-lg font-mono text-on-surface outline-none"
                    />
                  </div>
                </div>

                {/* Junk Fees */}
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold text-on-surface-variant block tracking-wider">OTHER LENDER / JUNK FEES</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-on-surface-variant">$</span>
                    <input
                      type="number"
                      value={junkFees}
                      onChange={(e) => setJunkFees(Number(e.target.value))}
                      className="w-full bg-[#0d0a0b]/80 border border-[#3c4a46] focus:border-primary focus:shadow-[0_0_0_1px_rgba(69,73,85,0.3)] transition-all pl-8 py-3 rounded-lg font-mono text-on-surface outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Feedback Banner */}
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-[12px] font-semibold text-on-surface-variant tracking-wider uppercase">Live Valuation Sync</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-[32px] font-bold text-on-surface drop-shadow-[0_0_10px_rgba(69,73,85,0.4)]">
                  ${totalCashToClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[14px] font-semibold text-primary">TOTAL CASH TO CLOSE</span>
              </div>
            </div>
            <button className="bg-primary hover:bg-[#454955] text-[#454955] text-[14px] px-8 py-4 rounded-lg font-bold shadow-[0_0_20px_rgba(69,73,85,0.3)] transition-all active:scale-95">
              EXECUTE STRUCTURE
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
