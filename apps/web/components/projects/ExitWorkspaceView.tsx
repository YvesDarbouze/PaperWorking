'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type {
  ProjectWorkspace,
  ExitPhaseDetails,
  ExitStrategyRoute,
  StateTransferTaxOverride,
  TenantEstoppelCertificate,
  HoldAuditSummary,
  TenantReconciliation,
  VdrAssetItem,
  OutrightSaleExecutionState,
  RefinanceRetainExecutionState,
  CondoSellOffExecutionState,
  CoopSellOffExecutionState,
  LeaseOptionExecutionState,
  Exchange1031ExecutionState,
  FundHandoverCostBaseline,
  ProjectPlaidLedgerState,
} from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import PropertySatelliteViewer from '@/components/maps/PropertySatelliteViewer';
import PropertyImageGallery from '@/components/projects/PropertyImageGallery';
import AssignOrInviteModal, { type AssigneeOption } from './AssignOrInviteModal';
import {
  ExitStrategySelectorCard,
  ExitDataAuditPreCheckCard,
  ExitValuationFinancialBaselineCard,
  ExitStrategyExecutionCard,
  ExitTaxAccountingWaterfallCard,
  ExitLifecycleClosureCard,
  ExitConversationalEngine,
  ProjectPlaidIntegrationCard,
  ProjectRentRollTrackerCard,
  ProjectHoldingCostTrackerCard,
  ProjectTransactionLedgerCard,
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
  DEFAULT_PROJECT_PLAID_LEDGER,
} from './exit';
import {
  Sliders,
  CheckCircle,
  FileText,
  ShieldCheck,
  Scales,
  ChartLineUp,
  Clock,
  Check,
  X,
  CreditCard,
  Lock,
  DownloadSimple,
  UserPlus,
  Buildings,
  MapPin,
} from '@/components/icons/PhosphorIcons';

export interface ExitWorkspaceViewProps {
  project: ProjectWorkspace;
  onUpdateProject: (updated: ProjectWorkspace) => void;
}

export type ExitExecutiveTab =
  | 'overview'
  | 'plaid_ledger'
  | 'strategy'
  | 'audit'
  | 'valuation'
  | 'execution'
  | 'waterfall'
  | 'closure';

export default function ExitWorkspaceView({
  project,
  onUpdateProject,
}: ExitWorkspaceViewProps) {
  // Baseline asset inputs
  const purchasePrice = project.purchasePrice || project.purchase_price || 485000;
  const rehabActual = project.rehab_costs || 65000;
  const originalDebt = project.funding?.loanAmount || Math.round(purchasePrice * 0.75);

  // View Mode: Conversational vs Executive Workspace
  const [viewMode, setViewMode] = useState<'conversational' | 'workspace'>('workspace');
  const [activeTab, setActiveTab] = useState<ExitExecutiveTab>('overview');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'conversational') {
        setViewMode('conversational');
      }
    }
  }, []);

  // Strategy Route State
  const [selectedRoute, setSelectedRoute] = useState<ExitStrategyRoute>(
    project.exitPhase?.selectedRoute || 'outright_sale'
  );

  // Valuation Baseline State
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

  // State Transfer Tax State
  const stateCode = project.propertyState || 'TX';
  const defaultBenchmark = resolveStateTransferTax(stateCode);
  const [transferTaxOverride, setTransferTaxOverride] = useState<StateTransferTaxOverride>(
    project.exitPhase?.stateTransferTax || {
      stateCode: defaultBenchmark.stateCode,
      stateName: defaultBenchmark.stateName,
      statutoryRatePct: defaultBenchmark.statutoryRatePct,
      paidBy: defaultBenchmark.paidByDefault,
      recordingFeeFlat: defaultBenchmark.recordingFeeFlat,
      isCustomOverrideActive: false,
      notes: defaultBenchmark.notes,
    }
  );

  // Pre-Check Data
  const [holdAudit, setHoldAudit] = useState<HoldAuditSummary>(
    project.exitPhase?.holdAudit || DEFAULT_HOLD_AUDIT
  );
  const [tenantRecon, setTenantRecon] = useState<TenantReconciliation>(
    project.exitPhase?.tenantReconciliation || DEFAULT_TENANT_RECONCILIATION
  );
  const [estoppels, setEstoppels] = useState<TenantEstoppelCertificate[]>(
    project.exitPhase?.estoppelCertificates || DEFAULT_ESTOPPELS
  );
  const [vdrAssets, setVdrAssets] = useState<VdrAssetItem[]>(
    project.exitPhase?.vdrAssets || DEFAULT_VDR_ASSETS
  );

  // Strategy Execution States
  const [outrightSale, setOutrightSale] = useState<OutrightSaleExecutionState>(
    project.exitPhase?.outrightSale || DEFAULT_OUTRIGHT_SALE
  );
  const [refinanceRetain, setRefinanceRetain] = useState<RefinanceRetainExecutionState>(
    project.exitPhase?.refinanceRetain || DEFAULT_REFINANCE_RETAIN
  );
  const [condoSellOff, setCondoSellOff] = useState<CondoSellOffExecutionState>(
    project.exitPhase?.condoSellOff || DEFAULT_CONDO_SELLOFF
  );
  const [coopSellOff, setCoopSellOff] = useState<CoopSellOffExecutionState>(
    project.exitPhase?.coopSellOff || DEFAULT_COOP_SELLOFF
  );
  const [leaseOption, setLeaseOption] = useState<LeaseOptionExecutionState>(
    project.exitPhase?.leaseOption || DEFAULT_LEASE_OPTION
  );
  const [exchange1031, setExchange1031] = useState<Exchange1031ExecutionState>(
    project.exitPhase?.exchange1031 || DEFAULT_EXCHANGE_1031
  );

  // Plaid Bank & Rent Ledger State
  const [plaidLedger, setPlaidLedger] = useState<ProjectPlaidLedgerState>(
    project.exitPhase?.plaidLedger || DEFAULT_PROJECT_PLAID_LEDGER
  );

  // Lifecycle closure and lock state
  const isLifecycleLocked = Boolean(project.exitPhase?.isLifecycleLocked);
  const lockedTimestamp = project.exitPhase?.lockedTimestamp || null;
  const [showConfirmLockModal, setShowConfirmLockModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Disposition Tasks and Team Assignments
  const initialExitTasks = [
    {
      id: 'exit-task-1',
      title: 'Engage commercial listing broker & execute listing agreement',
      assignedTo: 'Lead Underwriter',
      status: 'complete' as const,
    },
    {
      id: 'exit-task-2',
      title: 'Assemble due diligence data room & offering memorandum',
      assignedTo: 'Acquisition Analyst',
      status: 'pending' as const,
    },
    {
      id: 'exit-task-3',
      title: 'Order final title report & boundary survey update',
      assignedTo: '',
      status: 'pending' as const,
    },
    {
      id: 'exit-task-4',
      title: 'Draft closing settlement statement & waterfall distribution model',
      assignedTo: '',
      status: 'pending' as const,
    },
  ];

  const [exitTasks, setExitTasks] = useState(initialExitTasks);
  const [assignTaskModal, setAssignTaskModal] = useState<{
    id: string;
    title: string;
    assignedTo?: string;
  } | null>(null);

  const activeRoster: AssigneeOption[] =
    project.teamMembers && project.teamMembers.length > 0
      ? (project.teamMembers as AssigneeOption[])
      : [
          { id: 'lead', name: 'Lead Underwriter', role: 'Partner' },
          { id: 'analyst', name: 'Acquisition Analyst', role: 'Underwriting' },
          { id: 'cpa', name: 'Tax Advisor', role: 'CPA' },
        ];

  const handleToggleExitTask = (taskId: string) => {
    setExitTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'complete' ? 'pending' : 'complete' } : t
      )
    );
  };

  const handleAssignExitTask = (taskId: string, assigneeName: string) => {
    setExitTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignedTo: assigneeName } : t))
    );
  };

  const handleMemberInvitedAndAssigned = (newMember: AssigneeOption, taskId: string) => {
    const currentMembers = (project.teamMembers || []) as any[];
    const updatedMembers = [...currentMembers, newMember];
    setExitTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignedTo: newMember.name } : t))
    );
    onUpdateProject({
      ...project,
      teamMembers: updatedMembers,
    });
  };

  // Synchronize entire ExitPhaseDetails back into ProjectWorkspace
  const syncExitPhase = (updates: Partial<ExitPhaseDetails>) => {
    const merged: ExitPhaseDetails = {
      selectedRoute: updates.selectedRoute || selectedRoute,
      targetGrossPrice: updates.targetGrossPrice ?? targetGrossPrice,
      brokerCommissionPct: updates.brokerCommissionPct ?? brokerCommissionPct,
      sellerClosingCostPct: updates.sellerClosingCostPct ?? 1.5,
      debtPayoffAmount: updates.debtPayoffAmount ?? debtPayoffAmount,
      proratedTaxes: updates.proratedTaxes ?? proratedTaxes,
      netSalesProceeds: updates.netSalesProceeds ?? recalculatedOutputs.netCashToInvestor,

      fundHandoverCostBaseline: updates.fundHandoverCostBaseline || project.exitPhase?.fundHandoverCostBaseline || DEFAULT_FUND_HANDOVER_BASELINE,

      holdAudit: updates.holdAudit || holdAudit,
      tenantReconciliation: updates.tenantReconciliation || tenantRecon,
      estoppelCertificates: updates.estoppelCertificates || estoppels,
      vdrAssets: updates.vdrAssets || vdrAssets,

      stateTransferTax: updates.stateTransferTax || transferTaxOverride,

      outrightSale: updates.outrightSale || outrightSale,
      refinanceRetain: updates.refinanceRetain || refinanceRetain,
      condoSellOff: updates.condoSellOff || condoSellOff,
      coopSellOff: updates.coopSellOff || coopSellOff,
      leaseOption: updates.leaseOption || leaseOption,
      exchange1031: updates.exchange1031 || exchange1031,

      terminalIrr: updates.terminalIrr ?? recalculatedOutputs.terminalIrr,
      equityMultiple: updates.equityMultiple ?? recalculatedOutputs.equityMultiple,
      cashOnCashReturnPct: updates.cashOnCashReturnPct ?? recalculatedOutputs.cashOnCashYield,
      returnOnEquityPct: updates.returnOnEquityPct ?? recalculatedOutputs.roe,
      netProfit: updates.netProfit ?? recalculatedOutputs.netProfit,
      glAccountsClosed: updates.glAccountsClosed ?? (project.exitPhase?.glAccountsClosed || false),
      isLifecycleLocked: updates.isLifecycleLocked ?? isLifecycleLocked,
      lockedTimestamp: updates.lockedTimestamp !== undefined ? updates.lockedTimestamp : lockedTimestamp,
      lockedBy: updates.lockedBy || project.exitPhase?.lockedBy,
      ...updates,
    };

    onUpdateProject({
      ...project,
      exitPhase: merged,
    });
  };

  // Recalculation engine: computes net proceeds and life-of-asset KPIs
  const recalculatedOutputs = useMemo(() => {
    let grossRealization = targetGrossPrice;
    let totalClosingFees = 0;
    let debtPayoff = debtPayoffAmount;
    let netCashToInvestor = 0;
    let ongoingMonthlyCashFlow = 0;
    let ongoingDscr = 0;

    const effectiveTransferRatePct = transferTaxOverride.isCustomOverrideActive
      ? transferTaxOverride.customRatePct ?? transferTaxOverride.statutoryRatePct
      : transferTaxOverride.statutoryRatePct;

    const sellerTransferPortion =
      transferTaxOverride.paidBy === 'split_50_50'
        ? effectiveTransferRatePct / 2
        : transferTaxOverride.paidBy === 'buyer'
        ? 0
        : effectiveTransferRatePct;

    const transferTaxes = Math.round((targetGrossPrice * sellerTransferPortion) / 100);
    const brokerCommissions = Math.round((targetGrossPrice * brokerCommissionPct) / 100);

    switch (selectedRoute) {
      case 'outright_sale': {
        grossRealization = targetGrossPrice;
        totalClosingFees =
          brokerCommissions + transferTaxes + transferTaxOverride.recordingFeeFlat + proratedTaxes;
        debtPayoff = debtPayoffAmount;
        netCashToInvestor = Math.max(0, grossRealization - totalClosingFees - debtPayoff);
        break;
      }
      case 'refinance_retain': {
        const appraisedVal = refinanceRetain.postRehabAppraisalValue;
        const newLoanAmount = (appraisedVal * refinanceRetain.newLoanLtvPct) / 100;
        const refiClosingCosts = Math.round(newLoanAmount * 0.02);
        grossRealization = newLoanAmount;
        totalClosingFees = refiClosingCosts;
        debtPayoff = debtPayoffAmount;
        netCashToInvestor = Math.max(0, newLoanAmount - refiClosingCosts - debtPayoff);

        const monthlyRate = refinanceRetain.newInterestRatePct / 100 / 12;
        const numPayments = refinanceRetain.newAmortizationYears * 12;
        const monthlyDebtService =
          monthlyRate > 0
            ? (newLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
              (Math.pow(1 + monthlyRate, numPayments) - 1)
            : 0;
        const projectedMonthlyRent = 4200;
        const monthlyOpex = projectedMonthlyRent * 0.35;
        const monthlyNoi = projectedMonthlyRent - monthlyOpex;
        ongoingMonthlyCashFlow = monthlyNoi - monthlyDebtService;
        ongoingDscr = monthlyDebtService > 0 ? monthlyNoi / monthlyDebtService : 1.45;
        break;
      }
      case 'condo_selloff': {
        grossRealization = condoSellOff.totalUnits * condoSellOff.averageUnitPrice;
        const marketingFees = condoSellOff.totalUnits * 4500;
        totalClosingFees = 18000 + marketingFees;
        debtPayoff = debtPayoffAmount;
        netCashToInvestor = Math.max(0, grossRealization - totalClosingFees - debtPayoff);
        break;
      }
      case 'lease_option': {
        const netStrikePrice = leaseOption.strikePrice - leaseOption.accumulatedOptionCredits;
        grossRealization = netStrikePrice + leaseOption.upfrontOptionFee;
        totalClosingFees = Math.round(grossRealization * 0.02);
        debtPayoff = debtPayoffAmount;
        netCashToInvestor = Math.max(0, grossRealization - totalClosingFees - debtPayoff);
        break;
      }
      case '1031_exchange': {
        grossRealization = targetGrossPrice;
        const standardFees = brokerCommissions + transferTaxes + proratedTaxes;
        totalClosingFees = standardFees + 2500; // QI escrow fee
        debtPayoff = debtPayoffAmount;
        netCashToInvestor = Math.max(0, grossRealization - totalClosingFees - debtPayoff - exchange1031.bootAmount);
        break;
      }
    }

    const totalCapitalInvested = (purchasePrice - originalDebt) + rehabActual + 15000;
    const holdMonths = holdAudit.monthsInHold || 14;
    const holdYears = Math.max(0.5, holdMonths / 12);
    const netProfit = Math.round(netCashToInvestor - totalCapitalInvested);

    const equityMultiple =
      totalCapitalInvested > 0 ? Number(((netCashToInvestor) / totalCapitalInvested).toFixed(2)) : 1.0;

    const terminalIrr =
      equityMultiple > 0
        ? Number(((Math.pow(equityMultiple, 1 / holdYears) - 1) * 100).toFixed(1))
        : 0;

    const annualNoi = (holdAudit.netOperatingIncomeHold / holdMonths) * 12;
    const cashOnCashYield =
      totalCapitalInvested > 0 ? Number(((annualNoi / totalCapitalInvested) * 100).toFixed(1)) : 0;

    const initialEquity = purchasePrice - originalDebt;
    const roe =
      initialEquity > 0
        ? Number((((Math.max(0, netProfit) / holdYears) / initialEquity) * 100).toFixed(1))
        : 0;

    const buildingBasis = Math.round(purchasePrice * 0.80);
    const cumulativeDepreciation = Math.round((buildingBasis / 27.5) * holdYears);
    const adjustedCostBasis = purchasePrice + rehabActual - cumulativeDepreciation;
    const recognizedGain = Math.max(0, grossRealization - totalClosingFees - adjustedCostBasis);
    const estimatedDepreciationRecapture =
      selectedRoute === '1031_exchange' ? 0 : Math.round(Math.min(cumulativeDepreciation, recognizedGain) * 0.25);
    const estimatedCapitalGainsTax =
      selectedRoute === '1031_exchange'
        ? 0
        : Math.round(Math.max(0, recognizedGain - Math.min(cumulativeDepreciation, recognizedGain)) * 0.2);

    return {
      grossRealization,
      totalClosingFees,
      debtPayoff,
      netCashToInvestor,
      totalCapitalInvested,
      netProfit,
      equityMultiple,
      terminalIrr,
      cashOnCashYield,
      roe,
      ongoingMonthlyCashFlow,
      ongoingDscr,
      adjustedCostBasis,
      recognizedGain,
      estimatedDepreciationRecapture,
      estimatedCapitalGainsTax,
    };
  }, [
    selectedRoute,
    targetGrossPrice,
    brokerCommissionPct,
    debtPayoffAmount,
    proratedTaxes,
    transferTaxOverride,
    purchasePrice,
    originalDebt,
    rehabActual,
    refinanceRetain,
    condoSellOff,
    leaseOption,
    exchange1031,
    holdAudit,
  ]);

  // Handler: Finalize & Lock REIL Lifecycle
  const handleLockLifecycle = () => {
    const timestamp = new Date().toISOString();
    setShowConfirmLockModal(false);
    syncExitPhase({
      isLifecycleLocked: true,
      lockedTimestamp: timestamp,
      lockedBy: 'Lead Investment Committee (Authorized)',
      terminalIrr: recalculatedOutputs.terminalIrr,
      equityMultiple: recalculatedOutputs.equityMultiple,
      cashOnCashReturnPct: recalculatedOutputs.cashOnCashYield,
      returnOnEquityPct: recalculatedOutputs.roe,
      netProfit: recalculatedOutputs.netProfit,
      netSalesProceeds: recalculatedOutputs.netCashToInvestor,
      glAccountsClosed: true,
    });
  };

  const handleDownloadPacket = () => {
    setExportNotice('Investor Distribution Packet generated and queued for download.');
    setTimeout(() => {
      setExportNotice(null);
      setShowExportModal(false);
    }, 2000);
  };

  // Packaged exitPhase for subcomponents
  const exitPhaseBundle: ExitPhaseDetails = useMemo(() => {
    return {
      selectedRoute,
      targetGrossPrice,
      brokerCommissionPct,
      sellerClosingCostPct: 1.5,
      debtPayoffAmount,
      proratedTaxes,
      netSalesProceeds: recalculatedOutputs.netCashToInvestor,
      holdAudit,
      tenantReconciliation: tenantRecon,
      estoppelCertificates: estoppels,
      vdrAssets,
      stateTransferTax: transferTaxOverride,
      outrightSale,
      refinanceRetain,
      condoSellOff,
      leaseOption,
      exchange1031,
      terminalIrr: recalculatedOutputs.terminalIrr,
      equityMultiple: recalculatedOutputs.equityMultiple,
      cashOnCashReturnPct: recalculatedOutputs.cashOnCashYield,
      returnOnEquityPct: recalculatedOutputs.roe,
      netProfit: recalculatedOutputs.netProfit,
      glAccountsClosed: project.exitPhase?.glAccountsClosed || false,
      isLifecycleLocked,
      lockedTimestamp,
      lockedBy: project.exitPhase?.lockedBy,
    };
  }, [
    selectedRoute,
    targetGrossPrice,
    brokerCommissionPct,
    debtPayoffAmount,
    proratedTaxes,
    recalculatedOutputs,
    holdAudit,
    tenantRecon,
    estoppels,
    vdrAssets,
    transferTaxOverride,
    outrightSale,
    refinanceRetain,
    condoSellOff,
    leaseOption,
    exchange1031,
    isLifecycleLocked,
    lockedTimestamp,
    project.exitPhase,
  ]);

  return (
    <div
      className="space-y-6 w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 overflow-x-hidden font-sans text-neutral-100"
      data-testid="exit-workspace-view"
    >
      {/* Top Mode Switcher Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 p-3 rounded-none">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neutral-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Exit Phase Mode
          </span>
        </div>
        <div className="flex items-center border border-neutral-800 bg-neutral-900/80 p-0.5 rounded-none">
          <button
            type="button"
            data-testid="toggle-conversational-view"
            onClick={() => setViewMode('conversational')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-none transition ${
              viewMode === 'conversational'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            Conversational Walkthrough
          </button>
          <button
            type="button"
            data-testid="toggle-executive-view"
            onClick={() => setViewMode('workspace')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-none transition ${
              viewMode === 'workspace'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            Executive Workspace
          </button>
        </div>
      </div>

      {/* RENDER MODE: Conversational Walkthrough */}
      {viewMode === 'conversational' ? (
        <ExitConversationalEngine
          project={project}
          onUpdateProject={onUpdateProject}
          onSwitchToExecutiveView={() => setViewMode('workspace')}
          propertyState={stateCode}
        />
      ) : (
        /* RENDER MODE: Executive Workspace */
        <>
          {/* Header Card: Asset Overview, Satellite & Gallery */}
          <div
            data-testid="exit-deal-header-card"
            className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-850 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-300 rounded-none">
                    REIL Phase 04: Exit
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 font-medium rounded-none border ${
                      isLifecycleLocked
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                        : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                    }`}
                  >
                    {isLifecycleLocked ? 'Audited & Locked' : 'Disposition Active'}
                  </span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{project.propertyName || project.property_address || 'Capital Asset'}</span>
                </h1>
                <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{project.property_address || 'Address unassigned'}</span>
                  <span className="text-neutral-600 font-mono">({project.project_id})</span>
                </p>
              </div>

              {/* Top KPI Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
                <div className="border border-neutral-800 bg-neutral-900/60 p-2.5 rounded-none text-left">
                  <span className="text-[10px] uppercase text-neutral-400 font-mono block">
                    Net Cash Proceeds
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {formatCurrency(recalculatedOutputs.netCashToInvestor)}
                  </span>
                </div>
                <div className="border border-neutral-800 bg-neutral-900/60 p-2.5 rounded-none text-left">
                  <span className="text-[10px] uppercase text-neutral-400 font-mono block">
                    Terminal IRR
                  </span>
                  <span className="text-base font-bold font-mono text-white">
                    {recalculatedOutputs.terminalIrr}%
                  </span>
                </div>
                <div className="border border-neutral-800 bg-neutral-900/60 p-2.5 rounded-none text-left">
                  <span className="text-[10px] uppercase text-neutral-400 font-mono block">
                    Equity Multiple
                  </span>
                  <span className="text-base font-bold font-mono text-white">
                    {recalculatedOutputs.equityMultiple}x
                  </span>
                </div>
                <div className="border border-neutral-800 bg-neutral-900/60 p-2.5 rounded-none text-left">
                  <span className="text-[10px] uppercase text-neutral-400 font-mono block">
                    Tax Basis
                  </span>
                  <span className="text-base font-bold font-mono text-neutral-300">
                    {formatCurrency(recalculatedOutputs.adjustedCostBasis)}
                  </span>
                </div>
              </div>
            </div>

            {/* Satellite and Gallery Visuals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
              <PropertySatelliteViewer
                address={project.property_address || project.address || 'Austin, TX'}
                lat={(project as any).latitude || 30.2672}
                lng={(project as any).longitude || -97.7431}
                defaultZoom={18}
              />
              <PropertyImageGallery
                projectId={project.project_id || project.id}
                dealAddress={project.property_address || 'Austin, TX'}
                lat={(project as any).latitude || 30.2672}
                lng={(project as any).longitude || -97.7431}
              />
            </div>
          </div>

          {/* Executive Sub-Tabs Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-800 pb-2">
            {[
              { id: 'overview', label: 'All Lifecycle Sections' },
              { id: 'plaid_ledger', label: 'Plaid Bank & Rent Ledger' },
              { id: 'strategy', label: '1. Strategy Route' },
              { id: 'audit', label: '2. Audit & Pre-Check' },
              { id: 'valuation', label: '3. Valuation & Taxes' },
              { id: 'execution', label: '4. Execution Milestones' },
              { id: 'waterfall', label: '5. Waterfall & Tax Basis' },
              { id: 'closure', label: '6. Lifecycle Closure' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ExitExecutiveTab)}
                className={`min-h-[44px] px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-none transition border ${
                  activeTab === tab.id
                    ? 'border-neutral-200 bg-neutral-800 text-white'
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Plaid Real-Time Bank, Rent Collection & Holding Cost Ledger */}
          {(activeTab === 'overview' || activeTab === 'plaid_ledger') && (
            <div className="space-y-6">
              <ProjectPlaidIntegrationCard
                projectId={project.project_id || project.id}
                projectName={project.property_address || project.address || 'Target Property'}
                ledger={plaidLedger}
                onUpdateLedger={(updated) => {
                  setPlaidLedger(updated);
                  syncExitPhase({ plaidLedger: updated });
                }}
              />

              <ProjectRentRollTrackerCard
                ledger={plaidLedger}
                onUpdateLedger={(updated) => {
                  setPlaidLedger(updated);
                  syncExitPhase({ plaidLedger: updated });
                }}
              />

              <ProjectHoldingCostTrackerCard
                ledger={plaidLedger}
                onUpdateLedger={(updated) => {
                  setPlaidLedger(updated);
                  syncExitPhase({ plaidLedger: updated });
                }}
              />

              <ProjectTransactionLedgerCard
                projectId={project.project_id || project.id}
                projectName={project.property_address || project.address || 'Target Property'}
                ledger={plaidLedger}
                onUpdateLedger={(updated) => {
                  setPlaidLedger(updated);
                  syncExitPhase({ plaidLedger: updated });
                }}
              />
            </div>
          )}

          {/* Tab 1: Strategy Route Selection (Always rendered on overview or strategy) */}
          {(activeTab === 'overview' || activeTab === 'strategy') && (
            <div className="space-y-4">
              <ExitStrategySelectorCard
                selectedRoute={selectedRoute}
                recalculatedOutputs={recalculatedOutputs}
                onSelectRoute={(route) => {
                  setSelectedRoute(route);
                  syncExitPhase({ selectedRoute: route });
                }}
              />
            </div>
          )}

          {/* Disposition Milestones & Team Task Assignments Card */}
          {(activeTab === 'overview' || activeTab === 'execution') && (
            <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-200">
                    Exit Disposition Milestones &amp; Task Assignments
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Assign responsible team members and external counterparties to disposition milestones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAssignTaskModal({
                      id: `exit-task-${Date.now()}`,
                      title: 'New Disposition Task',
                    })
                  }
                  className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-none transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-neutral-400" />
                  <span>+ Invite via Email...</span>
                </button>
              </div>

              <div className="divide-y divide-neutral-800 border border-neutral-800 bg-neutral-900/40">
                {exitTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/70 transition"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleExitTask(task.id)}
                        className={`mt-0.5 w-4 h-4 rounded-none border flex items-center justify-center transition ${
                          task.status === 'complete'
                            ? 'border-emerald-500 bg-emerald-500 text-black'
                            : 'border-neutral-700 bg-neutral-950 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>
                      <div className="space-y-0.5">
                        <span
                          className={`text-xs font-medium ${
                            task.status === 'complete'
                              ? 'line-through text-neutral-500'
                              : 'text-neutral-200'
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                          <span>Assignee:</span>
                          <span className="font-mono text-neutral-300">
                            {task.assignedTo || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`open-assign-modal-${task.id}`}
                      onClick={() => setAssignTaskModal(task)}
                      className="min-h-[44px] px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-none transition self-start sm:self-auto"
                    >
                      {task.assignedTo ? 'Reassign' : 'Assign Lead'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Data Audit & Asset Stabilization Pre-Check */}
          {(activeTab === 'overview' || activeTab === 'audit') && (
            <ExitDataAuditPreCheckCard
              holdAudit={holdAudit}
              tenantReconciliation={tenantRecon}
              estoppels={estoppels}
              vdrAssets={vdrAssets}
              onUpdateEstoppels={(updated) => {
                setEstoppels(updated);
                syncExitPhase({ estoppelCertificates: updated });
              }}
              onUpdateVdrAssets={(updated) => {
                setVdrAssets(updated);
                syncExitPhase({ vdrAssets: updated });
              }}
            />
          )}

          {/* Tab 3: Valuation & Financial Baseline Setup */}
          {(activeTab === 'overview' || activeTab === 'valuation') && (
            <ExitValuationFinancialBaselineCard
              selectedRoute={selectedRoute}
              propertyState={stateCode}
              grossRealization={targetGrossPrice}
              brokerCommissionPct={brokerCommissionPct}
              closingCostPct={1.5}
              debtPayoffAmount={debtPayoffAmount}
              proratedTaxes={proratedTaxes}
              stateTransferTax={transferTaxOverride}
              onUpdateGrossRealization={(val: number) => {
                setTargetGrossPrice(val);
                syncExitPhase({ targetGrossPrice: val });
              }}
              onUpdateBrokerCommissionPct={(val: number) => {
                setBrokerCommissionPct(val);
                syncExitPhase({ brokerCommissionPct: val });
              }}
              onUpdateClosingCostPct={(val: number) => {
                syncExitPhase({ sellerClosingCostPct: val });
              }}
              onUpdateDebtPayoff={(val: number) => {
                setDebtPayoffAmount(val);
                syncExitPhase({ debtPayoffAmount: val });
              }}
              onUpdateProratedTaxes={(val: number) => {
                setProratedTaxes(val);
                syncExitPhase({ proratedTaxes: val });
              }}
              onUpdateStateTransferTax={(override: StateTransferTaxOverride) => {
                setTransferTaxOverride(override);
                syncExitPhase({ stateTransferTax: override });
              }}
            />
          )}

          {/* Tab 4: Strategy-Specific Execution Milestones */}
          {(activeTab === 'overview' || activeTab === 'execution') && (
            <ExitStrategyExecutionCard
              selectedRoute={selectedRoute}
              outrightSale={outrightSale}
              refinanceRetain={refinanceRetain}
              condoSellOff={condoSellOff}
              coopSellOff={coopSellOff}
              leaseOption={leaseOption}
              exchange1031={exchange1031}
              onUpdateOutrightSale={(updated) => {
                setOutrightSale(updated);
                syncExitPhase({ outrightSale: updated });
              }}
              onUpdateRefinanceRetain={(updated) => {
                setRefinanceRetain(updated);
                syncExitPhase({ refinanceRetain: updated });
              }}
              onUpdateCondoSellOff={(updated) => {
                setCondoSellOff(updated);
                syncExitPhase({ condoSellOff: updated });
              }}
              onUpdateCoopSellOff={(updated) => {
                setCoopSellOff(updated);
                syncExitPhase({ coopSellOff: updated });
              }}
              onUpdateLeaseOption={(updated) => {
                setLeaseOption(updated);
                syncExitPhase({ leaseOption: updated });
              }}
              onUpdateExchange1031={(updated) => {
                setExchange1031(updated);
                syncExitPhase({ exchange1031: updated });
              }}
            />
          )}

          {/* Tab 5: Accounting, Tax Basis & Waterfall Distributions */}
          {(activeTab === 'overview' || activeTab === 'waterfall') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                  Disposition Capital Waterfall
                </h3>
              </div>
              <ExitTaxAccountingWaterfallCard
                grossRealization={recalculatedOutputs.grossRealization}
                totalClosingFees={recalculatedOutputs.totalClosingFees}
                netSalesProceeds={recalculatedOutputs.netCashToInvestor}
                purchasePrice={purchasePrice}
                rehabActual={rehabActual}
                originalDebt={originalDebt}
                is1031Exchange={selectedRoute === '1031_exchange'}
              />
            </div>
          )}

          {/* Tab 6: Lifecycle Closure & Life-of-Asset Record */}
          {(activeTab === 'overview' || activeTab === 'closure') && (
            <div className="space-y-4">
              <ExitLifecycleClosureCard
                project={project}
                exitPhase={exitPhaseBundle}
                onUpdateExitPhase={syncExitPhase}
                purchasePrice={purchasePrice}
                rehabActual={rehabActual}
                originalDebt={originalDebt}
              />

              {/* Legacy Action Buttons Container for Backward Compatibility with existing tests */}
              <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-none flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-neutral-400">
                  <span>Terminal accounting certified. Ready to seal life-of-asset performance record.</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    data-testid="finalize-lifecycle-btn"
                    onClick={() => setShowConfirmLockModal(true)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-white text-neutral-950 rounded-none border border-neutral-200 transition flex items-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Finalize & Lock REIL Lifecycle</span>
                  </button>

                  <button
                    type="button"
                    data-testid="export-investor-packet-btn"
                    onClick={() => setShowExportModal(true)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-none border border-neutral-700 transition flex items-center gap-1.5"
                  >
                    <DownloadSimple className="w-4 h-4 text-neutral-400" />
                    <span>Export Investor Distribution Packet</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Confirm Lock Lifecycle (Legacy testid compatible) */}
          {showConfirmLockModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <div className="bg-neutral-950 border border-neutral-800 max-w-md w-full p-6 rounded-none space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Finalize REIL Lifecycle?</h3>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  This action reconciles all final accounting, logs actual terminal IRR ({recalculatedOutputs.terminalIrr}%) and net cash proceeds ({formatCurrency(recalculatedOutputs.netCashToInvestor)}), and archives the project as a verified completed transaction.
                </p>
                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowConfirmLockModal(false)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLockLifecycle}
                    className="min-h-[44px] px-5 py-2 text-xs font-semibold text-neutral-950 bg-neutral-100 hover:bg-white rounded-none border border-neutral-200"
                  >
                    Confirm & Lock
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Export Investor Packet (Legacy testid compatible) */}
          {showExportModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <div className="bg-neutral-950 border border-neutral-800 max-w-md w-full p-6 rounded-none space-y-4 shadow-xl">
                <h3 className="text-base font-bold text-white">Investor Distribution Packet</h3>
                <p className="text-xs text-neutral-300">
                  The distribution packet includes certified settlement statements, tax schedules (Schedule K-1 pro forma), and full lifecycle underwriting vs realized actuals.
                </p>
                <div className="border border-neutral-800 bg-neutral-900 p-3 text-xs space-y-1.5 font-mono text-neutral-300">
                  <div className="flex justify-between">
                    <span>Asset:</span>
                    <span className="text-white">{project.propertyName || project.property_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Route:</span>
                    <span className="capitalize text-white">{selectedRoute.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Realized Return:</span>
                    <span className="text-white">
                      {recalculatedOutputs.equityMultiple}x EM ({recalculatedOutputs.terminalIrr}% IRR)
                    </span>
                  </div>
                </div>

                {exportNotice && (
                  <div className="p-2 border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs text-center font-mono">
                    {exportNotice}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-none"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPacket}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold text-neutral-950 bg-neutral-100 hover:bg-white rounded-none border border-neutral-200"
                  >
                    Download Packet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Task Assignment and Email Invite Modal */}
          <AssignOrInviteModal
            isOpen={Boolean(assignTaskModal)}
            onClose={() => setAssignTaskModal(null)}
            projectId={project.project_id || project.id}
            projectName={project.propertyName || project.property_address || 'Exit Workspace'}
            task={assignTaskModal}
            existingMembers={activeRoster}
            onAssignExisting={async (taskId, assigneeName) => {
              handleAssignExitTask(taskId, assigneeName);
            }}
            onMemberInvitedAndAssigned={handleMemberInvitedAndAssigned}
          />
        </>
      )}
    </div>
  );
}
