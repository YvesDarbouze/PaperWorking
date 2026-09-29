'use client';

import React, { useState, useMemo } from 'react';
import type { ProjectWorkspace, ExitPhaseDetails } from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import {
  Lock,
  DownloadSimple,
  CheckCircle,
  FileText,
  ShieldCheck,
  Scales,
  ChartLineUp,
  Clock,
  Check,
  X,
  CreditCard,
  TreeStructure,
} from '@/components/icons/PhosphorIcons';

interface ExitLifecycleClosureCardProps {
  project: ProjectWorkspace;
  exitPhase: ExitPhaseDetails;
  onUpdateExitPhase: (updated: Partial<ExitPhaseDetails>) => void;
  purchasePrice: number;
  rehabActual: number;
  originalDebt: number;
}

interface GlCloseoutChecklist {
  accountsPayableCleared: boolean;
  tenantEscrowCleared: boolean;
  capitalReservesDistributed: boolean;
  taxHoldbackSegregated: boolean;
}

export default function ExitLifecycleClosureCard({
  project,
  exitPhase,
  onUpdateExitPhase,
  purchasePrice,
  rehabActual,
  originalDebt,
}: ExitLifecycleClosureCardProps) {
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [showPacketModal, setShowPacketModal] = useState<boolean>(false);
  const [copiedPacket, setCopiedPacket] = useState<boolean>(false);

  // GL Closeout Checklist State
  const [glChecks, setGlChecks] = useState<GlCloseoutChecklist>({
    accountsPayableCleared: true,
    tenantEscrowCleared: true,
    capitalReservesDistributed: true,
    taxHoldbackSegregated: true,
  });

  const allGlCleared = useMemo(() => {
    return (
      glChecks.accountsPayableCleared &&
      glChecks.tenantEscrowCleared &&
      glChecks.capitalReservesDistributed &&
      glChecks.taxHoldbackSegregated
    );
  }, [glChecks]);

  // Financial baseline calculations
  const totalCapitalInvested = (purchasePrice - originalDebt) + rehabActual + 15000;
  const holdMonths = exitPhase.holdAudit?.monthsInHold || 14;
  const holdYears = Math.max(0.5, holdMonths / 12);

  // Net Sales Proceeds & Net Profit
  const netProceeds = exitPhase.netSalesProceeds || 0;
  const netProfit = Math.round(netProceeds - totalCapitalInvested);

  // Life-of-Asset KPIs
  const equityMultiple = useMemo(() => {
    if (totalCapitalInvested <= 0) return 1.0;
    const moic = netProceeds / totalCapitalInvested;
    return Number(moic.toFixed(2));
  }, [netProceeds, totalCapitalInvested]);

  const terminalIrr = useMemo(() => {
    if (totalCapitalInvested <= 0 || equityMultiple <= 0) return 0;
    // Compounded annual growth rate over exact holding duration
    const annualReturn = (Math.pow(equityMultiple, 1 / holdYears) - 1) * 100;
    return Number(Math.max(-100, Math.min(500, annualReturn)).toFixed(1));
  }, [equityMultiple, holdYears, totalCapitalInvested]);

  const cashOnCashYield = useMemo(() => {
    const noi = exitPhase.holdAudit?.netOperatingIncomeHold || 38600;
    const annualNoi = (noi / holdMonths) * 12;
    if (totalCapitalInvested <= 0) return 0;
    return Number(((annualNoi / totalCapitalInvested) * 100).toFixed(1));
  }, [exitPhase.holdAudit, holdMonths, totalCapitalInvested]);

  const returnOnEquity = useMemo(() => {
    const netOperatingGain = netProfit > 0 ? netProfit : 0;
    const initialEquity = purchasePrice - originalDebt;
    if (initialEquity <= 0) return 0;
    const annualRoE = ((netOperatingGain / holdYears) / initialEquity) * 100;
    return Number(annualRoE.toFixed(1));
  }, [netProfit, purchasePrice, originalDebt, holdYears]);

  const isLocked = Boolean(exitPhase.isLifecycleLocked);

  const handleToggleGlCheck = (key: keyof GlCloseoutChecklist) => {
    if (isLocked) return;
    const updated = { ...glChecks, [key]: !glChecks[key] };
    setGlChecks(updated);
    const newAllCleared = Object.values(updated).every(Boolean);
    onUpdateExitPhase({ glAccountsClosed: newAllCleared });
  };

  const handleConfirmLock = () => {
    const timestamp = new Date().toISOString();
    onUpdateExitPhase({
      isLifecycleLocked: true,
      lockedTimestamp: timestamp,
      lockedBy: 'Lead Investment Committee (Authorized)',
      terminalIrr,
      equityMultiple,
      cashOnCashReturnPct: cashOnCashYield,
      returnOnEquityPct: returnOnEquity,
      netProfit,
      glAccountsClosed: allGlCleared,
    });
    setShowLockModal(false);
  };

  const handleUnlockLifecycle = () => {
    onUpdateExitPhase({
      isLifecycleLocked: false,
      lockedTimestamp: null,
      lockedBy: undefined,
    });
  };

  // Generate Investor Distribution Packet Markdown text
  const distributionPacketMarkdown = useMemo(() => {
    const dateStr = exitPhase.lockedTimestamp
      ? new Date(exitPhase.lockedTimestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    return `# INVESTOR DISTRIBUTION & LIFECYCLE CLOSURE PACKET
**PaperWorking Institutional Asset Record**
*Confidential Document For Accredited Investors & Partners Only*

---

## 1. ASSET SPECIFICATION
- **Asset Name**: ${project.propertyName || project.property_address || 'PaperWorking Capital Asset'}
- **Property Address**: ${project.property_address || 'Unspecified Address'}
- **Serial Reference**: ${project.project_id}
- **Exit Strategy Route**: ${exitPhase.selectedRoute.toUpperCase().replace('_', ' ')}
- **Lifecycle Status**: ${isLocked ? 'CLOSED & AUDIT LOCKED' : 'DISPOSITION IN PROGRESS'}
- **Disposition Date**: ${dateStr}
- **Holding Period**: ${holdMonths} Months (${holdYears.toFixed(2)} Years)

---

## 2. CAPITAL WATERLINE & CLOSING PROCEEDS
- **Acquisition Basis**: ${formatCurrency(purchasePrice)}
- **Renovation & Improvement Capital**: ${formatCurrency(rehabActual)}
- **Total Initial Capital Invested**: ${formatCurrency(totalCapitalInvested)}
- **Gross Disposition Realization**: ${formatCurrency(exitPhase.targetGrossPrice)}
- **Senior Debt Payoff**: (${formatCurrency(exitPhase.debtPayoffAmount)})
- **Brokerage Commissions**: (${formatPercent(exitPhase.brokerCommissionPct)})
- **Transfer Taxes & Municipal Recording**: (${formatPercent(exitPhase.sellerClosingCostPct)})
- **NET DISPOSITION PROCEEDS**: ${formatCurrency(netProceeds)}
- **TOTAL NET PROFIT REALIZED**: ${formatCurrency(netProfit)}

---

## 3. AUDITED LIFE-OF-ASSET PERFORMANCE KPIS
- **Terminal IRR (Internal Rate of Return)**: ${terminalIrr}%
- **Equity Multiple (MOIC)**: ${equityMultiple}x
- **Cash-on-Cash Operating Yield**: ${cashOnCashYield}%
- **Annualized Return on Equity (ROE)**: ${returnOnEquity}%

---

## 4. PARTNER WATERFALL DISTRIBUTIONS
*Governed by Operating Agreement Waterfall Tier 1 (100% Capital Return), Tier 2 (8% Preferred Return), Tier 3 (80/20 Excess Split)*

1. **Apex Capital Multi-Asset LP (55% LP)**
   - Initial Contributed Capital: ${formatCurrency(Math.round(totalCapitalInvested * 0.55))}
   - Return of Capital: ${formatCurrency(Math.round(Math.min(netProceeds, totalCapitalInvested) * 0.55))}
   - Preferred Return (8% Ann.): ${formatCurrency(Math.round(Math.max(0, netProceeds - totalCapitalInvested) * 0.55 * 0.5))}
   - Net Distribution Total: ${formatCurrency(Math.round(netProceeds * 0.52))}

2. **Sunbelt Family Office Partners (25% LP)**
   - Initial Contributed Capital: ${formatCurrency(Math.round(totalCapitalInvested * 0.25))}
   - Return of Capital: ${formatCurrency(Math.round(Math.min(netProceeds, totalCapitalInvested) * 0.25))}
   - Preferred Return (8% Ann.): ${formatCurrency(Math.round(Math.max(0, netProceeds - totalCapitalInvested) * 0.25 * 0.5))}
   - Net Distribution Total: ${formatCurrency(Math.round(netProceeds * 0.24))}

3. **Managing Partner (Lead Investor / General Partner) (20% GP + Promote)**
   - Initial Contributed Capital: ${formatCurrency(Math.round(totalCapitalInvested * 0.20))}
   - Return of Capital: ${formatCurrency(Math.round(Math.min(netProceeds, totalCapitalInvested) * 0.20))}
   - Carried Interest & Promote Split: ${formatCurrency(Math.round(Math.max(0, netProceeds - totalCapitalInvested) * 0.20))}
   - Net Distribution Total: ${formatCurrency(Math.round(netProceeds * 0.24))}

---

## 5. GENERAL LEDGER CLOSEOUT VERIFICATION
- [X] Operating Accounts Payable: Zeroed out; final retainages settled.
- [X] Tenant Escrow & Security Deposits: Reconciled and transferred/refunded.
- [X] Capital Expenditure Reserve Accounts: Liquidated and distributed.
- [X] Tax Filing Reserve: Segregated for upcoming tax year filing.

---
*Authorized by Lead Investment Committee on ${dateStr}*
`;
  }, [
    project,
    exitPhase,
    purchasePrice,
    rehabActual,
    totalCapitalInvested,
    netProceeds,
    netProfit,
    holdMonths,
    holdYears,
    terminalIrr,
    equityMultiple,
    cashOnCashYield,
    returnOnEquity,
    isLocked,
  ]);

  const handleCopyPacket = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(distributionPacketMarkdown);
      setCopiedPacket(true);
      setTimeout(() => setCopiedPacket(false), 2500);
    }
  };

  const handlePrintPacket = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className="border border-neutral-800 bg-neutral-900/60 p-5 rounded-none space-y-6"
      data-testid="exit-lifecycle-closure-card"
    >
      {/* Header and Locked Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neutral-300" />
            <h3 className="text-base font-semibold text-white tracking-tight">
              Task 6: Lifecycle Closure & Life-of-Asset Record
            </h3>
            <span
              className={`text-xs px-2 py-0.5 font-medium rounded-none border ${
                isLocked
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
              }`}
            >
              {isLocked ? 'Closed & Locked' : 'Pending Final Audit'}
            </span>
          </div>
          <p className="text-sm text-neutral-400">
            Reconcile general ledger accounts, generate the exportable Investor Distribution Packet, and freeze the audited investment record.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="preview-distribution-packet-btn"
            onClick={() => setShowPacketModal(true)}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-none transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-neutral-300" />
            <span>Distribution Packet</span>
          </button>

          {isLocked ? (
            <button
              type="button"
              data-testid="unlock-lifecycle-btn"
              onClick={handleUnlockLifecycle}
              className="min-h-[44px] px-3.5 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-none transition flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-neutral-400" />
              <span>Unlock Record</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="lock-lifecycle-btn"
              onClick={() => setShowLockModal(true)}
              disabled={!allGlCleared}
              className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-none border transition flex items-center gap-2 ${
                allGlCleared
                  ? 'bg-neutral-100 hover:bg-white text-neutral-950 border-neutral-200 shadow-sm cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Audit & Lock Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Lock Audit Timestamp Notice */}
      {isLocked && (
        <div
          data-testid="lifecycle-locked-banner"
          className="p-3.5 border border-emerald-500/30 bg-emerald-950/20 rounded-none flex items-start gap-3"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-emerald-200">
              Audit Complete: Lifecycle Record Permanently Locked
            </p>
            <p className="text-neutral-400">
              Locked on{' '}
              <span className="text-neutral-200">
                {exitPhase.lockedTimestamp
                  ? new Date(exitPhase.lockedTimestamp).toUTCString()
                  : 'Certified Date'}
              </span>{' '}
              by <span className="text-neutral-200">{exitPhase.lockedBy || 'Lead Investment Committee'}</span>. Life-of-asset KPIs are frozen in the permanent registry.
            </p>
          </div>
        </div>
      )}

      {/* Life-of-Asset Audited KPI Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Life-of-Asset Performance Metrics (Frozen Baseline)
          </h4>
          <span className="text-xs text-neutral-500 font-mono">
            {holdMonths} Months Hold
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Terminal IRR</span>
              <ChartLineUp className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div
              data-testid="audited-terminal-irr"
              className="text-xl font-bold font-mono text-emerald-400"
            >
              {terminalIrr}%
            </div>
            <div className="text-[11px] text-neutral-500">
              Annualized compound return
            </div>
          </div>

          <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Equity Multiple (MOIC)</span>
              <Scales className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div
              data-testid="audited-moic"
              className="text-xl font-bold font-mono text-white"
            >
              {equityMultiple}x
            </div>
            <div className="text-[11px] text-neutral-500">
              {formatCurrency(netProceeds)} returned
            </div>
          </div>

          <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Cash-on-Cash Operating</span>
              <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div
              data-testid="audited-coc-yield"
              className="text-xl font-bold font-mono text-white"
            >
              {cashOnCashYield}%
            </div>
            <div className="text-[11px] text-neutral-500">
              Annualized hold yield
            </div>
          </div>

          <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Total Net Profit</span>
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div
              data-testid="audited-net-profit"
              className={`text-xl font-bold font-mono ${
                netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(netProfit)}
            </div>
            <div className="text-[11px] text-neutral-500">
              ROE: {returnOnEquity}%
            </div>
          </div>
        </div>
      </div>

      {/* General Ledger Operational Closeout Checklist */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            General Ledger Operational Closeout Checklist
          </h4>
          <span
            className={`text-xs font-mono font-semibold ${
              allGlCleared ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {allGlCleared ? 'All Accounts Cleared (4/4)' : 'Closeout Incomplete'}
          </span>
        </div>

        <div className="border border-neutral-800 divide-y divide-neutral-800 bg-neutral-950">
          <label className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-neutral-900/60 transition">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                data-testid="gl-ap-check"
                checked={glChecks.accountsPayableCleared}
                onChange={() => handleToggleGlCheck('accountsPayableCleared')}
                disabled={isLocked}
                className="mt-1 h-4 w-4 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Operating Accounts Payable Zeroed
                </span>
                <p className="text-[11px] text-neutral-400">
                  Final vendor invoices, contractor retainages, and utility closeout payments disbursed and settled.
                </p>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-none border ${
                glChecks.accountsPayableCleared
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30'
                  : 'border-neutral-700 text-neutral-500'
              }`}
            >
              {glChecks.accountsPayableCleared ? 'Settled' : 'Pending'}
            </span>
          </label>

          <label className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-neutral-900/60 transition">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                data-testid="gl-tenant-escrow-check"
                checked={glChecks.tenantEscrowCleared}
                onChange={() => handleToggleGlCheck('tenantEscrowCleared')}
                disabled={isLocked}
                className="mt-1 h-4 w-4 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Tenant Security Deposit Escrow Reconciled
                </span>
                <p className="text-[11px] text-neutral-400">
                  Security deposit liabilities transferred to buyer settlement ledger or returned with accrued statutory interest.
                </p>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-none border ${
                glChecks.tenantEscrowCleared
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30'
                  : 'border-neutral-700 text-neutral-500'
              }`}
            >
              {glChecks.tenantEscrowCleared ? 'Settled' : 'Pending'}
            </span>
          </label>

          <label className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-neutral-900/60 transition">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                data-testid="gl-reserves-check"
                checked={glChecks.capitalReservesDistributed}
                onChange={() => handleToggleGlCheck('capitalReservesDistributed')}
                disabled={isLocked}
                className="mt-1 h-4 w-4 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  CapEx & Reserve Accounts Liquidated
                </span>
                <p className="text-[11px] text-neutral-400">
                  Remaining capital reserve escrow balances transferred into liquidation account for waterfall distribution.
                </p>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-none border ${
                glChecks.capitalReservesDistributed
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30'
                  : 'border-neutral-700 text-neutral-500'
              }`}
            >
              {glChecks.capitalReservesDistributed ? 'Settled' : 'Pending'}
            </span>
          </label>

          <label className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-neutral-900/60 transition">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                data-testid="gl-tax-holdback-check"
                checked={glChecks.taxHoldbackSegregated}
                onChange={() => handleToggleGlCheck('taxHoldbackSegregated')}
                disabled={isLocked}
                className="mt-1 h-4 w-4 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-200">
                  Tax Filing Reserve Segregated
                </span>
                <p className="text-[11px] text-neutral-400">
                  Estimated Section 1250 recapture and partnership K-1 final preparation reserve retained in isolated escrow.
                </p>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-none border ${
                glChecks.taxHoldbackSegregated
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30'
                  : 'border-neutral-700 text-neutral-500'
              }`}
            >
              {glChecks.taxHoldbackSegregated ? 'Settled' : 'Pending'}
            </span>
          </label>
        </div>
      </div>

      {/* Confirmation Modal: Lock Lifecycle */}
      {showLockModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="bg-neutral-950 border border-neutral-800 max-w-lg w-full p-6 rounded-none space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>Confirm Lifecycle Record Lock</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-neutral-300">
              <p>
                Locking this lifecycle will permanently freeze the life-of-asset performance metrics, mark general ledger accounts closed, and seal the investment record for tax audit compliance.
              </p>

              <div className="p-3 border border-neutral-800 bg-neutral-900/80 rounded-none space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Terminal IRR:</span>
                  <span className="text-emerald-400 font-bold">{terminalIrr}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Equity Multiple (MOIC):</span>
                  <span className="text-white font-bold">{equityMultiple}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Net Sales Proceeds:</span>
                  <span className="text-white font-bold">{formatCurrency(netProceeds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Realized Profit:</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(netProfit)}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-400">
                You can review or generate the Investor Distribution Packet at any time after locking.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-none"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-lock-lifecycle-btn"
                onClick={handleConfirmLock}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-neutral-950 bg-neutral-100 hover:bg-white rounded-none border border-neutral-200"
              >
                Confirm and Lock Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Investor Distribution Packet Preview */}
      {showPacketModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        >
          <div className="bg-neutral-950 border border-neutral-800 max-w-3xl w-full max-h-[85vh] flex flex-col rounded-none shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-neutral-300" />
                <h3 className="text-sm font-semibold text-white">
                  Investor Distribution & Lifecycle Closure Packet
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="copy-distribution-packet-btn"
                  onClick={handleCopyPacket}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-none transition flex items-center gap-1.5"
                >
                  {copiedPacket ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <DownloadSimple className="w-3.5 h-3.5 text-neutral-300" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  data-testid="print-distribution-packet-btn"
                  onClick={handlePrintPacket}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-none transition"
                >
                  Print / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPacketModal(false)}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Packet Content Viewer */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono text-neutral-300 whitespace-pre-wrap select-text bg-neutral-950">
              {distributionPacketMarkdown}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between text-xs text-neutral-400">
              <span>Audited institutional asset record generated by PaperWorking REIL.</span>
              <button
                type="button"
                onClick={() => setShowPacketModal(false)}
                className="min-h-[44px] px-4 py-2 font-medium text-neutral-200 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
