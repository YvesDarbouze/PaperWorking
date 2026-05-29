'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, Activity, DollarSign, Percent } from 'lucide-react';
import { calculateCapRate, calculateCoC, calculateIRR, calculateROI } from '@/lib/utils/reiCalculators';
import { CashFlowChart } from './charts/CashFlowChart';
import { EquityBuildupChart } from './charts/EquityBuildupChart';

/* ═══════════════════════════════════════════════════════════════
   Deal Analyzer — PRO-FORMA DASHBOARD
   Matches Stitch design for 5-Year Pro-Forma
   Inputs have been removed and moved to Acquisition Terminal.
   Calculations run off existing default state for now.
   ═══════════════════════════════════════════════════════════════ */

type AnalyzerMode = 'flip' | 'rental';

interface FlipInputs {
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  loanAmount: number;
  interestRate: number;
  loanLengthMonths: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyUtilities: number;
  monthlyOther: number;
  costOfSalePct: number;
}

interface RentalInputs {
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  monthlyRent: number;
  vacancyRatePct: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  propertyMgmtPct: number;
}

const DEFAULT_FLIP: FlipInputs = {
  purchasePrice: 325000,
  rehabCost: 65000,
  arv: 485000,
  loanAmount: 275000,
  interestRate: 9.5,
  loanLengthMonths: 6,
  monthlyTaxes: 350,
  monthlyInsurance: 180,
  monthlyUtilities: 250,
  monthlyOther: 100,
  costOfSalePct: 6.0,
};

const DEFAULT_RENTAL: RentalInputs = {
  purchasePrice: 325000,
  rehabCost: 65000,
  arv: 485000,
  loanAmount: 275000,
  interestRate: 7.5,
  loanTermYears: 30,
  monthlyRent: 2800,
  vacancyRatePct: 5,
  monthlyTaxes: 350,
  monthlyInsurance: 180,
  monthlyMaintenance: 150,
  propertyMgmtPct: 8,
};

export interface DealAnalyzerTerminalProps {
  data?: Partial<RentalInputs>;
  isLoading?: boolean;
}

export function DealAnalyzerTerminal({ data, isLoading = false }: DealAnalyzerTerminalProps = {}) {
  const mode = 'rental';
  const flip = DEFAULT_FLIP;
  const rental = useMemo(() => ({ ...DEFAULT_RENTAL, ...data }), [data]);
  const [activeSubTab, setActiveSubTab] = useState<'pnl' | 'assumptions' | 'sensitivity'>('pnl');

  /* ── Flip Calculations (Preserved) ── */
  const flipCalc = useMemo(() => {
    const f = flip;
    const monthlyInterest = (f.loanAmount * (f.interestRate / 100)) / 12;
    const financingCost = monthlyInterest * f.loanLengthMonths;
    const monthlyHolding = f.monthlyTaxes + f.monthlyInsurance + f.monthlyUtilities + f.monthlyOther;
    const totalHoldingCost = monthlyHolding * f.loanLengthMonths;
    const costOfSaleAmt = f.arv * (f.costOfSalePct / 100);
    const totalCosts = f.purchasePrice + f.rehabCost + financingCost + totalHoldingCost + costOfSaleAmt;
    const grossProfit = f.arv - totalCosts;
    const downPayment = f.purchasePrice - f.loanAmount;
    const totalCashNeeded = Math.max(downPayment, 0) + f.rehabCost + monthlyHolding * 2;
    const roi = calculateROI(grossProfit, totalCashNeeded);
    return {
      grossProfit,
      roi,
      totalCashNeeded,
      monthlyInterest,
      totalHoldingCost,
      financingCost,
      costOfSaleAmt,
    };
  }, [flip]);

  /* ── Rental Calculations ── */
  const rentalCalc = useMemo(() => {
    const r = rental;
    const effectiveRent = r.monthlyRent * (1 - r.vacancyRatePct / 100);
    const mgmtFee = effectiveRent * (r.propertyMgmtPct / 100);
    const monthlyOpEx = r.monthlyTaxes + r.monthlyInsurance + r.monthlyMaintenance + mgmtFee;
    const monthlyDebtSvc = (r.loanAmount * (r.interestRate / 100)) / 12;
    const monthlyCF = effectiveRent - monthlyOpEx - monthlyDebtSvc;
    const annualCF = monthlyCF * 12;
    const annualNOI = (effectiveRent - monthlyOpEx) * 12;
    const capRate = calculateCapRate(annualNOI, r.arv);
    const totalInvested = Math.max(r.purchasePrice - r.loanAmount, 0) + r.rehabCost;
    const coc = calculateCoC(annualCF, totalInvested);
    return { monthlyCF, annualCF, annualNOI, capRate, coc, monthlyDebtSvc, monthlyOpEx, totalInvested };
  }, [rental]);

  /* ── 5-Year Projections ── */
  const projections = useMemo(() => {
    const years = [1, 2, 3, 4, 5];
    const rentGrowth = 0.03;
    const expenseGrowth = 0.03;
    const appreciation = 0.03;

    return years.map(year => {
      const grossPotentialRent = rental.monthlyRent * 12 * Math.pow(1 + rentGrowth, year - 1);
      const vacancyLoss = grossPotentialRent * (rental.vacancyRatePct / 100);
      const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
      const mgmtFee = effectiveGrossIncome * (rental.propertyMgmtPct / 100);
      
      const baseOpEx = (rental.monthlyTaxes + rental.monthlyInsurance + rental.monthlyMaintenance) * 12;
      const grownBaseOpEx = baseOpEx * Math.pow(1 + expenseGrowth, year - 1);
      const operatingExpenses = grownBaseOpEx + mgmtFee;
      
      const noi = effectiveGrossIncome - operatingExpenses;
      const debtService = rentalCalc.monthlyDebtSvc * 12;
      const preTaxCashFlow = noi - debtService;

      const propertyValue = rental.arv * Math.pow(1 + appreciation, year);
      // Simple amortization approximation
      const loanBalance = rental.loanAmount * Math.pow(1 - 0.02, year);
      const equity = propertyValue - loanBalance;
      
      return {
        year,
        grossPotentialRent,
        vacancyLoss,
        effectiveGrossIncome,
        operatingExpenses,
        noi,
        debtService,
        preTaxCashFlow,
        propertyValue,
        loanBalance,
        equity
      };
    });
  }, [rental, rentalCalc]);

  // IRR Calculation
  const irr = useMemo(() => {
    const cashFlows = [
      -rentalCalc.totalInvested,
      ...projections.map((p, i) => {
        if (i === 4) {
          const netSaleProceeds = p.propertyValue * (1 - 0.06) - p.loanBalance;
          return p.preTaxCashFlow + netSaleProceeds;
        }
        return p.preTaxCashFlow;
      })
    ];

    return calculateIRR(cashFlows);
  }, [projections, rentalCalc]);

  const cashFlowData = useMemo(() => {
    return projections.map(p => ({
      period: `Year ${p.year}`,
      gpr: p.grossPotentialRent,
      opEx: p.operatingExpenses,
    }));
  }, [projections]);

  const equityData = useMemo(() => {
    return projections.map(p => ({
      period: `Year ${p.year}`,
      loanBalance: p.loanBalance,
      equity: p.equity,
    }));
  }, [projections]);

  const fmt = (v: number, decimals = 0) =>
    v < 0
      ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: decimals })}`
      : `$${v.toLocaleString('en-US', { maximumFractionDigits: decimals })}`;

  // Helper to compute metrics for sensitivity tables
  const computeCocAndIrr = useMemo(() => {
    return (rent: number, vacancyRate: number, interestRate: number) => {
      const years = [1, 2, 3, 4, 5];
      const rentGrowth = 0.03;
      const expenseGrowth = 0.03;
      const appreciation = 0.03;

      const effectiveRent = rent * (1 - vacancyRate / 100);
      const mgmtFee = effectiveRent * (rental.propertyMgmtPct / 100);
      const monthlyOpEx = rental.monthlyTaxes + rental.monthlyInsurance + rental.monthlyMaintenance + mgmtFee;
      const monthlyDebtSvc = (rental.loanAmount * (interestRate / 100)) / 12;
      const annualCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      const annualNOI = (effectiveRent - monthlyOpEx) * 12;
      const totalInvested = Math.max(rental.purchasePrice - rental.loanAmount, 0) + rental.rehabCost;
      const coc = calculateCoC(annualCF, totalInvested);

      // Projections for the IRR
      const yearProjections = years.map(year => {
        const grossPotentialRent = rent * 12 * Math.pow(1 + rentGrowth, year - 1);
        const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
        const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
        const yearMgmtFee = effectiveGrossIncome * (rental.propertyMgmtPct / 100);
        
        const baseOpEx = (rental.monthlyTaxes + rental.monthlyInsurance + rental.monthlyMaintenance) * 12;
        const grownBaseOpEx = baseOpEx * Math.pow(1 + expenseGrowth, year - 1);
        const operatingExpenses = grownBaseOpEx + yearMgmtFee;
        
        const noi = effectiveGrossIncome - operatingExpenses;
        const debtService = monthlyDebtSvc * 12;
        const preTaxCashFlow = noi - debtService;

        const propertyValue = rental.arv * Math.pow(1 + appreciation, year);
        const loanBalance = rental.loanAmount * Math.pow(1 - 0.02, year);
        const equity = propertyValue - loanBalance;
        
        return {
          preTaxCashFlow,
          propertyValue,
          loanBalance,
          equity
        };
      });

      const cashFlows = [
        -totalInvested,
        ...yearProjections.map((p, i) => {
          if (i === 4) {
            const netSaleProceeds = p.propertyValue * (1 - 0.06) - p.loanBalance;
            return p.preTaxCashFlow + netSaleProceeds;
          }
          return p.preTaxCashFlow;
        })
      ];

      const calculatedIrrDecimal = calculateIRR(cashFlows);
      const calculatedIrr = calculatedIrrDecimal * 100; // scale to percent

      return { coc, irr: calculatedIrr };
    };
  }, [rental]);

  // Interest Rate Sensitivity
  const interestRateSensitivity = useMemo(() => {
    const baseRate = rental.interestRate;
    const rates = [baseRate - 2, baseRate - 1, baseRate, baseRate + 1, baseRate + 2];
    return rates.map(r => {
      const metrics = computeCocAndIrr(rental.monthlyRent, rental.vacancyRatePct, r);
      const monthlyDebtSvc = (rental.loanAmount * (r / 100)) / 12;
      const effectiveRent = rental.monthlyRent * (1 - rental.vacancyRatePct / 100);
      const mgmtFee = effectiveRent * (rental.propertyMgmtPct / 100);
      const monthlyOpEx = rental.monthlyTaxes + rental.monthlyInsurance + rental.monthlyMaintenance + mgmtFee;
      const firstYearCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      return {
        label: `${r.toFixed(2)}%`,
        rate: r,
        firstYearCF,
        coc: metrics.coc,
        irr: metrics.irr,
        isBase: Math.abs(r - baseRate) < 0.01,
      };
    });
  }, [rental, computeCocAndIrr]);

  // Rent Sensitivity
  const rentSensitivity = useMemo(() => {
    const baseRent = rental.monthlyRent;
    const rents = [baseRent * 0.9, baseRent * 0.95, baseRent, baseRent * 1.05, baseRent * 1.1];
    return rents.map(rent => {
      const metrics = computeCocAndIrr(rent, rental.vacancyRatePct, rental.interestRate);
      const effectiveRent = rent * (1 - rental.vacancyRatePct / 100);
      const mgmtFee = effectiveRent * (rental.propertyMgmtPct / 100);
      const monthlyOpEx = rental.monthlyTaxes + rental.monthlyInsurance + rental.monthlyMaintenance + mgmtFee;
      const monthlyDebtSvc = (rental.loanAmount * (rental.interestRate / 100)) / 12;
      const firstYearCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      return {
        label: fmt(rent),
        rent,
        firstYearCF,
        coc: metrics.coc,
        irr: metrics.irr,
        isBase: Math.abs(rent - baseRent) < 1,
      };
    });
  }, [rental, computeCocAndIrr]);

  // Vacancy Sensitivity
  const vacancySensitivity = useMemo(() => {
    const baseVacancy = rental.vacancyRatePct;
    const vacancies = [0, 2.5, 5.0, 7.5, 10.0];
    return vacancies.map(v => {
      const metrics = computeCocAndIrr(rental.monthlyRent, v, rental.interestRate);
      const effectiveRent = rental.monthlyRent * (1 - v / 100);
      const mgmtFee = effectiveRent * (rental.propertyMgmtPct / 100);
      const monthlyOpEx = rental.monthlyTaxes + rental.monthlyInsurance + rental.monthlyMaintenance + mgmtFee;
      const monthlyDebtSvc = (rental.loanAmount * (rental.interestRate / 100)) / 12;
      const firstYearCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      return {
        label: `${v.toFixed(1)}%`,
        vacancy: v,
        firstYearCF,
        coc: metrics.coc,
        irr: metrics.irr,
        isBase: Math.abs(v - baseVacancy) < 0.01,
      };
    });
  }, [rental, computeCocAndIrr]);

  if (mode !== 'rental') return null; // Dashboard is strictly rental/proforma for now

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 w-full text-slate-200">
      
      {/* ── Massive KPI Row ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* CoC Return */}
        <div className="glass-card p-6 rounded-xl flex flex-col justify-between group hover:border-teal-500/30 transition-all duration-300 luminous-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 font-sans">Cash-on-Cash Return</span>
            <TrendingUp className="w-5 h-5 text-teal-400" />
          </div>
          <div className="mt-4">
            {isLoading ? (
              <>
                <div className="h-10 w-24 bg-slate-800/50 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-slate-800/30 rounded animate-pulse mt-2"></div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-mono font-bold text-teal-400 luminous-teal text-glow">{rentalCalc.coc.toFixed(1)}%</h2>
                <p className="text-xs text-teal-500 flex items-center gap-1 mt-1 font-sans">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {rentalCalc.coc > 0 ? "Positive Return" : "Negative Return"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Cap Rate */}
        <div className="glass-card p-6 rounded-xl flex flex-col justify-between group hover:border-teal-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 font-sans">Cap Rate</span>
            <Percent className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            {isLoading ? (
              <>
                <div className="h-10 w-24 bg-slate-800/50 rounded animate-pulse"></div>
                <div className="h-4 w-28 bg-slate-800/30 rounded animate-pulse mt-2"></div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-mono font-bold text-white">{rentalCalc.capRate.toFixed(2)}%</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-sans">
                  Market Avg: ~5.8%
                </p>
              </>
            )}
          </div>
        </div>

        {/* Annual NOI */}
        <div className="glass-card p-6 rounded-xl flex flex-col justify-between group hover:border-teal-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 font-sans">Annual NOI</span>
            <DollarSign className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            {isLoading ? (
              <>
                <div className="h-10 w-32 bg-slate-800/50 rounded animate-pulse"></div>
                <div className="h-4 w-28 bg-slate-800/30 rounded animate-pulse mt-2"></div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-mono font-bold text-white">{fmt(rentalCalc.annualNOI)}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-sans">
                  Gross Income - OpEx
                </p>
              </>
            )}
          </div>
        </div>

        {/* IRR */}
        <div className="glass-card p-6 rounded-xl flex flex-col justify-between group hover:border-teal-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 font-sans">5-Yr IRR</span>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            {isLoading ? (
              <>
                <div className="h-10 w-24 bg-slate-800/50 rounded animate-pulse"></div>
                <div className="h-4 w-36 bg-slate-800/30 rounded animate-pulse mt-2"></div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-mono font-bold text-white">{(irr * 100).toFixed(1)}%</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-sans">
                  Internal Rate of Return
                </p>
              </>
            )}
          </div>
        </div>

      </section>

      {/* ── Middle Split View ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Cash Flow Timeline Visualizer */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 font-sans">Cash Flow Timeline (5 Yr)</h3>
          
          <CashFlowChart data={cashFlowData} isLoading={isLoading || !projections || projections.length === 0} />
        </div>

        {/* Equity & Amortization */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 font-sans">Equity &amp; Amortization</h3>
          
          <div className="flex-1 w-full flex items-center justify-center">
            <EquityBuildupChart data={equityData} isLoading={isLoading || !projections || projections.length === 0} />
          </div>

          <div className="mt-8 flex justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-slate-400 font-sans">Loan Balance (Y5)</p>
              {isLoading || !projections || projections.length < 5 ? (
                <div className="h-6 w-24 bg-slate-800/50 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-xl font-mono mt-1 text-white">{fmt(projections[4].loanBalance)}</p>
              )}
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs font-semibold uppercase text-slate-400 font-sans">Built Equity (Y5)</p>
              {isLoading || !projections || projections.length < 5 ? (
                <div className="h-6 w-24 bg-slate-800/50 rounded animate-pulse mt-1 ml-auto"></div>
              ) : (
                <p className="text-xl font-mono mt-1 text-teal-400">{fmt(projections[4].equity)}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom Section: 3-Tab Detailed Info ── */}
      <section className="glass-card rounded-xl overflow-hidden mb-8">
        <div className="flex border-b border-white/5 bg-slate-900/40 px-6 gap-8">
          <button
            onClick={() => setActiveSubTab('pnl')}
            className={`py-4 text-sm font-semibold relative transition-colors ${
              activeSubTab === 'pnl'
                ? 'text-teal-400 font-bold border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Detailed P&amp;L
            {activeSubTab === 'pnl' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400 shadow-[0_0_8px_rgba(87,241,219,0.5)]"></span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('assumptions')}
            className={`py-4 text-sm font-semibold relative transition-colors ${
              activeSubTab === 'assumptions'
                ? 'text-teal-400 font-bold border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Assumptions
            {activeSubTab === 'assumptions' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400 shadow-[0_0_8px_rgba(87,241,219,0.5)]"></span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('sensitivity')}
            className={`py-4 text-sm font-semibold relative transition-colors ${
              activeSubTab === 'sensitivity'
                ? 'text-teal-400 font-bold border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sensitivity Analysis
            {activeSubTab === 'sensitivity' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-400 shadow-[0_0_8px_rgba(87,241,219,0.5)]"></span>
            )}
          </button>
        </div>

        <div className="p-6">
          {activeSubTab === 'pnl' && (
            <div className="overflow-x-auto -mx-6 -my-6">
              <table className="w-full text-left border-collapse font-mono text-sm">
                <thead className="bg-slate-800/30 text-xs font-semibold uppercase text-slate-400 font-sans">
                  <tr>
                    <th className="px-6 py-4">Line Item</th>
                    {isLoading || !projections || projections.length === 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <th key={i} className="px-6 py-4 text-right">Year {i + 1}</th>
                      ))
                    ) : (
                      projections.map(p => <th key={p.year} className="px-6 py-4 text-right">Year {p.year}</th>)
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading || !projections || projections.length === 0 ? (
                    Array.from({ length: 7 }).map((_, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="h-4 w-36 bg-slate-800/40 rounded animate-pulse"></div>
                        </td>
                        {Array.from({ length: 5 }).map((_, colIndex) => (
                          <td key={colIndex} className="px-6 py-4">
                            <div className="h-4 w-16 bg-slate-800/30 rounded animate-pulse ml-auto"></div>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-white font-sans group-hover:text-teal-400">Gross Potential Rent</td>
                        {projections.map(p => <td key={p.year} className="px-6 py-4 text-right">{fmt(p.grossPotentialRent)}</td>)}
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-red-400 font-sans group-hover:text-red-300">Vacancy Loss</td>
                        {projections.map(p => <td key={p.year} className="px-6 py-4 text-right text-red-400">-{fmt(p.vacancyLoss)}</td>)}
                      </tr>
                      <tr className="bg-slate-900/50 text-teal-400">
                        <td className="px-6 py-4 font-sans font-bold">Effective Gross Income</td>
                        {projections.map(p => <td key={p.year} className="px-6 py-4 text-right font-bold">{fmt(p.effectiveGrossIncome)}</td>)}
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-red-400 font-sans group-hover:text-red-300">Operating Expenses</td>
                        {projections.map(p => <td key={p.year} className="px-6 py-4 text-right text-red-400">-{fmt(p.operatingExpenses)}</td>)}
                      </tr>
                      <tr className="bg-slate-800/50 text-white">
                        <td className="px-6 py-4 font-sans font-bold uppercase">Net Operating Income (NOI)</td>
                        {projections.map(p => <td key={p.year} className="px-6 py-4 text-right font-bold">{fmt(p.noi)}</td>)}
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-slate-400 font-sans group-hover:text-white">Debt Service (P&amp;I)</td>
                        {projections.map(p => <td key={p.year} className="px-6 py-4 text-right text-slate-400">-{fmt(p.debtService)}</td>)}
                      </tr>
                      <tr className="bg-teal-500/10 text-teal-400">
                        <td className="px-6 py-4 font-sans font-bold uppercase">Pre-Tax Cash Flow</td>
                        {projections.map(p => <td key={p.year} className="px-6 py-4 text-right font-bold">{fmt(p.preTaxCashFlow)}</td>)}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'assumptions' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Acquisition & Valuation */}
              <div className="glass-card p-5 rounded-xl border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-2 font-sans">Acquisition &amp; Valuation</h4>
                <div className="space-y-3 text-sm font-sans">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Purchase Price</span>
                    <span className="font-mono text-white">{fmt(rental.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rehab Cost</span>
                    <span className="font-mono text-white">{fmt(rental.rehabCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">After Repair Value (ARV)</span>
                    <span className="font-mono text-white">{fmt(rental.arv)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 font-semibold">
                    <span className="text-teal-400">Total Invested Capital</span>
                    <span className="font-mono text-teal-400">{fmt(rentalCalc.totalInvested)}</span>
                  </div>
                </div>
              </div>

              {/* Debt & Financing */}
              <div className="glass-card p-5 rounded-xl border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-2 font-sans">Debt &amp; Financing</h4>
                <div className="space-y-3 text-sm font-sans">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Loan Amount</span>
                    <span className="font-mono text-white">{fmt(rental.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">LTV Ratio</span>
                    <span className="font-mono text-white">{((rental.loanAmount / rental.purchasePrice) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interest Rate</span>
                    <span className="font-mono text-white">{rental.interestRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Loan Term</span>
                    <span className="text-white font-mono">{rental.loanTermYears} Years</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 font-semibold">
                    <span className="text-teal-400">Monthly Debt Service</span>
                    <span className="font-mono text-teal-400">{fmt(rentalCalc.monthlyDebtSvc)}/mo</span>
                  </div>
                </div>
              </div>

              {/* Operations & Growth */}
              <div className="glass-card p-5 rounded-xl border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-2 font-sans">Operations &amp; Growth</h4>
                <div className="space-y-3 text-sm font-sans">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Monthly Rent</span>
                    <span className="font-mono text-white">{fmt(rental.monthlyRent)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vacancy Allowance</span>
                    <span className="font-mono text-white">{rental.vacancyRatePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Property Mgmt Fee</span>
                    <span className="font-mono text-white">{rental.propertyMgmtPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Appreciation Rate</span>
                    <span className="text-white font-mono">3.0% / year</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 font-semibold">
                    <span className="text-teal-400">Monthly Operating Exp</span>
                    <span className="font-mono text-teal-400">{fmt(rentalCalc.monthlyOpEx)}/mo</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'sensitivity' && (
            <div className="space-y-8">
              <div>
                <p className="text-sm text-slate-400 mb-4 font-sans">
                  Analyze how Cash-on-Cash Return and 5-Year IRR respond to fluctuations in key market variables. The base case values are highlighted.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Interest Rate Sensitivity */}
                <div className="glass-card p-5 rounded-xl border border-white/5">
                  <h4 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-2 font-sans">Interest Rate Sensitivity</h4>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/5 font-sans">
                        <th className="py-2">Rate</th>
                        <th className="py-2 text-right">CF (Yr 1)</th>
                        <th className="py-2 text-right">CoC</th>
                        <th className="py-2 text-right">5-Yr IRR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {interestRateSensitivity.map(item => (
                        <tr
                          key={item.label}
                          className={`hover:bg-white/5 ${item.isBase ? 'bg-teal-500/10 text-teal-300 font-semibold' : 'text-slate-300'}`}
                        >
                          <td className="py-2">{item.label}</td>
                          <td className="py-2 text-right">{fmt(item.firstYearCF)}</td>
                          <td className="py-2 text-right">{item.coc.toFixed(1)}%</td>
                          <td className="py-2 text-right">{item.irr.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Monthly Rent Sensitivity */}
                <div className="glass-card p-5 rounded-xl border border-white/5">
                  <h4 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-2 font-sans">Monthly Rent Sensitivity</h4>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/5 font-sans">
                        <th className="py-2">Monthly Rent</th>
                        <th className="py-2 text-right">CF (Yr 1)</th>
                        <th className="py-2 text-right">CoC</th>
                        <th className="py-2 text-right">5-Yr IRR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {rentSensitivity.map(item => (
                        <tr
                          key={item.label}
                          className={`hover:bg-white/5 ${item.isBase ? 'bg-teal-500/10 text-teal-300 font-semibold' : 'text-slate-300'}`}
                        >
                          <td className="py-2">{item.label}</td>
                          <td className="py-2 text-right">{fmt(item.firstYearCF)}</td>
                          <td className="py-2 text-right">{item.coc.toFixed(1)}%</td>
                          <td className="py-2 text-right">{item.irr.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vacancy Rate Sensitivity */}
                <div className="glass-card p-5 rounded-xl border border-white/5">
                  <h4 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-2 font-sans">Vacancy Rate Sensitivity</h4>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/5 font-sans">
                        <th className="py-2">Vacancy Rate</th>
                        <th className="py-2 text-right">CF (Yr 1)</th>
                        <th className="py-2 text-right">CoC</th>
                        <th className="py-2 text-right">5-Yr IRR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {vacancySensitivity.map(item => (
                        <tr
                          key={item.label}
                          className={`hover:bg-white/5 ${item.isBase ? 'bg-teal-500/10 text-teal-300 font-semibold' : 'text-slate-300'}`}
                        >
                          <td className="py-2">{item.label}</td>
                          <td className="py-2 text-right">{fmt(item.firstYearCF)}</td>
                          <td className="py-2 text-right">{item.coc.toFixed(1)}%</td>
                          <td className="py-2 text-right">{item.irr.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
