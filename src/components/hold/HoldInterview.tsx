'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, RehabTier } from '@/types/schema';
import { projectsService } from '@/lib/firebase/projects';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Info, AlertTriangle, Check, DollarSign } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import {
  getAllRehabTiers,
  getRehabTierBudgetRange,
  computeRehabBudgetVariance,
  computeTotalMonthlyHoldingCost,
  isPreWarProperty,
  computeProjectedTotalHoldCost,
  computeDailyBurnFromMonthly,
  TierBudgetRange,
} from '@/lib/calculations/holdCalculations';
import { buildEditHistoryEntries } from '@/lib/editHistory';

interface HoldInterviewProps {
  deal: Project;
}

// ── Helper: Parse a date field into YYYY-MM-DD string ──
function parseDateField(val: any): string {
  if (!val) return '';
  if (typeof val === 'object' && val.toDate) return val.toDate().toISOString().split('T')[0];
  try { return new Date(val).toISOString().split('T')[0]; } catch { return ''; }
}

// ── Section Definition ──────────────────────────────────
type SectionId =
  | 'rehab-tier'
  | 'rehab-budget'
  | 'holding-costs'
  | 'loan-carry'
  | 'rental-ops'
  | 'valuation'
  | 'review';

interface SectionDef {
  id: SectionId;
  title: string;
  subtitle: string;
  condition: (strategy: string, financials: any) => boolean;
}

const ALL_SECTIONS: SectionDef[] = [
  {
    id: 'rehab-tier',
    title: 'Rehab Scope',
    subtitle: 'Classify the level of work',
    condition: (s) => s === 'Fix & Flip' || s === 'Sell' || s === 'Rent',
  },
  {
    id: 'rehab-budget',
    title: 'Rehab Budget & Spend',
    subtitle: 'Budget, actuals, and completion',
    condition: (s) => s === 'Fix & Flip' || s === 'Sell' || s === 'Rent',
  },
  {
    id: 'holding-costs',
    title: 'Monthly Holding Costs',
    subtitle: 'Every dollar the property costs each month',
    condition: () => true,
  },
  {
    id: 'loan-carry',
    title: 'Loan Carry Cost',
    subtitle: 'Monthly interest on your financing',
    condition: (_s, f) => {
      const finType = f.financingType;
      const hasLoan = f.loanAmount > 0;
      return finType !== 'All Cash' && hasLoan;
    },
  },
  {
    id: 'rental-ops',
    title: 'Rental Operations',
    subtitle: 'Income, management, and occupancy',
    condition: (s) => s === 'Buy & Hold' || s === 'Rent',
  },
  {
    id: 'valuation',
    title: 'Current Valuation',
    subtitle: 'Track the property value',
    condition: () => true,
  },
  {
    id: 'review',
    title: 'Review & Go Live',
    subtitle: 'Confirm your hold data',
    condition: () => true,
  },
];

export default function HoldInterview({ deal }: HoldInterviewProps) {
  const { user } = useAuth();
  const strategy = deal.dispositionType === 'RENT'
    ? (deal.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
    : (deal.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip');

  // ── Form State ──────────────────────────────────────
  const [formData, setFormData] = useState(() => buildFormData(deal));
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [pre1978Acknowledged, setPre1978Acknowledged] = useState(false);

  // Sync when deal changes externally
  useEffect(() => {
    setFormData(buildFormData(deal));
  }, [deal]);

  // Active sections based on strategy and financials
  const activeSections = useMemo(() => {
    return ALL_SECTIONS.filter(s => s.condition(strategy, deal.financials || {}));
  }, [strategy, deal.financials]);

  const currentSection = activeSections[currentSectionIdx];
  const isLastSection = currentSectionIdx === activeSections.length - 1;
  const isFirstSection = currentSectionIdx === 0;
  const isPreWar = isPreWarProperty(deal.yearBuilt);

  // ── Navigation ──────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (currentSection?.id !== 'review') {
      await handleSave();
    }
    if (!isLastSection) {
      setCurrentSectionIdx(prev => prev + 1);
    }
  }, [currentSectionIdx, activeSections.length, currentSection]);

  const handleBack = useCallback(() => {
    if (!isFirstSection) setCurrentSectionIdx(prev => prev - 1);
  }, [currentSectionIdx]);

  const handleComplete = useCallback(async () => {
    await handleSave();
    toast.success('Hold interview complete! Live data updated.');
  }, [formData]);

  // ── Update a form field ─────────────────────────────
  const updateField = useCallback((key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  // ── Rehab Tier Selection ────────────────────────────
  const handleTierSelect = useCallback((tier: RehabTier) => {
    const range = getRehabTierBudgetRange(tier);
    setFormData((prev: any) => ({
      ...prev,
      rehabTier: tier,
      rehabTierBudgetLow: range.low,
      rehabTierBudgetHigh: range.high,
    }));
  }, []);

  // ── Save to Firestore ───────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    try {
      setIsSaving(true);
      const f = formData;

      const holdingCostTaxes = f.holdingCostTaxes !== '' ? Number(f.holdingCostTaxes) : 0;
      const holdingCostInsurance = f.holdingCostInsurance !== '' ? Number(f.holdingCostInsurance) : 0;
      const holdingCostUtilities = f.holdingCostUtilities !== '' ? Number(f.holdingCostUtilities) : 0;
      const monthlyHOA = f.monthlyHOA !== '' ? Number(f.monthlyHOA) : 0;
      const holdingCostMaintenance = f.holdingCostMaintenance !== '' ? Number(f.holdingCostMaintenance) : 0;
      const holdingCostManagement = f.holdingCostManagement !== '' ? Number(f.holdingCostManagement) : 0;
      const estimatedCurrentValue = f.estimatedCurrentValue !== '' ? Number(f.estimatedCurrentValue) : 0;
      const rehabBudget = f.rehabBudget !== '' ? Number(f.rehabBudget) : 0;
      const rehabActual = f.rehabActual !== '' ? Number(f.rehabActual) : 0;
      const propertyManagementFee = f.propertyManagementFee !== '' ? Number(f.propertyManagementFee) : 0;
      const monthlyMaintenanceReserve = f.monthlyMaintenanceReserve !== '' ? Number(f.monthlyMaintenanceReserve) : 0;
      const actualRentalIncome = f.actualRentalIncome !== '' ? Number(f.actualRentalIncome) : 0;
      const otherMonthlyIncome = f.otherMonthlyIncome !== '' ? Number(f.otherMonthlyIncome) : 0;
      const isOccupied = f.isOccupied === 'yes';
      const daysOccupied = isOccupied && f.daysOccupied !== '' ? Number(f.daysOccupied) : 0;
      const totalHoldDays = daysOccupied > 30 ? daysOccupied : (daysOccupied > 0 ? 30 : 0);

      // Build new financials
      const newFinancials = {
        ...deal.financials,
        // Rehab tier
        rehabTier: f.rehabTier || undefined,
        rehabTierBudgetLow: f.rehabTierBudgetLow ? Number(f.rehabTierBudgetLow) : undefined,
        rehabTierBudgetHigh: f.rehabTierBudgetHigh ? Number(f.rehabTierBudgetHigh) : undefined,
        // Rehab budget
        rehabBudget,
        projectedRehabCost: rehabBudget || deal.financials?.projectedRehabCost || 0,
        rehabActual,
        actualRehabCost: rehabActual || deal.financials?.actualRehabCost || 0,
        rehabDoneDate: f.rehabDoneDate ? new Date(f.rehabDoneDate) : null,
        // Holding costs
        holdingCostTaxes,
        operatingExpenseTaxes: holdingCostTaxes,
        holdingCostInsurance,
        operatingExpenseInsurance: holdingCostInsurance,
        holdingCostUtilities,
        monthlyHOA,
        holdingCostMaintenance,
        holdingCostManagement,
        estimatedCurrentValue,
        // Rental
        propertyManagementFee,
        maintenanceReserves: monthlyMaintenanceReserve,
        monthlyMaintenanceReserve,
        actualRentalIncome,
        occupiedUnits: isOccupied ? 1 : 0,
        daysOccupied,
        totalHoldDays,
        otherMonthlyIncome,
      };

      // Compute total monthly hold cost
      const holdBreakdown = computeTotalMonthlyHoldingCost(newFinancials);
      (newFinancials as any).totalMonthlyHoldingCost = holdBreakdown.total;

      // Build edit history diffs
      const diffs = buildEditHistoryEntries(deal.financials || {}, newFinancials, user.uid);
      const existingHistory = (deal as any).holdEditHistory || [];
      const updatedHistory = [...existingHistory, ...diffs];

      const updates: Partial<Project> = {
        financials: newFinancials as any,
        rehabTier: f.rehabTier || undefined,
        holdEditHistory: updatedHistory,
      } as any;

      await projectsService.updateProject(deal.id, updates);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save progress.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Computed values for display ─────────────────────
  const holdBreakdown = useMemo(() => {
    const mockFinancials = {
      holdingCostTaxes: Number(formData.holdingCostTaxes) || 0,
      holdingCostInsurance: Number(formData.holdingCostInsurance) || 0,
      holdingCostUtilities: Number(formData.holdingCostUtilities) || 0,
      monthlyHOA: Number(formData.monthlyHOA) || 0,
      holdingCostMaintenance: Number(formData.holdingCostMaintenance) || 0,
      holdingCostManagement: Number(formData.holdingCostManagement) || 0,
      loanAmount: deal.financials?.loanAmount || 0,
      loanInterestRate: deal.financials?.loanInterestRate || 0,
    };
    return computeTotalMonthlyHoldingCost(mockFinancials);
  }, [formData, deal.financials]);

  const budgetVariance = useMemo(() => {
    const budget = Number(formData.rehabBudget) || 0;
    return computeRehabBudgetVariance(budget, formData.rehabTier);
  }, [formData.rehabBudget, formData.rehabTier]);

  // ── Render ──────────────────────────────────────────
  return (
    <div className="bg-pw-white border border-pw-border p-6 md:p-8 text-left shadow-sm mb-8 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-pw-border pb-4 mb-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-text-primary">Hold Operations Wizard</h2>
          <p className="text-[10px] text-text-secondary font-semibold uppercase mt-0.5 tracking-wider">
            {currentSection?.title || 'Loading…'}
          </p>
        </div>
        <div className="text-[11px] font-mono text-text-secondary bg-pw-bg px-2.5 py-1 border border-pw-border">
          SECTION {currentSectionIdx + 1} OF {activeSections.length}
        </div>
      </div>

      {/* Section Progress Bar */}
      <div className="flex gap-1 mb-6">
        {activeSections.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i < currentSectionIdx ? 'bg-black' :
              i === currentSectionIdx ? 'bg-[#595959]' :
              'bg-[#F2F2F2]'
            }`}
          />
        ))}
      </div>

      {/* Section Content */}
      <div className="space-y-6 min-h-[280px]">
        {currentSection?.id === 'rehab-tier' && renderRehabTierSection()}
        {currentSection?.id === 'rehab-budget' && renderRehabBudgetSection()}
        {currentSection?.id === 'holding-costs' && renderHoldingCostsSection()}
        {currentSection?.id === 'loan-carry' && renderLoanCarrySection()}
        {currentSection?.id === 'rental-ops' && renderRentalOpsSection()}
        {currentSection?.id === 'valuation' && renderValuationSection()}
        {currentSection?.id === 'review' && renderReviewSection()}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-pw-border mt-8">
        <button
          onClick={handleBack}
          disabled={isFirstSection || isSaving}
          className="pw-btn pw-btn--sm pw-btn--secondary font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5 disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <ButtonGroup variant="related">
          {isSaving && (
            <span className="text-[10px] text-text-secondary animate-pulse">Saving…</span>
          )}
          {isLastSection ? (
            <button
              onClick={handleComplete}
              disabled={isSaving}
              className="pw-btn pw-btn--sm pw-btn--primary font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save & Go Live
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="pw-btn pw-btn--sm pw-btn--primary font-bold uppercase tracking-widest text-[11px] flex items-center gap-1.5"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </ButtonGroup>
      </div>
    </div>
  );

  // ── Section 1: Rehab Tier ─────────────────────────────
  function renderRehabTierSection() {
    const tiers = getAllRehabTiers();
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            What level of work does this property need?
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Select the rehab scope that best matches the renovation required. This sets a budget template — you'll enter actuals in the next step.
          </p>
        </div>

        {/* Pre-1978 Environmental Alert */}
        {isPreWar && !pre1978Acknowledged && (
          <div className="flex items-start gap-3 p-4 bg-[#FEF3C7] border border-[#F59E0B] text-xs leading-relaxed text-[#92400E]">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">⚠️ Pre-1978 Property — Environmental Disclosure Required</p>
              <p>
                Properties built before 1978 require EPA lead paint disclosure (40 CFR 745) and may require asbestos testing
                before any renovation work begins. Confirm you have addressed environmental testing.
              </p>
              <button
                onClick={() => setPre1978Acknowledged(true)}
                className="mt-2 px-3 py-1.5 bg-[#92400E] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#78350F] transition-colors"
              >
                I Acknowledge — Testing Addressed
              </button>
            </div>
          </div>
        )}

        {/* Tier Card Picker */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tiers.map(t => {
            const isSelected = formData.rehabTier === t.tier;
            return (
              <button
                key={t.tier}
                onClick={() => handleTierSelect(t.tier)}
                className={`text-left p-4 border-2 transition-all duration-200 hover:border-black/50 ${
                  isSelected
                    ? 'border-black bg-black/5 shadow-md'
                    : 'border-pw-border bg-pw-white hover:bg-pw-bg'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{t.emoji}</span>
                  {isSelected && <Check className="w-4 h-4 text-black" />}
                </div>
                <p className="text-sm font-bold text-text-primary">{t.label}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  ${t.low.toLocaleString()} – {t.high === Infinity ? '$150k+' : `$${t.high.toLocaleString()}`}
                </p>
                <p className="text-[9px] text-text-secondary opacity-60 mt-1 leading-snug">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Section 2: Rehab Budget & Spend ───────────────────
  function renderRehabBudgetSection() {
    const tierRange = formData.rehabTier ? getRehabTierBudgetRange(formData.rehabTier) : null;
    return (
      <div className="space-y-6">
        {/* Tier context */}
        {tierRange && (
          <div className="flex items-center gap-3 p-3 bg-pw-bg border border-pw-border text-xs text-text-secondary">
            <span className="text-lg">{tierRange.emoji}</span>
            <span>
              <strong className="text-text-primary">{tierRange.label}</strong> template:
              ${tierRange.low.toLocaleString()} – {tierRange.high === Infinity ? '$150k+' : `$${tierRange.high.toLocaleString()}`}
            </span>
          </div>
        )}

        {/* Rehab Budget */}
        <div className="space-y-2">
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            What is your rehab budget? (LIVE)
          </h3>
          <p className="text-sm text-text-secondary max-w-xl">
            Enter your target renovation budget. Capital improvements are capitalized (added to basis), not expensed.
          </p>
          <div className="flex items-start gap-3 p-3 bg-pw-bg border border-pw-border max-w-lg text-xs leading-relaxed text-text-secondary">
            <Info className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
            <div>Capital improvements are capitalized (added to basis) for depreciation. Do not lump them into operating expenses.</div>
          </div>
          <CurrencyInput value={formData.rehabBudget} onChange={(v) => updateField('rehabBudget', v)} />
          {budgetVariance.warning && (
            <div className="flex items-start gap-2 text-xs text-[#92400E] bg-[#FEF3C7] p-3 border border-[#F59E0B] max-w-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{budgetVariance.warning}</span>
            </div>
          )}
        </div>

        {/* Rehab Actual */}
        <div className="space-y-2">
          <h3 className="text-lg font-light tracking-tight text-text-primary">
            Track rehab spend: how much has been spent to date? (LIVE)
          </h3>
          <p className="text-sm text-text-secondary max-w-xl">
            Enter the actual total approved construction and renovation costs incurred so far.
          </p>
          <CurrencyInput value={formData.rehabActual} onChange={(v) => updateField('rehabActual', v)} />
        </div>

        {/* Rehab Done Date */}
        <div className="space-y-2">
          <h3 className="text-lg font-light tracking-tight text-text-primary">
            Rehab completion date? (LIVE)
          </h3>
          <p className="text-sm text-text-secondary max-w-xl">
            Date the renovation work was fully completed and accepted. Leave blank if still in progress.
          </p>
          <input
            type="date"
            value={formData.rehabDoneDate}
            onChange={(e) => updateField('rehabDoneDate', e.target.value)}
            className="pw-input text-lg py-3 px-4 w-full max-w-lg border border-pw-border focus:outline-none"
          />
        </div>
      </div>
    );
  }

  // ── Section 3: Monthly Holding Costs ──────────────────
  function renderHoldingCostsSection() {
    const lines = [
      { key: 'holdingCostTaxes', label: 'Property Taxes', desc: 'Monthly property tax bill' },
      { key: 'holdingCostInsurance', label: 'Insurance', desc: 'Monthly hazard, liability, or builder\'s risk premium' },
      { key: 'holdingCostUtilities', label: 'Utilities', desc: 'Water, sewer, trash, power, gas' },
      { key: 'monthlyHOA', label: 'HOA Fee', desc: 'Enter $0 if not in an HOA' },
      { key: 'holdingCostMaintenance', label: 'Maintenance / CapEx', desc: 'Monthly maintenance and capital expenditure reserve' },
      { key: 'holdingCostManagement', label: 'Management Fee', desc: 'Monthly management fee during hold (if not self-managing)' },
    ];

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Itemize your monthly holding costs (LIVE)
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Every dollar the property costs each month while you hold it. These accumulate daily and erode your profit.
          </p>
        </div>

        <div className="space-y-4">
          {lines.map(line => (
            <div key={line.key} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{line.label}</p>
                <p className="text-[10px] text-text-secondary opacity-60">{line.desc}</p>
              </div>
              <div className="w-40 flex-shrink-0">
                <CurrencyInput
                  value={(formData as any)[line.key]}
                  onChange={(v) => updateField(line.key, v)}
                  compact
                />
              </div>
            </div>
          ))}
        </div>

        {/* Live Total */}
        <div className="border-t border-pw-border pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Total Monthly Hold Cost</p>
            <p className="text-[9px] text-text-secondary opacity-40 mt-0.5">Excludes loan carry (next section)</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-text-primary">
            ${(holdBreakdown.total - holdBreakdown.loanCarry).toLocaleString()}<span className="text-sm font-normal text-text-secondary">/mo</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Section 4: Loan Carry Cost ────────────────────────
  function renderLoanCarrySection() {
    const loanAmount = deal.financials?.loanAmount || 0;
    const rate = deal.financials?.loanInterestRate || 0;
    const monthlyCarry = holdBreakdown.loanCarry;
    const dailyCarry = computeDailyBurnFromMonthly(monthlyCarry);

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Loan Carry Cost (Auto-Calculated)
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Interest-only monthly payment on your financing. This is computed from your loan terms entered in Phase 2.
          </p>
        </div>

        <div className="bg-pw-bg border border-pw-border p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Loan Amount</p>
              <p className="text-lg font-bold tabular-nums text-text-primary mt-1">${loanAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Interest Rate</p>
              <p className="text-lg font-bold tabular-nums text-text-primary mt-1">{rate}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Monthly Carry</p>
              <p className="text-lg font-bold tabular-nums text-text-primary mt-1">${monthlyCarry.toLocaleString()}</p>
            </div>
          </div>

          <div className="border-t border-pw-border pt-3 flex items-center gap-2">
            <span className="text-[10px] text-text-secondary opacity-50">Daily carry cost:</span>
            <span className="text-sm font-bold tabular-nums text-text-primary">${dailyCarry.toLocaleString()}/day</span>
          </div>
        </div>

        {/* Combined Total */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-60">Total Monthly Hold (All-In)</p>
            <p className="text-[9px] opacity-40 mt-0.5">Hold costs + loan carry</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            ${holdBreakdown.total.toLocaleString()}<span className="text-sm font-normal opacity-60">/mo</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Section 5: Rental Operations ──────────────────────
  function renderRentalOpsSection() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Rental Operations (LIVE)
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Track income, management costs, and occupancy for your rental property.
          </p>
        </div>

        {/* PM Fee */}
        <FieldRow label="Property Management Fee" desc="Monthly fee paid to PM. Enter $0 if self-managing.">
          <CurrencyInput value={formData.propertyManagementFee} onChange={(v) => updateField('propertyManagementFee', v)} />
        </FieldRow>

        {/* Maintenance Reserve */}
        <FieldRow label="Maintenance / CapEx Reserve" desc="Capital set aside monthly for future repairs (roof, HVAC).">
          <CurrencyInput value={formData.monthlyMaintenanceReserve} onChange={(v) => updateField('monthlyMaintenanceReserve', v)} />
        </FieldRow>

        {/* Actual Rent */}
        <FieldRow label="Actual Monthly Rent Collected" desc="Gross rental income collected this month.">
          <CurrencyInput value={formData.actualRentalIncome} onChange={(v) => updateField('actualRentalIncome', v)} />
        </FieldRow>

        {/* Other Income */}
        <FieldRow label="Other Monthly Income" desc="Parking, laundry, pet fees, storage, etc.">
          <CurrencyInput value={formData.otherMonthlyIncome} onChange={(v) => updateField('otherMonthlyIncome', v)} />
        </FieldRow>

        {/* Occupancy */}
        <FieldRow label="Is the property currently occupied?" desc="Select whether the unit is leased.">
          <select
            value={formData.isOccupied}
            onChange={(e) => updateField('isOccupied', e.target.value)}
            className="pw-input text-sm py-2.5 px-4 w-full border border-pw-border focus:outline-none"
          >
            <option value="yes">Yes, occupied</option>
            <option value="no">No, vacant</option>
          </select>
        </FieldRow>

        {/* Days Occupied (conditional) */}
        {formData.isOccupied === 'yes' && (
          <FieldRow label="Days Occupied This Period" desc="Number of days occupied by paying tenants this month (max 30).">
            <input
              type="number"
              value={formData.daysOccupied}
              onChange={(e) => updateField('daysOccupied', e.target.value)}
              placeholder="30"
              min="0"
              max="31"
              className="pw-input text-sm py-2.5 px-4 w-full border border-pw-border focus:outline-none tabular-nums"
            />
          </FieldRow>
        )}
      </div>
    );
  }

  // ── Section 6: Current Valuation ──────────────────────
  function renderValuationSection() {
    const purchase = deal.financials?.purchasePrice || 0;
    const currentVal = Number(formData.estimatedCurrentValue) || 0;
    const appreciation = currentVal - purchase;
    const appreciationPct = purchase > 0 ? Math.round((appreciation / purchase) * 100) : 0;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Current estimated market value? (LIVE)
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Estimate the current resale value of the property in its present condition. Drives appreciation metrics.
          </p>
        </div>

        <CurrencyInput value={formData.estimatedCurrentValue} onChange={(v) => updateField('estimatedCurrentValue', v)} />

        {currentVal > 0 && purchase > 0 && (
          <div className="bg-pw-bg border border-pw-border p-4 flex items-center justify-between max-w-lg">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Appreciation Since Purchase</p>
              <p className="text-[9px] text-text-secondary opacity-40 mt-0.5">vs. ${purchase.toLocaleString()} purchase price</p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold tabular-nums ${appreciation >= 0 ? 'text-text-primary' : 'text-[#595959]'}`}>
                {appreciation >= 0 ? '+' : ''}${appreciation.toLocaleString()}
              </p>
              <p className={`text-xs tabular-nums ${appreciation >= 0 ? 'text-text-secondary' : 'text-[#595959]'}`}>
                {appreciation >= 0 ? '+' : ''}{appreciationPct}%
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Section 7: Review & Submit ────────────────────────
  function renderReviewSection() {
    const dailyBurn = computeDailyBurnFromMonthly(holdBreakdown.total);
    const projectedMonths = deal.financials?.projectedHoldTimeMonths || 6;
    const projectedTotal = computeProjectedTotalHoldCost(holdBreakdown.total, projectedMonths);
    const rehabBudget = Number(formData.rehabBudget) || 0;
    const rehabActual = Number(formData.rehabActual) || 0;
    const tierRange = formData.rehabTier ? getRehabTierBudgetRange(formData.rehabTier) : null;

    const summaryRows = [
      ...(formData.rehabTier ? [{ label: 'Rehab Tier', value: `${tierRange?.emoji} ${tierRange?.label}` }] : []),
      ...(rehabBudget > 0 ? [{ label: 'Rehab Budget', value: `$${rehabBudget.toLocaleString()}` }] : []),
      ...(rehabActual > 0 ? [{ label: 'Rehab Spent', value: `$${rehabActual.toLocaleString()}` }] : []),
      ...(formData.rehabDoneDate ? [{ label: 'Rehab Done', value: formData.rehabDoneDate }] : []),
      { label: 'Monthly Taxes', value: `$${(Number(formData.holdingCostTaxes) || 0).toLocaleString()}` },
      { label: 'Monthly Insurance', value: `$${(Number(formData.holdingCostInsurance) || 0).toLocaleString()}` },
      { label: 'Monthly Utilities', value: `$${(Number(formData.holdingCostUtilities) || 0).toLocaleString()}` },
      { label: 'Monthly HOA', value: `$${(Number(formData.monthlyHOA) || 0).toLocaleString()}` },
      { label: 'Monthly Maintenance', value: `$${(Number(formData.holdingCostMaintenance) || 0).toLocaleString()}` },
      { label: 'Monthly Management', value: `$${(Number(formData.holdingCostManagement) || 0).toLocaleString()}` },
      ...(holdBreakdown.loanCarry > 0 ? [{ label: 'Loan Carry', value: `$${holdBreakdown.loanCarry.toLocaleString()}/mo` }] : []),
      ...(Number(formData.estimatedCurrentValue) > 0 ? [{ label: 'Current Value', value: `$${Number(formData.estimatedCurrentValue).toLocaleString()}` }] : []),
    ];

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Review & Confirm
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Verify your hold data before going live. All values will be saved to the project.
          </p>
        </div>

        {/* Summary Table */}
        <div className="bg-pw-bg border border-pw-border divide-y divide-pw-border">
          {summaryRows.map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-text-secondary">{row.label}</span>
              <span className="text-sm font-bold tabular-nums text-text-primary">{row.value}</span>
            </div>
          ))}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black text-white p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-60">Total Monthly</p>
            <p className="text-xl font-bold tabular-nums mt-1">${holdBreakdown.total.toLocaleString()}</p>
          </div>
          <div className="bg-black text-white p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-60">Daily Burn</p>
            <p className="text-xl font-bold tabular-nums mt-1">${dailyBurn.toLocaleString()}</p>
          </div>
          <div className="bg-black text-white p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-60">{projectedMonths}mo Projected</p>
            <p className="text-xl font-bold tabular-nums mt-1">${projectedTotal.toLocaleString()}</p>
          </div>
        </div>

        {/* Budget vs Actual Warning */}
        {rehabBudget > 0 && rehabActual > rehabBudget && (
          <div className="flex items-start gap-2 text-xs text-[#92400E] bg-[#FEF3C7] p-3 border border-[#F59E0B]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Rehab spend (${rehabActual.toLocaleString()}) exceeds budget (${rehabBudget.toLocaleString()}) by ${(rehabActual - rehabBudget).toLocaleString()}.
            </span>
          </div>
        )}
      </div>
    );
  }
}

// ── Shared Sub-Components ───────────────────────────────

function CurrencyInput({ value, onChange, compact }: { value: any; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <div className={`relative ${compact ? 'w-full' : 'w-full max-w-lg'}`}>
      <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-medium text-text-secondary ${compact ? 'text-sm' : 'text-lg'}`}>$</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className={`pw-input w-full border border-pw-border focus:outline-none tabular-nums ${
          compact ? 'text-sm py-2 pl-7 pr-3' : 'text-lg py-3 pl-10 pr-4'
        }`}
      />
    </div>
  );
}

function FieldRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      <p className="text-[10px] text-text-secondary opacity-60">{desc}</p>
      <div className="max-w-lg">{children}</div>
    </div>
  );
}

// ── Build initial form data from deal ───────────────────
function buildFormData(deal: Project) {
  const f = deal.financials || {} as any;
  return {
    // Rehab Tier
    rehabTier: f.rehabTier || (deal as any).rehabTier || '',
    rehabTierBudgetLow: f.rehabTierBudgetLow || '',
    rehabTierBudgetHigh: f.rehabTierBudgetHigh || '',
    // Rehab Budget
    rehabBudget: f.rehabBudget || f.projectedRehabCost || '',
    rehabActual: f.rehabActual || f.actualRehabCost || '',
    rehabDoneDate: parseDateField(f.rehabDoneDate),
    // Holding Costs
    holdingCostTaxes: f.holdingCostTaxes || f.operatingExpenseTaxes || '',
    holdingCostInsurance: f.holdingCostInsurance || f.operatingExpenseInsurance || '',
    holdingCostUtilities: f.holdingCostUtilities || '',
    monthlyHOA: f.monthlyHOA || '',
    holdingCostMaintenance: f.holdingCostMaintenance || '',
    holdingCostManagement: f.holdingCostManagement || '',
    // Rental Ops
    propertyManagementFee: f.propertyManagementFee || '',
    monthlyMaintenanceReserve: f.monthlyMaintenanceReserve || f.maintenanceReserves || '',
    actualRentalIncome: f.actualRentalIncome || '',
    otherMonthlyIncome: f.otherMonthlyIncome || '',
    isOccupied: (f.occupiedUnits && f.occupiedUnits > 0) || (f.daysOccupied && f.daysOccupied > 0) ? 'yes' : 'no',
    daysOccupied: f.daysOccupied || '',
    // Valuation
    estimatedCurrentValue: f.estimatedCurrentValue || '',
  };
}
