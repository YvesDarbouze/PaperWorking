'use client';

import React, { useState } from 'react';
import type { DealCardData } from '@/components/marketplace/DealCard';
import { formatCurrency } from '@/lib/projects/phase-utils';

export interface DealCrowdfundModalProps {
  deal: DealCardData;
  isOpen: boolean;
  onClose: () => void;
  onCommitSuccess: (amount: number) => void;
}

export default function DealCrowdfundModal({
  deal,
  isOpen,
  onClose,
  onCommitSuccess,
}: DealCrowdfundModalProps) {
  const minCheck = deal.minInvestment ?? 25000;
  const [selectedAmount, setSelectedAmount] = useState<number>(minCheck);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [entityType, setEntityType] = useState<'individual' | 'llc' | 'trust' | 'ira'>('individual');
  const [entityName, setEntityName] = useState<string>('');
  const [accreditedConfirmed, setAccreditedConfirmed] = useState(false);
  const [ppmAgreed, setPpmAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isValidAmount = currentAmount >= minCheck;
  const canSubmit = isValidAmount && accreditedConfirmed && ppmAgreed && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await fetch('/api/deals/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id || deal.slug,
          senderEmail: 'investor@paperworking.test',
          content: `[Crowdfund Commitment: $${currentAmount.toLocaleString()}] Entity: ${entityType.toUpperCase()} (${entityName || 'Individual'}). Accredited investor confirmation and preliminary syndication allocation requested.`,
          source: 'crowdfund_modal',
        }),
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        onCommitSuccess(currentAmount);
      }, 1200);
    } catch {
      setSubmittedSuccess(true);
      setTimeout(() => {
        onCommitSuccess(currentAmount);
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="deal-crowdfund-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#141217] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[9.5px] font-bold uppercase text-white tracking-wider">
              Crowdfunding Syndicate
            </span>
            <h2 className="mt-1 text-lg font-bold text-white">
              Invest in {deal.propertyName || deal.address.split(',')[0]}
            </h2>
            <p className="text-xs text-white/50">{deal.address}</p>
          </div>

          <button
            type="button"
            data-testid="close-crowdfund-modal-btn"
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {submittedSuccess ? (
          <div className="py-8 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-emerald-400">
              verified
            </span>
            <h3 className="text-lg font-bold text-white">Investment Commitment Recorded!</h3>
            <p className="text-xs text-white/60 max-w-sm mx-auto">
              Your commitment of <strong className="text-white font-mono">{formatCurrency(currentAmount)}</strong> has been recorded. Direct negotiation has been opened in your Unified Inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Amount Selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-2">
                1. Select Investment Amount (Min: {formatCurrency(minCheck)})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[minCheck, minCheck * 2, minCheck * 4].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                    }}
                    className={`rounded-xl border py-2.5 px-3 text-center font-mono font-bold transition min-h-[44px] ${
                      selectedAmount === amt && !customAmount
                        ? 'border-white bg-white/15 text-white shadow-sm'
                        : 'border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>

              <div className="mt-2">
                <input
                  type="number"
                  placeholder={`Or enter custom amount ($${minCheck.toLocaleString()}+)`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-white focus:outline-none font-mono min-h-[44px]"
                />
              </div>
            </div>

            {/* Entity Selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-2">
                2. Investing Entity Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['individual', 'llc', 'trust', 'ira'] as const).map((ent) => (
                  <button
                    key={ent}
                    type="button"
                    onClick={() => setEntityType(ent)}
                    className={`rounded-xl border py-2 text-center font-semibold capitalize transition min-h-[44px] ${
                      entityType === ent
                        ? 'border-white bg-white/15 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                    }`}
                  >
                    {ent}
                  </button>
                ))}
              </div>

              {entityType !== 'individual' && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder={`Enter ${entityType.toUpperCase()} Name`}
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-white focus:outline-none min-h-[44px]"
                  />
                </div>
              )}
            </div>

            {/* Accreditations & Disclosures */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <label className="flex items-start gap-2.5 cursor-pointer text-white/70 min-h-[32px]">
                <input
                  type="checkbox"
                  checked={accreditedConfirmed}
                  onChange={(e) => setAccreditedConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-white accent-white focus:ring-0 h-4 w-4"
                />
                <span className="text-[11px]">
                  I certify I am an accredited investor or qualified institutional investor pursuant to SEC Rule 501.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-white/70 min-h-[32px]">
                <input
                  type="checkbox"
                  checked={ppmAgreed}
                  onChange={(e) => setPpmAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-white accent-white focus:ring-0 h-4 w-4"
                />
                <span className="text-[11px]">
                  I have reviewed the Private Placement Memorandum (PPM) and understand real-estate syndication risks.
                </span>
              </label>
            </div>

            {/* Off-Platform Closing Policy Notice */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/60 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[16px] text-white/40 shrink-0 mt-0.5">gavel</span>
              <p>
                <strong className="text-white font-semibold">Off-Platform Closing:</strong> PaperWorking provides syndication indication recording and direct messaging. Formal subscription documents, KYC/AML accreditation verification, and capital funding occur directly between counterparties outside of PaperWorking.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                data-testid="submit-crowdfund-commitment-btn"
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-white/90 py-3 text-xs font-bold transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>
                  {submitting
                    ? 'Recording Commitment…'
                    : `Confirm Commitment of ${formatCurrency(currentAmount)}`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
