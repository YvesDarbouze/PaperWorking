'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Percent, Info, ExternalLink, Calendar, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

interface PreparationStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  strategy: string;
}

export default function PreparationStep({
  initialData,
  onSave,
  strategy,
}: PreparationStepProps) {
  const f = initialData?.financials || {};

  // ── Strategy: Sell preparation states ──
  const [sellChecklist, setSellChecklist] = useState<Record<string, boolean>>(() => {
    return f.exitSellChecklist || {
      repairsDone: false,
      cleaningDone: false,
      stagingArranged: false,
      photosReady: false,
      agentAssigned: false,
    };
  });
  const [listPrice, setListPrice] = useState<number>(f.exitListPrice || (initialData?.estimatedARV || f.estimatedARV || 320000));
  const [mlsNumber, setMlsNumber] = useState<string>(f.exitMlsNumber || '');
  const [listingDate, setListingDate] = useState<string>(f.exitListingDate || '');

  // ── Strategy: Refinance preparation states ──
  const [refiChecklist, setRefiChecklist] = useState<Record<string, boolean>>(() => {
    return f.exitRefiChecklist || {
      appraisalOrdered: false,
      lenderAssigned: false,
      rateLocked: false,
      titleOrdered: false,
      closingScheduled: false,
    };
  });
  const [newLoanAmount, setNewLoanAmount] = useState<number>(f.exitNewLoanAmount || 240000);
  const [newInterestRate, setNewInterestRate] = useState<number>(f.exitNewInterestRate || 6.5);
  const [newLoanTermYears, setNewLoanTermYears] = useState<number>(f.exitNewLoanTermYears || 30);

  const currentLoanBalance = f.loanAmount / 100 || 180000;

  // Calculators
  const computedSellDetails = useMemo(() => {
    const commission = listPrice * 0.06;
    const closingCosts = listPrice * 0.02;
    const netProceeds = listPrice - currentLoanBalance - commission - closingCosts;
    return {
      commission,
      closingCosts,
      netProceeds,
    };
  }, [listPrice, currentLoanBalance]);

  const computedRefiDetails = useMemo(() => {
    const cashOut = newLoanAmount - currentLoanBalance;
    const newMonthlyPayment = (newLoanAmount * (newInterestRate / 100)) / 12;
    const projectedNOI = f.projectedNOI / 100 || 2200;
    const dscr = projectedNOI / (newMonthlyPayment * 12);
    return {
      cashOut,
      newPayment: newMonthlyPayment,
      dscr,
    };
  }, [newLoanAmount, newInterestRate, currentLoanBalance, f.projectedNOI]);

  const handleToggleSellChecklist = (key: string) => {
    setSellChecklist({ ...sellChecklist, [key]: !sellChecklist[key] });
  };

  const handleToggleRefiChecklist = (key: string) => {
    setRefiChecklist({ ...refiChecklist, [key]: !refiChecklist[key] });
  };

  const handleContinue = async () => {
    const payload = {
      financials: {
        ...f,
        exitSellChecklist: sellChecklist,
        exitListPrice: listPrice,
        exitMlsNumber: mlsNumber,
        exitListingDate: listingDate,
        exitRefiChecklist: refiChecklist,
        exitNewLoanAmount: newLoanAmount,
        exitNewInterestRate: newInterestRate,
        exitNewLoanTermYears: newLoanTermYears,
        exitPrepComplete: true,
      },
    };
    await onSave(payload);
  };

  if (strategy === 'Hold') {
    return (
      <div className="space-y-5 text-center py-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 2: Preparation</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Holding long-term does not require pre-marketing staging or lender appraisal checks. You can skip directly to execution and review lease expiration terms.
        </p>
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-[#7A9EAA] text-[#0d0a0b] font-bold uppercase tracking-wider text-[11px] rounded-lg transition-all"
        >
          Proceed to Step 3
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 2: Exit Preparation</h3>
        <p className="text-xs text-slate-400">Complete pre-marketing checkpoints and finalize expected listing/lending parameters.</p>
      </div>

      {strategy === 'Sell' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Sell checklist */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Pre-Sale Marketing Checklist</h4>
            <div className="space-y-2 text-xs">
              {Object.keys(sellChecklist).map((key) => {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleSellChecklist(key)}
                    className="flex items-center gap-2 text-left text-white w-full"
                  >
                    {sellChecklist[key] ? (
                      <CheckSquare className="w-4 h-4 text-[#7A9EAA] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sell Parameters */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Listing settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">List Price ($)</label>
                <input
                  type="number"
                  value={listPrice || ''}
                  onChange={(e) => setListPrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase text-slate-500">MLS Number</label>
                <input
                  type="text"
                  value={mlsNumber}
                  onChange={(e) => setMlsNumber(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="opacity-60">Est. Agent Commissions (6%)</span>
                <span>${Math.round(computedSellDetails.commission).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Est. Closing Costs (2%)</span>
                <span>${Math.round(computedSellDetails.closingCosts).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#7A9EAA] font-bold">
                <span>Net Estimated Proceeds</span>
                <span>${Math.round(computedSellDetails.netProceeds).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Refi checklist */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Refinance lending checklist</h4>
            <div className="space-y-2 text-xs">
              {Object.keys(refiChecklist).map((key) => {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleRefiChecklist(key)}
                    className="flex items-center gap-2 text-left text-white w-full"
                  >
                    {refiChecklist[key] ? (
                      <CheckSquare className="w-4 h-4 text-[#7A9EAA] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Refi parameters */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Refi loan parameters</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[7px] font-bold uppercase text-slate-500">Loan Amount ($)</label>
                <input
                  type="number"
                  value={newLoanAmount || ''}
                  onChange={(e) => setNewLoanAmount(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-[11px] h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[7px] font-bold uppercase text-slate-500">Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newInterestRate || ''}
                  onChange={(e) => setNewInterestRate(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-[11px] h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[7px] font-bold uppercase text-slate-500">Term (Yrs)</label>
                <input
                  type="number"
                  value={newLoanTermYears || ''}
                  onChange={(e) => setNewLoanTermYears(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-[11px] h-8"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="opacity-60">Estimated Cash-Out</span>
                <span>${Math.round(computedRefiDetails.cashOut).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Estimated New Payment</span>
                <span>${Math.round(computedRefiDetails.newPayment).toLocaleString()}/mo</span>
              </div>
              <div className="flex justify-between text-[#7A9EAA] font-bold">
                <span>Projected DSCR</span>
                <span>{computedRefiDetails.dscr.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
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
