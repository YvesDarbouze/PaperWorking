'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Award, AlertTriangle, Calendar, CheckSquare, Square, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExecutionStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  strategy: string;
}

export default function ExecutionStep({
  initialData,
  onSave,
  strategy,
}: ExecutionStepProps) {
  const f = initialData?.financials || {};

  // ── Strategy: Sell Execution states ──
  const [offers, setOffers] = useState<any[]>(() => {
    return f.exitOffers || [
      { id: 'off_1', buyer: 'Investment Partners LLC', price: 315000, contingencies: 'None (Cash)', status: 'Countered' },
      { id: 'off_2', buyer: 'Jane & Mark Vance', price: 325000, contingencies: 'Financing, Inspection', status: 'Pending' },
    ];
  });
  const [showings, setShowings] = useState<any[]>(() => {
    return f.exitShowings || [
      { id: 'sh_1', date: '2026-07-15', buyer: 'Family Buyer', feedback: 'Loves the kitchen finishes, concerned with backyard size' },
      { id: 'sh_2', date: '2026-07-18', buyer: 'Cash Investor', feedback: 'Strong interest, intends to submit offer below list' },
    ];
  });
  const [daysOnMarket, setDaysOnMarket] = useState<number>(f.exitDaysOnMarket || 25);
  const zipAverageDOM = 10; // mock Zip Average DOM from RentCast

  const [sellCloseChecklist, setSellCloseChecklist] = useState<Record<string, boolean>>(() => {
    return f.exitSellCloseChecklist || {
      contractSigned: false,
      earnestMoneyReceived: false,
      inspectionCleared: false,
      appraisalCleared: false,
      titleCleared: false,
      walkthroughDone: false,
      docsSigned: false,
      fundsDisbursed: false,
    };
  });

  // ── Strategy: Refinance Execution states ──
  const [refiCloseChecklist, setRefiCloseChecklist] = useState<Record<string, boolean>>(() => {
    return f.exitRefiCloseChecklist || {
      appraisalConfirmed: false,
      payoffLetterReceived: false,
      newTitleClear: false,
      settlementSheetSigned: false,
      fundingDocsExecuted: false,
    };
  });
  const [refiFundingDate, setRefiFundingDate] = useState<string>(f.exitRefiFundingDate || '');
  const [refiCashReceived, setRefiCashReceived] = useState<number>(f.exitRefiCashReceived || 60000);

  // ── Strategy: Hold Execution states ──
  const [holdReviewChecklist, setHoldReviewChecklist] = useState<Record<string, boolean>>(() => {
    return f.exitHoldReviewChecklist || {
      maintenanceAuditDone: false,
      leaseRenewalChecked: false,
      rentIncreaseAnalyzed: false,
    };
  });

  const handleUpdateOfferStatus = (id: string, status: string) => {
    setOffers(offers.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(`Offer status set to ${status}.`);
  };

  const handleToggleSellClose = (key: string) => {
    setSellCloseChecklist({ ...sellCloseChecklist, [key]: !sellCloseChecklist[key] });
  };

  const handleToggleRefiClose = (key: string) => {
    setRefiCloseChecklist({ ...refiCloseChecklist, [key]: !refiCloseChecklist[key] });
  };

  const handleToggleHoldReview = (key: string) => {
    setHoldReviewChecklist({ ...holdReviewChecklist, [key]: !holdReviewChecklist[key] });
  };

  const handleContinue = async () => {
    const payload = {
      financials: {
        ...f,
        exitOffers: offers,
        exitShowings: showings,
        exitDaysOnMarket: daysOnMarket,
        exitSellCloseChecklist: sellCloseChecklist,
        exitRefiCloseChecklist: refiCloseChecklist,
        exitRefiFundingDate: refiFundingDate,
        exitRefiCashReceived: refiCashReceived,
        exitHoldReviewChecklist: holdReviewChecklist,
        exitExecComplete: true,
      },
    };
    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 3: Exit Execution</h3>
        <p className="text-xs text-slate-400">Track showings feedback, manage incoming buyer offers, or follow final loan payoff closures.</p>
      </div>

      {strategy === 'Sell' && (
        <div className="space-y-5">
          {/* Days on market alert */}
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Days on Market Counter</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span>Current:</span>
                <input
                  type="number"
                  value={daysOnMarket}
                  onChange={(e) => setDaysOnMarket(Number(e.target.value))}
                  className="w-12 text-center bg-white/5 border border-white/10 rounded text-xs text-white"
                />
              </div>
              <span className="text-[10px] text-slate-500">ZIP Average: {zipAverageDOM} Days</span>
            </div>
          </div>

          {daysOnMarket > zipAverageDOM + 14 && (
            <div className="p-3 border border-amber-500/20 bg-amber-500/5 text-amber-400 rounded-lg flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Consider Price Reduction</p>
                <p className="opacity-80">Days on Market exceeds the local ZIP average by over 14 days. Review listing price.</p>
              </div>
            </div>
          )}

          {/* Offer tracker */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Buyer Offer Ledger</h4>
            <div className="space-y-2.5">
              {offers.map((o) => (
                <div key={o.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{o.buyer}</span>
                    <span className="text-[9px] text-slate-500">Offer: <span className="text-sky-400 font-semibold">${o.price.toLocaleString()}</span> • Contingencies: {o.contingencies}</span>
                  </div>
                  <select
                    value={o.status}
                    onChange={(e) => handleUpdateOfferStatus(o.id, e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-[10px] font-semibold"
                  >
                    <option value="Pending" className="bg-[#181315]">Pending</option>
                    <option value="Accepted" className="bg-[#181315]">Accepted ✓</option>
                    <option value="Rejected" className="bg-[#181315]">Rejected</option>
                    <option value="Countered" className="bg-[#181315]">Countered</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Showings log */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Listing Showings & Feedback</h4>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {showings.map((s) => (
                <div key={s.id} className="p-2 bg-white/[0.01] border border-white/5 rounded-lg text-[10px] space-y-1">
                  <div className="flex justify-between font-bold text-slate-300">
                    <span>{s.buyer}</span>
                    <span>{s.date}</span>
                  </div>
                  <p className="text-slate-400 italic">"{s.feedback}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sell escrow closing checklist */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Escrow Contract-To-Close Milestones</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.keys(sellCloseChecklist).map((key) => {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleSellClose(key)}
                    className="flex items-center gap-2 text-left text-white w-full"
                  >
                    {sellCloseChecklist[key] ? (
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
        </div>
      )}

      {strategy === 'Refinance' && (
        <div className="space-y-4">
          {/* Refi checklists */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Lender Refinance checklist</h4>
            <div className="space-y-2 text-xs">
              {Object.keys(refiCloseChecklist).map((key) => {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleRefiClose(key)}
                    className="flex items-center gap-2 text-left text-white w-full"
                  >
                    {refiCloseChecklist[key] ? (
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

          {/* Refi Funding Date */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[8px] font-bold uppercase text-slate-500">Refi Funding Date</label>
              <input
                type="date"
                value={refiFundingDate}
                onChange={(e) => setRefiFundingDate(e.target.value)}
                className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold uppercase text-slate-500">Cash-Out Received ($)</label>
              <input
                type="number"
                value={refiCashReceived}
                onChange={(e) => setRefiCashReceived(Number(e.target.value))}
                className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
              />
            </div>
          </div>
        </div>
      )}

      {strategy === 'Hold' && (
        <div className="space-y-4">
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Annual Long-Term Review Checklist</h4>
            <div className="space-y-3 text-xs">
              {Object.keys(holdReviewChecklist).map((key) => {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleHoldReview(key)}
                    className="flex items-center gap-2 text-left text-white w-full"
                  >
                    {holdReviewChecklist[key] ? (
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
