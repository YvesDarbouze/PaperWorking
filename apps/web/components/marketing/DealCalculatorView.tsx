'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchSessionProfile } from '@/lib/auth/session-client';
import {
  canonicalDemoDeal,
  reconcileAcquisitionUnderwriting,
  type ReconciledUnderwritingMetrics,
} from '@paperworking/financial-engine';
import type { PropertyComparableSale } from '@/lib/calculator/property-types';
import { SensitivityGridsView } from '../analysis/SensitivityGridsView';

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
};

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
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

  // Property Data Lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [propertyData, setPropertyData] = useState<{
    configured: boolean;
    requiresCredentials?: boolean;
    provider: string;
    message?: string;
    facts: any;
    comps: PropertyComparableSale[];
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

    return reconcileAcquisitionUnderwriting({
      purchasePrice,
      rehabBudget,
      estimatedARV: arv,
      grossRentMonthly,
      operatingExpensesAnnual: inputs.operatingExpensesAnnual,
      operatingExpenseRatioPct: operatingExpensePct,
      vacancyRatePct,
      targetLtvPct: ltvPct,
      interestRatePct,
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

        // If facts were returned from real provider, populate inputs
        if (data.facts) {
          setInputs((prev) => ({
            ...prev,
            beds: data.facts.beds ?? prev.beds,
            baths: data.facts.baths ?? prev.baths,
            sqft: data.facts.squareFeet ?? data.facts.sqft ?? prev.sqft,
            yearBuilt: data.facts.yearBuilt ?? prev.yearBuilt,
            taxAssessment: data.facts.taxAssessment ?? prev.taxAssessment,
            arv: data.estimatedValue > 0 ? data.estimatedValue : prev.arv,
            grossRentMonthly: data.estimatedRent > 0 ? data.estimatedRent : prev.grossRentMonthly,
          }));
        }
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
      const next = {
        ...prev,
        [field]: value,
      };
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
  const handleAcceptProjectPrompt = async () => {
    setIsCreatingProject(true);
    setProjectCreationError(null);

    const promotePayload = {
      address: inputs.address,
      projectName: inputs.address.split(',')[0].trim() || 'New Investment Deal',
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
      strategy: 'buy_and_hold_rental' as const,
      assumptionsNotes: `Underwritten via Deal Calculator (Snapshot: ${persistedSnapshotId || 'snapshot-initial'})`,
    };

    let createdProjectId: string | undefined;

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
      loanType: inputs.loanType ?? 'amortizing',
      ioPeriodYears: inputs.ioPeriodYears ?? 5,
      armFixedPeriodYears: inputs.armFixedPeriodYears ?? 5,
      armAdjustmentPct: inputs.armAdjustmentPct ?? 2.0,
      stabilizationMonths: inputs.stabilizationMonths ?? 0,
      monthsVacantAtClose: inputs.monthsVacantAtClose ?? 0,
      concessionsMonths: inputs.concessionsMonths ?? 0,
      leaseUpRentRampPct: inputs.leaseUpRentRampPct ?? 100.0,
      strategy: 'buy_and_hold_rental' as const,
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

    const searchParams = new URLSearchParams({
      fromCalculator: 'true',
      phase: 'acquisition',
      address: inputs.address,
      price: String(inputs.purchasePrice),
      rehab: String(inputs.rehabBudget),
      arv: String(inputs.arv),
      rent: String(inputs.grossRentMonthly),
      strategy: 'buy_and_hold_rental',
    });
    if (createdProjectId) {
      searchParams.set('projectId', createdProjectId);
    }

    router.push(`/projects/new?${searchParams.toString()}`);
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
    <div className="min-h-[calc(100vh-144px)] bg-[#0a0a0f] text-[#fdfffc] px-4 py-8 md:px-8 lg:py-12">
      <div className="mx-auto max-w-[1240px]">
        {/* Page Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-primary)]">
                ACQUISITION PHASE 01
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-primary)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
                CANONICAL ENGINE
              </span>
              {persistedSnapshotId && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  <span className="material-symbols-outlined text-[12px]">bookmark</span>
                  {persistedSnapshotId}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Deal Calculator
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Analyze deals with institutional precision. Stress-test acquisition metrics before committing capital.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={snapshotSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-6 py-3 text-xs font-bold text-[#0a0a0f] transition hover:brightness-110 shadow-[0_0_20px_rgba(0,221,148,0.2)] touch-press min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              {snapshotSaving ? 'Calculating...' : 'Calculate Deal'}
            </button>
          </div>
        </div>

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

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                <span className="material-symbols-outlined text-[18px] text-white/40">location_on</span>
                <input
                  id="address-input"
                  type="text"
                  value={inputs.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter property address..."
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
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
                    {pricePerSqFt ? `$${pricePerSqFt}` : '—'}
                  </span>
                </div>
              </div>
              {!inputs.sqft && (
                <p className="text-[11px] text-white/40 italic">
                  Sqft not provided by public records — enter to calculate price/sqft.
                </p>
              )}
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="rehab-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    Rehab Budget ($)
                  </label>
                  <input
                    id="rehab-input"
                    data-testid="rehab-input"
                    type="number"
                    inputMode="numeric"
                    value={inputs.rehabBudget}
                    onChange={(e) => handleInputChange('rehabBudget', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="rent-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    Monthly Gross Rent ($)
                  </label>
                  <input
                    id="rent-input"
                    data-testid="gross-rent-input"
                    type="number"
                    inputMode="numeric"
                    value={inputs.grossRentMonthly}
                    onChange={(e) => handleInputChange('grossRentMonthly', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
                  />
                </div>
              </div>
            </div>

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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="ltv-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    Target LTV (%)
                  </label>
                  <input
                    id="ltv-input"
                    type="number"
                    inputMode="decimal"
                    value={inputs.ltvPct}
                    onChange={(e) => handleInputChange('ltvPct', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="rate-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    Interest Rate (%)
                  </label>
                  <input
                    id="rate-input"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={inputs.interestRatePct}
                    onChange={(e) => handleInputChange('interestRatePct', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="opex-input" className="block text-[11px] font-medium text-white/50 mb-1.5">
                    OpEx Ratio (%)
                  </label>
                  <input
                    id="opex-input"
                    type="number"
                    inputMode="decimal"
                    value={inputs.operatingExpensePct}
                    onChange={(e) => handleInputChange('operatingExpensePct', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
                  />
                </div>
              </div>

              {/* Terminal Valuation Method Discipline (W2-06) */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Terminal Valuation Method *
                  </label>
                  <span className="text-[10px] font-medium text-white/40">
                    Required — no silent fallback
                  </span>
                </div>
                <div data-testid="terminal-value-method-group" className="grid grid-cols-3 gap-2">
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
                        <label className="text-[11px] font-medium text-white/50">
                          Appreciation Base
                        </label>
                        <span className="text-[9px] font-mono text-white/40">
                          {inputs.appreciationBase === 'arv' ? 'ARV Base' : 'Price Base (Default)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
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
                      <label className="block text-[11px] font-medium text-white/50 mb-1">
                        Annual Appreciation (%)
                      </label>
                      <input
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
                    <label className="block text-[11px] font-medium text-white/50 mb-1">
                      Exit Cap Rate (%)
                    </label>
                    <input
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
                      <label className="block text-[11px] font-medium text-white/50 mb-1">
                        Units Count
                      </label>
                      <input
                        type="number"
                        value={inputs.unitsCount}
                        onChange={(e) => handleInputChange('unitsCount', Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-white/50 mb-1">
                        Per Unit Exit ($)
                      </label>
                      <input
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Growth &amp; Escalation Assumptions
                  </label>
                  <span className="text-[10px] font-medium text-white/40">
                    Honest 0.0% defaults — source: default
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-white/50">
                        Rent Growth (%/yr)
                      </label>
                      {(!inputs.rentGrowthPct || inputs.rentGrowthPct === 0) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
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
                      <label className="text-[11px] font-medium text-white/50">
                        Expense Growth (%/yr)
                      </label>
                      {(!inputs.expenseGrowthPct || inputs.expenseGrowthPct === 0) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
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
                      <label className="text-[11px] font-medium text-white/50">
                        Appreciation (%/yr)
                      </label>
                      {inputs.annualAppreciationPct === 3.0 && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Loan Structure &amp; Terms
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400/80">
                    {inputs.loanType === 'amortizing' ? '30-yr amortizing' : inputs.loanType === 'interest_only' ? `${inputs.ioPeriodYears}-yr IO` : `${inputs.armFixedPeriodYears}/1 ARM`}
                  </span>
                </div>
                <div data-testid="loan-type-group" className="grid grid-cols-3 gap-2">
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
                      <label className="text-[11px] font-medium text-white/50">
                        Interest-Only Period (Years)
                      </label>
                      <span className="text-[10px] font-mono text-white/40">
                        Then amortizes over remaining {Math.max(1, (inputs.amortizationYears || 30) - (inputs.ioPeriodYears ?? 5))} yrs
                      </span>
                    </div>
                    <div className="relative">
                      <input
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
                        <label className="text-[11px] font-medium text-white/50">
                          ARM Fixed Period (Years)
                        </label>
                        <span className="text-[9px] font-mono text-emerald-400/80">e.g. 5/1 ARM</span>
                      </div>
                      <div className="relative">
                        <input
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
                        <label className="text-[11px] font-medium text-white/50">
                          Assumed Rate Adjustment (%)
                        </label>
                        <span className="text-[9px] font-mono text-amber-300/80">assumption</span>
                      </div>
                      <div className="relative">
                        <input
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                    Lease-Up &amp; Stabilization
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400/80">
                    {!inputs.stabilizationMonths || inputs.stabilizationMonths === 0
                      ? 'Stabilized (0 mo)'
                      : `${inputs.stabilizationMonths}-mo lease-up`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-white/50">
                        Stabilization (Months)
                      </label>
                      {(!inputs.stabilizationMonths || inputs.stabilizationMonths === 0) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
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
                      <label className="text-[11px] font-medium text-white/50">
                        Rent Ramp (% during ramp)
                      </label>
                      {(inputs.leaseUpRentRampPct === 100 || inputs.leaseUpRentRampPct === undefined) && (
                        <span className="text-[9px] font-mono text-emerald-400/80">default</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
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
                        <label className="text-[11px] font-medium text-white/50">
                          Months Vacant at Close
                        </label>
                        <span className="text-[9px] font-mono text-white/40">0% rent period</span>
                      </div>
                      <div className="relative">
                        <input
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
                        <label className="text-[11px] font-medium text-white/50">
                          Concessions (Months Free)
                        </label>
                        <span className="text-[9px] font-mono text-white/40">free rent</span>
                      </div>
                      <div className="relative">
                        <input
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
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Vacancy Floor (%)
                    </label>
                    <input
                      type="number"
                      value={inputs.vacancyRatePct}
                      onChange={(e) => handleInputChange('vacancyRatePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Amortization (Years)
                    </label>
                    <input
                      type="number"
                      value={inputs.amortizationYears}
                      onChange={(e) => handleInputChange('amortizationYears', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Hold Period (Years)
                    </label>
                    <input
                      type="number"
                      value={inputs.holdPeriodYears}
                      onChange={(e) => handleInputChange('holdPeriodYears', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Exit Cap Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.exitCapRatePct}
                      onChange={(e) => handleInputChange('exitCapRatePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Closing Costs (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.buyerClosingCostsPct}
                      onChange={(e) => handleInputChange('buyerClosingCostsPct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Cost of Sale (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.costOfSalePct}
                      onChange={(e) => handleInputChange('costOfSalePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Annual Appreciation (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.annualAppreciationPct}
                      onChange={(e) => handleInputChange('annualAppreciationPct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/50 mb-1.5">
                      Selling Costs at Exit (%)
                    </label>
                    <input
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
                            <td className="py-2 text-right text-white/70">{comp.sqft ? `${comp.sqft}` : '—'}</td>
                            <td className="py-2 text-right text-white/50">{comp.distance !== undefined ? `${comp.distance} mi` : '—'}</td>
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
                  no comp data — REQUIRES CREDENTIALS
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

            {/* Primary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1 cursor-help"
                  title="Cap Rate on Cost (Yield on Cost): Year-1 NOI ÷ Total Cost Basis"
                >
                  Cap Rate on Cost
                </span>
                <span className="text-3xl font-extrabold text-white">
                  {formatPercent(calculations.capRateOnCost)}
                </span>
                <span className="mt-2 block text-[11px] text-white/40">
                  Year-1 NOI {formatCurrency(calculations.netOperatingIncome)} ÷ Total Cost Basis
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                  Projected IRR
                </span>
                <span
                  data-testid="irr-output-metric"
                  className="text-3xl font-extrabold text-[color:var(--color-primary)]"
                >
                  {calculations.projectedIrrPct !== null
                    ? `${calculations.projectedIrrPct.toFixed(1)}%`
                    : calculations.irrStatus === 'multiple_roots'
                      ? 'Multiple Roots'
                      : calculations.irrStatus === 'no_sign_change'
                        ? 'No Sign Change'
                        : '—'}
                </span>
                <span className="mt-2 block text-[11px] text-white/40">
                  {calculations.projectedIrrPct !== null
                    ? `${inputs.holdPeriodYears}-Yr hold (${calculations.terminalValueLabel})`
                    : calculations.irrStatus === 'multiple_roots'
                      ? 'Ambiguous cash flows cross zero multiple times — review assumptions'
                      : calculations.irrStatus === 'no_sign_change'
                        ? 'Cash flows never cross zero — IRR undefined'
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
                    {calculations.dscr !== null ? calculations.dscr.toFixed(2) : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Gross Rent Multiplier (GRM)</span>
                  <span className="font-semibold text-white">
                    {calculations.grossRentMultiplier !== null ? calculations.grossRentMultiplier.toFixed(1) : '—'}
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
              <div data-testid="dcf-projections-table" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
                    {`Multi-Year DCF Projection (${inputs.holdPeriodYears} Years)`}
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400/80">
                    {`${inputs.stabilizationMonths ? `${inputs.stabilizationMonths}-mo lease-up • ` : ''}${inputs.loanType === 'interest_only' ? `${inputs.ioPeriodYears}-yr IO` : inputs.loanType === 'arm' ? `${inputs.armFixedPeriodYears}/1 ARM` : 'Amortizing'} • ${inputs.rentGrowthPct || 0}% rent / ${inputs.expenseGrowthPct || 0}% exp`}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 text-[10px]">
                        <th className="py-2 pr-2">Yr</th>
                        <th className="py-2 pr-2">Gross Rent</th>
                        <th className="py-2 pr-2">OpEx</th>
                        <th className="py-2 pr-2">NOI</th>
                        <th className="py-2 pr-2">Op Cash Flow</th>
                        <th className="py-2 pr-2">Exit Proceeds</th>
                        <th className="py-2 text-right">Total Equity CF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      {calculations.annualProjections.map((p) => (
                        <tr key={p.year} className="hover:bg-white/[0.02]">
                          <td className="py-2 pr-2 font-bold text-white">{`Y${p.year}`}</td>
                          <td className="py-2 pr-2">{formatCurrency(p.grossRent)}</td>
                          <td className="py-2 pr-2 text-white/60">{formatCurrency(p.opex)}</td>
                          <td className="py-2 pr-2 font-semibold text-white">{formatCurrency(p.noi)}</td>
                          <td className={`py-2 pr-2 font-semibold ${p.operatingCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(p.operatingCashFlow)}
                          </td>
                          <td className="py-2 pr-2 text-white/60">
                            {p.netSaleProceeds > 0 ? formatCurrency(p.netSaleProceeds) : '—'}
                          </td>
                          <td className={`py-2 text-right font-bold ${p.totalCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(p.totalCashFlow)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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

            {/* Confidence Gauge */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/[0.04] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Model Confidence
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-bold text-[color:var(--color-primary)]">
                    {confidenceScore}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-[color:var(--color-primary)] transition-all duration-500"
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
                  className="rounded-2xl border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/[0.08] p-4 text-left transition-all backdrop-blur-md shadow-[0_4px_24px_rgba(0,221,148,0.12)]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-[20px] text-[color:var(--color-primary)]">
                      rocket_launch
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Want to make this deal a Project?
                    </h3>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Convert these underwriting numbers into an authoritative project workspace in Phase 01 — Acquisition.
                  </p>
                  <button
                    type="button"
                    onClick={handleAcceptProjectPrompt}
                    disabled={isCreatingProject}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-4 py-2.5 text-xs font-bold text-[#0a0a0f] hover:brightness-110 shadow-[0_0_16px_rgba(0,221,148,0.25)] min-h-[40px]"
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

      {/* ========================================================= */}
      {/* 1. SIGN-IN GATE MODAL (Unauthenticated State)             */}
      {/* ========================================================= */}
      {!authLoading && !authenticated ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-in-gate-title"
          data-testid="sign-in-gate-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <div className="relative mx-auto w-full max-w-[460px] rounded-2xl border border-white/15 bg-[#0a0a0f] p-6 text-center shadow-2xl md:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
              <span className="material-symbols-outlined text-[24px]">lock</span>
            </div>

            <h2 id="sign-in-gate-title" className="text-2xl font-bold tracking-tight text-white">
              Sign in
            </h2>

            <p className="mt-2 text-sm text-white/65">
              Sign in to use the Deal Calculator. Your in-progress calculations will be preserved.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href={`/login?next=${encodeURIComponent('/deal-calculator')}`}
                className="flex w-full items-center justify-center rounded-xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-[#0a0a0f] transition hover:brightness-110 no-underline shadow-[0_0_20px_rgba(0,221,148,0.25)]"
              >
                Sign in
              </Link>

              <Link
                href={`/signup?next=${encodeURIComponent('/deal-calculator')}`}
                className="flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 no-underline"
              >
                Get started
              </Link>
            </div>

            <div className="mt-4">
              <Link
                href="/"
                className="text-xs text-white/40 hover:text-white transition no-underline"
              >
                Back to overview
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* 2. PAYWALL NOTICE (Expired / Inactive Subscription)       */}
      {/* ========================================================= */}
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

      {/* ========================================================= */}
      {/* 3. "MAKE IT A PROJECT" PROMPT MODAL                       */}
      {/* ========================================================= */}
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
                onClick={handleAcceptProjectPrompt}
                disabled={isCreatingProject}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-7 py-2.5 text-sm font-bold text-[#0a0a0f] transition hover:brightness-110 disabled:opacity-50 shadow-[0_0_16px_rgba(0,221,148,0.25)] touch-press"
              >
                {isCreatingProject ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0a0a0f] border-t-transparent" />
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
    </div>
  );
}
