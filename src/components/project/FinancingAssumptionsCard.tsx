'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Percent, Sparkles, Landmark, Info, Coins, ShieldAlert } from 'lucide-react';
import type { Project } from '@/types/schema';
import { calculateAmortization } from '@/lib/utils/reiCalculators';
import toast from 'react-hot-toast';

interface FinancingAssumptionsCardProps {
  project: Project;
  phaseColor?: string;
  onSave: (updates: any) => Promise<void>;
}

export function FinancingAssumptionsCard({
  project,
  phaseColor = '#ffac5a',
  onSave,
}: FinancingAssumptionsCardProps) {
  // Convert purchase price from cents to dollars
  const purchasePrice = (project.financials?.purchasePrice || 0) / 100;

  // Local state
  const [financingType, setFinancingType] = useState<'Financed' | 'All Cash'>('Financed');
  const [downPaymentPercent, setDownPaymentPercent] = useState<string>('20');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('6.5');
  const [termYears, setTermYears] = useState<string>('30');
  const [closingCosts, setClosingCosts] = useState<string>('');
  const [originationPoints, setOriginationPoints] = useState<string>('1');

  const [isSaving, setIsSaving] = useState(false);

  // Sync state with project data on load / project change
  useEffect(() => {
    const f = project.financials;
    const type = f?.financingType || 'Financed';
    setFinancingType(type);

    setClosingCosts(f?.closingCosts !== undefined && f?.closingCosts !== null ? (f.closingCosts / 100).toString() : '');
    
    if (type === 'All Cash') {
      setDownPaymentPercent('');
      setLoanAmount('');
      setInterestRate('');
      setTermYears('');
      setOriginationPoints('');
    } else {
      setDownPaymentPercent(project.financials?.downPaymentPercent !== undefined && project.financials?.downPaymentPercent !== null ? project.financials.downPaymentPercent.toString() : '20');
      setLoanAmount(project.financials?.loanAmount !== undefined && project.financials?.loanAmount !== null ? (project.financials.loanAmount / 100).toString() : '');
      setInterestRate(project.financials?.loanInterestRate !== undefined && project.financials?.loanInterestRate !== null ? project.financials.loanInterestRate.toString() : '6.5');
      setTermYears(project.financials?.loanTermYears !== undefined && project.financials?.loanTermYears !== null ? project.financials.loanTermYears.toString() : '30');
      setOriginationPoints(project.financials?.loanOriginationPoints !== undefined && project.financials?.loanOriginationPoints !== null ? project.financials.loanOriginationPoints.toString() : '1');
    }
  }, [
    project.id,
    project.financials?.downPaymentPercent,
    project.financials?.loanAmount,
    project.financials?.loanInterestRate,
    project.financials?.loanTermYears,
    project.financials?.loanOriginationPoints,
    project.financials?.financingType,
    project.financials?.closingCosts,
  ]);

  // Handle reciprocal calculation between down payment % and loan amount
  const handleDownPercentChange = (pctStr: string) => {
    setDownPaymentPercent(pctStr);
    const pct = parseFloat(pctStr);
    if (!isNaN(pct) && purchasePrice > 0) {
      const loanAmt = purchasePrice * (1 - pct / 100);
      setLoanAmount(Math.round(loanAmt).toString());
    } else {
      setLoanAmount('');
    }
  };

  const handleLoanAmountChange = (amtStr: string) => {
    setLoanAmount(amtStr);
    const amt = parseFloat(amtStr);
    if (!isNaN(amt) && purchasePrice > 0) {
      const pct = ((purchasePrice - amt) / purchasePrice) * 100;
      setDownPaymentPercent(pct.toFixed(2));
    } else {
      setDownPaymentPercent('');
    }
  };

  // Live calculations using our shared calculateAmortization utility
  const derivedFinancing = useMemo(() => {
    if (financingType === 'All Cash' || purchasePrice <= 0) {
      return {
        loanAmount: 0,
        downPaymentPercent: 0,
        downPaymentAmount: purchasePrice,
        closingCosts: parseFloat(closingCosts) || 0,
        originationPointsFee: 0,
        totalCashRequired: purchasePrice + (parseFloat(closingCosts) || 0),
        monthlyPayment: 0,
        annualDebtService: 0,
        firstYearInterest: 0,
        firstYearPrincipal: 0,
      };
    }

    const amt = parseFloat(loanAmount) || purchasePrice * (1 - (parseFloat(downPaymentPercent) || 20) / 100);
    const r = parseFloat(interestRate) || 0;
    const tYears = parseFloat(termYears) || 30;
    const tMonths = tYears * 12;
    const points = parseFloat(originationPoints) || 0;
    const cc = parseFloat(closingCosts) || 0;

    const amort = calculateAmortization(amt, r, tMonths);
    const pointsFee = amt * (points / 100);
    const downAmt = purchasePrice - amt;
    const cashRequired = downAmt + cc + pointsFee;

    return {
      loanAmount: amt,
      downPaymentPercent: parseFloat(downPaymentPercent) || 20,
      downPaymentAmount: downAmt,
      closingCosts: cc,
      originationPointsFee: pointsFee,
      totalCashRequired: cashRequired,
      monthlyPayment: amort.monthlyPayment,
      annualDebtService: amort.annualDebtService,
      firstYearInterest: amort.firstYearInterest,
      firstYearPrincipal: amort.firstYearPrincipal,
    };
  }, [financingType, purchasePrice, downPaymentPercent, loanAmount, interestRate, termYears, closingCosts, originationPoints]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isCash = financingType === 'All Cash';
      const ccCents = derivedFinancing.closingCosts ? Math.round(derivedFinancing.closingCosts * 100) : null;

      // Un-levered vs levered field saves (all-cash nulls loan fields)
      const updates = {
        'financials.financingType': financingType,
        'financials.closingCosts': ccCents,
        // If financed, we also update totalCashInvested = downpayment + closingcosts + points
        'financials.totalCashInvested': Math.round(derivedFinancing.totalCashRequired * 100),
        
        // Loan parameters inside financials
        'financials.loanAmount': isCash ? null : Math.round(derivedFinancing.loanAmount * 100),
        'financials.loanInterestRate': isCash ? null : parseFloat(interestRate) || null,
        'financials.loanTermYears': isCash ? null : parseFloat(termYears) || null,
        'financials.loanOriginationPoints': isCash ? null : parseFloat(originationPoints) || null,
        'financials.downPaymentPercent': isCash ? null : parseFloat(downPaymentPercent) || null,
      };

      await onSave(updates);
      toast.success('Financing assumptions saved successfully!');
    } catch (err) {
      console.error('Failed to save financing assumptions:', err);
      toast.error('Failed to save financing assumptions');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[#161217] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            <Landmark className="h-4 w-4 text-[#ffac5a]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Financing Assumptions</h4>
            <p className="text-[9px] text-[#9E9DA0]">Projected debt structures & cash requirements</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1 rounded bg-[#241e26] border border-white/10 hover:bg-white/5 text-white text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Financing'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Toggle between financed and all-cash (Read-Only) */}
        <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-4 rounded-xl">
          <div>
            <span className="block text-xs text-white/90 font-bold uppercase tracking-wider text-[10px]">Funding Vehicle Type</span>
            <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Determined via the F1.1 modality selector</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded text-[10px] font-bold uppercase bg-[#ffac5a]/20 text-[#ffac5a] border border-[#ffac5a]/30">
              {financingType}
            </span>
          </div>
        </div>

        {financingType === 'All Cash' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unlevered view */}
            <div className="bg-yellow-500/5 border border-yellow-500/10 p-5 rounded-xl space-y-3 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-yellow-500">
                <Coins className="h-5 w-5" />
                <h5 className="text-xs font-bold uppercase tracking-widest">Unlevered Acquisition Set</h5>
              </div>
              <p className="text-[10px] text-white/70 leading-relaxed">
                You have selected an <strong>All Cash</strong> financing vehicle. All debt service KPIs, mortgage parameters, and interest split forecasts are bypassed. The scorecard metrics will automatically flip to unlevered metrics, replacing debt-related indicators with the Operating Expense Ratio (OER).
              </p>
            </div>

            <div className="space-y-4">
              {/* Closing Cost Input */}
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3 rounded-lg">
                <div>
                  <span className="block text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Estimated Closing Costs</span>
                  <span className="block text-[8px] text-[#9E9DA0] mt-0.5">Title search, escrow, transfer tax</span>
                </div>
                <div className="relative w-[130px]">
                  <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                  <input
                    type="number"
                    value={closingCosts}
                    onChange={(e) => setClosingCosts(e.target.value)}
                    placeholder="0"
                    className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                </div>
              </div>

              {/* Total Cash required rollup */}
              <div className="bg-white/[0.02] border border-white/10 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[10px] text-[#9E9DA0] uppercase tracking-wider font-bold">
                  <span>Purchase Capital</span>
                  <span className="font-mono text-white">{formatCurrency(purchasePrice)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#9E9DA0] uppercase tracking-wider font-bold">
                  <span>Closing costs</span>
                  <span className="font-mono text-white">{formatCurrency(derivedFinancing.closingCosts)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#ffac5a] uppercase tracking-widest font-black pt-2 border-t border-white/5">
                  <span>Total Cash Required</span>
                  <span className="font-mono text-lg">{formatCurrency(derivedFinancing.totalCashRequired)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financed inputs */}
            <div className="space-y-4">
              {/* Down Payment % and amount */}
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
                <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Down Payment</span>
                <div className="flex items-center gap-2">
                  <div className="relative w-[75px]">
                    <input
                      type="number"
                      value={downPaymentPercent}
                      onChange={(e) => handleDownPercentChange(e.target.value)}
                      placeholder="Down Payment %"
                      className="w-full pr-6 pl-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                    />
                    <Percent className="absolute right-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                  </div>
                  <span className="text-[10px] text-white/40">/</span>
                  <div className="relative w-[110px]">
                    <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => handleLoanAmountChange(e.target.value)}
                      placeholder="0"
                      className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Interest Rate */}
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
                <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Interest Rate</span>
                <div className="relative w-[100px]">
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="Interest Rate %"
                    className="w-full pr-6 pl-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                  <Percent className="absolute right-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                </div>
              </div>

              {/* Amortization Term */}
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
                <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Amortization Term</span>
                <div className="relative w-[100px]">
                  <input
                    type="number"
                    value={termYears}
                    onChange={(e) => setTermYears(e.target.value)}
                    placeholder="30"
                    className="w-full pr-10 pl-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                  <span className="absolute right-2 top-1.5 text-[9px] font-bold text-[#9E9DA0] uppercase">Yrs</span>
                </div>
              </div>

              {/* Closing Cost Estimate */}
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
                <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Estimated Closing Costs</span>
                <div className="relative w-[130px]">
                  <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                  <input
                    type="number"
                    value={closingCosts}
                    onChange={(e) => setClosingCosts(e.target.value)}
                    placeholder="0"
                    className="w-full pl-6 pr-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                </div>
              </div>

              {/* Origination Points */}
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-lg gap-3">
                <span className="text-xs text-white/70 font-semibold uppercase tracking-wider text-[10px]">Origination Points</span>
                <div className="relative w-[100px]">
                  <input
                    type="number"
                    step="0.1"
                    value={originationPoints}
                    onChange={(e) => setOriginationPoints(e.target.value)}
                    placeholder="1"
                    className="w-full pr-8 pl-2.5 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                  <span className="absolute right-2 top-1.5 text-[9px] font-bold text-[#9E9DA0] uppercase">Pts</span>
                </div>
              </div>
            </div>

            {/* Calculations and Preview */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Amortization schedule summary */}
              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-4">
                <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">Amortization Forecast (First Year)</span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-white/5 bg-white/[0.005] p-3 rounded-lg">
                    <span className="block text-[9px] text-[#9E9DA0] uppercase tracking-wider font-bold">Annual Debt Service</span>
                    <span className="block text-sm font-mono font-black text-white mt-1">
                      {formatCurrency(derivedFinancing.annualDebtService)}
                    </span>
                    <span className="block text-[8px] text-[#9E9DA0] mt-0.5">
                      ({formatCurrency(derivedFinancing.monthlyPayment)} / mo)
                    </span>
                  </div>

                  <div className="border border-white/5 bg-white/[0.005] p-3 rounded-lg">
                    <span className="block text-[9px] text-[#9E9DA0] uppercase tracking-wider font-bold">Points cost ({originationPoints} Pts)</span>
                    <span className="block text-sm font-mono font-bold text-white mt-1">
                      {formatCurrency(derivedFinancing.originationPointsFee)}
                    </span>
                  </div>
                </div>

                {/* Interest vs Principal split */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                    <span className="text-red-400">Interest Split: {formatCurrency(derivedFinancing.firstYearInterest)}</span>
                    <span className="text-pw-success">Principal Split: {formatCurrency(derivedFinancing.firstYearPrincipal)}</span>
                  </div>
                  <div className="h-2 w-full rounded overflow-hidden flex bg-white/5">
                    {derivedFinancing.annualDebtService > 0 ? (
                      <>
                        <div
                          className="h-full bg-red-400/80 transition-all duration-300"
                          style={{ width: `${(derivedFinancing.firstYearInterest / derivedFinancing.annualDebtService) * 100}%` }}
                        />
                        <div
                          className="h-full bg-pw-success/80 transition-all duration-300"
                          style={{ width: `${(derivedFinancing.firstYearPrincipal / derivedFinancing.annualDebtService) * 100}%` }}
                        />
                      </>
                    ) : (
                      <div className="h-full w-full bg-white/5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Cash requirement breakdown */}
              <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-[10px] text-[#9E9DA0] uppercase tracking-wider font-bold">
                  <span>Down Payment ({derivedFinancing.downPaymentPercent}%)</span>
                  <span className="font-mono text-white">{formatCurrency(derivedFinancing.downPaymentAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#9E9DA0] uppercase tracking-wider font-bold">
                  <span>Closing costs</span>
                  <span className="font-mono text-white">{formatCurrency(derivedFinancing.closingCosts)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#9E9DA0] uppercase tracking-wider font-bold">
                  <span>Origination points</span>
                  <span className="font-mono text-white">{formatCurrency(derivedFinancing.originationPointsFee)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#ffac5a] uppercase tracking-widest font-black pt-2 border-t border-white/5">
                  <span>Total Cash Needed</span>
                  <span className="font-mono text-lg">{formatCurrency(derivedFinancing.totalCashRequired)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
