'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Calendar, DollarSign, Info } from 'lucide-react';

interface Props {
  projectId: string;
  rehabSpend: any[];
  savedCompletedDate?: any;
  savedSpendTotal?: number;
  onSaveCompletion: (completedDate: string, spendTotal: number) => Promise<void>;
}

export function RenovationCompletionCard({
  projectId,
  rehabSpend,
  savedCompletedDate,
  savedSpendTotal,
  onSaveCompletion
}: Props) {
  const [completedDate, setCompletedDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive final spend total from ledger
  const currentLedgerTotal = rehabSpend.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Set default/initial date
  useEffect(() => {
    if (savedCompletedDate) {
      let dateVal = '';
      if (typeof savedCompletedDate === 'string') {
        dateVal = savedCompletedDate.slice(0, 10);
      } else if (savedCompletedDate.toDate) {
        dateVal = savedCompletedDate.toDate().toISOString().slice(0, 10);
      } else if (savedCompletedDate instanceof Date) {
        dateVal = savedCompletedDate.toISOString().slice(0, 10);
      }
      setCompletedDate(dateVal);
    } else {
      // Default to today
      setCompletedDate(new Date().toISOString().slice(0, 10));
    }
  }, [savedCompletedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedDate) return;
    setIsSubmitting(true);
    try {
      await onSaveCompletion(completedDate, currentLedgerTotal);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = !!savedCompletedDate;

  return (
    <div className="glass-card border border-white/5 rounded-xl p-5 space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`w-5 h-5 ${isCompleted ? 'text-green-500' : 'text-[#7A9EAA]'}`} />
          <span className="text-[14px] font-bold text-white uppercase tracking-wider">
            Renovation Completion (Card H2.2)
          </span>
        </div>
        {isCompleted && (
          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Rehab Confirmed
          </span>
        )}
      </div>

      <p className="text-xs text-[#9E9DA0] leading-relaxed">
        Record the actual completion date and finalize the total renovation spend. This actualizes the underwritten budget using live ledger transactions.
      </p>

      {/* Completion Status Alert Banner */}
      {isCompleted ? (
        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div className="text-xs text-[#9E9DA0] leading-normal">
            Renovation confirmed complete on <strong className="text-white">{completedDate}</strong>.
            <br />
            Final spend total actualized at <strong className="text-[#7A9EAA]">${(savedSpendTotal ? savedSpendTotal / 100 : currentLedgerTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
          </div>
        </div>
      ) : (
        <div className="bg-[#454955]/10 border border-[#454955]/20 p-4 rounded-xl flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#7A9EAA] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#9E9DA0] leading-normal">
            Ready to close out? Submitting will set <code className="text-white bg-white/5 px-1 py-0.25 rounded">rehab_completed_date</code> and write the current ledger total <strong className="text-[#7A9EAA]">${(currentLedgerTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> to <code className="text-white bg-white/5 px-1 py-0.25 rounded">rehab_spend_total</code>.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#9E9DA0] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#7A9EAA]" />
              Actual Completion Date
            </label>
            <input
              type="date"
              required
              value={completedDate}
              onChange={e => setCompletedDate(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none filter invert"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#9E9DA0] flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#7A9EAA]" />
              Final Spend Confirmation
            </label>
            <input
              type="text"
              disabled
              value={`$${(currentLedgerTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className="bg-black/10 border border-white/5 rounded-lg px-3 py-2 text-sm text-[#9E9DA0] w-full outline-none font-mono font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !completedDate}
            className={`text-xs font-bold px-4 py-2 rounded-lg transition ${
              isCompleted
                ? 'bg-white/5 text-[#9E9DA0] hover:bg-white/10 border border-white/10'
                : 'bg-[#7A9EAA] text-white hover:bg-[#7A9EAA]/80 shadow-md'
            }`}
          >
            {isSubmitting ? 'Saving...' : isCompleted ? 'Update Completion Details' : 'Confirm & Lock Completion'}
          </button>
        </div>
      </form>
    </div>
  );
}
