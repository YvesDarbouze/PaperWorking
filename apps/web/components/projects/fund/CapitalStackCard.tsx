'use client';

import React, { useState, useMemo } from 'react';
import type {
  ProjectFundingTerms,
  CapitalStackBreakdown,
  LenderUnderwritingCondition,
} from '@/lib/projects/types';
import { formatCurrency } from '@/lib/projects/phase-utils';
import { cn } from '@/lib/utils';

export interface CapitalStackCardProps {
  funding: ProjectFundingTerms;
  purchasePrice: number;
  totalCostBasis: number;
  onUpdateFunding: (updated: ProjectFundingTerms) => void;
  className?: string;
}

// Canonical default lender underwriting conditions if none provided
const DEFAULT_LENDER_CONDITIONS: LenderUnderwritingCondition[] = [
  {
    id: 'cond-ptd-1',
    category: 'PTD',
    title: 'Phase I Environmental Site Assessment (ESA)',
    description: 'Clean environmental assessment confirming no recognized environmental conditions (RECs).',
    status: 'approved',
    clearedAt: '2026-08-12T10:00:00.000Z',
  },
  {
    id: 'cond-ptd-2',
    category: 'PTD',
    title: 'Certified Commercial Appraisal & Valuation Sign-Off',
    description: 'Appraisal confirming market value meets or exceeds the contract purchase price.',
    status: 'approved',
    clearedAt: '2026-08-14T15:30:00.000Z',
  },
  {
    id: 'cond-ptd-3',
    category: 'PTD',
    title: 'Borrowing Entity Certificate of Good Standing',
    description: 'State filings, operating agreement, and EIN verification for the borrowing LLC.',
    status: 'submitted',
  },
  {
    id: 'cond-ptf-1',
    category: 'PTF',
    title: 'Borrower Equity Contribution & Proof of Funds',
    description: 'Escrow verification of initial cash to close deposit wired into escrow account.',
    status: 'submitted',
  },
  {
    id: 'cond-ptf-2',
    category: 'PTF',
    title: 'Hazard & Commercial General Liability Insurance Binder',
    description: 'Policy naming senior lender as primary loss payee and additional insured.',
    status: 'pending',
  },
  {
    id: 'cond-ptf-3',
    category: 'PTF',
    title: 'Execution of Loan Agreement & Promissory Note',
    description: 'Countersigned credit agreement, deed of trust, and personal/corporate guaranties.',
    status: 'pending',
  },
  {
    id: 'cond-closing-1',
    category: 'CLOSING',
    title: 'Settlement Statement (ALTA / HUD-1) Sign-Off',
    description: 'Reconciled figures signed by buyer, seller, lender counsel, and title officer.',
    status: 'pending',
  },
  {
    id: 'cond-closing-2',
    category: 'CLOSING',
    title: 'First Lien Mortgage / Deed of Trust Recordation',
    description: 'County recorder verification of first lien priority and title policy issuance.',
    status: 'pending',
  },
];

type ConditionCategory = 'PTD' | 'PTF' | 'CLOSING';
type ConditionStatus = 'pending' | 'submitted' | 'approved' | 'waived';

export default function CapitalStackCard({
  funding,
  purchasePrice,
  totalCostBasis,
  onUpdateFunding,
  className,
}: CapitalStackCardProps) {
  // Effective cost basis fallback
  const effectiveBasis = useMemo(() => {
    if (totalCostBasis > 0) return totalCostBasis;
    if (purchasePrice > 0) return Math.round(purchasePrice * 1.1);
    return 500000;
  }, [totalCostBasis, purchasePrice]);

  const effectivePrice = useMemo(() => {
    if (purchasePrice > 0) return purchasePrice;
    return Math.round(effectiveBasis * 0.9);
  }, [purchasePrice, effectiveBasis]);

  // Derived or stored capital stack
  const stack = useMemo<CapitalStackBreakdown>(() => {
    if (funding.capitalStack) {
      return funding.capitalStack;
    }
    // Default baseline derivation
    const seniorDebt = funding.loanAmount ?? Math.round(effectiveBasis * 0.70);
    const mezzanineDebt = 0;
    const preferredEquity = 0;
    const totalDebt = seniorDebt + mezzanineDebt;
    const remainingEquity = Math.max(0, effectiveBasis - totalDebt - preferredEquity);
    const investorEquity = Math.round(remainingEquity * 0.80);
    const leadEquity = Math.max(0, remainingEquity - investorEquity);

    return {
      seniorDebt,
      mezzanineDebt,
      preferredEquity,
      investorEquity,
      leadEquity,
      totalCostBasis: effectiveBasis,
      ltvPct: effectivePrice > 0 ? (seniorDebt / effectivePrice) * 100 : 0,
      ltcPct: effectiveBasis > 0 ? (seniorDebt / effectiveBasis) * 100 : 0,
    };
  }, [funding.capitalStack, funding.loanAmount, effectiveBasis, effectivePrice]);

  // Calculated totals
  const seniorDebtAmount = Number(stack.seniorDebt || 0);
  const mezzDebtAmount = Number(stack.mezzanineDebt || 0);
  const prefEquityAmount = Number(stack.preferredEquity || 0);
  const investorEquityAmount = Number(stack.investorEquity || 0);
  const leadEquityAmount = Number(stack.leadEquity || 0);

  const totalDebtAmount = seniorDebtAmount + mezzDebtAmount;
  const totalEquityAmount = prefEquityAmount + investorEquityAmount + leadEquityAmount;
  const totalStackAmount = totalDebtAmount + totalEquityAmount;

  // LTV & LTC metrics
  const calculatedLtv = useMemo(() => {
    if (effectivePrice <= 0) return 0;
    return (totalDebtAmount / effectivePrice) * 100;
  }, [totalDebtAmount, effectivePrice]);

  const calculatedLtc = useMemo(() => {
    if (effectiveBasis <= 0) return 0;
    return (totalDebtAmount / effectiveBasis) * 100;
  }, [totalDebtAmount, effectiveBasis]);

  // Proportional percentages of total capital stack
  const seniorPct = totalStackAmount > 0 ? (seniorDebtAmount / totalStackAmount) * 100 : 0;
  const mezzPct = totalStackAmount > 0 ? (mezzDebtAmount / totalStackAmount) * 100 : 0;
  const prefPct = totalStackAmount > 0 ? (prefEquityAmount / totalStackAmount) * 100 : 0;
  const investorPct = totalStackAmount > 0 ? (investorEquityAmount / totalStackAmount) * 100 : 0;
  const leadPct = totalStackAmount > 0 ? (leadEquityAmount / totalStackAmount) * 100 : 0;

  // Conditions list with fallback
  const conditions = useMemo<LenderUnderwritingCondition[]>(() => {
    if (funding.lenderConditions && funding.lenderConditions.length > 0) {
      return funding.lenderConditions;
    }
    return DEFAULT_LENDER_CONDITIONS;
  }, [funding.lenderConditions]);

  // Conditions status counts
  const clearedConditionsCount = useMemo(() => {
    return conditions.filter((c) => c.status === 'approved' || c.status === 'waived').length;
  }, [conditions]);

  const totalConditionsCount = conditions.length;
  const conditionsProgressPct =
    totalConditionsCount > 0 ? Math.round((clearedConditionsCount / totalConditionsCount) * 100) : 0;

  // Category filter state
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'ALL' | ConditionCategory>('ALL');

  // "Add Lender Condition" form state
  const [isAddingCondition, setIsAddingCondition] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ConditionCategory>('PTD');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<ConditionStatus>('pending');

  // "Edit Capital Stack" modal state
  const [isEditingStack, setIsEditingStack] = useState(false);
  const [editSeniorDebt, setEditSeniorDebt] = useState<number>(seniorDebtAmount);
  const [editMezzDebt, setEditMezzDebt] = useState<number>(mezzDebtAmount);
  const [editPrefEquity, setEditPrefEquity] = useState<number>(prefEquityAmount);
  const [editInvestorEquity, setEditInvestorEquity] = useState<number>(investorEquityAmount);
  const [editLeadEquity, setEditLeadEquity] = useState<number>(leadEquityAmount);

  // Synchronize edit inputs when opening modal
  const handleOpenEditStack = () => {
    setEditSeniorDebt(seniorDebtAmount);
    setEditMezzDebt(mezzDebtAmount);
    setEditPrefEquity(prefEquityAmount);
    setEditInvestorEquity(investorEquityAmount);
    setEditLeadEquity(leadEquityAmount);
    setIsEditingStack(true);
  };

  // Live sum while editing
  const editTotalStack =
    Number(editSeniorDebt || 0) +
    Number(editMezzDebt || 0) +
    Number(editPrefEquity || 0) +
    Number(editInvestorEquity || 0) +
    Number(editLeadEquity || 0);

  const editDifference = editTotalStack - effectiveBasis;

  // Auto-balance lead equity button handler
  const handleAutoBalanceLead = () => {
    const debtAndOther =
      Number(editSeniorDebt || 0) +
      Number(editMezzDebt || 0) +
      Number(editPrefEquity || 0) +
      Number(editInvestorEquity || 0);
    const balancedLead = Math.max(0, effectiveBasis - debtAndOther);
    setEditLeadEquity(balancedLead);
  };

  // Save edited capital stack
  const handleSaveCapitalStack = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedStack: CapitalStackBreakdown = {
      seniorDebt: Number(editSeniorDebt || 0),
      mezzanineDebt: Number(editMezzDebt || 0),
      preferredEquity: Number(editPrefEquity || 0),
      investorEquity: Number(editInvestorEquity || 0),
      leadEquity: Number(editLeadEquity || 0),
      totalCostBasis: effectiveBasis,
      ltvPct: effectivePrice > 0 ? ((Number(editSeniorDebt || 0) + Number(editMezzDebt || 0)) / effectivePrice) * 100 : 0,
      ltcPct: effectiveBasis > 0 ? ((Number(editSeniorDebt || 0) + Number(editMezzDebt || 0)) / effectiveBasis) * 100 : 0,
    };

    const updatedFunding: ProjectFundingTerms = {
      ...funding,
      loanAmount: updatedStack.seniorDebt,
      capitalStack: updatedStack,
    };

    onUpdateFunding(updatedFunding);
    setIsEditingStack(false);
  };

  // Update condition status handler
  const handleConditionStatusChange = (conditionId: string, status: ConditionStatus) => {
    const updatedConditions = conditions.map((item) => {
      if (item.id === conditionId) {
        return {
          ...item,
          status,
          clearedAt: status === 'approved' || status === 'waived' ? new Date().toISOString() : undefined,
        };
      }
      return item;
    });

    onUpdateFunding({
      ...funding,
      lenderConditions: updatedConditions,
    });
  };

  // Add condition handler
  const handleAddCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newCondition: LenderUnderwritingCondition = {
      id: `cond-${Date.now()}`,
      category: newCategory,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      status: newStatus,
      clearedAt: newStatus === 'approved' || newStatus === 'waived' ? new Date().toISOString() : undefined,
    };

    const updatedConditions = [...conditions, newCondition];

    onUpdateFunding({
      ...funding,
      lenderConditions: updatedConditions,
    });

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewStatus('pending');
    setIsAddingCondition(false);
  };

  // Filtered conditions for display
  const filteredConditions = useMemo(() => {
    if (selectedCategoryTab === 'ALL') return conditions;
    return conditions.filter((c) => c.category === selectedCategoryTab);
  }, [conditions, selectedCategoryTab]);

  return (
    <div
      data-testid="capital-stack-card"
      className={cn(
        'w-full rounded-none border border-neutral-800 bg-[#0c0c0c] text-neutral-100 p-4 sm:p-6 shadow-sm',
        className,
      )}
    >
      {/* SECTION 1: HEADER & KEY RATIOS */}
      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-none bg-zinc-200" />
            <h2 className="text-sm font-semibold tracking-tight text-white uppercase">
              Capital Stack & Lender Conditions
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Institutional debt and equity tranche breakdown with underwriting milestones
          </p>
        </div>

        <button
          type="button"
          data-testid="edit-capital-stack-btn"
          onClick={handleOpenEditStack}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-none border border-neutral-700 bg-neutral-900 px-4 py-2 text-base sm:text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          Edit Capital Stack
        </button>
      </div>

      {/* SECTION 2: METRIC CARDS (LTV, LTC, TOTAL STACK, TOTAL BASIS) */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: LTV */}
        <div className="rounded-none border border-neutral-800/80 bg-neutral-950 p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Senior LTV
          </p>
          <p
            className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-white tabular-nums"
            data-testid="metric-ltv"
          >
            {calculatedLtv.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Of {formatCurrency(effectivePrice)} Purchase Price
          </p>
        </div>

        {/* Metric 2: LTC */}
        <div className="rounded-none border border-neutral-800/80 bg-neutral-950 p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Senior LTC
          </p>
          <p
            className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-white tabular-nums"
            data-testid="metric-ltc"
          >
            {calculatedLtc.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Of {formatCurrency(effectiveBasis)} Total Basis
          </p>
        </div>

        {/* Metric 3: Total Stack */}
        <div className="rounded-none border border-neutral-800/80 bg-neutral-950 p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Total Capital Stack
          </p>
          <p
            className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-white tabular-nums"
            data-testid="metric-total-stack"
          >
            {formatCurrency(totalStackAmount)}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            {totalDebtAmount > 0 && totalStackAmount > 0
              ? `${Math.round((totalDebtAmount / totalStackAmount) * 100)}% Debt / ${Math.round((totalEquityAmount / totalStackAmount) * 100)}% Equity`
              : 'Structured capital'}
          </p>
        </div>

        {/* Metric 4: Total Cost Basis Balance */}
        <div className="rounded-none border border-neutral-800/80 bg-neutral-950 p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Cost Basis Match
          </p>
          <p
            className={cn(
              'mt-1 text-lg sm:text-xl font-bold tracking-tight tabular-nums',
              Math.abs(totalStackAmount - effectiveBasis) < 1
                ? 'text-neutral-100'
                : totalStackAmount < effectiveBasis
                  ? 'text-amber-400'
                  : 'text-sky-400',
            )}
            data-testid="metric-basis-match"
          >
            {Math.abs(totalStackAmount - effectiveBasis) < 1
              ? 'Balanced'
              : totalStackAmount < effectiveBasis
                ? `-${formatCurrency(effectiveBasis - totalStackAmount)}`
                : `+${formatCurrency(totalStackAmount - effectiveBasis)}`}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Target: {formatCurrency(effectiveBasis)}
          </p>
        </div>
      </div>

      {/* SECTION 3: MULTI-SEGMENTED VISUAL BAR */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
          <span className="font-medium text-neutral-300">Tranche Proportions</span>
          <span>100% Total Structured Capital</span>
        </div>

        {/* Proportional Bar */}
        <div
          role="progressbar"
          aria-label="Capital Stack Proportions"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={100}
          className="flex h-7 sm:h-8 w-full overflow-hidden rounded-none border border-neutral-800 bg-neutral-950"
        >
          {seniorPct > 0 && (
            <div
              style={{ width: `${seniorPct}%` }}
              className="group relative flex h-full items-center justify-center bg-zinc-200 text-zinc-950 transition-all text-[11px] font-bold px-1 overflow-hidden"
              title={`Senior Debt: ${formatCurrency(seniorDebtAmount)} (${seniorPct.toFixed(1)}%)`}
            >
              {seniorPct >= 12 && (
                <span className="truncate whitespace-nowrap">Senior {seniorPct.toFixed(0)}%</span>
              )}
            </div>
          )}

          {mezzPct > 0 && (
            <div
              style={{ width: `${mezzPct}%` }}
              className="group relative flex h-full items-center justify-center bg-zinc-400 text-zinc-950 transition-all text-[11px] font-bold px-1 overflow-hidden"
              title={`Mezzanine Debt: ${formatCurrency(mezzDebtAmount)} (${mezzPct.toFixed(1)}%)`}
            >
              {mezzPct >= 10 && (
                <span className="truncate whitespace-nowrap">Mezz {mezzPct.toFixed(0)}%</span>
              )}
            </div>
          )}

          {prefPct > 0 && (
            <div
              style={{ width: `${prefPct}%` }}
              className="group relative flex h-full items-center justify-center bg-zinc-600 text-white transition-all text-[11px] font-bold px-1 overflow-hidden"
              title={`Preferred Equity: ${formatCurrency(prefEquityAmount)} (${prefPct.toFixed(1)}%)`}
            >
              {prefPct >= 10 && (
                <span className="truncate whitespace-nowrap">Pref {prefPct.toFixed(0)}%</span>
              )}
            </div>
          )}

          {investorPct > 0 && (
            <div
              style={{ width: `${investorPct}%` }}
              className="group relative flex h-full items-center justify-center bg-zinc-700 text-white transition-all text-[11px] font-bold px-1 overflow-hidden"
              title={`Investor / LP Equity: ${formatCurrency(investorEquityAmount)} (${investorPct.toFixed(1)}%)`}
            >
              {investorPct >= 12 && (
                <span className="truncate whitespace-nowrap">LP {investorPct.toFixed(0)}%</span>
              )}
            </div>
          )}

          {leadPct > 0 && (
            <div
              style={{ width: `${leadPct}%` }}
              className="group relative flex h-full items-center justify-center bg-zinc-800 text-white transition-all text-[11px] font-bold px-1 overflow-hidden"
              title={`Lead Equity: ${formatCurrency(leadEquityAmount)} (${leadPct.toFixed(1)}%)`}
            >
              {leadPct >= 12 && (
                <span className="truncate whitespace-nowrap">Lead {leadPct.toFixed(0)}%</span>
              )}
            </div>
          )}
        </div>

        {/* Tranche Legend Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Layer 1: Senior Debt */}
          <div className="flex items-start gap-2.5 rounded-none border border-neutral-800 bg-neutral-950 p-2.5">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-none bg-zinc-200" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-semibold text-neutral-200 truncate">Senior Debt</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {seniorPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-300 tabular-nums">
                {formatCurrency(seniorDebtAmount)}
              </p>
              <p className="text-[10px] text-neutral-500">First lien mortgage / bridge note</p>
            </div>
          </div>

          {/* Layer 2: Mezzanine Debt (Always show slot) */}
          <div className="flex items-start gap-2.5 rounded-none border border-neutral-800 bg-neutral-950 p-2.5">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-none bg-zinc-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-semibold text-neutral-200 truncate">Mezzanine Debt</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {mezzPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-300 tabular-nums">
                {formatCurrency(mezzDebtAmount)}
              </p>
              <p className="text-[10px] text-neutral-500">Subordinated note / second lien</p>
            </div>
          </div>

          {/* Layer 3: Preferred Equity */}
          <div className="flex items-start gap-2.5 rounded-none border border-neutral-800 bg-neutral-950 p-2.5">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-none bg-zinc-600" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-semibold text-neutral-200 truncate">Preferred Equity</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {prefPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-300 tabular-nums">
                {formatCurrency(prefEquityAmount)}
              </p>
              <p className="text-[10px] text-neutral-500">Priority dividend hurdle tranche</p>
            </div>
          </div>

          {/* Layer 4: Investor / LP Equity */}
          <div className="flex items-start gap-2.5 rounded-none border border-neutral-800 bg-neutral-950 p-2.5">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-none bg-zinc-700" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-semibold text-neutral-200 truncate">Investor / LP Equity</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {investorPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-300 tabular-nums">
                {formatCurrency(investorEquityAmount)}
              </p>
              <p className="text-[10px] text-neutral-500">Limited partner co-investors</p>
            </div>
          </div>

          {/* Layer 5: Lead Equity */}
          <div className="flex items-start gap-2.5 rounded-none border border-neutral-800 bg-neutral-950 p-2.5">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-none bg-zinc-800" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-semibold text-neutral-200 truncate">Lead Equity</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {leadPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-300 tabular-nums">
                {formatCurrency(leadEquityAmount)}
              </p>
              <p className="text-[10px] text-neutral-500">Operating partner cash investment</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: LENDER UNDERWRITING CONDITIONS TRACKER */}
      <div className="mt-8 border-t border-neutral-800 pt-6">
        {/* Conditions Header with Summary */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-none bg-emerald-400" />
              <h3 className="text-sm font-semibold tracking-tight text-white uppercase">
                Lender Underwriting Conditions Tracker
              </h3>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {clearedConditionsCount} of {totalConditionsCount} Conditions Cleared ({conditionsProgressPct}%)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="toggle-add-condition-btn"
              onClick={() => setIsAddingCondition(!isAddingCondition)}
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-none border border-neutral-700 bg-neutral-900 px-4 py-2 text-base sm:text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              {isAddingCondition ? 'Cancel' : '+ Add Lender Condition'}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 w-full rounded-none bg-neutral-900 overflow-hidden">
          <div
            style={{ width: `${conditionsProgressPct}%` }}
            className="h-full bg-emerald-400 transition-all duration-300"
          />
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 flex flex-wrap gap-1 border-b border-neutral-800 pb-2">
          {(['ALL', 'PTD', 'PTF', 'CLOSING'] as const).map((cat) => {
            const count =
              cat === 'ALL'
                ? conditions.length
                : conditions.filter((c) => c.category === cat).length;
            const isSelected = selectedCategoryTab === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryTab(cat)}
                className={cn(
                  'min-h-[44px] px-3 py-2 text-base sm:text-xs font-medium rounded-none border transition-colors',
                  isSelected
                    ? 'border-neutral-500 bg-neutral-800 text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900',
                )}
              >
                {cat === 'ALL'
                  ? 'All Conditions'
                  : cat === 'PTD'
                    ? 'PTD (Prior to Document)'
                    : cat === 'PTF'
                      ? 'PTF (Prior to Funding)'
                      : 'CLOSING (Escrow Release)'}
                <span className="ml-1.5 text-[11px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Expandable Add Condition Form */}
        {isAddingCondition && (
          <form
            onSubmit={handleAddCondition}
            data-testid="add-condition-form"
            className="mt-4 rounded-none border border-neutral-700 bg-neutral-950 p-4 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-semibold text-neutral-200 uppercase">
                New Underwriting Requirement
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCondition(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Condition Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. As-Is Appraisal with $450k minimum value"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Milestone Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ConditionCategory)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                >
                  <option value="PTD">PTD (Prior to Document)</option>
                  <option value="PTF">PTF (Prior to Funding)</option>
                  <option value="CLOSING">CLOSING (Escrow Release)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Detailed Requirement & Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Specific guidance from lender credit memorandum"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Initial Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ConditionStatus)}
                className="w-full sm:w-60 min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="waived">Waived</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingCondition(false)}
                className="min-h-[44px] rounded-none border border-neutral-700 bg-transparent px-4 py-2 text-base sm:text-xs text-neutral-300 hover:bg-neutral-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-none border border-white bg-white px-5 py-2 text-base sm:text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
              >
                Add Condition
              </button>
            </div>
          </form>
        )}

        {/* Conditions List */}
        <div className="mt-4 space-y-2.5">
          {filteredConditions.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-500 border border-neutral-900">
              No lender underwriting conditions recorded in this category.
            </div>
          ) : (
            filteredConditions.map((condition) => {
              const isCleared = condition.status === 'approved' || condition.status === 'waived';

              return (
                <div
                  key={condition.id}
                  data-testid={`condition-item-${condition.id}`}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none border p-3.5 transition-colors',
                    isCleared
                      ? 'border-neutral-800/60 bg-neutral-950/40'
                      : 'border-neutral-700 bg-neutral-950',
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Category Badge */}
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-5 shrink-0 items-center justify-center rounded-none px-2 text-[10px] font-bold tracking-wider uppercase border',
                        condition.category === 'PTD'
                          ? 'border-sky-500/30 bg-sky-950/40 text-sky-400'
                          : condition.category === 'PTF'
                            ? 'border-amber-500/30 bg-amber-950/40 text-amber-400'
                            : 'border-purple-500/30 bg-purple-950/40 text-purple-400',
                      )}
                    >
                      {condition.category}
                    </span>

                    {/* Title & Description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p
                          className={cn(
                            'text-xs font-semibold leading-tight',
                            isCleared ? 'text-neutral-300 line-through opacity-85' : 'text-neutral-100',
                          )}
                        >
                          {condition.title}
                        </p>
                      </div>
                      {condition.description && (
                        <p className="mt-1 text-[11px] text-neutral-400 leading-normal">
                          {condition.description}
                        </p>
                      )}
                      {condition.clearedAt && (
                        <p className="mt-1 text-[10px] text-emerald-400/90 font-mono">
                          Cleared: {new Date(condition.clearedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Selector / Toggle */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <label className="sr-only" htmlFor={`status-select-${condition.id}`}>
                      Update condition status
                    </label>
                    <select
                      id={`status-select-${condition.id}`}
                      data-testid={`condition-status-${condition.id}`}
                      value={condition.status}
                      onChange={(e) =>
                        handleConditionStatusChange(condition.id, e.target.value as ConditionStatus)
                      }
                      className={cn(
                        'min-h-[44px] rounded-none border px-3 py-2 text-base sm:text-xs font-medium focus:outline-none transition-colors',
                        condition.status === 'approved'
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                          : condition.status === 'submitted'
                            ? 'border-sky-500/40 bg-sky-950/30 text-sky-400'
                            : condition.status === 'waived'
                              ? 'border-neutral-600 bg-neutral-900 text-neutral-400'
                              : 'border-amber-500/40 bg-amber-950/30 text-amber-400',
                      )}
                    >
                      <option value="pending">Pending</option>
                      <option value="submitted">Submitted</option>
                      <option value="approved">Approved</option>
                      <option value="waived">Waived</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 5: "EDIT CAPITAL STACK" MODAL / INLINE DIALOG */}
      {isEditingStack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-stack-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl rounded-none border border-neutral-700 bg-[#0c0c0c] text-neutral-100 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 id="edit-stack-title" className="text-sm font-semibold tracking-tight text-white uppercase">
                  Edit Structured Capital Stack
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Calibrate debt, preferred tranches, and equity contributions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingStack(false)}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-xs text-neutral-400 hover:text-white"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCapitalStack} className="mt-4 space-y-4">
              {/* Senior Debt */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-medium text-neutral-200">
                    Senior Debt (First Lien)
                  </label>
                  <span className="text-[11px] text-neutral-400 tabular-nums">
                    {effectiveBasis > 0
                      ? `${((Number(editSeniorDebt || 0) / effectiveBasis) * 100).toFixed(1)}% of Basis`
                      : ''}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editSeniorDebt}
                  onChange={(e) => setEditSeniorDebt(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Mezzanine Debt */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-medium text-neutral-200">
                    Mezzanine / Subordinated Debt
                  </label>
                  <span className="text-[11px] text-neutral-400">Optional subordinated loan</span>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editMezzDebt}
                  onChange={(e) => setEditMezzDebt(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Preferred Equity */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-medium text-neutral-200">
                    Preferred Equity
                  </label>
                  <span className="text-[11px] text-neutral-400">Priority dividend hurdle tranche</span>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editPrefEquity}
                  onChange={(e) => setEditPrefEquity(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Investor / LP Equity */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-medium text-neutral-200">
                    Investor / LP Equity
                  </label>
                  <span className="text-[11px] text-neutral-400">Syndicated / outside equity</span>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editInvestorEquity}
                  onChange={(e) => setEditInvestorEquity(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Lead Equity */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-medium text-neutral-200">
                    Lead Equity (Operating Partner)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoBalanceLead}
                    className="text-[11px] text-sky-400 underline hover:text-sky-300"
                  >
                    Auto-balance to Cost Basis
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editLeadEquity}
                  onChange={(e) => setEditLeadEquity(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-base sm:text-xs text-neutral-100 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Live Cost Basis Validation Box */}
              <div className="rounded-none border border-neutral-800 bg-neutral-950 p-3.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Total Capital Stack:</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatCurrency(editTotalStack)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Total Project Cost Basis:</span>
                  <span className="font-semibold text-white tabular-nums">
                    {formatCurrency(effectiveBasis)}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-neutral-800 pt-1.5">
                  <span className="text-neutral-400">Variance / Difference:</span>
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      Math.abs(editDifference) < 1
                        ? 'text-emerald-400'
                        : editDifference < 0
                          ? 'text-amber-400'
                          : 'text-sky-400',
                    )}
                  >
                    {Math.abs(editDifference) < 1
                      ? 'Fully Funded (100% Balanced)'
                      : editDifference < 0
                        ? `Shortfall: -${formatCurrency(Math.abs(editDifference))}`
                        : `Surplus: +${formatCurrency(editDifference)}`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingStack(false)}
                  className="min-h-[44px] w-full sm:w-auto rounded-none border border-neutral-700 bg-transparent px-4 py-2 text-base sm:text-xs font-medium text-neutral-300 hover:bg-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] w-full sm:w-auto rounded-none border border-white bg-white px-5 py-2 text-base sm:text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
                >
                  Save Capital Stack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
