'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type { DownPaymentCoordination } from '@/lib/projects/types';

export interface DownPaymentCoordinatorProps {
  coordination?: DownPaymentCoordination;
  totalCashToClose?: number;
  downPaymentAmount?: number;
  closingCostsAmount?: number;
  escrowOfficerName?: string;
  escrowCompanyName?: string;
  onUpdateCoordination: (updated: DownPaymentCoordination) => void;
  onConfirmFundsSent?: (coordination: DownPaymentCoordination) => void;
}

export default function DownPaymentCoordinator({
  coordination: initialCoordination,
  totalCashToClose = 105840,
  downPaymentAmount = 98000,
  closingCostsAmount = 7840,
  escrowOfficerName = 'Sarah Jenkins, Escrow Officer',
  escrowCompanyName = 'First National Title & Settlement',
  onUpdateCoordination,
  onConfirmFundsSent,
}: DownPaymentCoordinatorProps) {
  const defaultCoordination: DownPaymentCoordination = useMemo(() => {
    if (initialCoordination) return initialCoordination;
    return {
      paymentMethod: 'wire_transfer',
      totalAmountDue: totalCashToClose,
      recipientEscrowCompany: escrowCompanyName,
      recipientBankName: 'JPMorgan Chase Bank, N.A.',
      routingNumberMasked: '••••1248',
      accountNumberMasked: '••••••••4892',
      referenceFileNumber: 'ESC-2026-09-842',
      verbalConfirmationCompleted: false,
      status: 'awaiting_instructions',
    };
  }, [initialCoordination, totalCashToClose, escrowCompanyName]);

  const [coordination, setCoordination] = useState<DownPaymentCoordination>(defaultCoordination);
  const [paymentMethod, setPaymentMethod] = useState<'wire_transfer' | 'cashiers_check'>(
    coordination.paymentMethod || 'wire_transfer'
  );
  const [verbalConfirmed, setVerbalConfirmed] = useState(
    Boolean(coordination.verbalConfirmationCompleted)
  );
  const [verifiedPhone, setVerifiedPhone] = useState(
    coordination.verbalVerifiedPhone || '+1 (512) 555-0199'
  );
  const [verifiedWith, setVerifiedWith] = useState(
    coordination.verbalVerifiedWith || escrowOfficerName
  );
  const [wireRefNumber, setWireRefNumber] = useState(
    coordination.dispatchReferenceNumber || ''
  );
  const [proofDocName, setProofDocName] = useState(
    coordination.proofOfPaymentUrl ? 'Wire_Receipt_FedRef.pdf' : ''
  );

  const handleVerbalToggle = (checked: boolean) => {
    setVerbalConfirmed(checked);
    const updated: DownPaymentCoordination = {
      ...coordination,
      verbalConfirmationCompleted: checked,
      verbalVerifiedWith: verifiedWith,
      verbalVerifiedPhone: verifiedPhone,
      verbalVerifiedAt: checked ? new Date().toISOString() : undefined,
      status: checked && coordination.status === 'awaiting_instructions'
        ? 'instructions_verified'
        : coordination.status,
    };
    setCoordination(updated);
    onUpdateCoordination(updated);
  };

  const handleDispatchPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verbalConfirmed) return;

    const ref = wireRefNumber.trim() || `FED-${Date.now().toString().slice(-8)}`;
    const updated: DownPaymentCoordination = {
      ...coordination,
      paymentMethod,
      dispatchReferenceNumber: ref,
      dispatchedAt: new Date().toISOString(),
      proofOfPaymentUrl: proofDocName ? `/documents/${proofDocName}` : '/documents/wire_receipt.pdf',
      status: 'payment_dispatched',
    };

    setCoordination(updated);
    onUpdateCoordination(updated);
    if (onConfirmFundsSent) {
      onConfirmFundsSent(updated);
    }
  };

  const handleEscrowConfirmFunds = () => {
    const updated: DownPaymentCoordination = {
      ...coordination,
      status: 'confirmed_by_escrow',
    };
    setCoordination(updated);
    onUpdateCoordination(updated);
  };

  const isDispatched = coordination.status === 'payment_dispatched' || coordination.status === 'confirmed_by_escrow';
  const isConfirmed = coordination.status === 'confirmed_by_escrow';

  return (
    <div
      data-testid="down-payment-coordinator"
      className="w-full rounded-none border border-neutral-800 bg-[#0a0a0a] p-5 font-sans text-neutral-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isConfirmed
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : isDispatched
                  ? 'border border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : verbalConfirmed
                  ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border border-neutral-700 bg-neutral-800 text-neutral-400'
              }`}
            >
              {isConfirmed
                ? 'Funds Cleared by Escrow'
                : isDispatched
                ? 'Payment Dispatched'
                : verbalConfirmed
                ? 'Wire Instructions Verified'
                : 'Awaiting Verbal Verification'}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              File: {coordination.referenceFileNumber}
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-white tracking-tight">
            Down Payment & Cash-to-Close Coordination
          </h3>
          <p className="mt-0.5 text-xs text-neutral-400">
            Arrange closing funds transfer with verified escrow coordinates and anti-fraud verbal confirmation.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-neutral-400">Total Cash Due at Closing</span>
          <p className="text-base font-bold text-emerald-400">
            {formatCurrency(totalCashToClose)}
          </p>
          <p className="text-[11px] text-neutral-400">
            {`${formatCurrency(downPaymentAmount)} Down + ${formatCurrency(closingCostsAmount)} Closing Costs`}
          </p>
        </div>
      </div>

      {/* Payment Method Switcher */}
      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <label className="text-xs text-neutral-300 font-semibold">Payment Instrument:</label>
        <button
          type="button"
          onClick={() => setPaymentMethod('wire_transfer')}
          disabled={isDispatched}
          data-testid="method-wire-btn"
          className={`min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-none border transition ${
            paymentMethod === 'wire_transfer'
              ? 'border-white bg-neutral-900 text-white'
              : 'border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          Federal Wire Transfer (Standard)
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod('cashiers_check')}
          disabled={isDispatched}
          data-testid="method-check-btn"
          className={`min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-none border transition ${
            paymentMethod === 'cashiers_check'
              ? 'border-white bg-neutral-900 text-white'
              : 'border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          Official Bank Cashier&apos;s Check
        </button>
      </div>

      {/* Escrow Beneficiary Vault */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">Beneficiary / Escrow</span>
          <p className="font-semibold text-white mt-0.5">{coordination.recipientEscrowCompany}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">Receiving Depository Bank</span>
          <p className="font-semibold text-white mt-0.5">{coordination.recipientBankName}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">ABA Routing & Account</span>
          <p className="font-semibold text-white mt-0.5 font-mono">
            ABA: {coordination.routingNumberMasked} · ACCT: {coordination.accountNumberMasked}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">Escrow Reference Tag</span>
          <p className="font-semibold text-white mt-0.5 font-mono">{coordination.referenceFileNumber}</p>
        </div>
      </div>

      {/* Anti-Fraud Verbal Phone Verification Gate */}
      <div
        data-testid="anti-fraud-verbal-gate"
        className={`mt-4 rounded-none border p-4 text-xs space-y-3 ${
          verbalConfirmed
            ? 'border-emerald-500/40 bg-emerald-500/5 text-neutral-200'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <span className="material-symbols-outlined text-[18px]">security</span>
          <span>Mandatory Anti-Fraud Verbal Phone Verification Gate</span>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-300">
          Real estate wire fraud through compromised email accounts is a pervasive threat. Before transmitting funds, you must verbally verify wiring instructions with your settlement agent at an independently verified phone number (never call numbers listed on email PDFs).
        </p>

        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            id="verbal-confirm-checkbox"
            data-testid="verbal-confirm-checkbox"
            checked={verbalConfirmed}
            disabled={isDispatched}
            onChange={(e) => handleVerbalToggle(e.target.checked)}
            className="mt-1 h-5 w-5 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
          />
          <label htmlFor="verbal-confirm-checkbox" className="text-xs text-neutral-200 font-semibold cursor-pointer">
            I confirm I personally placed a phone call to {verifiedWith} at {verifiedPhone} and verified the ABA routing number and account number digits.
          </label>
        </div>

        {verbalConfirmed && coordination.verbalVerifiedAt && (
          <p className="text-[10px] text-emerald-400 font-mono">
            Verbal signoff logged at {new Date(coordination.verbalVerifiedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Dispatch Action & Escrow Confirmation */}
      <div className="mt-4 border-t border-neutral-800 pt-4">
        {!isDispatched ? (
          <form onSubmit={handleDispatchPayment} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Bank Wire / Check Reference Number
                </label>
                <input
                  type="text"
                  required
                  data-testid="wire-ref-input"
                  placeholder="e.g. FED-WIRE-9482019"
                  value={wireRefNumber}
                  onChange={(e) => setWireRefNumber(e.target.value)}
                  disabled={!verbalConfirmed}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Upload Wire Receipt / Fed Reference Doc
                </label>
                <input
                  type="text"
                  data-testid="wire-proof-doc-input"
                  placeholder="e.g. Chase_Outgoing_Wire_Receipt.pdf"
                  value={proofDocName}
                  onChange={(e) => setProofDocName(e.target.value)}
                  disabled={!verbalConfirmed}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="rounded-none min-h-[44px] px-5 text-xs"
                disabled={!verbalConfirmed}
                data-testid="dispatch-funds-btn"
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">send</span>
                Confirm Funds Dispatched to Escrow
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/40 p-4 rounded-none border border-neutral-800 text-xs">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Closing Funds Dispatched to Escrow ({formatCurrency(totalCashToClose)})</span>
              </div>
              <p className="text-neutral-400 text-[11px] mt-0.5">
                Reference: <strong className="text-white">{coordination.dispatchReferenceNumber}</strong>
                {coordination.dispatchedAt && ` · Dispatched on ${new Date(coordination.dispatchedAt).toLocaleDateString()}`}
              </p>
            </div>

            <div>
              {isConfirmed ? (
                <span className="rounded-none border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Funds Cleared & Logged by Escrow
                </span>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-none min-h-[44px] px-4 text-xs"
                  onClick={handleEscrowConfirmFunds}
                  data-testid="escrow-confirm-receipt-btn"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1.5">done_all</span>
                  Record Escrow Wire Confirmation
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
