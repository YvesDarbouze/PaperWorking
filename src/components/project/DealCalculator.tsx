'use client';

import React, { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Hammer,
  BarChart3,
  DollarSign,
  Percent,
  PiggyBank,
  ArrowUpRight,
  AlertTriangle,
  Landmark,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';
import CurrencyInputModule from './CurrencyInputModule';
import { CapitalSource, FundingCategory, ProjectFinancials } from '../../types/schema';
import { projectsService } from '@/lib/firebase/projects';
import { Loader2, Save } from 'lucide-react';
import LOIGenerator from './LOIGenerator';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════════════════════════════
   DealCalculator — Financial Analysis Container

   A modular card-based layout that houses the core financial
   inputs for REI deal analysis: ARV, Rehab Budget, and NOI.

   Design:
     • Uses --bg-surface (#FFFFFF) as the card background
     • Phase-aware header via phaseColor prop
     • Three-column metric grid for at-a-glance KPIs
     • Individual input sections with dashed-border placeholders
       ready for future interactive form controls

   Props:
     phaseColor — hex color used for section header bars
     purchasePrice — existing purchase price (cents) from deal
     estimatedARV  — existing ARV estimate (cents) from deal
   ═══════════════════════════════════════════════════════════════ */

interface DealCalculatorProps {
  phaseColor: string;
  projectId: string;
  propertyAddress?: string;
  initialFinancials?: ProjectFinancials;
  onSaveSuccess?: (updatedFinancials: ProjectFinancials) => void;
  readOnly?: boolean;
}

/* ── Metric card sub-component ── */
function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  phaseColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
  phaseColor: string;
}) {
  return (
    <div
      className="rounded-lg p-8 flex flex-col gap-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `${phaseColor}12` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: phaseColor }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

/* ── Input section placeholder sub-component ── */
function InputSection({
  icon: Icon,
  title,
  description,
  phaseColor,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  phaseColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      {/* Section header */}
      <div className="px-8 py-5 flex items-center gap-4" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-ui)' }}>
        <Icon className="w-4 h-4" style={{ color: phaseColor }} aria-hidden="true" />
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>

      {/* Section body */}
      <div className="px-8 py-8">
        {children || (
          <div className="flex flex-col items-center justify-center py-10 gap-4" style={{ border: '1px dashed var(--border-ui)', borderRadius: '8px' }}>
            <Icon className="w-5 h-5" style={{ color: 'var(--text-secondary)', opacity: 0.25 }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-center" style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function DealCalculator({ phaseColor, projectId, propertyAddress, initialFinancials, onSaveSuccess, readOnly = false }: DealCalculatorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  /* ── Interactive State ── */
  const [arvCents, setArvCents] = useState<number>(initialFinancials?.estimatedARV || 0);
  const [rehabCents, setRehabCents] = useState<number>(initialFinancials?.projectedRehabCost || 0);
  const [purchasePrice, setPurchasePrice] = useState<number>(initialFinancials?.purchasePrice || 0);

  // NOI Gross Income State (Monthly)
  const [baseRent, setBaseRent] = useState<number>(initialFinancials?.grossIncomeBaseRent || 0);
  const [parkingFees, setParkingFees] = useState<number>(initialFinancials?.grossIncomeParking || 0);
  const [laundryFees, setLaundryFees] = useState<number>(initialFinancials?.grossIncomeLaundry || 0);

  // NOI Operating Expenses State (Monthly)
  const [taxes, setTaxes] = useState<number>(initialFinancials?.operatingExpenseTaxes || 0);
  const [insurance, setInsurance] = useState<number>(initialFinancials?.operatingExpenseInsurance || 0);

  // Financing Data State
  const [cashInvested, setCashInvested] = useState<number>(initialFinancials?.financingCashInvested || 0);
  const [debtService, setDebtService] = useState<number>(initialFinancials?.financingDebtService || 0);

  // Equity Valuation Tracker State
  const [estimatedCurrentValue, setEstimatedCurrentValue] = useState<number>(initialFinancials?.estimatedCurrentValue || 0);
  const [estimatedExistingDebt, setEstimatedExistingDebt] = useState<number>(initialFinancials?.estimatedExistingDebt || 0);

  // Capital Stack State
  const [capitalStack, setCapitalStack] = useState<CapitalSource[]>(initialFinancials?.capitalStack || []);

  // Holding Costs State
  const [projectedHoldTimeMonths, setProjectedHoldTimeMonths] = useState<number>(initialFinancials?.projectedHoldTimeMonths || 0);
  const [holdingCostTaxes, setHoldingCostTaxes] = useState<number>(initialFinancials?.holdingCostTaxes || 0);
  const [holdingCostInsurance, setHoldingCostInsurance] = useState<number>(initialFinancials?.holdingCostInsurance || 0);
  const [holdingCostUtilities, setHoldingCostUtilities] = useState<number>(initialFinancials?.holdingCostUtilities || 0);

  const addCapitalSource = () => {
    setCapitalStack([...capitalStack, {
      id: crypto.randomUUID(),
      category: 'Hard Money Loans',
      amount: 0,
      interestRate: 0
    }]);
  };

  const updateCapitalSource = (id: string, field: keyof CapitalSource, value: any) => {
    setCapitalStack(capitalStack.map(source => 
      source.id === id ? { ...source, [field]: value } : source
    ));
  };

  const removeCapitalSource = (id: string) => {
    setCapitalStack(capitalStack.filter(source => source.id !== id));
  };

  // Offer Response State
  const [offerStatus, setOfferStatus] = useState<'Pending' | 'Accepted' | 'Rejected'>(initialFinancials?.offerStatus || 'Pending');

  // Distressed Property Indicators State
  const [absenteeOwnership, setAbsenteeOwnership] = useState<boolean>(initialFinancials?.distressedIndicators?.absenteeOwnership || false);
  const [preForeclosure, setPreForeclosure] = useState<boolean>(initialFinancials?.distressedIndicators?.preForeclosure || false);
  const [liensPresent, setLiensPresent] = useState<boolean>(initialFinancials?.distressedIndicators?.liensPresent || false);
  const [vacantStatus, setVacantStatus] = useState<boolean>(initialFinancials?.distressedIndicators?.vacantStatus || false);
  const [highTurnover, setHighTurnover] = useState<boolean>(initialFinancials?.distressedIndicators?.highTurnoverSalesHistory || false);

  /* ── Dirty State & Validation ── */
  const isDirty = 
    arvCents !== (initialFinancials?.estimatedARV || 0) ||
    rehabCents !== (initialFinancials?.projectedRehabCost || 0) ||
    purchasePrice !== (initialFinancials?.purchasePrice || 0) ||
    baseRent !== (initialFinancials?.grossIncomeBaseRent || 0) ||
    parkingFees !== (initialFinancials?.grossIncomeParking || 0) ||
    laundryFees !== (initialFinancials?.grossIncomeLaundry || 0) ||
    taxes !== (initialFinancials?.operatingExpenseTaxes || 0) ||
    insurance !== (initialFinancials?.operatingExpenseInsurance || 0) ||
    cashInvested !== (initialFinancials?.financingCashInvested || 0) ||
    debtService !== (initialFinancials?.financingDebtService || 0) ||
    estimatedCurrentValue !== (initialFinancials?.estimatedCurrentValue || 0) ||
    estimatedExistingDebt !== (initialFinancials?.estimatedExistingDebt || 0) ||
    JSON.stringify(capitalStack) !== JSON.stringify(initialFinancials?.capitalStack || []) ||
    projectedHoldTimeMonths !== (initialFinancials?.projectedHoldTimeMonths || 0) ||
    holdingCostTaxes !== (initialFinancials?.holdingCostTaxes || 0) ||
    holdingCostInsurance !== (initialFinancials?.holdingCostInsurance || 0) ||
    holdingCostUtilities !== (initialFinancials?.holdingCostUtilities || 0) ||
    offerStatus !== (initialFinancials?.offerStatus || 'Pending') ||
    absenteeOwnership !== (initialFinancials?.distressedIndicators?.absenteeOwnership || false) ||
    preForeclosure !== (initialFinancials?.distressedIndicators?.preForeclosure || false) ||
    liensPresent !== (initialFinancials?.distressedIndicators?.liensPresent || false) ||
    vacantStatus !== (initialFinancials?.distressedIndicators?.vacantStatus || false) ||
    highTurnover !== (initialFinancials?.distressedIndicators?.highTurnoverSalesHistory || false);

  /* ── Save Handler ── */
  const handleSave = async () => {
    // Validation
    if (
      isNaN(purchasePrice) || purchasePrice < 0 ||
      isNaN(arvCents) || arvCents < 0 ||
      isNaN(rehabCents) || rehabCents < 0 ||
      isNaN(baseRent) || baseRent < 0 ||
      isNaN(parkingFees) || parkingFees < 0 ||
      isNaN(laundryFees) || laundryFees < 0 ||
      isNaN(taxes) || taxes < 0 ||
      isNaN(insurance) || insurance < 0 ||
      isNaN(cashInvested) || cashInvested < 0 ||
      isNaN(debtService) || debtService < 0 ||
      isNaN(estimatedCurrentValue) || estimatedCurrentValue < 0 ||
      isNaN(estimatedExistingDebt) || estimatedExistingDebt < 0 ||
      isNaN(projectedHoldTimeMonths) || projectedHoldTimeMonths < 0 ||
      isNaN(holdingCostTaxes) || holdingCostTaxes < 0 ||
      isNaN(holdingCostInsurance) || holdingCostInsurance < 0 ||
      isNaN(holdingCostUtilities) || holdingCostUtilities < 0
    ) {
      setSaveMessage('Error: Invalid values. Please check your inputs.');
      return;
    }

    const isCapitalStackValid = capitalStack.every(source => 
      !isNaN(source.amount) && source.amount >= 0 && 
      !isNaN(source.interestRate) && source.interestRate >= 0
    );

    if (!isCapitalStackValid) {
      setSaveMessage('Error: Invalid Capital Stack values.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');
    try {
      const updatedFinancials: ProjectFinancials = {
        ...initialFinancials,
        purchasePrice,
        estimatedARV: arvCents,
        projectedRehabCost: rehabCents,
        grossIncomeBaseRent: baseRent,
        grossIncomeParking: parkingFees,
        grossIncomeLaundry: laundryFees,
        operatingExpenseTaxes: taxes,
        operatingExpenseInsurance: insurance,
        financingCashInvested: cashInvested,
        financingDebtService: debtService,
        estimatedCurrentValue,
        estimatedExistingDebt,
        projectedHoldTimeMonths,
        holdingCostTaxes,
        holdingCostInsurance,
        holdingCostUtilities,
        capitalStack,
        offerStatus,
        distressedIndicators: {
          ...initialFinancials?.distressedIndicators,
          absenteeOwnership,
          preForeclosure,
          liensPresent,
          vacantStatus,
          highTurnoverSalesHistory: highTurnover
        },
        costs: initialFinancials?.costs || []
      };

      await projectsService.updateDeal(projectId, { financials: updatedFinancials });
      
      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);

      if (onSaveSuccess) {
        onSaveSuccess(updatedFinancials);
      }

      // ── Automation Hook: Phase Progression Redirect ──
      if (offerStatus === 'Accepted' && initialFinancials?.offerStatus !== 'Accepted') {
        router.push(`/dashboard/projects/${projectId}/phase-2`);
      }
    } catch (error) {
      console.error('Failed to save financials:', error);
      setSaveMessage('Error saving data');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Formatting helpers ── */
  const fmtCurrency = (cents?: number) => {
    if (!cents) return '—';
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  /* ── Derived KPIs ── */
  const spreadCents = (arvCents && purchasePrice) ? arvCents - purchasePrice : undefined;
  const marginPct = (arvCents && purchasePrice && purchasePrice > 0)
    ? ((arvCents - purchasePrice) / arvCents * 100).toFixed(1)
    : undefined;

  // 70% Rule Logic
  const maoCents = Math.round(arvCents * 0.70) - rehabCents;

  // NOI & Cash Flow Logic (Monthly inputs -> Annualized for KPIs)
  const totalGrossIncome = baseRent + parkingFees + laundryFees;
  const totalOperatingExpenses = taxes + insurance;
  const monthlyNOI = totalGrossIncome - totalOperatingExpenses;
  const annualNOI = monthlyNOI * 12;

  // Cap Rate = (Annual NOI / Purchase Price)
  const capRate = (purchasePrice && purchasePrice > 0) ? (annualNOI / purchasePrice) * 100 : 0;

  // Cash-on-Cash Return
  const annualDebtService = debtService * 12;
  const annualCashFlow = annualNOI - annualDebtService;
  const cocReturn = (cashInvested && cashInvested > 0) ? (annualCashFlow / cashInvested) * 100 : 0;

  // Equity Valuation Logic
  const currentEquityCents = estimatedCurrentValue - estimatedExistingDebt;
  const equityPercentage = estimatedCurrentValue > 0 
    ? (currentEquityCents / estimatedCurrentValue) * 100 
    : 0;

  // Holding Costs Logic
  const totalMonthlyHoldingCosts = holdingCostTaxes + holdingCostInsurance + holdingCostUtilities;
  const estimatedTotalHoldingCosts = totalMonthlyHoldingCosts * projectedHoldTimeMonths;

  return (
    <section
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      {/* ── Calculator header ── */}
      <div className="px-8 py-5 flex items-center justify-between gap-4" style={{ background: phaseColor }}>
        <div className="flex items-center gap-3">
          <Calculator className="w-4 h-4" style={{ color: '#FFFFFF' }} aria-hidden="true" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#FFFFFF' }}>
            Deal Calculator
          </h2>
        </div>
        <div className="flex items-center gap-6">
          {isDirty && !saveMessage && (
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: '#FCD34D' }}>
              Unsaved Changes
            </span>
          )}
          {saveMessage && (
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: saveMessage.includes('Error') ? '#FF9494' : '#BBF7D0' }}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || (!isDirty && !saveMessage) || readOnly}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${(!isDirty && !saveMessage) ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              background: 'rgba(255,255,255,0.15)', 
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? 'Saving...' : 'Save Financials'}
          </button>
        </div>
      </div>

      {/* ── Body container ── */}
      <div className="p-8 space-y-12">

        {/* ── At-a-glance metrics row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <InputSection
            icon={DollarSign}
            title="Purchase Price"
            description="Acquisition basis"
            phaseColor={phaseColor}
          >
            <CurrencyInputModule 
              label="Purchase Price"
              initialValue={purchasePrice} 
              onChange={setPurchasePrice}
              phaseColor={phaseColor}
              readOnly={readOnly}
            />
          </InputSection>
          <MetricCard
            icon={TrendingUp}
            label="Estimated ARV"
            value={fmtCurrency(arvCents)}
            sublabel="After-repair value"
            phaseColor={phaseColor}
          />
          <MetricCard
            icon={ArrowUpRight}
            label="Spread"
            value={spreadCents ? fmtCurrency(spreadCents) : '—'}
            sublabel={marginPct ? `${marginPct}% margin` : 'Pending inputs'}
            phaseColor={phaseColor}
          />
        </div>

        {/* ── Financial input sections ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <InputSection
            icon={TrendingUp}
            title="Market Value"
            description="Enter expected ARV"
            phaseColor={phaseColor}
          >
            <CurrencyInputModule 
              label="After Repair Value (ARV)"
              tooltipText="After Repair Value (ARV) is the estimated future value of a property once all renovations are complete. It's a critical metric for determining your Maximum Allowable Offer (MAO) and overall profitability."
              initialValue={arvCents} 
              onChange={setArvCents}
              phaseColor={phaseColor}
              readOnly={readOnly}
            />
          </InputSection>
          <InputSection
            icon={Hammer}
            title="Rehab Budget"
            description="Add rehab line items"
            phaseColor={phaseColor}
          >
            <CurrencyInputModule 
              label="Estimated Rehab Costs"
              tooltipText="The total estimated cost to renovate the property to reach its ARV. Include all materials, labor, and a contingency buffer."
              initialValue={rehabCents} 
              onChange={setRehabCents}
              phaseColor={phaseColor}
              readOnly={readOnly}
            />
          </InputSection>
          <InputSection
            icon={BarChart3}
            title="Gross Income (Monthly)"
            description="Enter revenue streams"
            phaseColor={phaseColor}
          >
            <div className="flex flex-col gap-4">
              <CurrencyInputModule 
                label="Base Rent"
                tooltipText="The primary monthly rental income expected from the property, assuming it is fully occupied."
                initialValue={baseRent} 
                onChange={setBaseRent}
                phaseColor={phaseColor} 
                readOnly={readOnly}
              />
              <CurrencyInputModule 
                label="Parking Fees"
                tooltipText="Expected monthly revenue from dedicated parking spots, carports, or garage rentals."
                initialValue={parkingFees} 
                onChange={setParkingFees}
                phaseColor={phaseColor} 
                readOnly={readOnly}
              />
              <CurrencyInputModule 
                label="Laundry / Service Fees"
                tooltipText="Ancillary monthly income generated from on-site laundry facilities, storage lockers, pet fees, or other services."
                initialValue={laundryFees} 
                onChange={setLaundryFees}
                phaseColor={phaseColor} 
                readOnly={readOnly}
              />
              
              <div className="mt-2 pt-4 flex items-center justify-between" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Total Gross Income</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: phaseColor }}>{fmtCurrency(totalGrossIncome)}</span>
              </div>
            </div>
          </InputSection>
          <InputSection
            icon={BarChart3}
            title="Operating Expenses (Monthly)"
            description="Enter fixed & variable costs"
            phaseColor={phaseColor}
          >
            <div className="flex flex-col gap-4">
              {/* UX Warning */}
              <div className="px-3 py-2 rounded flex items-center justify-center text-center" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-ui)' }}>
                <span className="text-[11px] font-bold tracking-wide uppercase text-red-500">
                  ⚠️ Do NOT subtract mortgage payments here.
                </span>
              </div>
              
              <CurrencyInputModule 
                label="Property Taxes"
                tooltipText="Estimated monthly property tax burden."
                initialValue={taxes} 
                onChange={setTaxes}
                phaseColor={phaseColor} 
                readOnly={readOnly}
              />
              <CurrencyInputModule 
                label="Insurance"
                tooltipText="Estimated monthly cost for landlord/property insurance."
                initialValue={insurance} 
                onChange={setInsurance}
                phaseColor={phaseColor} 
                readOnly={readOnly}
              />
              
              <div className="mt-2 pt-4 flex flex-col gap-2" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Total Expenses</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(totalOperatingExpenses)}</span>
                </div>
              </div>
            </div>
          </InputSection>

          {/* ── Prominent NOI Data Card ── */}
          <div 
            className="md:col-span-2 rounded-lg p-10 flex flex-col sm:flex-row items-center justify-between shadow-sm mt-4" 
            style={{ background: phaseColor, color: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-90">Net Operating Income (NOI)</h3>
                <p className="text-sm font-medium opacity-80 mt-0.5">Total Gross Income − Total Operating Expenses</p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <div className="text-4xl font-bold tabular-nums tracking-tight">
                {fmtCurrency(annualNOI)}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-70 mt-1">
                Annualized Calculation
              </div>
            </div>
          </div>
        </div>

        {/* ── Full-width additional analysis slot ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <InputSection
            icon={Percent}
            title="Cap Rate"
            description="Auto-calculated from NOI"
            phaseColor={phaseColor}
          >
             <div className="flex flex-col items-center justify-center py-6 gap-2">
               <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
                 {purchasePrice && purchasePrice > 0 ? capRate.toFixed(2) + '%' : '—'}
               </span>
               <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-center" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                 Based on Annual NOI & Purchase Price
               </span>
             </div>
          </InputSection>
          <InputSection
            icon={PiggyBank}
            title="Cash-on-Cash Return"
            description="Requires financing data"
            phaseColor={phaseColor}
          >
            <div className="flex flex-col gap-4">
              <CurrencyInputModule 
                label="Total Cash Invested"
                tooltipText="The total amount of your own cash used in the deal (down payment, closing costs, out-of-pocket rehab)."
                initialValue={cashInvested}
                onChange={setCashInvested}
                phaseColor={phaseColor}
                readOnly={readOnly}
              />
              <CurrencyInputModule 
                label="Monthly Debt Service"
                tooltipText="Your total monthly loan payment (principal and interest)."
                initialValue={debtService}
                onChange={setDebtService}
                phaseColor={phaseColor}
                readOnly={readOnly}
              />
              <div className="mt-2 pt-4 flex flex-col gap-2" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Annual Cash Flow</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(annualCashFlow)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>CoC Return</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: phaseColor }}>
                    {cashInvested > 0 ? cocReturn.toFixed(2) + '%' : '—'}
                  </span>
                </div>
              </div>
            </div>
          </InputSection>
          <InputSection
            icon={DollarSign}
            title="Maximum Allowable Offer"
            description="MAO = ARV × 70% − Rehab"
            phaseColor={phaseColor}
          >
            <div className="flex flex-col gap-4">
              <CurrencyInputModule 
                label="MAO (70% Rule)"
                tooltipText="The Maximum Allowable Offer represents the highest price you can pay for a property while maintaining a 30% gross profit margin. Formula: (ARV × 0.70) - Rehab Costs."
                initialValue={maoCents > 0 ? maoCents : 0} 
                phaseColor={phaseColor} 
                readOnly={readOnly}
              />
              <LOIGenerator 
                propertyAddress={propertyAddress || ''} 
                maoCents={maoCents > 0 ? maoCents : 0} 
                phaseColor={phaseColor} 
              />
              <div className="mt-2 pt-4 flex flex-col gap-2" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Offer Status</label>
                <select 
                  value={offerStatus}
                  onChange={(e) => setOfferStatus(e.target.value as 'Pending' | 'Accepted' | 'Rejected')}
                  disabled={readOnly}
                  className="w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                  style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </InputSection>
        </div>

        {/* ── Holding Costs & Capital Stack Ledger ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Holding Costs Calculator */}
          <InputSection
            icon={Clock}
            title="Holding Costs Calculator"
            description="Calculate total costs during hold period"
            phaseColor={phaseColor}
          >
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Projected Hold Time (Months)</label>
                <input
                  type="number"
                  value={projectedHoldTimeMonths || ''}
                  onChange={(e) => setProjectedHoldTimeMonths(parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  placeholder="0"
                  className="w-full bg-transparent text-xl font-bold placeholder-opacity-30 focus:outline-none"
                  style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                />
              </div>
              <CurrencyInputModule 
                label="Monthly Taxes"
                initialValue={holdingCostTaxes}
                onChange={setHoldingCostTaxes}
                phaseColor={phaseColor}
                readOnly={readOnly}
              />
              <CurrencyInputModule 
                label="Monthly Insurance"
                initialValue={holdingCostInsurance}
                onChange={setHoldingCostInsurance}
                phaseColor={phaseColor}
                readOnly={readOnly}
              />
              <CurrencyInputModule 
                label="Monthly Utilities"
                initialValue={holdingCostUtilities}
                onChange={setHoldingCostUtilities}
                phaseColor={phaseColor}
                readOnly={readOnly}
              />
              <div className="mt-2 pt-4 flex flex-col gap-2" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Estimated Total Holding Costs</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: phaseColor }}>{fmtCurrency(estimatedTotalHoldingCosts)}</span>
                </div>
              </div>
            </div>
          </InputSection>

          <InputSection
            icon={Landmark}
            title="Capital Stack"
            description="Add multiple funding sources"
            phaseColor={phaseColor}
          >
            <div className="flex flex-col gap-6">
              {capitalStack.map((source) => (
                <div key={source.id} className="p-8 rounded-lg relative" style={{ border: '1px solid var(--border-ui)', background: 'var(--bg-inset)' }}>
                  <button 
                    onClick={() => removeCapitalSource(source.id)}
                    disabled={readOnly}
                    className={`absolute top-3 right-3 p-1 rounded-md transition-opacity ${readOnly ? 'opacity-30 cursor-not-allowed' : 'opacity-50 hover:opacity-100'}`}
                    style={{ background: 'var(--bg-surface)' }}
                    aria-label="Remove source"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                  <div className="flex flex-col gap-3 pr-8">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Funding Category</label>
                      <select 
                        value={source.category}
                        onChange={(e) => updateCapitalSource(source.id, 'category', e.target.value)}
                        disabled={readOnly}
                        className="w-full bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                        style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                      >
                        <option value="Hard Money Loans">Hard Money Loans</option>
                        <option value="Private Money">Private Money</option>
                        <option value="Conventional Financing">Conventional Financing</option>
                      </select>
                      {source.category === 'Hard Money Loans' && (
                        <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>Often covers 80-90% of purchase, 100% of rehab.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CurrencyInputModule 
                        label="Amount"
                        initialValue={source.amount}
                        onChange={(val) => updateCapitalSource(source.id, 'amount', val)}
                        phaseColor={phaseColor}
                      />
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Interest Rate (%)</label>
                        <input
                          type="number"
                          value={source.interestRate || ''}
                          onChange={(e) => updateCapitalSource(source.id, 'interestRate', parseFloat(e.target.value) || 0)}
                          disabled={readOnly}
                          placeholder="0"
                          className="w-full bg-transparent text-xl font-bold placeholder-opacity-30 focus:outline-none"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={addCapitalSource}
                disabled={readOnly}
                className={`flex items-center justify-center gap-2 py-3 rounded-md transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                style={{ border: '1px dashed var(--border-ui)', color: phaseColor }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-bold">Add Funding Source</span>
              </button>
            </div>
          </InputSection>
        </div>

        {/* ── Equity & Distressed Indicators ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Equity Valuation Tracker */}
          <InputSection
            icon={Percent}
            title="Equity Valuation Tracker"
            description="Calculate owner's equity"
            phaseColor={phaseColor}
          >
            <div className="flex flex-col gap-4">
              <CurrencyInputModule 
                label="Estimated Current Property Value"
                tooltipText="Your estimate of the property's value in its current condition."
                initialValue={estimatedCurrentValue}
                onChange={setEstimatedCurrentValue}
                phaseColor={phaseColor}
                readOnly={readOnly}
              />
              <CurrencyInputModule 
                label="Estimated Existing Mortgage/Debt"
                tooltipText="The approximate remaining balance on the current owner's mortgage or liens."
                initialValue={estimatedExistingDebt}
                onChange={setEstimatedExistingDebt}
                phaseColor={phaseColor}
                readOnly={readOnly}
              />
              <div className="mt-2 pt-4 flex flex-col gap-2" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Current Equity Amount</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(currentEquityCents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Owner Equity Percentage</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: phaseColor }}>
                    {estimatedCurrentValue > 0 ? equityPercentage.toFixed(2) + '%' : '—'}
                  </span>
                </div>
              </div>
            </div>
          </InputSection>

          {/* Distressed Property Indicators */}
          <InputSection
            icon={AlertTriangle}
            title="Distressed Property Indicators"
            description="Toggle applicable distressed property conditions"
            phaseColor={phaseColor}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Absentee Ownership', value: absenteeOwnership, setter: setAbsenteeOwnership },
                { label: 'Pre-foreclosure', value: preForeclosure, setter: setPreForeclosure },
                { label: 'Liens Present', value: liensPresent, setter: setLiensPresent },
                { label: 'Vacant Status', value: vacantStatus, setter: setVacantStatus },
                { label: 'High-Turnover Sales History', value: highTurnover, setter: setHighTurnover },
              ].map((indicator, idx) => (
                <label key={idx} className={`flex items-center justify-between p-3 rounded-md transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} style={{ border: '1px solid var(--border-ui)', background: indicator.value ? `${phaseColor}10` : 'transparent' }}>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{indicator.label}</span>
                  <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-200 ${indicator.value ? 'justify-end' : 'justify-start'}`} style={{ background: indicator.value ? phaseColor : 'var(--border-ui)' }}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                  <input type="checkbox" className="hidden" checked={indicator.value} onChange={(e) => indicator.setter(e.target.checked)} disabled={readOnly} />
                </label>
              ))}
            </div>
          </InputSection>
        </div>
      </div>
    </section>
  );
}
