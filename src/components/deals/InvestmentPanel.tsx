'use client';

import React, { useState } from 'react';
import { DollarSign, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export interface InvestmentCommitmentData {
  id?: string;
  dealId: string;
  investorId: string;
  investorName?: string;
  amount: number;
  percentage: number;
  currency: 'USD' | 'CAD' | 'EUR' | 'GBP';
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: string;
}

interface InvestmentPanelProps {
  dealId: string;
  fundingTarget: number;
  committedAmount: number;
  existingCommitment?: InvestmentCommitmentData | null;
  onCommitSuccess?: (commitment: InvestmentCommitmentData) => void;
  className?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CAD: 'CA$',
  EUR: '€',
  GBP: '£',
};

export default function InvestmentPanel({
  dealId,
  fundingTarget = 200000,
  committedAmount = 130000,
  existingCommitment = null,
  onCommitSuccess,
  className = '',
}: InvestmentPanelProps) {
  const [mode, setMode] = useState<'percent' | 'fixed'>('fixed');
  const [amountInput, setAmountInput] = useState<string>('10000');
  const [currency, setCurrency] = useState<'USD' | 'CAD' | 'EUR' | 'GBP'>('USD');
  const [commitment, setCommitment] = useState<InvestmentCommitmentData | null>(existingCommitment);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remaining = Math.max(0, fundingTarget - committedAmount);

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive investment amount.');
      return;
    }

    let calculatedAmount = val;
    let calculatedPercent = (val / fundingTarget) * 100;

    if (mode === 'percent') {
      if (val > 100) {
        setError('Percentage commitment cannot exceed 100%.');
        return;
      }
      calculatedPercent = val;
      calculatedAmount = (val / 100) * fundingTarget;
    } else {
      if (calculatedAmount > remaining && remaining > 0) {
        setError(`Fixed amount cannot exceed remaining target (${CURRENCY_SYMBOLS[currency]}${remaining.toLocaleString()}).`);
        return;
      }
    }

    setIsSubmitting(true);

    const newCommitment: InvestmentCommitmentData = {
      id: `commit_${Date.now()}`,
      dealId,
      investorId: 'user_investor_current',
      amount: calculatedAmount,
      percentage: Number(calculatedPercent.toFixed(2)),
      currency,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setTimeout(() => {
      setCommitment(newCommitment);
      setIsSubmitting(false);
      if (onCommitSuccess) onCommitSuccess(newCommitment);
    }, 400);
  };

  return (
    <div
      data-testid="investment-panel"
      className={`rounded-[14px] border border-white/[0.06] p-6 bg-[#0a0a0f]/80 backdrop-blur-[12px] shadow-2xl space-y-5 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#34d399]" />
            <span>Submit Investment Commitment</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Indicate your soft commitment to participate in this deal.
          </p>
        </div>
        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-[6px] bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
          Non-Binding
        </span>
      </div>

      {commitment ? (
        <div data-testid="existing-commitment-banner" className="p-4 rounded-[12px] bg-[#34d399]/10 border border-[#34d399]/30 text-slate-200 space-y-2">
          <div className="flex items-center gap-2 text-[#34d399] font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Commitment Recorded</span>
          </div>
          <p className="text-xs text-slate-300">
            You committed <span className="font-extrabold text-white font-mono">{CURRENCY_SYMBOLS[commitment.currency]}{commitment.amount.toLocaleString()}</span> ({commitment.percentage}% of target).
          </p>
          <div className="pt-2 flex items-center gap-3 text-[11px] text-slate-400">
            <span>Status: <strong className="text-amber-400 capitalize">{commitment.status}</strong></span>
            <button
              type="button"
              onClick={() => setCommitment(null)}
              className="text-xs font-bold text-[#34d399] underline hover:text-[#34d399]/80"
            >
              Modify commitment
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCommit} className="space-y-4">
          {/* Glass Sliding Pill Toggle */}
          <div className="inline-flex p-1 bg-white/[0.03] backdrop-blur-[8px] border border-white/[0.06] rounded-[10px] w-fit">
            <button
              type="button"
              data-testid="mode-toggle-fixed"
              onClick={() => { setMode('fixed'); setError(null); }}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all min-h-[34px] cursor-pointer ${
                mode === 'fixed'
                  ? 'bg-white/15 text-white font-extrabold shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fixed Amount ($)
            </button>
            <button
              type="button"
              data-testid="mode-toggle-percent"
              onClick={() => { setMode('percent'); setError(null); }}
              className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all min-h-[34px] cursor-pointer ${
                mode === 'percent'
                  ? 'bg-white/15 text-white font-extrabold shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              % of Deal
            </button>
          </div>

          {/* Amount & Currency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {mode === 'fixed' ? 'Commitment Amount' : 'Target Percentage (%)'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 font-mono text-sm">
                  {mode === 'fixed' ? CURRENCY_SYMBOLS[currency] : '%'}
                </span>
                <input
                  type="number"
                  data-testid="commitment-amount-input"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={mode === 'fixed' ? '10000' : '5'}
                  className="w-full pl-8 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-[10px] text-sm font-bold font-mono text-white focus:outline-none focus:border-[#34d399]/40 min-h-[44px]"
                />
              </div>
            </div>

            {/* Glass Currency Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Currency
              </label>
              <select
                data-testid="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs font-bold text-slate-200 focus:outline-none focus:border-[#34d399]/40 appearance-none min-h-[44px] cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {error && (
            <div data-testid="commitment-error-msg" className="p-3 rounded-[10px] bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Teal Commit Button (rounded 10px, dark text) */}
          <button
            type="submit"
            data-testid="commit-submit-button"
            disabled={isSubmitting}
            className="w-full py-3 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg min-h-[48px] cursor-pointer disabled:opacity-50"
          >
            <span>Commit Investment</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </form>
      )}
    </div>
  );
}
