'use client';

import React, { useState, useMemo } from 'react';
import type {
  ProjectWorkspace,
  ExitPhaseDetails,
  ExitStrategyRoute,
  StateTransferTaxOverride,
  TenantEstoppelCertificate,
} from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import {
  CaretRight,
  CaretLeft,
  CheckCircle,
  FileText,
  ShieldCheck,
  Scales,
  ChartLineUp,
  Clock,
  Check,
  CreditCard,
  Lock,
  ArrowRight,
  Info,
} from '@/components/icons/PhosphorIcons';
import {
  resolveStateTransferTax,
  DEFAULT_HOLD_AUDIT,
  DEFAULT_TENANT_RECONCILIATION,
  DEFAULT_ESTOPPELS,
  DEFAULT_VDR_ASSETS,
  DEFAULT_OUTRIGHT_SALE,
  DEFAULT_REFINANCE_RETAIN,
  DEFAULT_CONDO_SELLOFF,
  DEFAULT_COOP_SELLOFF,
  DEFAULT_LEASE_OPTION,
  DEFAULT_EXCHANGE_1031,
  DEFAULT_FUND_HANDOVER_BASELINE,
} from './types';

export interface ExitConversationalEngineProps {
  project: ProjectWorkspace;
  onUpdateProject: (updated: ProjectWorkspace) => void;
  onSwitchToExecutiveView: () => void;
  userTier?: string;
  propertyState?: string;
}

export type ExitConversationalStepId =
  | 'strategy_selection'
  | 'audit_precheck'
  | 'valuation_baseline'
  | 'execution_milestones'
  | 'tax_waterfall'
  | 'lifecycle_closure';

interface StepConfig {
  id: ExitConversationalStepId;
  title: string;
  subtitle: string;
  whyThisMatters: string;
  requiredDocument: string;
  assignedRole: string;
}

const EXIT_STEPS: StepConfig[] = [
  {
    id: 'strategy_selection',
    title: '1. Exit Route Selection',
    subtitle: 'Select the optimal disposition strategy for this asset',
    whyThisMatters:
      'The selected route governs how return metrics are reported. Outright Sale and 1031 Exchange measure terminal liquidation, whereas Refinance and Retain hands back to active Hold with ongoing DSCR, Cash-on-Cash yield, and ROE.',
    requiredDocument: 'Investment Committee Disposition Mandate & IC Resolution',
    assignedRole: 'Lead Acquisition & Disposition Officer',
  },
  {
    id: 'audit_precheck',
    title: '2. Data Audit & Asset Stabilization Pre-Check',
    subtitle: 'Reconcile Hold phase operating records, tenant deposits, and virtual data room',
    whyThisMatters:
      'Institutional buyers and lenders scrutinize trailing revenue, security deposits, and tenant estoppels before underwriting. Clear records prevent closing holdbacks and price retrades.',
    requiredDocument: 'Certified Rent Roll, T-12 Operating Statement, Tenant Estoppels',
    assignedRole: 'Asset Manager & Property Accountant',
  },
  {
    id: 'valuation_baseline',
    title: '3. Valuation & Financial Baseline Setup',
    subtitle: 'Establish disposition pricing, 50-state statutory transfer taxes, and payoff demand',
    whyThisMatters:
      'Transfer taxes vary from 0.00% to 4.00% by state, and municipal surtaxes can add another 1% to 2%. Accurate accounting prevents last-minute net equity shortfalls at the closing table.',
    requiredDocument: 'Broker Opinion of Value (BOV) & Senior Lender Payoff Demand Letter',
    assignedRole: 'Capital Markets & Title Escrow Officer',
  },
  {
    id: 'execution_milestones',
    title: '4. Strategy-Specific Execution Milestones',
    subtitle: 'Execute transaction workflows according to the selected disposition route',
    whyThisMatters:
      'Each route requires distinct legal covenants: Offering Memorandums for sales, DSCR packages for refis, Master Deeds for condo sell-offs, and Qualified Intermediary escrows for 1031 exchanges.',
    requiredDocument: 'Executed Purchase & Sale Agreement or Refinance Loan Commitment',
    assignedRole: 'Transaction Manager & Closing Counsel',
  },
  {
    id: 'tax_waterfall',
    title: '5. Accounting, Tax Recapture & Waterfall Distributions',
    subtitle: 'Calculate Section 1250 depreciation recapture, capital gains, and partner distributions',
    whyThisMatters:
      'Depreciation recapture is taxed at 25% federally unless deferred through a Section 1031 exchange. Equity proceeds must strictly honor preferred returns and LP promote hurdles.',
    requiredDocument: 'Tax Basis Schedule & Partnership Waterfall Distribution Ledger',
    assignedRole: 'CPA & Managing Partner',
  },
  {
    id: 'lifecycle_closure',
    title: '6. Lifecycle Closure & Life-of-Asset Performance Record',
    subtitle: 'Close operational GL accounts, lock audited KPIs, and issue the Investor Distribution Packet',
    whyThisMatters:
      'Permanently archiving the life-of-asset performance metrics (IRR, MOIC, CoC, ROE) provides the verifiable audit trail expected by institutional LP investors and lenders.',
    requiredDocument: 'Final Certified Settlement Statement (ALTA/HUD-1) & GL Closeout Ledger',
    assignedRole: 'Managing Partner (Lead Investor)',
  },
];

export default function ExitConversationalEngine({
  project,
  onUpdateProject,
  onSwitchToExecutiveView,
  userTier = 'Investment Team',
  propertyState = 'TX',
}: ExitConversationalEngineProps) {
  const purchasePrice = project.purchasePrice || 485000;
  const rehabActual = project.rehab_costs || 65000;
  const originalDebt = project.funding?.loanAmount || Math.round(purchasePrice * 0.75);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const currentStep = EXIT_STEPS[currentStepIndex];

  // Strategy Route
  const [selectedRoute, setSelectedRoute] = useState<ExitStrategyRoute>(
    project.exitPhase?.selectedRoute || 'outright_sale'
  );

  // Valuation baseline inputs
  const [targetGrossPrice, setTargetGrossPrice] = useState<number>(
    project.exitPhase?.targetGrossPrice || Math.round(purchasePrice * 1.42)
  );
  const [brokerCommissionPct, setBrokerCommissionPct] = useState<number>(
    project.exitPhase?.brokerCommissionPct ?? 5.0
  );
  const [debtPayoffAmount, setDebtPayoffAmount] = useState<number>(
    project.exitPhase?.debtPayoffAmount ?? originalDebt
  );
  const [proratedTaxes, setProratedTaxes] = useState<number>(
    project.exitPhase?.proratedTaxes ?? 3400
  );

  // State Transfer Tax
  const stateCode = project.propertyState || propertyState || 'TX';
  const benchmark = resolveStateTransferTax(stateCode);
  const [transferTaxOverride, setTransferTaxOverride] = useState<StateTransferTaxOverride>(
    project.exitPhase?.stateTransferTax || {
      stateCode: benchmark.stateCode,
      stateName: benchmark.stateName,
      statutoryRatePct: benchmark.statutoryRatePct,
      paidBy: benchmark.paidByDefault,
      recordingFeeFlat: benchmark.recordingFeeFlat,
      isCustomOverrideActive: false,
      notes: benchmark.notes,
    }
  );

  // Tenant estoppels state
  const [estoppels, setEstoppels] = useState<TenantEstoppelCertificate[]>(
    project.exitPhase?.estoppelCertificates || DEFAULT_ESTOPPELS
  );

  // General Ledger Closeout Checks
  const [glChecks, setGlChecks] = useState({
    accountsPayableCleared: true,
    tenantEscrowCleared: true,
    capitalReservesDistributed: true,
    taxHoldbackSegregated: true,
  });

  // Calculate Net Proceeds
  const effectiveTransferRatePct = transferTaxOverride.isCustomOverrideActive
    ? transferTaxOverride.customRatePct ?? transferTaxOverride.statutoryRatePct
    : transferTaxOverride.statutoryRatePct;

  const sellerTransferPortion =
    transferTaxOverride.paidBy === 'split_50_50'
      ? effectiveTransferRatePct / 2
      : transferTaxOverride.paidBy === 'buyer'
      ? 0
      : effectiveTransferRatePct;

  const totalTransferTaxes = Math.round((targetGrossPrice * sellerTransferPortion) / 100);
  const brokerCommissions = Math.round((targetGrossPrice * brokerCommissionPct) / 100);
  const totalDispositionFees =
    brokerCommissions + totalTransferTaxes + transferTaxOverride.recordingFeeFlat + proratedTaxes;
  const netSalesProceeds = Math.max(0, targetGrossPrice - totalDispositionFees - debtPayoffAmount);

  // Capital & Performance KPIs
  const totalCapitalInvested = (purchasePrice - originalDebt) + rehabActual + 15000;
  const holdMonths = project.exitPhase?.holdAudit?.monthsInHold || 14;
  const holdYears = Math.max(0.5, holdMonths / 12);
  const netProfit = Math.round(netSalesProceeds - totalCapitalInvested);

  const equityMultiple = useMemo(() => {
    if (totalCapitalInvested <= 0) return 1.0;
    return Number((netSalesProceeds / totalCapitalInvested).toFixed(2));
  }, [netSalesProceeds, totalCapitalInvested]);

  const terminalIrr = useMemo(() => {
    if (totalCapitalInvested <= 0 || equityMultiple <= 0) return 0;
    const annualRate = (Math.pow(equityMultiple, 1 / holdYears) - 1) * 100;
    return Number(Math.max(-100, Math.min(500, annualRate)).toFixed(1));
  }, [equityMultiple, holdYears, totalCapitalInvested]);

  const cashOnCashYield = useMemo(() => {
    const noi = project.exitPhase?.holdAudit?.netOperatingIncomeHold || 38600;
    const annualNoi = (noi / holdMonths) * 12;
    if (totalCapitalInvested <= 0) return 0;
    return Number(((annualNoi / totalCapitalInvested) * 100).toFixed(1));
  }, [project.exitPhase?.holdAudit, holdMonths, totalCapitalInvested]);

  const returnOnEquity = useMemo(() => {
    const netOperatingGain = netProfit > 0 ? netProfit : 0;
    const initialEquity = purchasePrice - originalDebt;
    if (initialEquity <= 0) return 0;
    return Number((((netOperatingGain / holdYears) / initialEquity) * 100).toFixed(1));
  }, [netProfit, purchasePrice, originalDebt, holdYears]);

  const isLocked = Boolean(project.exitPhase?.isLifecycleLocked);

  // Toggle estoppel confirmation
  const handleToggleEstoppel = (id: string) => {
    setEstoppels((prev) =>
      prev.map((e) => (e.id === id ? { ...e, confirmedByTenant: !e.confirmedByTenant } : e))
    );
  };

  // Sync state back to project
  const handleSaveAndSync = (markLocked = false) => {
    const allGlCleared = Object.values(glChecks).every(Boolean);
    const updatedExitPhase: ExitPhaseDetails = {
      selectedRoute,
      targetGrossPrice,
      brokerCommissionPct,
      sellerClosingCostPct: Number((sellerTransferPortion + 1.5).toFixed(2)),
      debtPayoffAmount,
      proratedTaxes,
      netSalesProceeds,

      fundHandoverCostBaseline: project.exitPhase?.fundHandoverCostBaseline || DEFAULT_FUND_HANDOVER_BASELINE,

      holdAudit: project.exitPhase?.holdAudit || DEFAULT_HOLD_AUDIT,
      tenantReconciliation: project.exitPhase?.tenantReconciliation || DEFAULT_TENANT_RECONCILIATION,
      estoppelCertificates: estoppels,
      vdrAssets: project.exitPhase?.vdrAssets || DEFAULT_VDR_ASSETS,

      stateTransferTax: transferTaxOverride,

      outrightSale: project.exitPhase?.outrightSale || DEFAULT_OUTRIGHT_SALE,
      refinanceRetain: project.exitPhase?.refinanceRetain || DEFAULT_REFINANCE_RETAIN,
      condoSellOff: project.exitPhase?.condoSellOff || DEFAULT_CONDO_SELLOFF,
      coopSellOff: project.exitPhase?.coopSellOff || DEFAULT_COOP_SELLOFF,
      leaseOption: project.exitPhase?.leaseOption || DEFAULT_LEASE_OPTION,
      exchange1031: project.exitPhase?.exchange1031 || DEFAULT_EXCHANGE_1031,

      terminalIrr,
      equityMultiple,
      cashOnCashReturnPct: cashOnCashYield,
      returnOnEquityPct: returnOnEquity,
      netProfit,
      glAccountsClosed: allGlCleared,
      isLifecycleLocked: markLocked ? true : isLocked,
      lockedTimestamp: markLocked ? new Date().toISOString() : project.exitPhase?.lockedTimestamp,
      lockedBy: markLocked ? 'Lead Investment Committee (Authorized)' : project.exitPhase?.lockedBy,
    };

    onUpdateProject({
      ...project,
      exitPhase: updatedExitPhase,
    });
  };

  const handleNext = () => {
    handleSaveAndSync();
    if (currentStepIndex < EXIT_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onSwitchToExecutiveView();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div
      className="space-y-6 max-w-full overflow-x-hidden font-sans text-neutral-100"
      data-testid="exit-conversational-engine"
    >
      {/* Top Banner: Progressive Disclosure Wizard Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 p-3 rounded-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            Exit Phase Conversational Engine
          </span>
          <span className="border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono text-neutral-300 rounded-none">
            Step {currentStepIndex + 1} of {EXIT_STEPS.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onSwitchToExecutiveView}
          className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-none transition"
        >
          Switch to Executive Workspace
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-900 h-1.5 rounded-none border-b border-neutral-800">
        <div
          className="bg-neutral-200 h-1.5 transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / EXIT_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Main Conversational Card */}
      <div className="border border-neutral-800 bg-neutral-900/60 p-5 rounded-none space-y-6">
        {/* Step Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">{currentStep.title}</h2>
          </div>
          <p className="text-sm text-neutral-300">{currentStep.subtitle}</p>
        </div>

        {/* Why This Matters & Role Context */}
        <div className="p-4 border border-neutral-800 bg-neutral-950 rounded-none space-y-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-neutral-200 uppercase tracking-wider">
                Why this matters for your returns
              </span>
              <p className="text-neutral-400 leading-relaxed">{currentStep.whyThisMatters}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-neutral-850 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
            <div>
              <span className="text-neutral-500">Required Evidence: </span>
              <span className="text-neutral-300 font-medium">{currentStep.requiredDocument}</span>
            </div>
            <div>
              <span className="text-neutral-500">Signoff Role: </span>
              <span className="text-neutral-300 font-medium">{currentStep.assignedRole}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Step Content */}
        <div className="space-y-4">
          {/* STEP 1: ROUTE SELECTION */}
          {currentStep.id === 'strategy_selection' && (
            <div className="space-y-5" data-testid="step-strategy-selection">
              {/* Fund-to-Exit Handover Cost Baseline Card */}
              <div className="border border-border bg-muted/20 p-4 rounded-none space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-none bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-mono uppercase font-bold">
                      Fund Phase Verified Baseline
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Acquisition &amp; Capital Stack Inception
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Ownership Transferred / Revenue Commenced
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-card border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block">Purchase Price</span>
                    <strong className="text-foreground text-sm block mt-0.5">{formatCurrency(purchasePrice)}</strong>
                  </div>
                  <div className="bg-card border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block">Senior Loan Facility</span>
                    <strong className="text-foreground text-sm block mt-0.5">{formatCurrency(originalDebt)}</strong>
                  </div>
                  <div className="bg-card border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block">Rehab Invested</span>
                    <strong className="text-foreground text-sm block mt-0.5">{formatCurrency(rehabActual)}</strong>
                  </div>
                  <div className="bg-card border border-border p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block">Total Cash Invested</span>
                    <strong className="text-primary text-sm block mt-0.5">{formatCurrency((purchasePrice - originalDebt) + rehabActual)}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Exit begins the moment ownership transfers or investment revenue commences. All verified purchase prices, loan terms, and initial capital outlays from the Fund phase are inherited directly to power the 33 Portfolio KPIs without redundant input.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300 block mb-2">
                  What kind of closing or disposition are you executing?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      route: 'outright_sale',
                      title: 'Route A: Outright Sale / Flip',
                      desc: 'Full third-party asset sale. Liquidates equity, realizes capital gains, and freezes life-of-asset IRR/MOIC.',
                    },
                    {
                      route: 'refinance_retain',
                      title: 'Route B: Refinance & Retain (BRRRR)',
                      desc: 'Cash-out recapitalization. Shifts asset back to active Hold with ongoing DSCR, Cash-on-Cash yield, and ROE.',
                    },
                    {
                      route: 'condo_selloff',
                      title: 'Route C: Developed Condo Sales',
                      desc: 'Fee-simple individual unit sales, condominium declaration, HOA incorporation, and phased loan release paydowns.',
                    },
                    {
                      route: 'coop_selloff',
                      title: 'Route D: Developed Co-op Sales',
                      desc: 'Housing corporation formation, proprietary lease dispositions, offering plan clearance with state AG, and board reviews.',
                    },
                    {
                      route: 'lease_option',
                      title: 'Route E: Lease-Option Conversion',
                      desc: 'Rent-to-own structure. Accumulates monthly option credits towards strike price purchase.',
                    },
                    {
                      route: '1031_exchange',
                      title: 'Route F: 1031 Tax-Deferred Exchange',
                      desc: 'Section 1031 rollover. Defers §1250 recapture and capital gains with 45-day ID and 180-day closing deadlines.',
                    },
                  ].map((item) => (
                    <button
                      key={item.route}
                      type="button"
                      data-testid={`conversational-route-${item.route}`}
                      onClick={() => setSelectedRoute(item.route as ExitStrategyRoute)}
                      className={`p-3.5 text-left border rounded-none transition flex flex-col justify-between min-h-[110px] ${
                        selectedRoute === item.route
                          ? 'border-neutral-100 bg-neutral-900 text-white ring-1 ring-neutral-200'
                          : 'border-neutral-800 bg-neutral-950/70 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.title}</span>
                          {selectedRoute === item.route && (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AUDIT & PRE-CHECK */}
          {currentStep.id === 'audit_precheck' && (
            <div className="space-y-4" data-testid="step-audit-precheck">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Audited Hold Revenue</span>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {formatCurrency(58400)}
                  </div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Hold Operating Expenses</span>
                  <div className="text-base font-bold font-mono text-rose-400">
                    {formatCurrency(19800)}
                  </div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Hold Net Operating Income</span>
                  <div className="text-base font-bold font-mono text-white">
                    {formatCurrency(38600)}
                  </div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Tenant Deposits Held</span>
                  <div className="text-base font-bold font-mono text-white">
                    {formatCurrency(7600)}
                  </div>
                </div>
              </div>

              {/* Estoppels Confirmation List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Tenant Estoppel Certificates Verification
                </span>
                <div className="border border-neutral-800 divide-y divide-neutral-800 bg-neutral-950">
                  {estoppels.map((est) => (
                    <div
                      key={est.id}
                      className="p-3 flex items-center justify-between hover:bg-neutral-900/50 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-white flex items-center gap-2">
                          <span>{est.unitNumber}</span>
                          <span className="text-neutral-400 font-normal font-mono">
                            {est.tenantName}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Rent: {formatCurrency(est.monthlyRent)}/mo | Deposit:{' '}
                          {formatCurrency(est.securityDepositAmount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleEstoppel(est.id)}
                        className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none border transition flex items-center gap-1.5 ${
                          est.confirmedByTenant
                            ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                        }`}
                      >
                        {est.confirmedByTenant ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Confirmed</span>
                          </>
                        ) : (
                          <span>Pending Signature</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plaid Real-Time Bank & Rent Collection Status */}
              <div className="p-3.5 border border-neutral-800 bg-neutral-950 rounded-none space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                      Plaid Bank Connection & Rent Collection Ledger
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono">
                      Daily Sync Active
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    JPMorgan Chase ••••8492
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Daily automated checks match incoming tenant ACH/Zelle deposits against lease contracts, calculating payment lateness and late fee triggers.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2 border border-neutral-800/80 bg-neutral-900/40">
                    <span className="text-neutral-500 text-[10px] uppercase block">Scheduled Rent</span>
                    <span className="font-mono font-bold text-neutral-200">$4,650.00/mo</span>
                  </div>
                  <div className="p-2 border border-neutral-800/80 bg-neutral-900/40">
                    <span className="text-neutral-500 text-[10px] uppercase block">Plaid Verified Collections</span>
                    <span className="font-mono font-bold text-emerald-400">$4,725.00</span>
                  </div>
                  <div className="p-2 border border-neutral-800/80 bg-neutral-900/40 col-span-2 sm:col-span-1">
                    <span className="text-neutral-500 text-[10px] uppercase block">Lateness Compliance</span>
                    <span className="font-mono font-bold text-neutral-200">1 Late (Fee Paid)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VALUATION & FINANCIAL BASELINE */}
          {currentStep.id === 'valuation_baseline' && (
            <div className="space-y-4" data-testid="step-valuation-baseline">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-medium">
                    Target Gross Disposition Price ($)
                  </label>
                  <input
                    type="number"
                    value={targetGrossPrice}
                    onChange={(e) => setTargetGrossPrice(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-none text-white focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-medium">
                    Brokerage Sales Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={brokerCommissionPct}
                    onChange={(e) => setBrokerCommissionPct(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-none text-white focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-medium">
                    Senior Debt Payoff Demand ($)
                  </label>
                  <input
                    type="number"
                    value={debtPayoffAmount}
                    onChange={(e) => setDebtPayoffAmount(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-none text-white focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-medium">
                    Prorated Property Taxes ($)
                  </label>
                  <input
                    type="number"
                    value={proratedTaxes}
                    onChange={(e) => setProratedTaxes(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-none text-white focus:border-neutral-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* State Transfer Tax Summary */}
              <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-medium">
                    {transferTaxOverride.stateName} Statutory Transfer Tax:
                  </span>
                  <span className="font-mono text-white">
                    {formatPercent(effectiveTransferRatePct)} ({transferTaxOverride.paidBy})
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">{transferTaxOverride.notes}</p>
              </div>

              {/* Net Proceeds Display */}
              <div className="p-4 border border-emerald-500/30 bg-emerald-950/20 rounded-none flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-300 font-medium uppercase tracking-wider">
                    Projected Net Proceeds at Settlement
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {formatCurrency(netSalesProceeds)}
                  </div>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  Total Deductions: {formatCurrency(totalDispositionFees + debtPayoffAmount)}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EXECUTION MILESTONES */}
          {currentStep.id === 'execution_milestones' && (
            <div className="space-y-4" data-testid="step-execution-milestones">
              <div className="p-4 border border-neutral-800 bg-neutral-950 rounded-none space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                    Active Route Milestones: {selectedRoute.toUpperCase().replace('_', ' ')}
                  </h4>
                  <span className="text-xs text-emerald-400 font-mono">In Progress</span>
                </div>

                {selectedRoute === 'outright_sale' && (
                  <div className="text-xs space-y-2 text-neutral-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Offering Memorandum published to private investor syndicate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>8 NDAs executed; purchase and sale agreement signed with buyer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Title deed transfer scheduled for settlement table</span>
                    </div>
                  </div>
                )}

                {selectedRoute === 'refinance_retain' && (
                  <div className="text-xs space-y-2 text-neutral-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Post-rehab appraisal completed at $685,000 (75.0% LTV)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>DSCR loan commitment issued at 6.25% (30-year amortization)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>$138,500 tax-free equity capital extracted for reinvestment</span>
                    </div>
                  </div>
                )}

                {selectedRoute === 'condo_selloff' && (
                  <div className="text-xs space-y-2 text-neutral-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Task 1: Master Deed &amp; survey plats recorded; individual tax parcels established</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Task 2: HOA incorporated &amp; initial reserve account funded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Task 3: Public Offering Statement (POS) disclosure booklet delivered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Task 4: Phased sales gallery closings paying down construction debt</span>
                    </div>
                  </div>
                )}

                {selectedRoute === 'coop_selloff' && (
                  <div className="text-xs space-y-2 text-neutral-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Task 1: Housing Corporation incorporated; master real estate title transferred</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Task 2: Board bylaws, house rules &amp; buyer acceptance standards ratified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Task 3: Cooperative offering plan cleared by State Attorney General</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Task 4: Buyer board packages reviewed; stock shares &amp; proprietary leases issued</span>
                    </div>
                  </div>
                )}

                {selectedRoute === 'lease_option' && (
                  <div className="text-xs space-y-2 text-neutral-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>$25,000 non-refundable option consideration secured</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>$5,400 option credits accumulated toward $695,000 strike price</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Tenant mortgage pre-qualification in underwriting</span>
                    </div>
                  </div>
                )}

                {selectedRoute === '1031_exchange' && (
                  <div className="text-xs space-y-2 text-neutral-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>First American Exchange Co. engaged as Qualified Intermediary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>2 replacement targets identified within statutory 45-day window</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Closing scheduled well within 180-day replacement deadline</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: TAX BASIS & WATERFALL */}
          {currentStep.id === 'tax_waterfall' && (
            <div className="space-y-4" data-testid="step-tax-waterfall">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Total Invested Capital</span>
                  <div className="text-base font-bold font-mono text-white">
                    {formatCurrency(totalCapitalInvested)}
                  </div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Depreciation Recapture</span>
                  <div className="text-base font-bold font-mono text-amber-400">
                    {formatCurrency(21164)}
                  </div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">§1250 Recapture Tax (25%)</span>
                  <div className="text-base font-bold font-mono text-rose-400">
                    {selectedRoute === '1031_exchange' ? '$0 (Deferred)' : formatCurrency(5291)}
                  </div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Net Distributable Cash</span>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {formatCurrency(netSalesProceeds)}
                  </div>
                </div>
              </div>

              {/* Waterfall Tier Summary */}
              <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-neutral-300">
                  Operating Agreement Waterfall Schedule
                </span>
                <div className="space-y-1 text-neutral-400">
                  <p>• Tier 1: 100% Return of Capital to LP and Lead Investors</p>
                  <p>• Tier 2: 8% Annual Preferred Return on unreturned equity</p>
                  <p>• Tier 3: 80% to LP Investors / 20% to Managing Partner (Lead Investor) Promote</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: LIFECYCLE CLOSURE */}
          {currentStep.id === 'lifecycle_closure' && (
            <div className="space-y-4" data-testid="step-lifecycle-closure">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Terminal IRR</span>
                  <div className="text-lg font-bold font-mono text-emerald-400">{terminalIrr}%</div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Equity Multiple</span>
                  <div className="text-lg font-bold font-mono text-white">{equityMultiple}x</div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Total Net Profit</span>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {formatCurrency(netProfit)}
                  </div>
                </div>
                <div className="p-3 border border-neutral-800 bg-neutral-950 rounded-none space-y-1">
                  <span className="text-xs text-neutral-400">Lifecycle Status</span>
                  <div className="text-xs font-bold font-mono text-neutral-200">
                    {isLocked ? 'LOCKED & SEALED' : 'READY TO LOCK'}
                  </div>
                </div>
              </div>

              {/* Final Lock CTA */}
              <div className="p-4 border border-neutral-800 bg-neutral-950 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white">
                    {isLocked ? 'Lifecycle Audited & Locked' : 'Audit Lock Life-of-Asset Record'}
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Freezes performance KPIs, closes general ledger accounts, and certifies investor distribution packets.
                  </p>
                </div>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => handleSaveAndSync(true)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-950 rounded-none border border-neutral-200 transition flex items-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Lock Life-of-Asset Record</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-none border transition flex items-center gap-1.5 ${
              currentStepIndex === 0
                ? 'border-neutral-850 bg-neutral-950 text-neutral-600 cursor-not-allowed'
                : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <CaretLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-950 rounded-none border border-neutral-200 transition flex items-center gap-2"
          >
            <span>
              {currentStepIndex === EXIT_STEPS.length - 1
                ? 'Complete & View Executive Workspace'
                : 'Save & Continue'}
            </span>
            <CaretRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
