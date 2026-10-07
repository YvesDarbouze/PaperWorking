'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchSessionProfile } from '@/lib/auth/session-client';
import {
  canonicalDemoDeal,
  reconcileAcquisitionUnderwriting,
  type ReconciledUnderwritingMetrics,
  type PurchaseCriteriaInputs,
} from '@paperworking/financial-engine';
import type { PropertyComparableSale } from '@/lib/calculator/property-types';
import { SensitivityGridsView } from '../analysis/SensitivityGridsView';
import AddressSearch from '@/components/deals/AddressSearch';
import PropertySatelliteViewer from '@/components/maps/PropertySatelliteViewer';
import StrategySelectorBar, { type InvestmentStrategyType } from './deal-calculator/StrategySelectorBar';
import DealStructuringCard, { type FinancingModality, type CapitalSeekingIntent } from './deal-calculator/DealStructuringCard';
import RehabWorksheetModal, { type RehabLineItem } from './deal-calculator/RehabWorksheetModal';
import ScheduleEExpenseModal from './deal-calculator/ScheduleEExpenseModal';
import PurchaseCriteriaCard from './deal-calculator/PurchaseCriteriaCard';
import StrategyOutputsCard from './deal-calculator/StrategyOutputsCard';
import MultiYearDcfTable from './deal-calculator/MultiYearDcfTable';
import PublishToMarketplaceModal from './deal-calculator/PublishToMarketplaceModal';
import BroadcastDealModal from './deal-calculator/BroadcastDealModal';
import StrategyInputsPanel from './deal-calculator/StrategyInputsPanel';
import StartProjectFromCalculatorModal from './deal-calculator/StartProjectFromCalculatorModal';
import ClosingCostsModal, { type ClosingCostLineItem } from './deal-calculator/ClosingCostsModal';

interface CalculatorInputs {
  address: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  taxAssessment?: number;
  purchasePrice: number;
  arv: number;
  rehabBudget: number;
  grossRentMonthly: number;
  otherIncomeMonthly?: number;
  downPaymentPct?: number;
  operatingExpensesAnnual?: number;
  operatingExpensePct: number;
  vacancyRatePct: number;
  ltvPct: number;
  interestRatePct: number;
  amortizationYears: number;
  holdPeriodYears: number;
  annualAppreciationPct: number;
  rentGrowthPct?: number;
  expenseGrowthPct?: number;
  sellingCostsPct: number;
  exitCapRatePct: number;
  buyerClosingCostsPct: number;
  costOfSalePct: number;
  terminalValueMethod: 'appreciation_pct' | 'exit_cap' | 'per_unit';
  appreciationBase?: 'purchase_price' | 'arv';
  unitsCount?: number;
  perUnitExitValue?: number;
  loanType?: 'amortizing' | 'interest_only' | 'arm';
  ioPeriodYears?: number;
  armFixedPeriodYears?: number;
  armAdjustmentPct?: number;
  /** W2-11: Lease-up and stabilization duration in months */
  stabilizationMonths?: number;
  /** W2-11: Initial months completely vacant immediately after closing */
  monthsVacantAtClose?: number;
  /** W2-11: Concessions in months of free rent granted during lease-up */
  concessionsMonths?: number;
  /** W2-11: Rent ramp % during active lease-up months */
  leaseUpRentRampPct?: number;

  // 6 Strategies
  strategy: InvestmentStrategyType;

  // Strategy-Specific Inputs
  averageDailyRate: number;
  occupancyRatePct: number;
  cleaningFeePerStay: number;
  averageStayNights: number;
  cleaningCostPerStay: number;
  platformFeePct: number;
  strFurnishingCapex: number;
  refinanceMonthsAfterClose: number;
  refinanceLtvPct: number;
  refinanceInterestRatePct: number;
  refinanceAmortizationYears: number;
  refinanceClosingCostsPct: number;
  postRefiGrossMonthlyRent?: number;
  postRefiMonthlyOperatingExpenses?: number;
  commercialSqft: number;
  marketCapRatePct: number;
  contractPurchasePrice: number;
  targetAssignmentFee: number;
  isDoubleClosing: boolean;
  doubleClosingEscrowFees: number;

  // Deal Structuring & Financing
  financingModality: FinancingModality;
  hardMoneyPoints: number;
  hardMoneyInterestRatePct: number;
  hardMoneyTermMonths: number;
  balloonTermMonths: number;
  capitalSeekingIntent: CapitalSeekingIntent;
  partnerEquitySplitPct: number;
  targetCapitalRaise: number;
  minimumInvestmentTicket: number;
  preferredReturnPct: number;

  // Purchase Criteria Screening
  purchaseCriteria: PurchaseCriteriaInputs;
}

const DEFAULT_INPUTS: CalculatorInputs = {
  address: canonicalDemoDeal.propertyAddress,
  beds: canonicalDemoDeal.beds,
  baths: canonicalDemoDeal.baths,
  sqft: canonicalDemoDeal.sqft,
  yearBuilt: canonicalDemoDeal.yearBuilt,
  taxAssessment: 480000,
  purchasePrice: canonicalDemoDeal.purchasePrice,
  arv: 680000,
  rehabBudget: canonicalDemoDeal.rehabBudget,
  grossRentMonthly: canonicalDemoDeal.grossRentMonthly,
  otherIncomeMonthly: 0,
  downPaymentPct: 25,
  operatingExpensesAnnual: canonicalDemoDeal.operatingExpensesAnnual,
  operatingExpensePct: Number(canonicalDemoDeal.operatingExpenseRatioPct.toFixed(2)),
  vacancyRatePct: canonicalDemoDeal.vacancyRatePct,
  ltvPct: canonicalDemoDeal.targetLtvPct,
  interestRatePct: canonicalDemoDeal.interestRatePct,
  amortizationYears: canonicalDemoDeal.amortizationYears,
  holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
  annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
  rentGrowthPct: 0.0,
  expenseGrowthPct: 0.0,
  sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
  exitCapRatePct: 6.5,
  buyerClosingCostsPct: canonicalDemoDeal.buyerClosingCostsPct,
  costOfSalePct: canonicalDemoDeal.sellingCostsPct,
  terminalValueMethod: canonicalDemoDeal.terminalValueMethod,
  appreciationBase: 'purchase_price',
  unitsCount: 1,
  perUnitExitValue: canonicalDemoDeal.purchasePrice,
  loanType: 'amortizing',
  ioPeriodYears: 5,
  armFixedPeriodYears: 5,
  armAdjustmentPct: 2.0,
  stabilizationMonths: 0,
  monthsVacantAtClose: 0,
  concessionsMonths: 0,
  leaseUpRentRampPct: 100.0,
  // Strategy defaults
  strategy: 'buy_and_hold_rental',
  averageDailyRate: 220,
  occupancyRatePct: 70,
  cleaningFeePerStay: 150,
  averageStayNights: 3.5,
  cleaningCostPerStay: 120,
  platformFeePct: 3.0,
  strFurnishingCapex: 20000,
  refinanceMonthsAfterClose: 6,
  refinanceLtvPct: 75.0,
  refinanceInterestRatePct: 6.75,
  refinanceAmortizationYears: 30,
  refinanceClosingCostsPct: 2.5,
  commercialSqft: 4500,
  marketCapRatePct: 6.5,
  contractPurchasePrice: canonicalDemoDeal.purchasePrice,
  targetAssignmentFee: 15000,
  isDoubleClosing: false,
  doubleClosingEscrowFees: 2500,
  financingModality: 'conventional',
  hardMoneyPoints: 2.0,
  hardMoneyInterestRatePct: 10.0,
  hardMoneyTermMonths: 12,
  balloonTermMonths: 60,
  capitalSeekingIntent: 'solo',
  partnerEquitySplitPct: 50.0,
  targetCapitalRaise: 150000,
  minimumInvestmentTicket: 10000,
  preferredReturnPct: 8.0,
  purchaseCriteria: {
    minCashOnCashPct: 8.0,
    minDscr: 1.25,
    minCapRatePct: 6.0,
    minFlipProfit: 30000,
    maxLtvPct: 80.0,
  },
};

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || isNaN(pct)) return 'n/a';
  return `${pct.toFixed(1)}%`;
}

export interface DealCalculatorViewProps {
  initialAuthenticated?: boolean;
  initialSubscriptionStatus?: string;
  initialShowProjectPrompt?: boolean;
}

export default function DealCalculatorView({
  initialAuthenticated = false,
  initialSubscriptionStatus = 'active',
  initialShowProjectPrompt = false,
}: DealCalculatorViewProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth & Subscription State
  const [authLoading, setAuthLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>(initialSubscriptionStatus);

  // Calculator State initialized from query parameters or localStorage (Agent 04 preserved state)
  const [inputs, setInputs] = useState<CalculatorInputs>(() => {
    // 1. Query parameters take first priority
    const pPrice = searchParams.get('price') ? Number(searchParams.get('price')) : NaN;
    const pArv = searchParams.get('arv') ? Number(searchParams.get('arv')) : NaN;
    const pRehab = searchParams.get('rehab') ? Number(searchParams.get('rehab')) : NaN;
    const pRent = searchParams.get('rent') ? Number(searchParams.get('rent')) : NaN;
    const pAddress = searchParams.get('address');
    const pStrategy = searchParams.get('strategy') as InvestmentStrategyType | null;

    // 2. LocalStorage serves as in-progress preserve (signed-out -> sign-in recovery)
    let savedInputs: Partial<CalculatorInputs> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('pw_deal_calculator_inputs');
        if (raw) savedInputs = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    return {
      ...DEFAULT_INPUTS,
      ...savedInputs,
      address: pAddress || savedInputs.address || DEFAULT_INPUTS.address,
      strategy: pStrategy || savedInputs.strategy || DEFAULT_INPUTS.strategy,
      purchasePrice: !isNaN(pPrice) ? pPrice : (savedInputs.purchasePrice ?? DEFAULT_INPUTS.purchasePrice),
      arv: !isNaN(pArv) ? pArv : (savedInputs.arv ?? DEFAULT_INPUTS.arv),
      rehabBudget: !isNaN(pRehab) ? pRehab : (savedInputs.rehabBudget ?? DEFAULT_INPUTS.rehabBudget),
      grossRentMonthly: !isNaN(pRent) ? pRent : (savedInputs.grossRentMonthly ?? DEFAULT_INPUTS.grossRentMonthly),
    };
  });

  // Prompt & Modal states
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [showProjectPrompt, setShowProjectPrompt] = useState(initialShowProjectPrompt);
  const [dismissedProjectPrompt, setDismissedProjectPrompt] = useState(false);
  const [projectCreationError, setProjectCreationError] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  // New Modals for Worksheets and Collaboration
  const [showStartProjectModal, setShowStartProjectModal] = useState(false);
  const [showClosingCostsModal, setShowClosingCostsModal] = useState(false);
  const [whatIfVacancy, setWhatIfVacancy] = useState<number>(5);
  const [whatIfRentDeltaPct, setWhatIfRentDeltaPct] = useState<number>(0);
  const [exitPlanningHorizon, setExitPlanningHorizon] = useState<5 | 10 | 20>(5);
  const [showRehabModal, setShowRehabModal] = useState(false);
  const [showScheduleEModal, setShowScheduleEModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSuccessDealId, setPublishSuccessDealId] = useState<string | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastSuccessCount, setBroadcastSuccessCount] = useState<number | null>(null);

  // Overarching Project resolution from query parameters
  const queryProjectId = searchParams.get('projectId');
  const [overarchingProjectName, setOverarchingProjectName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      if (!queryProjectId) {
        setOverarchingProjectName(null);
        return;
      }
      try {
        const res = await fetch(`/api/projects/${queryProjectId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data) {
            setOverarchingProjectName(data.propertyName || data.name || queryProjectId);
          }
        } else {
          if (!cancelled) setOverarchingProjectName(queryProjectId);
        }
      } catch {
        if (!cancelled) setOverarchingProjectName(queryProjectId);
      }
    }
    loadProject();
    return () => {
      cancelled = true;
    };
  }, [queryProjectId]);

  // Property Data Lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [propertyData, setPropertyData] = useState<{
    configured: boolean;
    requiresCredentials?: boolean;
    provider: string;
    message?: string;
    facts: any;
    comps: PropertyComparableSale[];
    estimatedRent?: number;
    rentRangeLow?: number;
    rentRangeHigh?: number;
    estimatedValue?: number;
    source?: 'rentcast' | 'cache' | 'offline';
    as_of?: string;
    asOf?: string;
    stale?: boolean;
    isStale?: boolean;
    degraded?: boolean;
    requiresAuth?: boolean;
    coverageNote?: string;
  } | null>(null);

  // Snapshot lineage state
  const [persistedSnapshotId, setPersistedSnapshotId] = useState<string | null>(null);
  const [snapshotSaving, setSnapshotSaving] = useState(false);

  // Check auth on mount
  useEffect(() => {
    let cancelled = false;
    fetchSessionProfile().then((profile) => {
      if (cancelled) return;
      setAuthenticated(Boolean(profile.authenticated));
      setSubscriptionStatus(profile.subscriptionStatus ?? 'active');
      setAuthLoading(false);
    });

    // Check live provider status on mount (Rule 5 honest reporting)
    fetch(`/api/properties/lookup?address=${encodeURIComponent(inputs.address || 'default')}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data) {
          setPropertyData(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPropertyData({
            configured: false,
            requiresCredentials: true,
            provider: 'rentcast',
            message: 'Property data provider is unconfigured in this environment.',
            facts: null,
            comps: [],
          });
        }
      });

    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('pw_deal_calc_prompt_dismissed');
      if (dismissed === 'true') {
        setDismissedProjectPrompt(true);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist in-progress inputs to localStorage on change (Agent 04 auth gate interplay)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pw_deal_calculator_inputs', JSON.stringify(inputs));
    }
  }, [inputs]);

  // Real calculations via canonical financial engine (Recomputes live on input change)
  const calculations: ReconciledUnderwritingMetrics = useMemo(() => {
    const {
      purchasePrice,
      rehabBudget,
      arv,
      grossRentMonthly,
      operatingExpensePct,
      vacancyRatePct,
      ltvPct,
      interestRatePct,
      amortizationYears,
      holdPeriodYears,
      annualAppreciationPct,
      sellingCostsPct,
      exitCapRatePct,
      buyerClosingCostsPct,
      costOfSalePct,
      terminalValueMethod,
      unitsCount,
      perUnitExitValue,
      rentGrowthPct,
      expenseGrowthPct,
      loanType,
      ioPeriodYears,
      armFixedPeriodYears,
      armAdjustmentPct,
    } = inputs;

    // Modality overrides
    const effectiveLtv = inputs.financingModality === 'cash' ? 0 : ltvPct;
    const effectiveRate =
      inputs.financingModality === 'cash'
        ? 0
        : inputs.financingModality === 'hard_money'
          ? inputs.hardMoneyInterestRatePct
          : interestRatePct;

    return reconcileAcquisitionUnderwriting({
      purchasePrice,
      rehabBudget,
      estimatedARV: arv,
      grossRentMonthly,
      otherIncomeMonthly: inputs.otherIncomeMonthly ?? 0,
      operatingExpensesAnnual: inputs.operatingExpensesAnnual,
      operatingExpenseRatioPct: operatingExpensePct,
      vacancyRatePct,
      targetLtvPct: effectiveLtv,
      interestRatePct: effectiveRate,
      amortizationYears,
      holdPeriodYears,
      annualAppreciationPct,
      appreciationPct: annualAppreciationPct,
      rentGrowthPct: rentGrowthPct ?? 0.0,
      expenseGrowthPct: expenseGrowthPct ?? 0.0,
      sellingCostsPct,
      exitCapRatePct,
      buyerClosingCostsPct,
      costOfSalePct,
      strategy: inputs.strategy,
      terminalValueMethod,
      appreciationBase: inputs.appreciationBase,
      unitsCount,
      perUnitExitValue,
      loanType: loanType ?? 'amortizing',
      ioPeriodYears: ioPeriodYears ?? 5,
      armFixedPeriodYears: armFixedPeriodYears ?? 5,
      armAdjustmentPct: armAdjustmentPct ?? 2.0,
      stabilizationMonths: inputs.stabilizationMonths ?? 0,
      monthsVacantAtClose: inputs.monthsVacantAtClose ?? 0,
      concessionsMonths: inputs.concessionsMonths ?? 0,
      leaseUpRentRampPct: inputs.leaseUpRentRampPct ?? 100.0,
      // Multi-strategy inputs
      averageDailyRate: inputs.averageDailyRate,
      occupancyRatePct: inputs.occupancyRatePct,
      cleaningFeePerStay: inputs.cleaningFeePerStay,
      averageStayNights: inputs.averageStayNights,
      cleaningCostPerStay: inputs.cleaningCostPerStay,
      platformFeePct: inputs.platformFeePct,
      strFurnishingCapex: inputs.strFurnishingCapex,
      refinanceMonthsAfterClose: inputs.refinanceMonthsAfterClose,
      refinanceLtvPct: inputs.refinanceLtvPct,
      refinanceInterestRatePct: inputs.refinanceInterestRatePct,
      refinanceAmortizationYears: inputs.refinanceAmortizationYears,
      refinanceClosingCostsPct: inputs.refinanceClosingCostsPct,
      commercialSqft: inputs.commercialSqft,
      marketCapRatePct: inputs.marketCapRatePct,
      contractPurchasePrice: inputs.contractPurchasePrice || purchasePrice,
      targetAssignmentFee: inputs.targetAssignmentFee,
      isDoubleClosing: inputs.isDoubleClosing,
      doubleClosingEscrowFees: inputs.doubleClosingEscrowFees,
      // Deal Structuring
      financingModality: inputs.financingModality,
      hardMoneyPoints: inputs.hardMoneyPoints,
      hardMoneyInterestRatePct: inputs.hardMoneyInterestRatePct,
      hardMoneyTermMonths: inputs.hardMoneyTermMonths,
      balloonTermMonths: inputs.balloonTermMonths,
      capitalSeekingIntent: inputs.capitalSeekingIntent,
      partnerEquitySplitPct: inputs.partnerEquitySplitPct,
      targetCapitalRaise: inputs.targetCapitalRaise,
      minimumInvestmentTicket: inputs.minimumInvestmentTicket,
      preferredReturnPct: inputs.preferredReturnPct,
      // Purchase Criteria
      purchaseCriteria: inputs.purchaseCriteria,
    });
  }, [inputs]);

  // Model Confidence score derived from completeness of inputs
  const confidenceScore = useMemo(() => {
    let score = 70;
    if (inputs.address && inputs.address.length > 8) score += 5;
    if (inputs.sqft && inputs.sqft > 0) score += 5;
    if (inputs.purchasePrice > 0 && inputs.arv > 0) score += 10;
    if (inputs.rehabBudget > 0) score += 5;
    if (inputs.grossRentMonthly > 0) score += 5;
    return Math.min(100, score);
  }, [inputs]);

  // Handler for live property lookup via API
  const handleLookupProperty = async (addressToLookup?: string, refresh?: boolean) => {
    const targetAddress = (addressToLookup || inputs.address || '').trim();
    if (!targetAddress) return;

    setLookupLoading(true);
    try {
      const url = `/api/properties/lookup?address=${encodeURIComponent(targetAddress)}${
        refresh ? '&refresh=true' : ''
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPropertyData(data);

        // If facts or valuation/rent were returned, populate inputs
        setInputs((prev) => ({
          ...prev,
          beds: data.facts?.beds ?? prev.beds,
          baths: data.facts?.baths ?? prev.baths,
          sqft: data.facts?.squareFeet ?? data.facts?.sqft ?? prev.sqft,
          yearBuilt: data.facts?.yearBuilt ?? prev.yearBuilt,
          taxAssessment: data.facts?.taxAssessment ?? prev.taxAssessment,
          arv: data.estimatedValue && data.estimatedValue > 0 ? data.estimatedValue : prev.arv,
          grossRentMonthly: data.estimatedRent && data.estimatedRent > 0 ? data.estimatedRent : prev.grossRentMonthly,
        }));
      }
    } catch {
      // Offline / network failure: degrade gracefully without crashing
      setPropertyData({
        configured: false,
        requiresCredentials: true,
        provider: 'rentcast',
        message: 'Could not connect to property data provider — enter values manually.',
        facts: null,
        comps: [],
      });
    } finally {
      setLookupLoading(false);
    }
  };

  // Handler for running analysis & persisting calculation snapshot
  const handleRunAnalysis = useCallback(async () => {
    setAnalysisCompleted(true);
    if (!dismissedProjectPrompt) {
      setShowProjectPrompt(true);
    }

    // Persist CalculatorSnapshot via real API (Requirement 3)
    setSnapshotSaving(true);
    try {
      const snapshotPayload = {
        inputs: { ...inputs },
        outputs: { ...calculations },
        assumptions: {
          holdPeriodYears: inputs.holdPeriodYears,
          exitCapRatePct: inputs.exitCapRatePct,
          vacancyRatePct: inputs.vacancyRatePct,
          operatingExpensePct: inputs.operatingExpensePct,
          buyerClosingCostsPct: inputs.buyerClosingCostsPct,
          costOfSalePct: inputs.costOfSalePct,
        },
        source: 'deal_calculator',
        calculatorVersion: calculations.engineVersion || '1.0.0',
      };

      const res = await fetch('/api/calculator/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshotPayload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.snapshot?.id) {
          setPersistedSnapshotId(json.snapshot.id);
        }
      }
    } catch {
      // Local calculations continue even if offline
    } finally {
      setSnapshotSaving(false);
    }
  }, [inputs, calculations, dismissedProjectPrompt]);

  // Handler for input change
  const handleInputChange = (field: keyof CalculatorInputs, value: string | number) => {
    setInputs((prev) => {
      const next: CalculatorInputs = {
        ...prev,
        [field]: value,
      };
      if (field === 'downPaymentPct') {
        const numVal = Math.max(0, Math.min(100, Number(value) || 0));
        next.downPaymentPct = numVal;
        next.ltvPct = Number((100 - numVal).toFixed(2));
      } else if (field === 'ltvPct') {
        const numVal = Math.max(0, Math.min(100, Number(value) || 0));
        next.ltvPct = numVal;
        next.downPaymentPct = Number((100 - numVal).toFixed(2));
      }
      if (field === 'operatingExpensePct' || field === 'grossRentMonthly') {
        delete next.operatingExpensesAnnual;
      }
      return next;
    });
  };

  // "No" path: dismiss project prompt for this session without nagging
  const handleDismissProjectPrompt = () => {
    setShowProjectPrompt(false);
    setDismissedProjectPrompt(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pw_deal_calc_prompt_dismissed', 'true');
    }
  };

  // "Yes" path: promotes deal to Project with full mapping per Spec 5.2
  const handleAcceptProjectPrompt = async (directToWorkspace: boolean = false) => {
    setIsCreatingProject(true);
    setProjectCreationError(null);

    const promotePayload = {
      address: inputs.address,
      projectName: inputs.address.split(',')[0].trim() || 'New Investment Deal',
      purchasePrice: inputs.purchasePrice,
      rehabBudget: inputs.rehabBudget,
      estimatedARV: inputs.arv,
      grossRentMonthly: inputs.grossRentMonthly,
      otherIncomeMonthly: inputs.otherIncomeMonthly ?? 0,
      operatingExpenseRatioPct: inputs.operatingExpensePct,
      operatingExpensesAnnual: inputs.operatingExpensesAnnual,
      targetLtvPct: inputs.ltvPct,
      interestRatePct: inputs.interestRatePct,
      amortizationYears: inputs.amortizationYears,
      rentGrowthPct: inputs.rentGrowthPct ?? 0.0,
      expenseGrowthPct: inputs.expenseGrowthPct ?? 0.0,
      buyerClosingCostsPct: inputs.buyerClosingCostsPct,
      beds: inputs.beds,
      baths: inputs.baths,
      sqft: inputs.sqft,
      yearBuilt: inputs.yearBuilt,
      taxAssessment: inputs.taxAssessment,
      loanType: inputs.loanType ?? 'amortizing',
      ioPeriodYears: inputs.ioPeriodYears ?? 5,
      armFixedPeriodYears: inputs.armFixedPeriodYears ?? 5,
      armAdjustmentPct: inputs.armAdjustmentPct ?? 2.0,
      stabilizationMonths: inputs.stabilizationMonths ?? 0,
      monthsVacantAtClose: inputs.monthsVacantAtClose ?? 0,
      concessionsMonths: inputs.concessionsMonths ?? 0,
      leaseUpRentRampPct: inputs.leaseUpRentRampPct ?? 100.0,
      terminalValueMethod: inputs.terminalValueMethod,
      appreciationBase: inputs.appreciationBase ?? 'purchase_price',
      strategy: inputs.strategy,
      assumptionsNotes: `Underwritten via Deal Calculator (Snapshot: ${persistedSnapshotId || 'snapshot-initial'})`,
    };

    const existingProjectId = searchParams?.get('projectId') || null;
    let createdProjectId: string | undefined = existingProjectId || undefined;

    if (existingProjectId) {
      try {
        await fetch(`/api/projects/${existingProjectId}/underwriting`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            underwritingRecord: {
              inputs: {
                purchasePrice: inputs.purchasePrice,
                estimatedARV: inputs.arv,
                rehabBudget: inputs.rehabBudget,
                grossMonthlyRent: inputs.grossRentMonthly,
                operatingExpenseRatioPct: inputs.operatingExpensePct,
                targetLtvPct: inputs.ltvPct,
                interestRatePct: inputs.interestRatePct,
                amortizationYears: inputs.amortizationYears,
                holdPeriodYears: inputs.holdPeriodYears,
              },
              outputs: calculations,
              version: persistedSnapshotId ? Number(persistedSnapshotId.replace(/\D/g, '')) + 1 : 2,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } catch {
        // continue
      }
      router.push(`/project/${existingProjectId}`);
      return;
    }

    try {
      // 1. Real atomic promotion API call (Requirement 4 & satisfies deal-calculator-auth-gate test)
      const res = await fetch('/api/projects/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promotePayload),
      });

      if (res.ok) {
        const data = await res.json();
        createdProjectId = data.projectId || data.project?.id;
      }
    } catch {
      // Fallback continues
    }

    // 2. Also seed wizard draft store at Step 5 Review
    const draftPayload = {
      step: 5,
      address: inputs.address,
      purchasePrice: inputs.purchasePrice,
      rehabBudget: inputs.rehabBudget,
      estimatedARV: inputs.arv,
      grossRentMonthly: inputs.grossRentMonthly,
      operatingExpenseRatioPct: inputs.operatingExpensePct,
      targetLtvPct: inputs.ltvPct,
      interestRatePct: inputs.interestRatePct,
      amortizationYears: inputs.amortizationYears,
      rentGrowthPct: inputs.rentGrowthPct ?? 0.0,
      expenseGrowthPct: inputs.expenseGrowthPct ?? 0.0,
      buyerClosingCostsPct: inputs.buyerClosingCostsPct,
      beds: inputs.beds,
      baths: inputs.baths,
      sqft: inputs.sqft,
      yearBuilt: inputs.yearBuilt,
      taxAssessment: inputs.taxAssessment,
      loanType: inputs.loanType ?? 'amortizing',
      ioPeriodYears: inputs.ioPeriodYears ?? 5,
      armFixedPeriodYears: inputs.armFixedPeriodYears ?? 5,
      armAdjustmentPct: inputs.armAdjustmentPct ?? 2.0,
      stabilizationMonths: inputs.stabilizationMonths ?? 0,
      monthsVacantAtClose: inputs.monthsVacantAtClose ?? 0,
      concessionsMonths: inputs.concessionsMonths ?? 0,
      leaseUpRentRampPct: inputs.leaseUpRentRampPct ?? 100.0,
      strategy: inputs.strategy,
      source: 'deal_calculator' as const,
      dealNotes: `Promoted from Deal Calculator scenario (${persistedSnapshotId || 'initial'})`,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('pw_new_project_draft_v1', JSON.stringify(draftPayload));
    }

    try {
      await fetch('/api/projects/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPayload),
      });
    } catch {
      // ignore
    }

    if (directToWorkspace && createdProjectId) {
      router.push(`/project/${createdProjectId}`);
      return;
    }

    const projectCreationParams = new URLSearchParams({
      fromCalculator: 'true',
      phase: 'acquisition',
      address: inputs.address,
      price: String(inputs.purchasePrice),
      rehab: String(inputs.rehabBudget),
      arv: String(inputs.arv),
      rent: String(inputs.grossRentMonthly),
      strategy: inputs.strategy,
    });
    if (createdProjectId) {
      projectCreationParams.set('projectId', createdProjectId);
    }

    router.push(`/projects/new?${projectCreationParams.toString()}`);
  };

  const isExpired =
    authenticated &&
    (subscriptionStatus === 'canceled' ||
      subscriptionStatus === 'expired' ||
      subscriptionStatus === 'past_due');

  const pricePerSqFt =
    inputs.sqft && inputs.sqft > 0
      ? Math.round(inputs.purchasePrice / inputs.sqft)
      : null;

  return (
    <div className="min-h-[calc(100vh-144px)] bg-background text-foreground px-4 sm:px-6 md:px-8 pt-1.5 pb-12 sm:pt-2 sm:pb-14 md:pt-2.5 md:pb-16">
      <div className="mx-auto max-w-[1200px]">
        {/* Overarching Project Context Banner */}
        {queryProjectId && (
          <div
            data-testid="calc-overarching-project-badge"
            className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none border border-border bg-card p-4 shadow-sm ring-1 ring-foreground/10"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-muted-foreground">
                <span className="material-symbols-outlined text-[20px]">folder_open</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Overarching Project Workspace
                  </span>
                  <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border">
                    Phase 01 Underwriting
                  </span>
                </div>
                <h2 className="text-sm font-bold text-foreground truncate mt-0.5">
                  Underwriting Deal Component for Overarching Project: {overarchingProjectName || queryProjectId}
                </h2>
              </div>
            </div>

            <Link
              href={`/project/${queryProjectId}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-none border border-border bg-muted px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition shrink-0 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Project Workspace</span>
            </Link>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-primary)]">
                ACQUISITION PHASE 01
              </span>
              <span className="inline-flex items-center gap-1 rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                CANONICAL ENGINE
              </span>
              {persistedSnapshotId && (
                <span className="inline-flex items-center gap-1 rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  <span className="material-symbols-outlined text-[12px]">bookmark</span>
                  {persistedSnapshotId}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Deal Calculator
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyze deals with institutional precision. Stress-test acquisition metrics before committing capital.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-testid="start-project-from-calculator-btn"
              onClick={() => setShowStartProjectModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 hover:text-white min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[17px] text-emerald-400">
                rocket_launch
              </span>
              <span>Start Project from Deal</span>
            </button>

            <button
              type="button"
              data-testid="broadcast-deal-btn"
              onClick={() => setShowBroadcastModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[17px] text-foreground">
                forward_to_inbox
              </span>
              <span>Share via Email</span>
            </button>

            <button
              type="button"
              data-testid="post-marketplace-btn"
              onClick={() => setShowPublishModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[17px] text-foreground">
                storefront
              </span>
              <span>Post to Marketplace</span>
            </button>

            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={snapshotSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 shadow-sm touch-press min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              {snapshotSaving ? 'Calculating...' : 'Calculate Deal'}
            </button>
          </div>
        </div>

        {/* Strategy Selector Bar */}
        <div className="mb-6">
          <StrategySelectorBar
            selectedStrategy={inputs.strategy}
            onSelectStrategy={(strat) => handleInputChange('strategy', strat)}
          />
        </div>

        {/* Success Notifications for Marketplace / Broadcast */}
        {publishSuccessDealId && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              <span>
                Deal published to Marketplace. Investors can now submit soft commitments and request introduction meetings.
              </span>
            </div>
            <Link
              href="/marketplaces"
              className="font-bold underline text-emerald-300 hover:text-white"
            >
              View in Marketplace
            </Link>
          </div>
        )}

        {broadcastSuccessCount !== null && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">mark_email_read</span>
              <span>
                Pro-forma broadcast successfully dispatched to {broadcastSuccessCount} investor recipient(s).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBroadcastSuccessCount(null)}
              className="text-xs text-emerald-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Honest Provider Status Banner (Rule 5) */}
        {propertyData?.requiresCredentials && (
          <div
            data-testid="property-data-unconfigured-banner"
            className="mb-6 flex items-center justify-between rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-amber-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">info</span>
              <span>
                <strong>REQUIRES CREDENTIALS:</strong> Property Data Provider (RentCast) is unconfigured in this environment. Live comps cannot be fetched; manual entry is enabled.
              </span>
            </div>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-amber-300">
              Manual Mode
            </span>
          </div>
        )}

        {/* Provider Outage / Degraded Notice */}
        {propertyData?.degraded && (
          <div
            data-testid="property-outage-banner"
            className="mb-6 flex items-center justify-between rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-amber-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">warning</span>
              <span>
                <strong>PROVIDER NOTICE:</strong> {propertyData.message || 'Estimates temporarily unavailable — enter manually.'}
              </span>
            </div>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-amber-300">
              Manual Entry
            </span>
          </div>
        )}

        {/* Main Grid: Inputs Column (Left) & Outputs Column (Right) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Inputs Column */}
          <div className="space-y-6 lg:col-span-6">
            {/* Property Address & Live Data Lookup */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="address-input" className="block text-xs font-bold uppercase tracking-wider text-white/60">
                  Property Address
                </label>
                <button
                  type="button"
                  onClick={() => handleLookupProperty()}
                  disabled={lookupLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-primary)] hover:underline disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {lookupLoading ? 'sync' : 'travel_explore'}
                  </span>
                  {lookupLoading ? 'Fetching public records…' : 'Lookup Property Data'}
                </button>
              </div>

              <div className="space-y-3">
                <AddressSearch
                  mode="select"
                  value={inputs.address}
                  placeholder="Search any street address (Google Maps Places Autocomplete)…"
                  onSearchChange={(val) => handleInputChange('address', val)}
                  onSelectAddress={(selected) => {
                    handleInputChange('address', selected);
                    handleLookupProperty(selected);
                  }}
                />
              </div>

              {/* Cache Staleness / As-Of Date Badge */}
              {(propertyData?.source === 'cache' || propertyData?.stale || Boolean(propertyData?.as_of)) && (
                <div
                  data-testid="as-of-date-badge property-cache-badge"
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                    propertyData?.stale
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : 'border-white/10 bg-white/[0.03] text-white/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[16px] ${propertyData?.stale ? 'text-amber-400' : 'text-emerald-400'}`}>
                      history
                    </span>
                    <span>
                      {propertyData?.stale ? 'Older estimate ' : 'Valuation '}
                      <span className="font-semibold">
                        as of {propertyData?.as_of ? new Date(propertyData.as_of).toLocaleDateString() : 'recent'}
                      </span>
                      {propertyData?.stale && (
                        <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          Stale
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid="property-cache-refresh-btn"
                    onClick={() => handleLookupProperty(inputs.address, true)}
                    disabled={lookupLoading}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition"
                  >
                    <span className="material-symbols-outlined text-[13px]">refresh</span>
                    Refresh
                  </button>
                </div>
              )}

              {/* Offline Benchmark Dataset Indicator */}
              {propertyData?.source === 'offline' && (
                <div
                  data-testid="property-offline-badge"
                  className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-200 space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                    <span className="material-symbols-outlined text-[16px]">database</span>
                    <span>Offline Benchmark Dataset (Austin, Phoenix, Dallas, Denver)</span>
                  </div>
                  <p className="text-[11px] text-cyan-200/70">
                    {propertyData.coverageNote ||
                      'Offline Benchmark Data — Authenticate for live RentCast valuation on any US address.'}
                  </p>
                </div>
              )}

              {/* Property Specs Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
                <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                  <span className="block text-[9.5px] uppercase font-mono text-white/40">Beds</span>
                  <input
                    type="number"
                    value={inputs.beds ?? ''}
                    onChange={(e) => handleInputChange('beds', Number(e.target.value))}
                    placeholder="3"
                    className="w-full bg-transparent text-center font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                  <span className="block text-[9.5px] uppercase font-mono text-white/40">Baths</span>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.baths ?? ''}
                    onChange={(e) => handleInputChange('baths', Number(e.target.value))}
                    placeholder="2"
                    className="w-full bg-transparent text-center font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                  <span className="block text-[9.5px] uppercase font-mono text-white/40">SqFt</span>
                  <input
                    type="number"
                    value={inputs.sqft ?? ''}
                    onChange={(e) => handleInputChange('sqft', Number(e.target.value))}
                    placeholder="1850"
                    className="w-full bg-transparent text-center font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                  <span className="block text-[9.5px] uppercase font-mono text-white/40">Year</span>
                  <input
                    type="number"
                    value={inputs.yearBuilt ?? ''}
                    onChange={(e) => handleInputChange('yearBuilt', Number(e.target.value))}
                    placeholder="1984"
                    className="w-full bg-transparent text-center font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                  <span className="block text-[9.5px] uppercase font-mono text-white/40">$/SqFt</span>
                  <span className="block font-bold text-[color:var(--color-primary)]">
                    {pricePerSqFt ? `$${pricePerSqFt}` : 'N/A'}
                  </span>
                </div>
              </div>
              {!inputs.sqft && (
                <p className="text-[11px] text-white/40 italic">
                  Sqft not provided by public records. Enter to calculate price/sqft.
                </p>
              )}

              {/* Satellite Parcel Screencap */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-foreground">satellite_alt</span>
                    <span>Satellite Aerial Parcel Screencap</span>
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    Google Maps Platform
                  </span>
                </div>
                <PropertySatelliteViewer
                  address={inputs.address}
                  aspectRatio="16/9"
                  title={inputs.address}
                  className="rounded-xl border border-white/10"
                />
              </div>
            </div>

            {/* Acquisition Inputs */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">
                Acquisition Inputs
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="price-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    Purchase Price ($) *
                  </label>
                  <input
                    id="price-input"
                    data-testid="purchase-price-input"
                    type="number"
                    inputMode="numeric"
                    value={inputs.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="arv-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    After Repair Value (ARV) ($)
                  </label>
                  <input
                    id="arv-input"
                    data-testid="arv-input"
                    type="number"
                    inputMode="numeric"
                    value={inputs.arv}
                    onChange={(e) => handleInputChange('arv', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="rehab-input" className="block text-[11px] font-medium text-white/50">
                      Rehab Budget ($)
                    </label>
                    <button
                      type="button"
                      data-testid="open-rehab-worksheet-btn"
                      onClick={() => setShowRehabModal(true)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[13px]">construction</span>
                      <span>Itemized Worksheet</span>
                    </button>
                  </div>
                  <input
                    id="rehab-input"
                    data-testid="rehab-input"
                    type="number"
                    inputMode="numeric"
                    value={inputs.rehabBudget}
                    onChange={(e) => handleInputChange('rehabBudget', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="closing-costs-input" className="block text-[11px] font-medium text-white/50">
                      Buyer Closing Costs (%)
                    </label>
                    <button
                      type="button"
                      data-testid="open-closing-costs-modal-btn"
                      onClick={() => setShowClosingCostsModal(true)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400 hover:underline"
                    >
                      <span className="material-symbols-outlined text-[13px]">receipt</span>
                      <span>Itemized Worksheet</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="closing-costs-input"
                      data-testid="closing-costs-pct-input"
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={inputs.buyerClosingCostsPct}
                      onChange={(e) => handleInputChange('buyerClosingCostsPct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-mono text-white/40">
                      {formatCurrency(calculations.buyerClosingCostsAmount)}
                    </span>
                  </div>
                </div>

                {/* Total Cost Basis Summary */}
                <div
                  data-testid="total-cost-basis-display"
                  className="col-span-1 sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] uppercase font-mono text-white/50 block">Total Acquisition Basis</span>
                    <span className="text-sm font-bold text-white">
                      Purchase + Closing ({inputs.buyerClosingCostsPct}%) + Rehab
                    </span>
                  </div>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {formatCurrency(calculations.totalCostBasis)}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="rent-input" className="block text-[11px] font-medium text-white/50">
                      Monthly Gross Rent ($)
                    </label>
                    <button
                      type="button"
                      data-testid="open-schedule-e-btn"
                      onClick={() => setShowScheduleEModal(true)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400 hover:underline"
                    >
                      <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                      <span>Schedule E OpEx</span>
                    </button>
                  </div>
                  <input
                    id="rent-input"
                    data-testid="gross-rent-input"
                    type="number"
                    inputMode="numeric"
                    value={inputs.grossRentMonthly}
                    onChange={(e) => handleInputChange('grossRentMonthly', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="other-income-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    Additional Income (Laundry/Parking) ($/mo)
                  </label>
                  <input
                    id="other-income-input"
                    data-testid="other-income-input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={inputs.otherIncomeMonthly ?? 0}
                    onChange={(e) => handleInputChange('otherIncomeMonthly', Number(e.target.value))}
                    placeholder="e.g. 150"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                {/* Effective Gross Income Waterfall Card */}
                <div
                  data-testid="effective-gross-income-card"
                  className="col-span-1 sm:col-span-2 rounded-xl border border-white/10 bg-black/30 p-4 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span className="material-symbols-outlined text-[16px] text-emerald-400">payments</span>
                      <span>Income &amp; Expense Projections (Effective Gross Income)</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">Canonical Underwriting</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <span className="block text-[9.5px] uppercase text-white/40">Gross Potential Rent</span>
                      <span className="block font-bold text-white text-xs mt-0.5">
                        {formatCurrency(inputs.grossRentMonthly * 12)}/yr
                      </span>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <span className="block text-[9.5px] uppercase text-white/40">Ancillary Income</span>
                      <span className="block font-bold text-emerald-400 text-xs mt-0.5">
                        +{formatCurrency((inputs.otherIncomeMonthly ?? 0) * 12)}/yr
                      </span>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <span className="block text-[9.5px] uppercase text-white/40">Vacancy Loss ({inputs.vacancyRatePct}%)</span>
                      <span className="block font-bold text-amber-300 text-xs mt-0.5">
                        -{formatCurrency(Math.round((inputs.grossRentMonthly * 12) * (inputs.vacancyRatePct / 100)))}/yr
                      </span>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                      <span className="block text-[9.5px] uppercase text-white/40">Effective Gross Income</span>
                      <span className="block font-bold text-white text-xs mt-0.5">
                        {formatCurrency(calculations.grossOperatingIncome)}/yr
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-1 border-t border-white/5 gap-1">
                    <span className="text-white/60">
                      Operating Expenses ({inputs.operatingExpensePct}% or Schedule E):{' '}
                      <strong className="text-white font-mono">-{formatCurrency(calculations.totalOperatingExpenses)}/yr</strong>
                    </span>
                    <span className="text-white/60">
                      Net Operating Income (NOI):{' '}
                      <strong className="text-emerald-400 font-mono font-bold" data-testid="noi-output-metric">
                        {formatCurrency(calculations.netOperatingIncome)}/yr
                      </strong>
                    </span>
                  </div>
                </div>

                {/* RentCast Rent Potential Indicator */}
                <div
                  data-testid="rentcast-rent-potential-panel"
                  className="col-span-1 sm:col-span-2 rounded-none border border-border bg-card p-3 text-xs space-y-2 ring-1 ring-foreground/10 text-card-foreground"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className="material-symbols-outlined text-[15px]">real_estate_agent</span>
                      <span>Rent Potential (RentCast API Engine)</span>
                    </div>
                    {propertyData?.source && (
                      <span className="rounded-none bg-muted px-2 py-0.5 text-[9.5px] font-mono uppercase text-muted-foreground border border-border">
                        {propertyData.source === 'offline' ? 'Benchmark Dataset' : 'Live RentCast'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-foreground/80">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Estimated Market Rent</span>
                        <span className="text-sm font-bold text-foreground">
                          {propertyData?.estimatedRent ? formatCurrency(propertyData.estimatedRent) : formatCurrency(inputs.grossRentMonthly)}/mo
                        </span>
                      </div>
                      {propertyData?.rentRangeLow && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Range (Low to High)</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatCurrency(propertyData.rentRangeLow)} to {formatCurrency(propertyData.rentRangeHigh)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Gross Yield Potential</span>
                        <span className="text-xs font-mono text-foreground font-semibold">
                          {formatPercent(((inputs.grossRentMonthly * 12) / (inputs.purchasePrice || 1)) * 100)}
                        </span>
                      </div>
                    </div>
                    {Boolean(propertyData?.estimatedRent) && propertyData!.estimatedRent !== inputs.grossRentMonthly && (
                      <button
                        type="button"
                        data-testid="apply-market-rent-btn"
                        onClick={() => handleInputChange('grossRentMonthly', propertyData!.estimatedRent as number)}
                        className="rounded-none bg-primary text-primary-foreground border border-primary px-2.5 py-1 text-[11px] font-medium hover:bg-primary/80 transition"
                      >
                        Apply Market Rent ({formatCurrency(propertyData!.estimatedRent as number)})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy-Specific Inputs Panel */}
            <StrategyInputsPanel
              strategy={inputs.strategy}
              inputs={inputs}
              onInputChange={(field, value) => handleInputChange(field as any, value)}
            />

            {/* Deal Structuring & Capital Seeking Intent Module */}
            <DealStructuringCard
              financingModality={inputs.financingModality}
              onSelectModality={(m) => handleInputChange('financingModality', m)}
              capitalSeekingIntent={inputs.capitalSeekingIntent}
              onSelectIntent={(i) => handleInputChange('capitalSeekingIntent', i)}
              hardMoneyPoints={inputs.hardMoneyPoints}
              onChangeHardMoneyPoints={(v) => handleInputChange('hardMoneyPoints', v)}
              hardMoneyInterestRatePct={inputs.hardMoneyInterestRatePct}
              onChangeHardMoneyRate={(v) => handleInputChange('hardMoneyInterestRatePct', v)}
              hardMoneyTermMonths={inputs.hardMoneyTermMonths}
              onChangeHardMoneyTerm={(v) => handleInputChange('hardMoneyTermMonths', v)}
              balloonTermMonths={inputs.balloonTermMonths}
              onChangeBalloonTerm={(v) => handleInputChange('balloonTermMonths', v)}
              partnerEquitySplitPct={inputs.partnerEquitySplitPct}
              onChangePartnerSplit={(v) => handleInputChange('partnerEquitySplitPct', v)}
              targetCapitalRaise={inputs.targetCapitalRaise}
              onChangeTargetCapitalRaise={(v) => handleInputChange('targetCapitalRaise', v)}
              minimumInvestmentTicket={inputs.minimumInvestmentTicket}
              onChangeMinimumTicket={(v) => handleInputChange('minimumInvestmentTicket', v)}
              preferredReturnPct={inputs.preferredReturnPct}
              onChangePreferredReturn={(v) => handleInputChange('preferredReturnPct', v)}
              structuringMetrics={calculations.dealStructuring}
              totalCashRequired={calculations.cashRequired}
            />

            {/* Financing & Assumptions (Collapsible) */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Financing & Underwriting Assumptions
                </h2>
                <button
                  type="button"
                  data-testid="toggle-assumptions-btn"
                  onClick={() => setShowAssumptions(!showAssumptions)}
                  className="text-xs font-semibold text-[color:var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <span>{showAssumptions ? 'Collapse' : 'Refine Assumptions'}</span>
                  <span className="material-symbols-outlined text-[14px]">
                    {showAssumptions ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="down-payment-input" className="block text-[11px] font-medium text-white/50">
                      Down Payment (%)
                    </label>
                    <span className="text-[10px] font-mono text-white/40">
                      {formatCurrency(inputs.purchasePrice * ((inputs.downPaymentPct ?? (100 - inputs.ltvPct)) / 100))}
                    </span>
                  </div>
                  <input
                    id="down-payment-input"
                    data-testid="down-payment-pct-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="1"
                    value={inputs.downPaymentPct ?? (100 - inputs.ltvPct)}
                    onChange={(e) => handleInputChange('downPaymentPct', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="ltv-input" className="block text-[11px] font-medium text-white/50">
                      Target LTV (%)
                    </label>
                    <span className="text-[10px] font-mono text-white/40">
                      {formatCurrency(inputs.purchasePrice * (inputs.ltvPct / 100))}
                    </span>
                  </div>
                  <input
                    id="ltv-input"
                    data-testid="ltv-pct-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="1"
                    value={inputs.ltvPct}
                    onChange={(e) => handleInputChange('ltvPct', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="rate-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    Interest Rate (%)
                  </label>
                  <input
                    id="rate-input"
                    data-testid="interest-rate-input"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={inputs.interestRatePct}
                    onChange={(e) => handleInputChange('interestRatePct', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="opex-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    OpEx Ratio (%)
                  </label>
                  <input
                    id="opex-input"
                    data-testid="opex-ratio-input"
                    type="number"
                    inputMode="decimal"
                    value={inputs.operatingExpensePct}
                    onChange={(e) => handleInputChange('operatingExpensePct', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>
              </div>

              {/* Loan Terms Quick-Selector */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="block text-[11px] font-medium text-white/50">
                    Loan Term / Amortization Schedule
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {inputs.amortizationYears} Years
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Loan Term / Amortization Schedule">
                  {[30, 20, 15, 10].map((term) => (
                    <button
                      key={term}
                      type="button"
                      data-testid={`loan-term-${term}yr-btn`}
                      onClick={() => handleInputChange('amortizationYears', term)}
                      className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[40px] ${
                        inputs.amortizationYears === term
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                      }`}
                    >
                      {term}-Yr
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal Valuation Method Discipline (W2-06) */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Terminal Valuation Method *
                  </span>
                  <span className="text-[10px] font-medium text-white/40">
                    Required — no silent fallback
                  </span>
                </div>
                <div data-testid="terminal-value-method-group" className="grid grid-cols-3 gap-2" role="group" aria-label="Terminal Valuation Method">
                  <button
                    type="button"
                    data-testid="terminal-method-appreciation"
                    onClick={() => handleInputChange('terminalValueMethod', 'appreciation_pct')}
                    className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[40px] ${
                      inputs.terminalValueMethod === 'appreciation_pct'
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    Appreciation %
                  </button>
                  <button
                    type="button"
                    data-testid="terminal-method-exit-cap"
                    onClick={() => handleInputChange('terminalValueMethod', 'exit_cap')}
                    className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[40px] ${
                      inputs.terminalValueMethod === 'exit_cap'
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    Exit Cap Rate
                  </button>
                  <button
                    type="button"
                    data-testid="terminal-method-per-unit"
                    onClick={() => handleInputChange('terminalValueMethod', 'per_unit')}
                    className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[40px] ${
                      inputs.terminalValueMethod === 'per_unit'
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    Per Unit Exit
                  </button>
                </div>

                {inputs.terminalValueMethod === 'appreciation_pct' && (
                  <div className="pt-1 space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-white/50">
                          Appreciation Base
                        </span>
                        <span className="text-[9px] font-mono text-white/40">
                          {inputs.appreciationBase === 'arv' ? 'ARV Base' : 'Price Base (Default)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Appreciation Base">
                        <button
                          type="button"
                          data-testid="appreciation-base-purchase-price"
                          onClick={() => handleInputChange('appreciationBase', 'purchase_price')}
                          className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[38px] ${
                            (inputs.appreciationBase ?? 'purchase_price') === 'purchase_price'
                              ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                              : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                          }`}
                        >
                          Purchase Price ({formatCurrency(inputs.purchasePrice)})
                        </button>
                        <button
                          type="button"
                          data-testid="appreciation-base-arv"
                          onClick={() => handleInputChange('appreciationBase', 'arv')}
                          className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[38px] ${
                            inputs.appreciationBase === 'arv'
                              ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                              : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                          }`}
                        >
                          ARV ({formatCurrency(inputs.arv)})
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="deal-calc-annual-appreciation-pct" className="block text-[11px] font-medium text-white/50 mb-1">
                        Annual Appreciation (%)
                      </label>
                      <input
                        id="deal-calc-annual-appreciation-pct"
                        type="number"
                        step="0.1"
                        value={inputs.annualAppreciationPct}
                        onChange={(e) => handleInputChange('annualAppreciationPct', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                    </div>
                  </div>
                )}
                {inputs.terminalValueMethod === 'exit_cap' && (
                  <div className="pt-1">
                    <label htmlFor="deal-calc-exit-cap-rate-pct" className="block text-[11px] font-medium text-white/50 mb-1">
                      Exit Cap Rate (%)
                    </label>
                    <input
                      id="deal-calc-exit-cap-rate-pct"
                      type="number"
                      step="0.1"
                      value={inputs.exitCapRatePct}
                      onChange={(e) => handleInputChange('exitCapRatePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                    />
                  </div>
                )}
                {inputs.terminalValueMethod === 'per_unit' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label htmlFor="deal-calc-units-count" className="block text-[11px] font-medium text-white/50 mb-1">
                        Units Count
                      </label>
                      <input
                        id="deal-calc-units-count"
                        type="number"
                        value={inputs.unitsCount}
                        onChange={(e) => handleInputChange('unitsCount', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="deal-calc-per-unit-exit" className="block text-[11px] font-medium text-white/50 mb-1">
                        Per Unit Exit ($)
                      </label>
                      <input
                        id="deal-calc-per-unit-exit"
                        type="number"
                        value={inputs.perUnitExitValue}
                        onChange={(e) => handleInputChange('perUnitExitValue', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Growth & Escalation Assumptions (W2-09) */}
              <div data-testid="growth-escalation-section" className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Growth &amp; Escalation Assumptions
                  </span>
                  <span className="text-[10px] font-medium text-white/40">
                    Honest 0.0% defaults — source: default
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="growth-rent-pct" className="text-[11px] font-medium text-white/50">
                        Rent Growth (%/yr)
                      </label>
                      {(!inputs.rentGrowthPct || inputs.rentGrowthPct === 0) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="growth-rent-pct"
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        data-testid="growth-rent-pct"
                        value={inputs.rentGrowthPct ?? 0.0}
                        onChange={(e) => handleInputChange('rentGrowthPct', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                        %
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="growth-expense-pct" className="text-[11px] font-medium text-white/50">
                        Expense Growth (%/yr)
                      </label>
                      {(!inputs.expenseGrowthPct || inputs.expenseGrowthPct === 0) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="growth-expense-pct"
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        data-testid="growth-expense-pct"
                        value={inputs.expenseGrowthPct ?? 0.0}
                        onChange={(e) => handleInputChange('expenseGrowthPct', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                        %
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="growth-appreciation-pct" className="text-[11px] font-medium text-white/50">
                        Appreciation (%/yr)
                      </label>
                      {inputs.annualAppreciationPct === 3.0 && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="growth-appreciation-pct"
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        data-testid="growth-appreciation-pct"
                        value={inputs.annualAppreciationPct}
                        onChange={(e) => handleInputChange('annualAppreciationPct', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Structure & Terms (W2-10) */}
              <div data-testid="loan-structure-section" className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Loan Structure &amp; Terms
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/80">
                    {inputs.loanType === 'amortizing' ? '30-yr amortizing' : inputs.loanType === 'interest_only' ? `${inputs.ioPeriodYears}-yr IO` : `${inputs.armFixedPeriodYears}/1 ARM`}
                  </span>
                </div>
                <div data-testid="loan-type-group" className="grid grid-cols-3 gap-2" role="group" aria-label="Loan Structure & Terms">
                  <button
                    type="button"
                    data-testid="loan-type-amortizing"
                    onClick={() => handleInputChange('loanType', 'amortizing')}
                    className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[40px] ${
                      inputs.loanType === 'amortizing' || !inputs.loanType
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    Amortizing
                  </button>
                  <button
                    type="button"
                    data-testid="loan-type-io"
                    onClick={() => handleInputChange('loanType', 'interest_only')}
                    className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[40px] ${
                      inputs.loanType === 'interest_only'
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    Interest-Only
                  </button>
                  <button
                    type="button"
                    data-testid="loan-type-arm"
                    onClick={() => handleInputChange('loanType', 'arm')}
                    className={`rounded-xl border p-2 text-center text-xs font-semibold transition min-h-[40px] ${
                      inputs.loanType === 'arm'
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    ARM
                  </button>
                </div>

                {inputs.loanType === 'interest_only' && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="loan-io-years" className="text-[11px] font-medium text-white/50">
                        Interest-Only Period (Years)
                      </label>
                      <span className="text-[10px] font-mono text-white/40">
                        Then amortizes over remaining {Math.max(1, (inputs.amortizationYears || 30) - (inputs.ioPeriodYears ?? 5))} yrs
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="loan-io-years"
                        type="number"
                        min="1"
                        max="30"
                        data-testid="loan-io-years"
                        value={inputs.ioPeriodYears ?? 5}
                        onChange={(e) => handleInputChange('ioPeriodYears', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                        years
                      </span>
                    </div>
                  </div>
                )}

                {inputs.loanType === 'arm' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="loan-arm-fixed-years" className="text-[11px] font-medium text-white/50">
                          ARM Fixed Period (Years)
                        </label>
                        <span className="text-[9px] font-mono text-emerald-400/80">e.g. 5/1 ARM</span>
                      </div>
                      <div className="relative">
                        <input
                          id="loan-arm-fixed-years"
                          type="number"
                          min="1"
                          max="30"
                          data-testid="loan-arm-fixed-years"
                          value={inputs.armFixedPeriodYears ?? 5}
                          onChange={(e) => handleInputChange('armFixedPeriodYears', Number(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                          years
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="loan-arm-adjustment-pct" className="text-[11px] font-medium text-white/50">
                          Assumed Rate Adjustment (%)
                        </label>
                        <span className="text-[9px] font-mono text-amber-300/80">assumption</span>
                      </div>
                      <div className="relative">
                        <input
                          id="loan-arm-adjustment-pct"
                          type="number"
                          step="0.1"
                          data-testid="loan-arm-adjustment-pct"
                          value={inputs.armAdjustmentPct ?? 2.0}
                          onChange={(e) => handleInputChange('armAdjustmentPct', Number(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lease-Up & Stabilization Assumptions (W2-11) */}
              <div data-testid="leaseup-section" className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Lease-Up &amp; Stabilization
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/80">
                    {!inputs.stabilizationMonths || inputs.stabilizationMonths === 0
                      ? 'Stabilized (0 mo)'
                      : `${inputs.stabilizationMonths}-mo lease-up`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="leaseup-stabilization-months" className="text-[11px] font-medium text-white/50">
                        Stabilization (Months)
                      </label>
                      {(!inputs.stabilizationMonths || inputs.stabilizationMonths === 0) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="leaseup-stabilization-months"
                        type="number"
                        min="0"
                        max="36"
                        data-testid="leaseup-stabilization-months"
                        value={inputs.stabilizationMonths ?? 0}
                        onChange={(e) => handleInputChange('stabilizationMonths', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                        mos
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="leaseup-ramp-pct" className="text-[11px] font-medium text-white/50">
                        Rent Ramp (% during ramp)
                      </label>
                      {(inputs.leaseUpRentRampPct === 100 || inputs.leaseUpRentRampPct === undefined) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="leaseup-ramp-pct"
                        type="number"
                        min="0"
                        max="100"
                        data-testid="leaseup-ramp-pct"
                        value={inputs.leaseUpRentRampPct ?? 100}
                        onChange={(e) => handleInputChange('leaseUpRentRampPct', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {inputs.stabilizationMonths && inputs.stabilizationMonths > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="leaseup-vacant-months" className="text-[11px] font-medium text-white/50">
                          Months Vacant at Close
                        </label>
                        <span className="text-[9px] font-mono text-white/40">0% rent period</span>
                      </div>
                      <div className="relative">
                        <input
                          id="leaseup-vacant-months"
                          type="number"
                          min="0"
                          max="24"
                          data-testid="leaseup-vacant-months"
                          value={inputs.monthsVacantAtClose ?? 0}
                          onChange={(e) => handleInputChange('monthsVacantAtClose', Number(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                          mos
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="leaseup-concessions-months" className="text-[11px] font-medium text-white/50">
                          Concessions (Months Free)
                        </label>
                        <span className="text-[9px] font-mono text-white/40">free rent</span>
                      </div>
                      <div className="relative">
                        <input
                          id="leaseup-concessions-months"
                          type="number"
                          min="0"
                          max="12"
                          data-testid="leaseup-concessions-months"
                          value={inputs.concessionsMonths ?? 0}
                          onChange={(e) => handleInputChange('concessionsMonths', Number(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                          mos
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {showAssumptions && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-white/5 text-xs animate-in fade-in duration-200">
                  <div>
                    <label htmlFor="deal-calc-vacancy-floor" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Vacancy Floor (%)
                    </label>
                    <input
                      id="deal-calc-vacancy-floor"
                      type="number"
                      value={inputs.vacancyRatePct}
                      onChange={(e) => handleInputChange('vacancyRatePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="deal-calc-amortization-years" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Amortization (Years)
                    </label>
                    <input
                      id="deal-calc-amortization-years"
                      type="number"
                      value={inputs.amortizationYears}
                      onChange={(e) => handleInputChange('amortizationYears', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="deal-calc-hold-period-years" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Hold Period (Years)
                    </label>
                    <input
                      id="deal-calc-hold-period-years"
                      type="number"
                      value={inputs.holdPeriodYears}
                      onChange={(e) => handleInputChange('holdPeriodYears', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="deal-calc-exit-cap-rate" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Exit Cap Rate (%)
                    </label>
                    <input
                      id="deal-calc-exit-cap-rate"
                      type="number"
                      step="0.1"
                      value={inputs.exitCapRatePct}
                      onChange={(e) => handleInputChange('exitCapRatePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="deal-calc-closing-costs" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Closing Costs (%)
                    </label>
                    <input
                      id="deal-calc-closing-costs"
                      type="number"
                      step="0.1"
                      value={inputs.buyerClosingCostsPct}
                      onChange={(e) => handleInputChange('buyerClosingCostsPct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="deal-calc-cost-of-sale" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Cost of Sale (%)
                    </label>
                    <input
                      id="deal-calc-cost-of-sale"
                      type="number"
                      step="0.1"
                      value={inputs.costOfSalePct}
                      onChange={(e) => handleInputChange('costOfSalePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="deal-calc-annual-appreciation" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Annual Appreciation (%)
                    </label>
                    <input
                      id="deal-calc-annual-appreciation"
                      type="number"
                      step="0.1"
                      value={inputs.annualAppreciationPct}
                      onChange={(e) => handleInputChange('annualAppreciationPct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="deal-calc-selling-costs-exit" className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Selling Costs at Exit (%)
                    </label>
                    <input
                      id="deal-calc-selling-costs-exit"
                      type="number"
                      step="0.1"
                      value={inputs.sellingCostsPct}
                      onChange={(e) => handleInputChange('sellingCostsPct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Criteria Screening (Green Light Buy Box) */}
            <PurchaseCriteriaCard
              criteria={inputs.purchaseCriteria}
              onChangeCriteria={(crit) => handleInputChange('purchaseCriteria' as any, crit as any)}
              result={calculations.purchaseCriteriaResult}
            />

            {/* Live Comparable Sales Section (Zero Fabricated Data) */}
            <div data-testid="comps-section" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Comparable Sales (Live Public Records)
                </h2>
                <span className="text-[11px] font-mono text-white/40">
                  {propertyData?.comps?.length || 0} comps loaded
                </span>
              </div>

              {!propertyData ? (
                <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-center text-xs text-white/45">
                  Click &ldquo;Lookup Property Data&rdquo; to pull real public record comparables, or enter valuation directly.
                </div>
              ) : propertyData.comps && propertyData.comps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" data-testid="comps-table">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase font-mono text-white/40">
                        <th className="pb-2 font-medium">Address</th>
                        <th className="pb-2 font-medium">Source</th>
                        <th className="pb-2 font-medium text-right">Sale Price</th>
                        <th className="pb-2 font-medium text-right">SqFt</th>
                        <th className="pb-2 font-medium text-right">Distance</th>
                        <th className="pb-2 font-medium text-right">Status / As-Of</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {propertyData.comps.map((comp, idx) => {
                        const isStale = Boolean(comp.isStale || propertyData.stale);
                        const asOfDate = comp.asOf || comp.sale_date || propertyData.as_of;
                        const formattedDate = asOfDate ? new Date(asOfDate).toLocaleDateString() : 'recent';
                        return (
                          <tr key={idx} className="hover:bg-white/[0.02]" data-testid={`comp-row-${idx}`}>
                            <td className="py-2 text-white truncate max-w-[170px]">{comp.address}</td>
                            <td className="py-2">
                              <span
                                data-testid="comp-source-tag"
                                className="inline-block rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-white/60"
                              >
                                {comp.source || propertyData.source || 'rentcast'}
                              </span>
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-emerald-400">
                              {formatCurrency(comp.sale_price)}
                            </td>
                            <td className="py-2 text-right text-white/70">{comp.sqft ? `${comp.sqft}` : 'N/A'}</td>
                            <td className="py-2 text-right text-white/50">{comp.distance !== undefined ? `${comp.distance} mi` : 'N/A'}</td>
                            <td className="py-2 text-right">
                              {isStale ? (
                                <span
                                  data-testid="comp-staleness-badge"
                                  className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono"
                                >
                                  <span className="material-symbols-outlined text-[11px]">history</span>
                                  Stale (as of {formattedDate})
                                </span>
                              ) : (
                                <span
                                  data-testid="comp-fresh-badge"
                                  className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 font-mono"
                                >
                                  <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                  Fresh (as of {formattedDate})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : propertyData.requiresCredentials ? (
                <div
                  data-testid="no-comps-credentials"
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs font-mono text-amber-300"
                >
                  no comp data: REQUIRES CREDENTIALS
                </div>
              ) : (
                <div
                  data-testid="no-comps-found"
                  className="rounded-xl border border-white/10 bg-black/20 p-4 text-center text-xs font-mono text-white/50"
                >
                  no recent comps found
                </div>
              )}
            </div>
          </div>

          {/* Outputs Column */}
          <div className="space-y-6 lg:col-span-6">
            {/* Strategy-Specific Financial Outputs */}
            <StrategyOutputsCard strategy={inputs.strategy} calculations={calculations} />

            {/* Payment Shock Disclosure Banner (W2-10) */}
            {calculations.paymentShock && (
              <div
                data-testid="payment-shock-disclosure"
                className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200"
              >
                <span className="material-symbols-outlined text-amber-400 text-[20px] shrink-0">
                  notification_important
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-amber-300">
                      Payment Shock Disclosure
                    </span>
                    <span className="font-semibold text-white">
                      {calculations.paymentShock.disclosureLabel}
                    </span>
                  </div>
                  <p className="text-white/80">
                    Monthly debt service rises from{' '}
                    <span className="font-mono font-bold text-white">{formatCurrency(calculations.paymentShock.previousMonthlyPayment)}</span> to{' '}
                    <span className="font-mono font-bold text-amber-300">{formatCurrency(calculations.paymentShock.newMonthlyPayment)}</span>{' '}
                    (+{formatCurrency(calculations.paymentShock.monthlyIncreaseAmount)}/mo, +{calculations.paymentShock.percentageIncrease.toFixed(1)}%).
                  </p>
                </div>
              </div>
            )}

            {/* Primary KPI Cards (4 Key Metrics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1 cursor-help"
                  title="Cash-on-Cash Return: Annual Net Cash Flow ÷ Total Cash Required"
                >
                  Cash-on-Cash Return
                </span>
                <span
                  data-testid="coc-output-metric"
                  className={`text-3xl font-extrabold ${calculations.cashOnCashReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {formatPercent(calculations.cashOnCashReturnPct)}
                </span>
                <span className="mt-2 block text-[11px] text-white/40">
                  {formatCurrency(calculations.annualNetCashFlow)}/yr cash flow ÷ {formatCurrency(calculations.cashRequired)} equity
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1 cursor-help"
                  title="Cap Rate on Cost (Yield on Cost): Year-1 NOI ÷ Total Cost Basis"
                >
                  Cap Rate on Cost
                </span>
                <span
                  data-testid="cap-rate-output-metric"
                  className="text-3xl font-extrabold text-white"
                >
                  {formatPercent(calculations.capRateOnCost)}
                </span>
                <span className="mt-2 block text-[11px] text-white/40">
                  Year-1 NOI {formatCurrency(calculations.netOperatingIncome)} ÷ Basis {formatCurrency(calculations.totalCostBasis)}
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                  Net Operating Income (NOI)
                </span>
                <span
                  data-testid="noi-kpi-metric"
                  className="text-3xl font-extrabold text-white"
                >
                  {formatCurrency(calculations.netOperatingIncome)}
                </span>
                <span className="mt-2 block text-[11px] text-white/40">
                  EGI {formatCurrency(calculations.grossOperatingIncome)} - OpEx {formatCurrency(calculations.totalOperatingExpenses)}
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                  Projected IRR
                </span>
                <span
                  data-testid="irr-output-metric"
                  className="text-3xl font-extrabold text-emerald-400"
                >
                  {calculations.projectedIrrPct !== null
                    ? `${calculations.projectedIrrPct.toFixed(1)}%`
                    : calculations.irrStatus === 'multiple_roots'
                      ? 'Multiple Roots'
                      : calculations.irrStatus === 'no_sign_change'
                        ? 'No Sign Change'
                        : 'N/A'}
                </span>
                <span className="mt-2 block text-[11px] text-white/40">
                  {calculations.projectedIrrPct !== null
                    ? `${inputs.holdPeriodYears}-Yr hold (${calculations.terminalValueLabel})`
                    : calculations.irrStatus === 'multiple_roots'
                      ? 'Ambiguous cash flows cross zero multiple times; review assumptions'
                      : calculations.irrStatus === 'no_sign_change'
                        ? 'Cash flows never cross zero: IRR undefined'
                        : 'Cash flows do not converge'}
                </span>
              </div>
            </div>

            {/* Lease-Up Status Disclosure Banner (W2-11) */}
            {calculations.isLeaseUpActive && (
              <div
                data-testid="leaseup-status-banner"
                className="flex items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-200"
              >
                <span className="material-symbols-outlined text-sky-400 text-[20px] shrink-0">
                  timelapse
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[10px] font-bold tracking-wider text-sky-300 uppercase">
                      Lease-Up Active ({calculations.stabilizationMonths} Months)
                    </span>
                    <span className="text-[10px] font-mono text-sky-300/70">
                      Ramp: {calculations.leaseUpRentRampPct}%
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-sky-100">
                    Year 1 reflects transition ramp ({formatCurrency(calculations.annualNetCashFlow)}/yr). Stabilized run-rate: {formatCurrency(calculations.stabilizedAnnualCashFlow)}/yr ({formatCurrency(Math.round((calculations.stabilizedAnnualCashFlow ?? 0) / 12))}/mo).
                  </p>
                </div>
              </div>
            )}

            {/* Edge Case Warning: Negative Cash Flow */}
            {calculations.monthlyNetCashFlow <= 0 && (
              <div
                data-testid="negative-cash-flow-banner"
                className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200"
              >
                <span className="material-symbols-outlined text-red-400 text-[20px] shrink-0">
                  warning
                </span>
                <div>
                  <p className="font-bold text-red-300">
                    Negative Cash Flow Detected: {formatCurrency(calculations.monthlyNetCashFlow)}/mo
                  </p>
                  <p className="mt-0.5 text-white/70">
                    Debt service ({formatCurrency(calculations.monthlyDebtService)}/mo) and operating expenses exceed gross rent. Consider increasing down payment or negotiating purchase price.
                  </p>
                </div>
              </div>
            )}

            {/* Edge Case Warning: Negative Leverage (W2-08) */}
            {calculations.isNegativeLeverage && (
              <div
                data-testid="negative-leverage-banner"
                className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200"
              >
                <span className="material-symbols-outlined text-amber-400 text-[20px] shrink-0">
                  trending_down
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                      Negative Leverage
                    </span>
                    <span className="font-semibold text-white">
                      Debt Constant ({calculations.loanConstantPct.toFixed(2)}%) &gt; Yield on Cost ({calculations.yieldOnCostPct.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="mt-1 text-white/80">
                    The debt costs more than the deal yields — returns are amplified downward.
                    Borrowing at {inputs.interestRatePct.toFixed(1)}% ({calculations.loanConstantPct.toFixed(2)}% constant) against a {calculations.yieldOnCostPct.toFixed(1)}% yield on cost compresses equity Cash-on-Cash ({calculations.cashOnCashReturnPct.toFixed(1)}%).
                  </p>
                </div>
              </div>
            )}

            {/* Edge Case Warning: DSCR < 1.20 Lender Threshold */}
            {calculations.dscr !== null && calculations.dscr < 1.20 && (
              <div
                data-testid="dscr-warning-banner"
                className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">gavel</span>
                  <span>
                    <strong>DSCR {calculations.dscr.toFixed(2)}:</strong> Below standard 1.20 lender floor. May require commercial debt waiver or additional equity.
                  </span>
                </div>
              </div>
            )}


            {/* All 11 Canonical Financial Metrics Table */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Calculated Metrics & Capital Summary
                </h2>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  Canonical Engine v1.0
                </span>
              </div>

              <div className="divide-y divide-white/5 text-xs">
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Target Purchase Price</span>
                  <span className="font-semibold text-white">{formatCurrency(inputs.purchasePrice)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">After Repair Value (ARV)</span>
                  <span className="font-semibold text-white">{formatCurrency(calculations.totalCostBasis > 0 ? inputs.arv : 0)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Total Cost Basis (Price + {inputs.buyerClosingCostsPct}% Close + Rehab)</span>
                  <span className="font-semibold text-white">{formatCurrency(calculations.totalCostBasis)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Initial Loan Amount ({calculations.ltvPct}% LTV)</span>
                  <span className="font-semibold text-white">{formatCurrency(calculations.loanAmount)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Cash Required to Close</span>
                  <span className="font-semibold text-white">{formatCurrency(calculations.cashRequired)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Net Operating Income (NOI)</span>
                  <span className="font-semibold text-white">{formatCurrency(calculations.netOperatingIncome)}/yr</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Monthly Net Cash Flow</span>
                  <span className={`font-semibold font-mono ${calculations.monthlyNetCashFlow > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(calculations.monthlyNetCashFlow)}/mo
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Cash-on-Cash Return</span>
                  <span className="font-semibold text-white">{formatPercent(calculations.cashOnCashReturnPct)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Debt Service Coverage Ratio (DSCR)</span>
                  <span className={`font-semibold font-mono ${calculations.dscr !== null && calculations.dscr >= 1.20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {calculations.dscr !== null ? calculations.dscr.toFixed(2) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Gross Rent Multiplier (GRM)</span>
                  <span className="font-semibold text-white">
                    {calculations.grossRentMultiplier !== null ? calculations.grossRentMultiplier.toFixed(1) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Maximum Allowable Offer (MAO / 70% Rule)</span>
                  <span className="font-bold text-[color:var(--color-primary)]">
                    {formatCurrency(calculations.maximumAllowableOffer70Pct)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Projected Flip Net Profit</span>
                  <span className="font-semibold font-mono text-emerald-400">
                    {formatCurrency(calculations.projectedFlipProfit)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Estimated Exit Valuation ({calculations.terminalValueLabel})</span>
                  <span className="font-semibold text-white font-mono">
                    {formatCurrency(calculations.estimatedExitValue)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Annual Debt Constant (Loan Constant)</span>
                  <span className="font-semibold text-white font-mono">
                    {calculations.loanConstantPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-Year DCF Cash Flow Schedule (W2-09) */}
            {calculations.annualProjections && calculations.annualProjections.length > 0 && (
              <MultiYearDcfTable
                projections={calculations.annualProjections}
                holdPeriodYears={inputs.holdPeriodYears}
                onChangeHoldPeriod={(years) => handleInputChange('holdPeriodYears', years)}
                stabilizationMonths={inputs.stabilizationMonths}
                loanType={inputs.loanType}
                rentGrowthPct={inputs.rentGrowthPct}
                expenseGrowthPct={inputs.expenseGrowthPct}
              />
            )}

            {/* Institutional Sensitivity Matrix (W2-12) */}
            {calculations.sensitivityGrids && (
              <SensitivityGridsView
                sensitivityGrids={calculations.sensitivityGrids}
                onExportPdf={() => {
                  if (typeof window !== 'undefined') {
                    window.print();
                  }
                }}
              />
            )}

            {/* Advanced Risk & Forward-Looking: "What-If" Sensitivity Scenarios */}
            <div
              data-testid="what-if-scenarios-panel"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-400">tune</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Sensitivity &amp; &ldquo;What-If&rdquo; Stress Testing
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-white/40">Real-time Simulation</span>
              </div>
              <p className="text-xs text-white/60">
                Stress test returns if market vacancy rises or achieved rents deviate from pro-forma underwriting.
              </p>

              {/* Stress Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-white/60 font-medium">Stressed Vacancy Rate:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        data-testid="what-if-vacancy-input"
                        value={whatIfVacancy}
                        onChange={(e) => setWhatIfVacancy(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-14 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-right font-bold text-white font-mono text-xs focus:outline-none focus:border-amber-400 min-h-[32px]"
                      />
                      <span className="text-white/50 text-xs">%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 8, 10, 15].map((v) => (
                      <button
                        key={v}
                        type="button"
                        data-testid={`what-if-vacancy-${v}-btn`}
                        onClick={() => setWhatIfVacancy(v)}
                        className={`rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition min-h-[44px] sm:min-h-[36px] ${
                          whatIfVacancy === v
                            ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                            : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-white/60 font-medium">Rent Variance:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        data-testid="what-if-rent-delta-input"
                        value={whatIfRentDeltaPct}
                        onChange={(e) => setWhatIfRentDeltaPct(Math.max(-50, Math.min(50, Number(e.target.value))))}
                        className="w-14 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-right font-bold text-white font-mono text-xs focus:outline-none focus:border-amber-400 min-h-[32px]"
                      />
                      <span className="text-white/50 text-xs">%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[-10, -5, 0, 5, 10].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        data-testid={`what-if-rent-delta-${delta}-btn`}
                        onClick={() => setWhatIfRentDeltaPct(delta)}
                        className={`rounded-lg border px-1.5 py-1.5 text-center text-[11px] font-semibold transition min-h-[44px] sm:min-h-[36px] ${
                          whatIfRentDeltaPct === delta
                            ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                            : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                        }`}
                      >
                        {delta > 0 ? `+${delta}%` : `${delta}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Simulated Real-Time Outcomes */}
              {(() => {
                const stressedRent = inputs.grossRentMonthly * (1 + whatIfRentDeltaPct / 100);
                const stressedGrossAnnual = stressedRent * 12;
                const ancillaryAnnual = (inputs.otherIncomeMonthly ?? 0) * 12;
                const stressedEGI = Math.round(stressedGrossAnnual * (1 - whatIfVacancy / 100) + ancillaryAnnual);
                const opex = inputs.operatingExpensesAnnual ?? Math.round(stressedGrossAnnual * (inputs.operatingExpensePct / 100));
                const stressedNOI = stressedEGI - opex;
                const annualDebt = calculations.annualDebtService;
                const stressedAnnualCashFlow = stressedNOI - annualDebt;
                const stressedMonthlyCashFlow = Math.round(stressedAnnualCashFlow / 12);
                const stressedCoC = calculations.cashRequired > 0 ? (stressedAnnualCashFlow / calculations.cashRequired) * 100 : 0;
                const stressedDSCR = annualDebt > 0 ? stressedNOI / annualDebt : null;

                return (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Stressed Effective Gross Income:</span>
                      <span className="font-mono text-white font-semibold">{formatCurrency(stressedEGI)}/yr</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Stressed Net Operating Income (NOI):</span>
                      <span className="font-mono text-white font-semibold">{formatCurrency(stressedNOI)}/yr</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5 text-center">
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <span className="block text-[9.5px] uppercase text-white/40">Monthly Cash Flow</span>
                        <span className={`block font-bold text-xs mt-0.5 ${stressedMonthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(stressedMonthlyCashFlow)}/mo
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <span className="block text-[9.5px] uppercase text-white/40">Cash-on-Cash</span>
                        <span className={`block font-bold text-xs mt-0.5 ${stressedCoC >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {stressedCoC.toFixed(1)}%
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <span className="block text-[9.5px] uppercase text-white/40">Stressed DSCR</span>
                        <span className={`block font-bold text-xs mt-0.5 ${stressedDSCR !== null && stressedDSCR >= 1.20 ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {stressedDSCR !== null ? stressedDSCR.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Advanced Risk & Forward-Looking: Exit Strategy Planning (5, 10, 20 Years) */}
            <div
              data-testid="exit-strategy-planning-panel"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-cyan-400">flag</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Exit Strategy Planning &amp; Wealth Horizon
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-cyan-300">{exitPlanningHorizon}-Year Horizon</span>
              </div>
              <p className="text-xs text-white/60">
                Model long-term wealth building, cumulative rental cash flows, equity paydown, and exit sales proceeds over 5, 10, or 20 years.
              </p>

              {/* Horizon Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {([5, 10, 20] as const).map((years) => (
                  <button
                    key={years}
                    type="button"
                    data-testid={`exit-horizon-${years}yr-btn`}
                    onClick={() => {
                      setExitPlanningHorizon(years);
                      handleInputChange('holdPeriodYears', years);
                    }}
                    className={`rounded-xl border p-2.5 text-center text-xs font-semibold transition min-h-[44px] ${
                      exitPlanningHorizon === years
                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 font-bold'
                        : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                    }`}
                  >
                    {years}-Year Exit Plan
                  </button>
                ))}
              </div>

              {/* Exit Horizon Calculated Breakdown */}
              {(() => {
                const H = exitPlanningHorizon;
                const basePrice = inputs.appreciationBase === 'arv' && inputs.arv > 0 ? inputs.arv : inputs.purchasePrice;
                const rateApprec = (inputs.annualAppreciationPct ?? 3) / 100;
                let futurePropertyVal = Math.round(basePrice * Math.pow(1 + rateApprec, H));

                if (inputs.terminalValueMethod === 'exit_cap' && inputs.exitCapRatePct > 0) {
                  const growthRate = (inputs.rentGrowthPct ?? 2.0) / 100;
                  const futureNOI = calculations.netOperatingIncome * Math.pow(1 + growthRate, H);
                  futurePropertyVal = Math.round(futureNOI / (inputs.exitCapRatePct / 100));
                } else if (inputs.terminalValueMethod === 'per_unit' && inputs.unitsCount && inputs.perUnitExitValue) {
                  futurePropertyVal = Math.round(inputs.unitsCount * inputs.perUnitExitValue * Math.pow(1 + rateApprec, H));
                }

                // Debt paydown estimate
                const monthlyRate = (inputs.interestRatePct ?? 6.5) / 100 / 12;
                const totalMonths = (inputs.amortizationYears ?? 30) * 12;
                const monthsElapsed = H * 12;
                const initialDebt = calculations.loanAmount;
                let remainingDebt = 0;
                if (initialDebt > 0 && monthlyRate > 0) {
                  if (monthsElapsed >= totalMonths) {
                    remainingDebt = 0;
                  } else {
                    const factorTotal = Math.pow(1 + monthlyRate, totalMonths);
                    const factorElapsed = Math.pow(1 + monthlyRate, monthsElapsed);
                    remainingDebt = Math.max(0, Math.round(initialDebt * ((factorTotal - factorElapsed) / (factorTotal - 1))));
                  }
                }
                const debtPaidDown = Math.max(0, initialDebt - remainingDebt);
                const totalEquityBuilt = Math.max(0, futurePropertyVal - remainingDebt);
                const sellingCosts = Math.round(futurePropertyVal * ((inputs.sellingCostsPct ?? 6) / 100));
                const netExitProceeds = Math.max(0, futurePropertyVal - sellingCosts - remainingDebt);
                const cumulativeCashFlow = Math.round(calculations.annualNetCashFlow * H);
                const totalCumulativeGain = netExitProceeds + cumulativeCashFlow - calculations.cashRequired;
                const multiYearRoiPct = calculations.cashRequired > 0 ? (totalCumulativeGain / calculations.cashRequired) * 100 : 0;

                return (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <span className="block text-[9.5px] uppercase text-white/40">Future Property Value</span>
                        <span className="block font-bold text-white text-xs mt-0.5">
                          {formatCurrency(futurePropertyVal)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <span className="block text-[9.5px] uppercase text-white/40">Remaining Debt</span>
                        <span className="block font-bold text-white/70 text-xs mt-0.5">
                          {formatCurrency(remainingDebt)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <span className="block text-[9.5px] uppercase text-white/40">Principal Paydown</span>
                        <span className="block font-bold text-emerald-400 text-xs mt-0.5">
                          +{formatCurrency(debtPaidDown)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                        <span className="block text-[9.5px] uppercase text-white/40">Total Equity at Exit</span>
                        <span className="block font-bold text-cyan-300 text-xs mt-0.5">
                          {formatCurrency(totalEquityBuilt)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/60">Cumulative {H}-Yr Cash Flow:</span>
                        <span className="font-semibold text-white">{formatCurrency(cumulativeCashFlow)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Estimated Net Sales Proceeds (After Debt &amp; {inputs.sellingCostsPct}% Cost of Sale):</span>
                        <span className="font-semibold text-emerald-400">{formatCurrency(netExitProceeds)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
                        <span className="text-white">Total Projected Multi-Year ROI:</span>
                        <span className="text-cyan-300 text-sm">{multiYearRoiPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Confidence Gauge */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Model Confidence
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold text-primary">
                    {confidenceScore}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
              </div>

              {/* Appraisal Contingency Alert */}
              <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs">
                <span className="material-symbols-outlined text-[20px] text-amber-300 shrink-0">
                  notifications_active
                </span>
                <p className="text-white/75 leading-relaxed">
                  <strong className="text-amber-300 font-semibold">Contingency Notice:</strong> Appraisal contingency expires in 3 days. Lock underwriting before earnest money goes hard.
                </p>
              </div>

              {/* "Want to make this deal a Project?" Persistent CTA Card */}
              {analysisCompleted && !isExpired && (
                <div
                  data-testid="make-project-persistent-cta"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all backdrop-blur-md shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-[20px] text-emerald-400">
                      rocket_launch
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Want to make this deal a Project?
                    </h3>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Convert these underwriting numbers into an authoritative project workspace in Phase 01: Acquisition.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowStartProjectModal(true)}
                    disabled={isCreatingProject}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
                  >
                    {isCreatingProject ? 'Opening Project...' : 'Make this deal a Project'}
                  </button>
                </div>
              )}

              {/* Persistent Legal & Investment Disclaimer Bar */}
              <div
                data-testid="calculator-disclaimer-bar"
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left backdrop-blur-md"
              >
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-white/40 text-[18px] mt-0.5 shrink-0">
                    info
                  </span>
                  <p className="text-[11px] leading-relaxed text-white/55">
                    <strong>Disclaimer:</strong> Hypothetical illustration based on user-supplied
                    assumptions; not investment, legal, tax, or financial advice; not a prediction or
                    guarantee.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Sign-In Gate Modal (Unauthenticated State) */}
      {!authLoading && !authenticated ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-in-gate-title"
          data-testid="sign-in-gate-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="relative mx-auto w-full max-w-[500px] rounded-none border border-border bg-card p-6 text-center shadow-2xl md:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-none border border-border bg-muted/50 text-foreground">
              <span className="material-symbols-outlined text-[24px]">lock</span>
            </div>

            <div className="mb-2 inline-flex items-center gap-1.5 rounded-none border border-border/80 bg-muted/30 px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Marketplace Eco-System
            </div>

            <h2 id="sign-in-gate-title" className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Sign in to Access the Deal Calculator
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The Marketplace is a real estate investment eco-system designed for serious Real Estate professionals and investors. You must be signed in to your account to access the Deal Calculator and live deal analysis.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/signup?next=${encodeURIComponent('/deal-calculator')}`}
                className="flex w-full min-h-[44px] items-center justify-center rounded-none bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 no-underline shadow-sm"
              >
                Start a 14 day free trial to access the Deal Calculator
              </Link>

              <Link
                href={`/login?next=${encodeURIComponent('/deal-calculator')}`}
                className="flex w-full min-h-[44px] items-center justify-center rounded-none border border-border bg-secondary/40 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-secondary no-underline"
              >
                Sign in to your account
              </Link>
            </div>

            <div className="mt-4">
              <Link
                href="/"
                className="text-xs text-muted-foreground hover:text-foreground transition no-underline"
              >
                Back to overview
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Paywall Notice (Expired / Inactive Subscription) */}
      {!authLoading && authenticated && isExpired ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
          data-testid="paywall-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="relative mx-auto w-full max-w-[460px] rounded-2xl border border-amber-500/30 bg-[#0a0a0f] p-6 text-center shadow-2xl md:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
            </div>

            <h2 id="paywall-title" className="text-xl font-bold tracking-tight text-white">
              Trial Expired
            </h2>

            <p className="mt-2 text-sm text-white/65">
              Your free trial has ended. Select an investor plan to unlock the Deal Calculator and lifecycle tools.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/pricing"
                className="flex w-full items-center justify-center rounded-xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:brightness-110 no-underline"
              >
                View Plans & Upgrade
              </Link>

              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5 no-underline"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Make It a Project Prompt Modal */}
      {showProjectPrompt && !isExpired ? (
        <div
          id="project-prompt-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-prompt-title"
          data-testid="make-project-prompt-modal"
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 p-0 md:p-4 backdrop-blur-md"
        >
          <div className="relative w-full max-w-[500px] rounded-t-2xl md:rounded-2xl border-t md:border border-white/15 bg-[#0a0a0f] p-5 md:p-8 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8 animate-in slide-in-from-bottom-6 duration-200 md:fade-in-once">
            {/* Mobile Drag Handle */}
            <div className="flex justify-center pt-1 pb-3 md:hidden">
              <div className="h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                <span className="material-symbols-outlined text-[20px]">folder_open</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
                  LIFECYCLE PROMPT
                </span>
                <h2 id="project-prompt-title" className="text-base sm:text-lg font-bold text-white">
                  Want to make this deal a Project?
                  <span className="sr-only"> Do you want to make this deal a Project?</span>
                </h2>
              </div>
            </div>

            {/* Deal Summary to Carry Over */}
            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-white/50">Property:</span>
                <span className="font-semibold text-white truncate max-w-[280px]">{inputs.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Purchase Price:</span>
                <span className="font-semibold text-white">{formatCurrency(inputs.purchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Rehab Budget:</span>
                <span className="font-semibold text-white">{formatCurrency(inputs.rehabBudget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Cap Rate on Cost / IRR:</span>
                <span className="font-semibold text-[color:var(--color-primary)]">
                  {formatPercent(calculations.capRateOnCost)} / {calculations.projectedIrrPct !== null ? `${calculations.projectedIrrPct.toFixed(1)}%` : 'n/a'}
                </span>
              </div>
              {persistedSnapshotId && (
                <div className="flex justify-between">
                  <span className="text-white/50">Underwriting Lineage:</span>
                  <span className="font-mono text-emerald-300 font-semibold">{persistedSnapshotId}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-white/50">Lifecycle Assignment:</span>
                <span className="font-semibold text-emerald-400 uppercase">Phase 01 — Acquisition</span>
              </div>
            </div>

            {/* Error Message if project creation fails */}
            {projectCreationError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {projectCreationError}
              </div>
            )}

            {/* Action Buttons: Yes / No with thumb-friendly touch targets */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDismissProjectPrompt}
                disabled={isCreatingProject}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-50 touch-press"
              >
                No
              </button>

              <button
                type="button"
                onClick={() => handleAcceptProjectPrompt(false)}
                disabled={isCreatingProject}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-7 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 shadow-sm touch-press"
              >
                {isCreatingProject ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Opening Project...
                  </>
                ) : (
                  'Yes, Make this deal a Project'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile Sticky Bottom Action Bar (Thumb-reach CTAs) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0b10]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-2xl">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase font-bold text-white/40 truncate">
            {inputs.strategy.replace(/_/g, ' ')}
          </span>
          <span className="text-sm font-black text-white font-mono truncate">
            {formatCurrency(calculations.cashRequired)} <span className="text-[10px] text-white/50 font-normal">Cash</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white active:bg-white/10"
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => handleAcceptProjectPrompt(false)}
            disabled={isCreatingProject}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm active:brightness-95"
          >
            <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
            <span>Make Project</span>
          </button>
        </div>
      </div>

      {/* 4. Rehab Worksheet Modal */}
      <RehabWorksheetModal
        isOpen={showRehabModal}
        onClose={() => setShowRehabModal(false)}
        currentRehabBudget={inputs.rehabBudget}
        onApplyTotal={(total) => {
          handleInputChange('rehabBudget', total);
          setShowRehabModal(false);
        }}
      />

      {/* 5. Schedule E Operating Expenses Modal */}
      <ScheduleEExpenseModal
        isOpen={showScheduleEModal}
        onClose={() => setShowScheduleEModal(false)}
        grossRentAnnual={inputs.grossRentMonthly * 12}
        currentAnnualOpex={inputs.operatingExpensesAnnual ?? (inputs.grossRentMonthly * 12 * (inputs.operatingExpensePct / 100))}
        onApplyExpenses={(annualTotal, opexRatioPct) => {
          handleInputChange('operatingExpensesAnnual' as any, annualTotal);
          handleInputChange('operatingExpensePct', opexRatioPct);
          setShowScheduleEModal(false);
        }}
      />

      {/* 6. Publish to Marketplace Modal */}
      <PublishToMarketplaceModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        address={inputs.address}
        purchasePrice={inputs.purchasePrice}
        strategy={inputs.strategy}
        calculations={calculations}
        projectId={searchParams?.get('projectId') || null}
        onSuccess={(dealId) => {
          setPublishSuccessDealId(dealId);
          setShowPublishModal(false);
        }}
      />

      {/* 7. Broadcast Deal Modal */}
      <BroadcastDealModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        address={inputs.address}
        purchasePrice={inputs.purchasePrice}
        calculations={calculations}
        onSuccess={(recipientCount) => {
          setBroadcastSuccessCount(recipientCount);
          setShowBroadcastModal(false);
        }}
      />

      {/* 8. Start Project from Deal Modal */}
      <StartProjectFromCalculatorModal
        isOpen={showStartProjectModal}
        onClose={() => setShowStartProjectModal(false)}
        address={inputs.address}
        strategy={inputs.strategy}
        purchasePrice={inputs.purchasePrice}
        rehabBudget={inputs.rehabBudget}
        arv={inputs.arv}
        grossRentMonthly={inputs.grossRentMonthly}
        noi={calculations.netOperatingIncome}
        projectedIrrPct={calculations.projectedIrrPct}
        capRateOnCost={calculations.capRateOnCost}
        cashOnCashReturnPct={calculations.cashOnCashReturnPct}
        loanAmount={calculations.loanAmount}
        cashRequired={calculations.cashRequired}
        persistedSnapshotId={persistedSnapshotId}
        isCreatingProject={isCreatingProject}
        projectCreationError={projectCreationError}
        onLaunchProjectWorkspace={() => handleAcceptProjectPrompt(true)}
        onOpenProjectWizard={() => handleAcceptProjectPrompt(false)}
      />

      {/* 9. Itemized Closing Costs Modal */}
      <ClosingCostsModal
        isOpen={showClosingCostsModal}
        onClose={() => setShowClosingCostsModal(false)}
        purchasePrice={inputs.purchasePrice}
        currentClosingCostsPct={inputs.buyerClosingCostsPct}
        onApplyClosingCosts={(_totalAmount, closingCostsPct) => {
          handleInputChange('buyerClosingCostsPct', closingCostsPct);
          setShowClosingCostsModal(false);
        }}
      />
    </div>
  );
}
