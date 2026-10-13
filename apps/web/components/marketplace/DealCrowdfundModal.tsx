'use client';

import React, { useState } from 'react';
import { X, SealCheck, Gavel, CheckCircle } from '@phosphor-icons/react';
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isValidAmount = currentAmount >= minCheck;
  const canSubmit = isValidAmount && accreditedConfirmed && ppmAgreed && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/deals/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id || deal.slug,
          senderEmail: 'investor@paperworking.test',
          content: `[Crowdfund Commitment: $${currentAmount.toLocaleString()}] Entity: ${entityType.toUpperCase()} (${entityName || 'Individual'}). Accredited investor confirmation and preliminary syndication allocation requested.`,
          source: 'crowdfund_modal',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record commitment');
      }

      setSubmittedSuccess(true);
      setTimeout(() => {
        onCommitSuccess(currentAmount);
      }, 1200);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to record commitment. Please try again.');
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
        className="relative w-full max-w-lg rounded-none border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div>
            <span className="rounded-none bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-[9.5px] font-medium uppercase text-neutral-300 tracking-wider">
              Crowdfunding Syndicate
            </span>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Invest in {deal.propertyName || deal.address.split(',')[0]}
            </h2>
            <p className="text-xs text-neutral-400">{deal.address}</p>
          </div>

          <button
            type="button"
            data-testid="close-crowdfund-modal-btn"
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="py-8 text-center space-y-3">
            <SealCheck className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-semibold text-white">Investment Commitment Recorded!</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Your commitment of <strong className="text-white font-mono">{formatCurrency(currentAmount)}</strong> has been recorded. Direct negotiation has been opened in your Unified Inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Amount Selection */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">
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
                    className={`rounded-none border py-2.5 px-3 text-center font-mono font-medium transition min-h-[44px] ${
                      selectedAmount === amt && !customAmount
                        ? 'border-neutral-500 bg-neutral-800 text-white'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:bg-neutral-800'
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
                  className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-base md:text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none font-mono min-h-[44px]"
                />
              </div>
            </div>

            {/* Entity Selection */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">
                2. Investing Entity Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['individual', 'llc', 'trust', 'ira'] as const).map((ent) => (
                  <button
                    key={ent}
                    type="button"
                    onClick={() => setEntityType(ent)}
                    className={`rounded-none border py-2 text-center font-medium capitalize transition min-h-[44px] ${
                      entityType === ent
                        ? 'border-neutral-500 bg-neutral-800 text-white font-semibold'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800'
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
                    className="w-full rounded-none border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-base md:text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              )}
            </div>

            {/* Accreditations & Disclosures */}
            <div className="space-y-2 pt-1 border-t border-neutral-800">
              <label className="flex items-start gap-2.5 cursor-pointer text-neutral-300 min-h-[32px]">
                <input
                  type="checkbox"
                  checked={accreditedConfirmed}
                  onChange={(e) => setAccreditedConfirmed(e.target.checked)}
                  className="mt-0.5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-100 focus:outline-none h-4 w-4"
                />
                <span className="text-[11px]">
                  I certify I am an accredited investor or qualified institutional investor pursuant to SEC Rule 501.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-neutral-300 min-h-[32px]">
                <input
                  type="checkbox"
                  checked={ppmAgreed}
                  onChange={(e) => setPpmAgreed(e.target.checked)}
                  className="mt-0.5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-100 focus:outline-none h-4 w-4"
                />
                <span className="text-[11px]">
                  I have reviewed the Private Placement Memorandum (PPM) and understand real-estate syndication risks.
                </span>
              </label>
            </div>

            {/* Off-Platform Closing Policy Notice */}
            <div className="rounded-none border border-neutral-800 bg-neutral-900/40 p-3 text-[11px] text-neutral-400 flex items-start gap-2.5">
              <Gavel className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-white font-medium">Off-Platform Closing:</strong> PaperWorking provides syndication indication recording and direct messaging. Formal subscription documents, KYC/AML accreditation verification, and capital funding occur directly between counterparties outside of PaperWorking.
              </p>
            </div>

            {/* Error banner */}
            {submitError && (
              <div
                role="alert"
                className="rounded-none border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 font-medium"
              >
                {submitError}
              </div>
            )}

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                data-testid="submit-crowdfund-commitment-btn"
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 rounded-none bg-white text-neutral-950 hover:bg-neutral-200 py-3 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                <CheckCircle className="h-4 w-4" />
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
