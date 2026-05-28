"use client";

import React from "react";

interface CashFlowInputTerminalProps {
  loanAmount: number;
  setLoanAmount: (val: number) => void;
  interestRate: number;
  setInterestRate: (val: number) => void;
  loanTerm: number;
  setLoanTerm: (val: number) => void;
  otherDebt: number;
  setOtherDebt: (val: number) => void;
}

export default function CashFlowInputTerminal({
  loanAmount,
  setLoanAmount,
  interestRate,
  setInterestRate,
  loanTerm,
  setLoanTerm,
  otherDebt,
  setOtherDebt,
}: CashFlowInputTerminalProps) {
  return (
    <section className="glass-card rounded-xl overflow-hidden relative" style={{ background: "rgba(11, 20, 26, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-secondary/5 to-transparent">
        <h3 className="font-headline-md text-secondary flex items-center gap-2">DEBT SERVICE</h3>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="col-span-full">
          <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Loan Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
            <input 
              type="number" 
              value={loanAmount} 
              onChange={e => setLoanAmount(Number(e.target.value))}
              className="w-full bg-surface-container-high border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Interest Rate (%)</label>
          <div className="relative">
            <input 
              type="number" 
              step="0.1"
              value={interestRate} 
              onChange={e => setInterestRate(Number(e.target.value))}
              className="w-full bg-surface-container-high border border-white/10 rounded-lg py-3 px-4 text-on-surface font-mono focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Loan Term (Yrs)</label>
          <div className="relative">
            <input 
              type="number" 
              value={loanTerm} 
              onChange={e => setLoanTerm(Number(e.target.value))}
              className="w-full bg-surface-container-high border border-white/10 rounded-lg py-3 px-4 text-on-surface font-mono focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
            />
          </div>
        </div>
        <div className="col-span-full">
          <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Other Monthly Debt</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
            <input 
              type="number" 
              value={otherDebt} 
              onChange={e => setOtherDebt(Number(e.target.value))}
              className="w-full bg-surface-container-high border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
