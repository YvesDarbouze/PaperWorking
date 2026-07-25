'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, Percent, Plus, Trash2, ShieldAlert, BarChart2 } from 'lucide-react';
import type { CapitalSource, CapitalSourceType, FundingCategory, FundingSourceStatus } from '@/types/schema';
import toast from 'react-hot-toast';

interface CapitalStackStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function CapitalStackStep({
  initialData,
  onSave,
}: CapitalStackStepProps) {
  const f = initialData?.financials || {};
  const purchasePrice = (f.purchasePrice || 25000000) / 100;
  const rehabBudget = (f.projectedRehabCost || 2500000) / 100;
  const closingCosts = (f.fixedAcquisitionCosts || (purchasePrice * 0.03));
  const holdingReserves = 1200; // suggested reserve

  const totalProjectCost = purchasePrice + rehabBudget + closingCosts + holdingReserves;

  // Stored sources
  const [sources, setSources] = useState<CapitalSource[]>(() => {
    const stack = f.capitalStack || [];
    if (stack.length > 0) return stack;
    
    // Default fallback starting source
    return [
      {
        id: 'default-1',
        category: 'Conventional Financing',
        type: 'conventional_loan',
        amount: purchasePrice * 0.75,
        interestRate: 6.5,
        termMonths: 360,
        status: 'Exploring',
        notes: 'Primary financing',
      }
    ];
  });

  // Handle adding a source row
  const handleAddSource = () => {
    const newSource: CapitalSource = {
      id: `source_${Math.random().toString(36).substring(2, 9)}`,
      category: 'Conventional Financing',
      type: 'conventional_loan',
      amount: 10000,
      interestRate: 7.0,
      termMonths: 360,
      status: 'Exploring',
      notes: '',
    };
    setSources([...sources, newSource]);
  };

  // Handle updating a single cell field
  const handleUpdateField = (id: string, field: keyof CapitalSource, value: any) => {
    setSources(
      sources.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        // Map UI category from type
        if (field === 'type') {
          let cat: FundingCategory = 'Conventional Financing';
          if (value === 'hard_money') cat = 'Hard Money Loans';
          else if (value === 'bridge') cat = 'Bridge Loans';
          else if (value === 'solo_cash') cat = 'Borrower Injection';
          else if (value === 'syndication_equity') cat = 'Syndication Equity';
          else if (value === 'co_buyer_equity') cat = 'Co-buying Equity';
          updated.category = cat;
        }
        return updated;
      })
    );
  };

  // Delete a source row
  const handleDeleteSource = (id: string) => {
    setSources(sources.filter((s) => s.id !== id));
  };

  // Perform computations
  const calculations = useMemo(() => {
    let totalRaised = 0;
    let totalDebt = 0;
    let weightedDebtRateSum = 0;
    let monthlyDebtService = 0;

    sources.forEach((s) => {
      const amt = s.amount || 0;
      totalRaised += amt;

      const isDebt = ['conventional_loan', 'hard_money', 'bridge', 'sba_504_bank', 'sba_504_cdc'].includes(s.type || '');
      if (isDebt) {
        totalDebt += amt;
        weightedDebtRateSum += amt * (s.interestRate || 0);

        // Compute monthly debt payment
        const r = (s.interestRate || 0) / 100 / 12;
        const n = s.termMonths || 360;
        let pmt = 0;
        if (s.notes?.toLowerCase().includes('interest only') || s.type === 'hard_money' || s.type === 'bridge') {
          // Interest-only payment
          pmt = amt * ((s.interestRate || 0) / 100) / 12;
        } else {
          // Amortized payment
          pmt = r > 0 ? (amt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : amt / n;
        }
        monthlyDebtService += pmt;
      }
    });

    const gapSurplus = totalProjectCost - totalRaised;
    const blendedRate = totalDebt > 0 ? weightedDebtRateSum / totalDebt : 0;
    
    // Get NOI from acquisition scorecard
    const annualNoi = (f.grossRent || 1800) * 12 * 0.6; // derived estimate if absent
    const dscr = monthlyDebtService > 0 ? (annualNoi / 12) / monthlyDebtService : 0;

    return {
      totalRaised,
      totalDebt,
      gapSurplus,
      blendedRate,
      monthlyDebtService,
      dscr,
    };
  }, [sources, totalProjectCost, f]);

  // Color alerts configurations
  const gapPercent = Math.abs(calculations.gapSurplus) / totalProjectCost;
  const isUnderfunded = calculations.gapSurplus > 0;
  const isOvercapitalized = calculations.gapSurplus < 0 && gapPercent > 0.10;

  const alertState = isUnderfunded
    ? { color: 'border-rose-500/20 bg-rose-500/5 text-rose-400', label: 'Underfunded Gap', msg: `Your capital stack is missing $${calculations.gapSurplus.toLocaleString()} to meet the total project cost. Add more sources.` }
    : isOvercapitalized
    ? { color: 'border-amber-500/20 bg-amber-500/5 text-amber-400', label: 'Over-Capitalized', msg: `Surplus funds exceed 10% of project cost by $${Math.abs(calculations.gapSurplus).toLocaleString()}. Consider adjusting equity levels.` }
    : { color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400', label: 'Fully Funded', msg: 'Capital stack matches target requirements. Ready to continue.' };

  const handleContinue = async () => {
    if (isUnderfunded) {
      toast.error('Capital stack is underfunded. Please cover the gap before continuing.');
      return;
    }

    const payload = {
      financials: {
        ...f,
        capitalStack: sources,
        loanAmount: calculations.totalDebt * 100, // Sync actual loan values
        loanInterestRate: calculations.blendedRate,
        annualDebtService: calculations.monthlyDebtService * 12,
        dscr: calculations.dscr,
      },
    };

    await onSave(payload);
  };

  // Stacked chart render widths
  const debtWidth = useMemo(() => {
    if (calculations.totalRaised === 0) return 0;
    return (calculations.totalDebt / calculations.totalRaised) * 100;
  }, [calculations.totalDebt, calculations.totalRaised]);

  const equityWidth = 100 - debtWidth;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 1: Capital Stack Builder</h3>
        <p className="text-xs text-slate-400">Compose and reconcile capital sources against the total project cost budget.</p>
      </div>

      {/* Visual Stack Chart */}
      <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>Capital Allocation breakdown</span>
          <span className="text-white text-xs font-semibold">
            ${calculations.totalRaised.toLocaleString()} Raised of ${totalProjectCost.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-6 rounded-lg overflow-hidden flex border border-white/10 bg-white/5 font-mono text-[9px] font-bold text-center leading-6 text-black select-none">
          {debtWidth > 0 && (
            <div
              className="bg-sky-400 transition-all duration-300"
              style={{ width: `${debtWidth}%` }}
              title={`Debt: ${debtWidth.toFixed(1)}%`}
            >
              DEBT ({debtWidth.toFixed(0)}%)
            </div>
          )}
          {equityWidth > 0 && (
            <div
              className="bg-emerald-400 transition-all duration-300"
              style={{ width: `${equityWidth}%` }}
              title={`Equity: ${equityWidth.toFixed(1)}%`}
            >
              EQUITY ({equityWidth.toFixed(0)}%)
            </div>
          )}
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold uppercase">
          <span>Debt: ${calculations.totalDebt.toLocaleString()}</span>
          <span>Equity: ${(calculations.totalRaised - calculations.totalDebt).toLocaleString()}</span>
        </div>
      </div>

      {/* Sources Table Inputs */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Funding Sources Ledger</span>
          <button
            type="button"
            onClick={handleAddSource}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Capital Source
          </button>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
          {sources.map((s, index) => (
            <div
              key={s.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-xl relative group transition-all"
            >
              {/* Type Select */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Source Type</label>
                <select
                  value={s.type}
                  onChange={(e) => handleUpdateField(s.id, 'type', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
                >
                  <option value="conventional_loan" className="bg-[#181315]">Conventional Loan</option>
                  <option value="hard_money" className="bg-[#181315]">Hard Money Loan</option>
                  <option value="bridge" className="bg-[#181315]">Bridge Loan</option>
                  <option value="solo_cash" className="bg-[#181315]">Solo Cash Injection</option>
                  <option value="syndication_equity" className="bg-[#181315]">Syndication Equity</option>
                  <option value="co_buyer_equity" className="bg-[#181315]">JV/Co-buyer Equity</option>
                </select>
              </div>

              {/* Amount */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Amount ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 w-3 h-3 text-slate-500" />
                  <input
                    type="number"
                    value={s.amount || ''}
                    onChange={(e) => handleUpdateField(s.id, 'amount', Number(e.target.value))}
                    className="w-full pl-7 pr-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold h-8"
                  />
                </div>
              </div>

              {/* Interest Rate */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Rate (%)</label>
                <div className="relative">
                  <Percent className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-500" />
                  <input
                    type="number"
                    step="0.1"
                    value={s.interestRate || ''}
                    disabled={!['conventional_loan', 'hard_money', 'bridge'].includes(s.type || '')}
                    onChange={(e) => handleUpdateField(s.id, 'interestRate', Number(e.target.value))}
                    className="w-full px-2 pr-7 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold h-8 disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Term */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">Term (Mo)</label>
                <input
                  type="number"
                  value={s.termMonths || ''}
                  disabled={!['conventional_loan', 'hard_money', 'bridge'].includes(s.type || '')}
                  onChange={(e) => handleUpdateField(s.id, 'termMonths', Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold h-8 disabled:opacity-40"
                />
              </div>

              {/* Actions/Trash */}
              <div className="sm:col-span-2 flex items-end justify-end h-full">
                <button
                  type="button"
                  onClick={() => handleDeleteSource(s.id)}
                  className="p-2 border border-white/5 hover:border-red-500/20 text-slate-500 hover:text-rose-500 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Banner */}
      <div className={`p-4 border rounded-xl space-y-1 flex items-start gap-3 transition-all ${alertState.color}`}>
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider">{alertState.label}</h4>
          <p className="text-xs opacity-80 leading-relaxed mt-0.5">{alertState.msg}</p>
        </div>
      </div>

      {/* Sidebar Metrics Summary */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 text-xs">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA] flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" /> Projected Capital Pro-Forma
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-white/5 p-2.5 rounded-xl">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Total Project Cost</p>
            <p className="text-sm font-bold text-white">${Math.round(totalProjectCost).toLocaleString()}</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Blended Rate</p>
            <p className="text-sm font-bold text-white">{calculations.blendedRate.toFixed(2)}%</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Monthly Debt Service</p>
            <p className="text-sm font-bold text-white">${Math.round(calculations.monthlyDebtService).toLocaleString()}/mo</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Projected DSCR</p>
            <p className="text-sm font-bold text-emerald-400">{calculations.dscr.toFixed(2)}x</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-white/5">
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-[#7A9EAA] text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
