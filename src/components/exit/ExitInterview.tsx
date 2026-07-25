'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '@/types/schema';
import { projectsService } from '@/lib/firebase/projects';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, AlertTriangle, Check } from 'lucide-react';
import { 
  computeGrossProfit,
  computeNetProceeds,
  computeRealizedROI,
  computeHoldingPeriodDays,
  computeQuickTaxEstimate
} from '@/lib/calculations/exitCalculations';
import { buildExitEditHistoryEntries } from '@/lib/editHistory';

interface ExitInterviewProps {
  deal: Project;
}

// ── Helper: Parse a date field into YYYY-MM-DD string ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDateField(val: any): string {
  if (!val) return '';
  if (typeof val === 'object' && val.toDate) return val.toDate().toISOString().split('T')[0];
  try { return new Date(val).toISOString().split('T')[0]; } catch { return ''; }
}

// ── Section Definition ──────────────────────────────────
type SectionId =
  | 'exit-type'
  | 'sale-details'
  | 'rental-ops'
  | 'refi-details'
  | 'review';

interface SectionDef {
  id: SectionId;
  title: string;
  subtitle: string;
  condition: (exitType: string) => boolean;
}

const ALL_SECTIONS: SectionDef[] = [
  {
    id: 'exit-type',
    title: 'Exit Pathway',
    subtitle: 'Select your exit strategy',
    condition: () => true,
  },
  {
    id: 'sale-details',
    title: 'Sale Metrics',
    subtitle: 'Final sale price and costs',
    condition: (et) => et === 'Sale',
  },
  {
    id: 'rental-ops',
    title: 'Rental Stabilization',
    subtitle: 'Transition to hold as rental',
    condition: (et) => et === 'Stabilization',
  },
  {
    id: 'refi-details',
    title: 'BRRRR Refinance',
    subtitle: 'Refinance and cash out',
    condition: (et) => et === 'Refinance',
  },
  {
    id: 'review',
    title: 'Review & Finalize',
    subtitle: 'Confirm exit data',
    condition: () => true,
  },
];

export default function ExitInterview({ deal }: ExitInterviewProps) {
  const { user } = useAuth();
  
  // ── Form State ──────────────────────────────────────
  const [formData, setFormData] = useState(() => buildFormData(deal));
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if deal updates externally
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(buildFormData(deal));
  }, [deal]);

  const exitType = formData.exitType || 'Sale';

  // Active sections based on exit type
  const activeSections = useMemo(() => {
    return ALL_SECTIONS.filter(s => s.condition(exitType));
  }, [exitType]);

  const currentSection = activeSections[currentSectionIdx];
  const isLastSection = currentSectionIdx === activeSections.length - 1;
  const isFirstSection = currentSectionIdx === 0;

  // ── Navigation ──────────────────────────────────────
  const handleNext = async () => {
    if (currentSection?.id !== 'review') {
      await handleSave();
    }
    if (!isLastSection) {
      setCurrentSectionIdx(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstSection) setCurrentSectionIdx(prev => prev - 1);
  };

  const handleComplete = async () => {
    await handleSave(true);
  };

  // ── Update a form field ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (key: string, value: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFormData((prev: any) => {
      const next = { ...prev, [key]: value };
      // If exitType changes, ensure we reset index to 1 to avoid bounds issues
      if (key === 'exitType') {
        setCurrentSectionIdx(1);
      }
      return next;
    });
  };

  // ── Save to Firestore ───────────────────────────────
  async function handleSave(isFinalizing: boolean = false) {
    if (!user) return;
    try {
      setIsSaving(true);
      const f = formData;

      // Extract raw values
      const actualSalePrice = f.actualSalePrice !== '' ? Number(f.actualSalePrice) : 0;
      const sellingCosts = f.sellingCosts !== '' ? Number(f.sellingCosts) : 0;
      const exitAttorneyFees = f.exitAttorneyFees !== '' ? Number(f.exitAttorneyFees) : 0;
      const exitMarketingCost = f.exitMarketingCost !== '' ? Number(f.exitMarketingCost) : 0;
      
      const rentalMarketingCost = f.rentalMarketingCost !== '' ? Number(f.rentalMarketingCost) : 0;
      const isStabilized = f.isStabilized === 'yes';
      
      const refiLoanAmount = f.refiLoanAmount ? Number(f.refiLoanAmount) : 0;
      const refiInterestRate = f.refiInterestRate ? Number(f.refiInterestRate) : 0;
      const refiLoanTermYears = f.refiLoanTermYears ? Number(f.refiLoanTermYears) : 30;
      const refiCashOut = f.refiCashOut ? Number(f.refiCashOut) : 0;

      const newFinancials = {
        ...deal.financials,
        exitType: f.exitType
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      let newStatus = deal.status;
      let newPhase = deal.currentPhase;

      if (f.exitType === 'Sale') {
        newFinancials.actualSalePrice = actualSalePrice;
        newFinancials.sellingCosts = sellingCosts;
        newFinancials.exitAttorneyFees = exitAttorneyFees;
        newFinancials.exitMarketingCost = exitMarketingCost;
        if (f.soldDate) newFinancials.soldDate = new Date(f.soldDate);

        // Compute realized metrics if finalizing
        if (isFinalizing) {
          const purchasePrice = deal.financials?.purchasePrice || 0;
          newFinancials.realizedGrossProfit = computeGrossProfit(actualSalePrice, purchasePrice);
          
          // Using 0 for commissions as they could be part of sellingCosts for now
          newFinancials.realizedNetProceeds = computeNetProceeds(
            actualSalePrice,
            0,
            exitAttorneyFees,
            0, // closingCosts on sell side usually separate, simplified here
            sellingCosts,
            0,
            exitMarketingCost
          );

          const totalCashInvested = deal.financials?.totalCashInvested || 0;
          newFinancials.realizedROI = computeRealizedROI(newFinancials.realizedGrossProfit, totalCashInvested);

          const holdDays = computeHoldingPeriodDays(deal.financials?.acquisitionDate, newFinancials.soldDate);
          const costBasis = (deal.financials?.purchasePrice || 0) + (deal.financials?.actualRehabCost || 0);
          newFinancials.taxEstimateSnapshot = computeQuickTaxEstimate(costBasis, newFinancials.realizedNetProceeds, holdDays);
          
          newStatus = 'exit';
          newPhase = 4;
        }

      } else if (f.exitType === 'Stabilization') {
        newFinancials.isStabilized = isStabilized;
        newFinancials.rentalMarketingCost = rentalMarketingCost;
        if (f.stabilizationDate) newFinancials.stabilizationDate = new Date(f.stabilizationDate);
        if (isFinalizing) {
          newStatus = 'exit';
          newPhase = 4;
        }
      } else if (f.exitType === 'Refinance') {
        newFinancials.isRefinanced = true;
        newFinancials.refiLoanAmount = refiLoanAmount;
        newFinancials.refiInterestRate = refiInterestRate;
        newFinancials.refiLoanTermYears = refiLoanTermYears;
        newFinancials.refiCashOut = refiCashOut;
        if (f.refiDate) newFinancials.refiDate = new Date(f.refiDate);
        
        if (isFinalizing) {
          // Reset primary debt metrics
          newFinancials.loanAmount = refiLoanAmount;
          newFinancials.loanInterestRate = refiInterestRate;
          newFinancials.loanTermYears = refiLoanTermYears;
          newStatus = 'hold';
          newPhase = 3; // Go back to Hold
        }
      }

      // Build edit history diffs
      const diffs = buildExitEditHistoryEntries(deal.financials || {}, newFinancials, user.uid);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingHistory = (deal as any).exitEditHistory || [];
      const updatedHistory = [...existingHistory, ...diffs];

      const updates: Partial<Project> = {
        financials: newFinancials,
        exitEditHistory: updatedHistory,
        status: newStatus,
        currentPhase: newPhase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      await projectsService.updateProject(deal.id, updates);
      
      if (isFinalizing) {
        if (f.exitType === 'Sale') {
          await projectsService.closeProjectAndArchive(deal.id, deal.organizationId || '', 'Sell');
          toast.success("Sale exit finalized! Project locked & archived.");
        } else if (f.exitType === 'Stabilization') {
          toast.success("Property marked as stabilized operating rental. Project returned to Hold.");
        } else {
          toast.success("Refinance terms recorded. Project returned to Hold with reset debt service.");
        }
        window.location.reload();
      }

    } catch (e) {
      console.error(e);
      toast.error('Failed to save progress.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────
  return (
    <div className="glass-card border border-pw-border p-6 md:p-8 text-left mb-8 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-pw-border pb-4 mb-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-text-primary">Exit Operations Wizard</h2>
          <p className="text-[10px] text-text-secondary font-bold uppercase mt-0.5 tracking-wider">
            {currentSection?.title || 'Loading…'}
          </p>
        </div>
        <div className="text-[11px] font-mono text-text-secondary bg-pw-glass-bg px-2.5 py-1 border border-pw-border">
          SECTION {currentSectionIdx + 1} OF {activeSections.length}
        </div>
      </div>

      {/* Section Progress Bar */}
      <div className="flex gap-1 mb-6">
        {activeSections.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 transition-all duration-500 ${
              i <= currentSectionIdx ? 'bg-pw-accent' : 'bg-pw-border'
            }`}
          />
        ))}
      </div>

      {/* Section Content */}
      <div className="space-y-6 min-h-[280px]">
        {currentSection?.id === 'exit-type' && renderExitTypeSection()}
        {currentSection?.id === 'sale-details' && renderSaleDetailsSection()}
        {currentSection?.id === 'rental-ops' && renderRentalOpsSection()}
        {currentSection?.id === 'refi-details' && renderRefiDetailsSection()}
        {currentSection?.id === 'review' && renderReviewSection()}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-pw-border mt-8">
        <button
          onClick={handleBack}
          disabled={isFirstSection || isSaving}
          className="pw-btn pw-btn--sm pw-btn--secondary font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-[10px] text-text-secondary animate-pulse">Saving…</span>
          )}
          {isLastSection ? (
            <button
              onClick={handleComplete}
              disabled={isSaving}
              className="pw-btn pw-btn--sm pw-btn--primary font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Complete Exit Setup
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="pw-btn pw-btn--sm pw-btn--primary font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Section 1: Exit Type ─────────────────────────────
  function renderExitTypeSection() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            What is your exit pathway?
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Select the exit scenario for this project. Different paths trigger distinct financial evaluations.
          </p>
        </div>

        <FieldRow label="Exit Pathway" desc="Select how you are exiting or transitioning this project.">
          <select
            value={formData.exitType}
            onChange={(e) => updateField('exitType', e.target.value)}
            className="glass-input text-sm py-3 px-4 w-full focus:outline-none"
          >
            <option value="Sale">Sale (Liquidation / Flip)</option>
            <option value="Stabilization">Rental Stabilization (Hold as operating rental)</option>
            <option value="Refinance">BRRRR Refinance (Extract capital and reset debt)</option>
          </select>
        </FieldRow>
      </div>
    );
  }

  // ── Section 2: Sale Details ───────────────────────────
  function renderSaleDetailsSection() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Sale Metrics (LIVE)
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Enter final figures from the settlement statement to calculate realized ROI and tax basis.
          </p>
        </div>

        <FieldRow label="Actual Sale Price" desc="The final gross sale price of the property.">
          <CurrencyInput value={formData.actualSalePrice} onChange={(v) => updateField('actualSalePrice', v)} />
        </FieldRow>

        <FieldRow label="Selling + Marketing Costs" desc="Commissions, staging, and other transaction costs.">
          <CurrencyInput value={formData.sellingCosts} onChange={(v) => updateField('sellingCosts', v)} />
        </FieldRow>

        <FieldRow label="Exit Marketing Cost" desc="Specific spend on marketing the property for sale.">
          <CurrencyInput value={formData.exitMarketingCost} onChange={(v) => updateField('exitMarketingCost', v)} />
        </FieldRow>

        <FieldRow label="Exit Attorney Fees" desc="Sell-side attorney fees for closing.">
          <CurrencyInput value={formData.exitAttorneyFees} onChange={(v) => updateField('exitAttorneyFees', v)} />
        </FieldRow>

        <FieldRow label="Sale / Closing Date" desc="The date the transaction officially closed.">
          <input
            type="date"
            value={formData.soldDate}
            onChange={(e) => updateField('soldDate', e.target.value)}
            className="glass-input text-sm py-3 px-4 w-full max-w-lg focus:outline-none"
          />
        </FieldRow>
      </div>
    );
  }

  // ── Section 3: Rental Operations ──────────────────────
  function renderRentalOpsSection() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Transition to Rental (LIVE)
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Log marketing costs and confirm stabilization to return this project to the Hold phase.
          </p>
        </div>

        <FieldRow label="Rental Marketing Cost" desc="Spend on placing a tenant (advertising, broker fees).">
          <CurrencyInput value={formData.rentalMarketingCost} onChange={(v) => updateField('rentalMarketingCost', v)} />
        </FieldRow>

        <FieldRow label="Mark as stabilized operating rental?" desc="Confirming this transitions status to Rented.">
          <select
            value={formData.isStabilized}
            onChange={(e) => updateField('isStabilized', e.target.value)}
            className="glass-input text-sm py-3 px-4 w-full focus:outline-none"
          >
            <option value="yes">Yes, mark as stabilized</option>
            <option value="no">No, keep editing</option>
          </select>
        </FieldRow>

        <FieldRow label="Stabilization Date" desc="When was the property declared stabilized?">
          <input
            type="date"
            value={formData.stabilizationDate}
            onChange={(e) => updateField('stabilizationDate', e.target.value)}
            className="glass-input text-sm py-3 px-4 w-full max-w-lg focus:outline-none"
          />
        </FieldRow>
      </div>
    );
  }

  // ── Section 4: BRRRR Refinance ────────────────────────
  function renderRefiDetailsSection() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Refinance Terms (LIVE)
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Log the new debt service and cash-out to reset the project&apos;s financing.
          </p>
        </div>

        <FieldRow label="New Loan Amount" desc="The new mortgage loan amount.">
          <CurrencyInput value={formData.refiLoanAmount} onChange={(v) => updateField('refiLoanAmount', v)} />
        </FieldRow>

        <FieldRow label="New Interest Rate (%)" desc="Annual interest rate.">
          <div className="relative w-full max-w-lg">
            <input
              type="number"
              step="0.01"
              value={formData.refiInterestRate}
              onChange={(e) => updateField('refiInterestRate', e.target.value)}
              placeholder="6.5"
              className="glass-input text-sm py-3 pr-10 pl-4 w-full focus:outline-none tabular-nums text-text-primary"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-secondary">%</span>
          </div>
        </FieldRow>

        <FieldRow label="New Loan Term (years)" desc="Duration of the new mortgage loan.">
          <div className="relative w-full max-w-lg">
            <input
              type="number"
              value={formData.refiLoanTermYears}
              onChange={(e) => updateField('refiLoanTermYears', e.target.value)}
              placeholder="30"
              className="glass-input text-sm py-3 px-4 w-full focus:outline-none tabular-nums text-text-primary"
              min="0"
            />
          </div>
        </FieldRow>

        <FieldRow label="Cash Pulled Out" desc="Cash-out amount returned to investors.">
          <CurrencyInput value={formData.refiCashOut} onChange={(v) => updateField('refiCashOut', v)} />
        </FieldRow>

        <FieldRow label="Refinance Date" desc="Closing date of the refinance transaction.">
          <input
            type="date"
            value={formData.refiDate}
            onChange={(e) => updateField('refiDate', e.target.value)}
            className="glass-input text-sm py-3 px-4 w-full max-w-lg focus:outline-none"
          />
        </FieldRow>
      </div>
    );
  }

  // ── Section 5: Review & Submit ────────────────────────
  function renderReviewSection() {
    let summaryRows: { label: string, value: string }[] = [];

    if (formData.exitType === 'Sale') {
      summaryRows = [
        { label: 'Sale Price', value: `$${(Number(formData.actualSalePrice) || 0).toLocaleString()}` },
        { label: 'Selling + Marketing', value: `$${(Number(formData.sellingCosts) || 0).toLocaleString()}` },
        { label: 'Attorney Fees', value: `$${(Number(formData.exitAttorneyFees) || 0).toLocaleString()}` },
        { label: 'Exit Marketing', value: `$${(Number(formData.exitMarketingCost) || 0).toLocaleString()}` },
        { label: 'Sale Date', value: formData.soldDate || 'TBD' }
      ];
    } else if (formData.exitType === 'Stabilization') {
      summaryRows = [
        { label: 'Rental Marketing', value: `$${(Number(formData.rentalMarketingCost) || 0).toLocaleString()}` },
        { label: 'Stabilized?', value: formData.isStabilized === 'yes' ? 'Yes' : 'No' },
        { label: 'Stabilization Date', value: formData.stabilizationDate || 'TBD' }
      ];
    } else if (formData.exitType === 'Refinance') {
      summaryRows = [
        { label: 'Refi Loan Amount', value: `$${(Number(formData.refiLoanAmount) || 0).toLocaleString()}` },
        { label: 'Interest Rate', value: `${formData.refiInterestRate || 0}%` },
        { label: 'Term', value: `${formData.refiLoanTermYears || 0} years` },
        { label: 'Cash Out', value: `$${(Number(formData.refiCashOut) || 0).toLocaleString()}` },
        { label: 'Refi Date', value: formData.refiDate || 'TBD' }
      ];
    }

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-light tracking-tight text-text-primary">
            Review & Finalize
          </h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Confirm your exit details. Finalizing a sale will lock and archive the project.
          </p>
        </div>

        {/* Summary Table */}
        <div className="bg-pw-glass-bg/30 border border-pw-border divide-y divide-pw-border">
          {summaryRows.map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-text-secondary">{row.label}</span>
              <span className="text-sm font-semibold tabular-nums text-text-primary">{row.value}</span>
            </div>
          ))}
        </div>

        {formData.exitType === 'Sale' && (
          <div className="flex items-start gap-3 p-4 bg-color-error/10 border border-color-error/30 text-xs leading-relaxed text-color-error">
            <AlertTriangle className="w-5 h-5 text-color-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Finalizing Sale</p>
              <p>Completing this will transition the project to <b>Sold</b> and move it to your archives. Realized ROI and Tax Estimates will be computed and locked.</p>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// ── Shared Sub-Components ───────────────────────────────

function CurrencyInput({ value, onChange, compact }: { value: string | number; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <div className={`relative ${compact ? 'w-full' : 'w-full max-w-lg'}`}>
      <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-medium text-text-secondary ${compact ? 'text-sm' : 'text-lg'}`}>$</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className={`glass-input w-full focus:outline-none tabular-nums text-text-primary ${
          compact ? 'text-sm py-2 pl-7 pr-3' : 'text-lg py-3 pl-10 pr-4'
        }`}
      />
    </div>
  );
}

function FieldRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-text-primary uppercase tracking-wider">{label}</p>
      <p className="text-[10px] text-text-secondary mt-0.5">{desc}</p>
      <div className="max-w-lg">{children}</div>
    </div>
  );
}

// ── Build initial form data from deal ───────────────────
function buildFormData(deal: Project) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = deal.financials || {} as any;
  return {
    exitType: f.exitType || 'Sale',
    // Sale
    actualSalePrice: f.actualSalePrice || f.estimatedARV || '',
    sellingCosts: f.sellingCosts || '',
    exitMarketingCost: f.exitMarketingCost || '',
    exitAttorneyFees: f.exitAttorneyFees || '',
    soldDate: parseDateField(f.soldDate),
    // Rental
    rentalMarketingCost: f.rentalMarketingCost || '',
    isStabilized: f.isStabilized ? 'yes' : 'no',
    stabilizationDate: parseDateField(f.stabilizationDate),
    // Refi
    refiLoanAmount: f.refiLoanAmount || f.loanAmount || '',
    refiInterestRate: f.refiInterestRate || f.loanInterestRate || '',
    refiLoanTermYears: f.refiLoanTermYears || f.loanTermYears || 30,
    refiCashOut: f.refiCashOut || '',
    refiDate: parseDateField(f.refiDate),
  };
}
