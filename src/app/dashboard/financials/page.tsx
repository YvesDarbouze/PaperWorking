"use client";

import React, { useState } from "react";
import NOIInputTerminal from "@/components/dashboard/financials/NOIInputTerminal";
import NOIWaterfallChart from "@/components/dashboard/financials/NOIWaterfallChart";
import CashFlowInputTerminal from "@/components/dashboard/financials/CashFlowInputTerminal";
import CashFlowDeepDive from "@/components/dashboard/financials/CashFlowDeepDive";

function computeMonthlyPayment(principal: number, annualRatePercent: number, years: number) {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRatePercent <= 0) return principal / (years * 12);
  
  const monthlyRate = annualRatePercent / 100 / 12;
  const numPayments = years * 12;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  return payment;
}

export default function FinancialsTerminal() {
  // --- NOI State ---
  const [gri, setGri] = useState(23400);
  const [otherIncome, setOtherIncome] = useState(0);
  const [vacancyPct, setVacancyPct] = useState(0);
  const [opex, setOpex] = useState(10914);
  
  // --- Cash Flow State ---
  const [loanAmount, setLoanAmount] = useState(131480);
  const [interestRate, setInterestRate] = useState(7.25);
  const [loanTerm, setLoanTerm] = useState(30);
  const [otherDebt, setOtherDebt] = useState(0);

  // --- Derived NOI ---
  const grossIncome = gri + otherIncome;
  const vacancyLoss = grossIncome * (vacancyPct / 100);
  const noi = grossIncome - vacancyLoss - opex;

  // --- Derived Cash Flow ---
  const monthlyPI = computeMonthlyPayment(loanAmount, interestRate, loanTerm);
  const annualDebtService = (monthlyPI + otherDebt) * 12;
  const cashFlow = noi - annualDebtService;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md pb-32">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-white/10 shadow-sm flex items-center justify-between px-6 h-20">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-2xl">terminal</span>
          <h1 className="font-headline-md text-headline-md font-bold tracking-tighter text-primary">Financial Terminal</h1>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 md:px-gutter-desktop py-stack-lg space-y-stack-lg">
        
        {/* --- NOI TERMINAL --- */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 border-b border-white/10 pb-2">
            1. NOI Input Terminal
          </h2>
          
          <NOIInputTerminal 
            gri={gri} setGri={setGri}
            otherIncome={otherIncome} setOtherIncome={setOtherIncome}
            vacancyPct={vacancyPct} setVacancyPct={setVacancyPct}
            opex={opex} setOpex={setOpex}
            vacancyLoss={vacancyLoss}
          />

          <div className="pt-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">NOI Analysis</h3>
            <div className="glass-card rounded-xl p-6 relative overflow-hidden" style={{ background: "rgba(11, 20, 26, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <NOIWaterfallChart 
                grossIncome={grossIncome}
                vacancyLoss={vacancyLoss}
                opex={opex}
                noi={noi}
              />
            </div>
          </div>
        </div>

        {/* --- CASH FLOW TERMINAL --- */}
        <div className="space-y-6 pt-8">
          <h2 className="text-xl font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 border-b border-white/10 pb-2">
            2. Cash Flow Datapoint Agent
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CashFlowInputTerminal 
              loanAmount={loanAmount} setLoanAmount={setLoanAmount}
              interestRate={interestRate} setInterestRate={setInterestRate}
              loanTerm={loanTerm} setLoanTerm={setLoanTerm}
              otherDebt={otherDebt} setOtherDebt={setOtherDebt}
            />

            <CashFlowDeepDive 
              annualDebtService={annualDebtService}
              monthlyPI={monthlyPI}
              dscr={dscr}
              cashFlow={cashFlow}
            />
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 w-full h-20 bg-surface-container-highest/90 backdrop-blur-2xl border-t border-primary/20 shadow-[0_-4px_20px_rgba(87,241,219,0.15)] z-[60]">
        <div className="h-full max-w-5xl mx-auto px-4 md:px-gutter-desktop flex items-center justify-between">
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <div className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-on-surface-variant font-bold uppercase truncate">
              NOI <span className="text-on-surface">{formatCur(noi)}</span>
              <span className="mx-1 opacity-20">|</span> 
              Debt Service <span className="text-error">{formatCur(annualDebtService)}</span>
              <span className="mx-2">=</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold leading-none mb-1">Cash Flow</span>
              <div className={`font-mono text-xl md:text-[22px] font-bold whitespace-nowrap leading-none ${cashFlow > 0 ? 'text-primary' : 'text-error'}`}>
                {formatCur(cashFlow)}/yr <span className="text-sm font-sans font-medium text-on-surface-variant">({formatCur(cashFlow / 12)}/mo)</span>
              </div>
            </div>
          </div>
          <button className="bg-primary text-on-primary px-6 h-10 md:h-12 rounded-lg font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(87,241,219,0.4)] active:scale-95 transition-all duration-150 whitespace-nowrap ml-4">
            Save Financials
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
