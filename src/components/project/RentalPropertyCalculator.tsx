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
  Save,
  Loader2,
  Home,
  Settings,
  Building
} from 'lucide-react';
import CurrencyInputModule from './CurrencyInputModule';
import { ProjectFinancials } from '../../types/schema';
import { projectsService } from '@/lib/firebase/projects';

interface RentalPropertyCalculatorProps {
  phaseColor: string;
  projectId: string;
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
      className="rounded-lg overflow-hidden h-full"
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
      <div className="px-8 py-8 h-full">
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
export default function RentalPropertyCalculator({ phaseColor, projectId, initialFinancials, onSaveSuccess, readOnly = false }: RentalPropertyCalculatorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  /* ── Interactive State ── */
  // Acquisition / Capital
  const [purchasePrice, setPurchasePrice] = useState<number>(initialFinancials?.purchasePrice || 0);
  const [downPayment, setDownPayment] = useState<number>(initialFinancials?.financingCashInvested || 0);
  const [rehabCents, setRehabCents] = useState<number>(initialFinancials?.projectedRehabCost || 0);
  const [closingCosts, setClosingCosts] = useState<number>(initialFinancials?.fixedAcquisitionCosts || 0);

  // Financing
  const [interestRate, setInterestRate] = useState<number>(initialFinancials?.loanInterestRate || 0); // Percent
  const [amortizationYears, setAmortizationYears] = useState<number>(initialFinancials?.amortizationYears || 30);

  // Income
  const [monthlyRent, setMonthlyRent] = useState<number>(initialFinancials?.monthlyGrossRent || 0);
  const [otherIncome, setOtherIncome] = useState<number>(initialFinancials?.otherMonthlyIncome || 0);

  // Expenses
  const [taxes, setTaxes] = useState<number>(initialFinancials?.operatingExpenseTaxes || 0);
  const [insurance, setInsurance] = useState<number>(initialFinancials?.operatingExpenseInsurance || 0);
  const [hoa, setHoa] = useState<number>(initialFinancials?.monthlyHOA || 0);
  const [maintenance, setMaintenance] = useState<number>(initialFinancials?.monthlyMaintenanceReserve || 0);

  // Assumptions
  const [vacancyRate, setVacancyRate] = useState<number>(initialFinancials?.vacancyRatePercent || 5);
  const [managementFee, setManagementFee] = useState<number>(initialFinancials?.propertyManagementFeePercent || 8);
  const [appreciation, setAppreciation] = useState<number>(initialFinancials?.annualAppreciationPercent || 3);

  /* ── Dirty State & Validation ── */
  const isDirty = 
    purchasePrice !== (initialFinancials?.purchasePrice || 0) ||
    downPayment !== (initialFinancials?.financingCashInvested || 0) ||
    rehabCents !== (initialFinancials?.projectedRehabCost || 0) ||
    closingCosts !== (initialFinancials?.fixedAcquisitionCosts || 0) ||
    interestRate !== (initialFinancials?.loanInterestRate || 0) ||
    amortizationYears !== (initialFinancials?.amortizationYears || 30) ||
    monthlyRent !== (initialFinancials?.monthlyGrossRent || 0) ||
    otherIncome !== (initialFinancials?.otherMonthlyIncome || 0) ||
    taxes !== (initialFinancials?.operatingExpenseTaxes || 0) ||
    insurance !== (initialFinancials?.operatingExpenseInsurance || 0) ||
    hoa !== (initialFinancials?.monthlyHOA || 0) ||
    maintenance !== (initialFinancials?.monthlyMaintenanceReserve || 0) ||
    vacancyRate !== (initialFinancials?.vacancyRatePercent || 5) ||
    managementFee !== (initialFinancials?.propertyManagementFeePercent || 8) ||
    appreciation !== (initialFinancials?.annualAppreciationPercent || 3);

  /* ── Save Handler ── */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const updatedFinancials: ProjectFinancials = {
        ...initialFinancials,
        purchasePrice,
        financingCashInvested: downPayment,
        projectedRehabCost: rehabCents,
        fixedAcquisitionCosts: closingCosts,
        loanInterestRate: interestRate,
        amortizationYears: amortizationYears,
        monthlyGrossRent: monthlyRent,
        otherMonthlyIncome: otherIncome,
        operatingExpenseTaxes: taxes,
        operatingExpenseInsurance: insurance,
        monthlyHOA: hoa,
        monthlyMaintenanceReserve: maintenance,
        vacancyRatePercent: vacancyRate,
        propertyManagementFeePercent: managementFee,
        annualAppreciationPercent: appreciation,
      };

      await projectsService.updateProject(projectId, { financials: updatedFinancials });
      
      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);

      if (onSaveSuccess) {
        onSaveSuccess(updatedFinancials);
      }
    } catch (error) {
      console.error('Failed to save financials:', error);
      setSaveMessage('Error saving data');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Formatting helpers ── */
  const fmtCurrency = (cents: number) => {
    if (!cents || isNaN(cents)) return '$0';
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  /* ── Calculations ── */
  // Loan / Mortgage
  const loanAmountCents = purchasePrice - downPayment;
  let monthlyMortgagePaymentCents = 0;
  if (loanAmountCents > 0 && interestRate > 0 && amortizationYears > 0) {
    const r = (interestRate / 100) / 12;
    const n = amortizationYears * 12;
    monthlyMortgagePaymentCents = loanAmountCents * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  } else if (loanAmountCents > 0 && interestRate === 0 && amortizationYears > 0) {
    monthlyMortgagePaymentCents = loanAmountCents / (amortizationYears * 12);
  }

  // Income
  const grossMonthlyIncome = monthlyRent + otherIncome;
  
  // Expenses
  const vacancyLoss = grossMonthlyIncome * (vacancyRate / 100);
  const managementCost = grossMonthlyIncome * (managementFee / 100);
  const totalMonthlyOperatingExpenses = taxes + insurance + hoa + maintenance + vacancyLoss + managementCost;

  // NOI & Cash Flow
  const monthlyNOI = grossMonthlyIncome - totalMonthlyOperatingExpenses;
  const annualNOI = monthlyNOI * 12;
  const monthlyCashFlow = monthlyNOI - monthlyMortgagePaymentCents;
  const annualCashFlow = monthlyCashFlow * 12;

  // Investment Returns
  const totalInitialInvestment = downPayment + rehabCents + closingCosts;
  const capRate = purchasePrice > 0 ? (annualNOI / purchasePrice) * 100 : 0;
  const cashOnCash = totalInitialInvestment > 0 ? (annualCashFlow / totalInitialInvestment) * 100 : 0;

  // Total ROI Calculation (Year 1 Estimate)
  // Principal paydown year 1 (approximate)
  let annualPrincipalPaydown = 0;
  if (loanAmountCents > 0 && interestRate > 0) {
     const annualInterest = loanAmountCents * (interestRate / 100);
     annualPrincipalPaydown = (monthlyMortgagePaymentCents * 12) - annualInterest;
     if (annualPrincipalPaydown < 0) annualPrincipalPaydown = 0;
  } else if (interestRate === 0) {
     annualPrincipalPaydown = monthlyMortgagePaymentCents * 12;
  }
  const annualAppreciationCents = purchasePrice * (appreciation / 100);
  const totalYearOneReturn = annualCashFlow + annualPrincipalPaydown + annualAppreciationCents;
  const totalROI = totalInitialInvestment > 0 ? (totalYearOneReturn / totalInitialInvestment) * 100 : 0;

  return (
    <section
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      {/* ── Calculator header ── */}
      <div className="px-8 py-5 flex items-center justify-between gap-4" style={{ background: phaseColor }}>
        <div className="flex items-center gap-3">
          <Calculator className="w-4 h-4" style={{ color: '#FFFFFF' }} aria-hidden="true" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#FFFFFF' }}>
            Rental Property Calculator
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={TrendingUp}
            label="Cash Flow"
            value={fmtCurrency(monthlyCashFlow) + ' /mo'}
            sublabel={`${fmtCurrency(annualCashFlow)} /yr`}
            phaseColor={phaseColor}
          />
          <MetricCard
            icon={Percent}
            label="Cap Rate"
            value={capRate.toFixed(2) + '%'}
            sublabel="Annual NOI / Purchase Price"
            phaseColor={phaseColor}
          />
          <MetricCard
            icon={PiggyBank}
            label="Cash on Cash"
            value={cashOnCash.toFixed(2) + '%'}
            sublabel={`On ${fmtCurrency(totalInitialInvestment)} Invested`}
            phaseColor={phaseColor}
          />
          <MetricCard
            icon={ArrowUpRight}
            label="Total ROI (Yr 1)"
            value={totalROI.toFixed(2) + '%'}
            sublabel="Includes Equity & Appreciation"
            phaseColor={phaseColor}
          />
        </div>

        {/* ── Input Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Property & Purchase */}
          <div className="flex flex-col gap-8 h-full">
            <InputSection icon={Home} title="Property & Purchase" description="Acquisition details" phaseColor={phaseColor}>
              <div className="flex flex-col gap-4">
                <CurrencyInputModule 
                  label="Purchase Price"
                  initialValue={purchasePrice} 
                  onChange={setPurchasePrice}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <CurrencyInputModule 
                  label="Down Payment / Cash"
                  initialValue={downPayment} 
                  onChange={setDownPayment}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <CurrencyInputModule 
                  label="Estimated Repairs"
                  initialValue={rehabCents} 
                  onChange={setRehabCents}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <CurrencyInputModule 
                  label="Closing Costs"
                  initialValue={closingCosts} 
                  onChange={setClosingCosts}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
              </div>
            </InputSection>
            
            <InputSection icon={Landmark} title="Financing" description="Loan terms" phaseColor={phaseColor}>
               <div className="flex flex-col gap-4">
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Interest Rate (%)</label>
                    <input
                      type="number"
                      value={interestRate === 0 ? '' : interestRate}
                      onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                      disabled={readOnly}
                      placeholder="0"
                      step="0.01"
                      className="w-full bg-transparent text-xl font-bold placeholder-opacity-30 focus:outline-none"
                      style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Amortization (Years)</label>
                    <input
                      type="number"
                      value={amortizationYears === 0 ? '' : amortizationYears}
                      onChange={(e) => setAmortizationYears(parseInt(e.target.value) || 0)}
                      disabled={readOnly}
                      placeholder="30"
                      className="w-full bg-transparent text-xl font-bold placeholder-opacity-30 focus:outline-none"
                      style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                    />
                 </div>
                 <div className="mt-2 pt-4 flex items-center justify-between" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Monthly P&I</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(monthlyMortgagePaymentCents)}</span>
                </div>
               </div>
            </InputSection>
          </div>

          {/* Column 2: Income & Assumptions */}
          <div className="flex flex-col gap-8 h-full">
            <InputSection icon={DollarSign} title="Income" description="Monthly revenue" phaseColor={phaseColor}>
              <div className="flex flex-col gap-4">
                <CurrencyInputModule 
                  label="Monthly Rent"
                  initialValue={monthlyRent} 
                  onChange={setMonthlyRent}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <CurrencyInputModule 
                  label="Other Income"
                  initialValue={otherIncome} 
                  onChange={setOtherIncome}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <div className="mt-2 pt-4 flex items-center justify-between" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Gross Monthly Income</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: phaseColor }}>{fmtCurrency(grossMonthlyIncome)}</span>
                </div>
              </div>
            </InputSection>

            <InputSection icon={Settings} title="Assumptions" description="Variables & Reserves" phaseColor={phaseColor}>
              <div className="flex flex-col gap-4">
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Vacancy Rate (%)</label>
                    <input
                      type="number"
                      value={vacancyRate === 0 ? '' : vacancyRate}
                      onChange={(e) => setVacancyRate(parseFloat(e.target.value) || 0)}
                      disabled={readOnly}
                      placeholder="5"
                      step="0.1"
                      className="w-full bg-transparent text-xl font-bold placeholder-opacity-30 focus:outline-none"
                      style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Management Fee (%)</label>
                    <input
                      type="number"
                      value={managementFee === 0 ? '' : managementFee}
                      onChange={(e) => setManagementFee(parseFloat(e.target.value) || 0)}
                      disabled={readOnly}
                      placeholder="8"
                      step="0.1"
                      className="w-full bg-transparent text-xl font-bold placeholder-opacity-30 focus:outline-none"
                      style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--text-secondary)' }}>Annual Appreciation (%)</label>
                    <input
                      type="number"
                      value={appreciation === 0 ? '' : appreciation}
                      onChange={(e) => setAppreciation(parseFloat(e.target.value) || 0)}
                      disabled={readOnly}
                      placeholder="3"
                      step="0.1"
                      className="w-full bg-transparent text-xl font-bold placeholder-opacity-30 focus:outline-none"
                      style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)', paddingBottom: '4px' }}
                    />
                 </div>
              </div>
            </InputSection>
          </div>

          {/* Column 3: Expenses & NOI */}
          <div className="flex flex-col gap-8 h-full">
            <InputSection icon={Building} title="Operating Expenses" description="Monthly Fixed & Variable" phaseColor={phaseColor}>
              <div className="flex flex-col gap-4">
                <CurrencyInputModule 
                  label="Property Taxes"
                  initialValue={taxes} 
                  onChange={setTaxes}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <CurrencyInputModule 
                  label="Insurance"
                  initialValue={insurance} 
                  onChange={setInsurance}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <CurrencyInputModule 
                  label="HOA Fees"
                  initialValue={hoa} 
                  onChange={setHoa}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                <CurrencyInputModule 
                  label="Maintenance / Repairs"
                  initialValue={maintenance} 
                  onChange={setMaintenance}
                  phaseColor={phaseColor}
                  readOnly={readOnly}
                />
                
                <div className="mt-2 pt-4 flex flex-col gap-3" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Vacancy Loss</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtCurrency(vacancyLoss)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Management Fee</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtCurrency(managementCost)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px dashed var(--border-ui)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-primary)' }}>Total OpEx</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(totalMonthlyOperatingExpenses)}</span>
                  </div>
                </div>
              </div>
            </InputSection>

            {/* NOI Results Block */}
            <div 
              className="rounded-lg p-6 flex flex-col justify-between shadow-sm flex-1" 
              style={{ background: phaseColor, color: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)' }}
            >
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-90 mb-1">Monthly NOI</h3>
                <p className="text-3xl font-bold tabular-nums tracking-tight">{fmtCurrency(monthlyNOI)}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-90 mb-1">Annual NOI</h3>
                <p className="text-xl font-medium tabular-nums tracking-tight">{fmtCurrency(annualNOI)}</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
