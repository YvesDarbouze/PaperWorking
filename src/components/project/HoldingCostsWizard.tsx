'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HelpCircle, Sparkles, Check, ArrowLeft, ArrowRight, DollarSign, Info, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
  financials: any;
  onSaveCategory: (category: string, amount: number) => Promise<void>;
  onAllCompleted: () => void;
}

interface RecurringProposal {
  id: string;
  category: string;
  merchant: string;
  amount: number; // cents
  frequency: string;
}

const PLAID_RECURRING_PROPOSALS: RecurringProposal[] = [
  { id: 'rec-001', category: 'tax', merchant: 'County Tax Collector', amount: 35000, frequency: 'Monthly' },
  { id: 'rec-002', category: 'insurance', merchant: 'Liberty Mutual', amount: 12500, frequency: 'Monthly' },
  { id: 'rec-003', category: 'security', merchant: 'ADT Security', amount: 3500, frequency: 'Monthly' },
  { id: 'rec-004', category: 'maintenance', merchant: 'Local Landscaping Co', amount: 7500, frequency: 'Monthly' },
  { id: 'rec-005', category: 'utilities', merchant: 'Con Edison', amount: 18500, frequency: 'Monthly' },
  { id: 'rec-006', category: 'management', merchant: 'Premier Property PM', amount: 15000, frequency: 'Monthly' },
  { id: 'rec-007', category: 'hoa', merchant: 'Oakridge HOA', amount: 4500, frequency: 'Monthly' },
  { id: 'rec-008', category: 'capex', merchant: 'Reserve Accrual (Sugg.)', amount: 10000, frequency: 'Monthly' }
];

interface StepConfig {
  key: string;
  label: string;
  dbField: string;
  legacyField?: string;
  desc: string;
  guidance: string;
}

const STEPS: StepConfig[] = [
  {
    key: 'tax',
    label: 'Property Tax',
    dbField: 'holding_cost_tax',
    legacyField: 'holdingCostTaxes',
    desc: 'Taxes levied by county/municipal authorities during the hold period.',
    guidance: 'Usually calculated by dividing the annual tax assessment by 12.'
  },
  {
    key: 'insurance',
    label: 'Insurance',
    dbField: 'holding_cost_insurance',
    legacyField: 'holdingCostInsurance',
    desc: 'Hazard, liability, and builder risk insurance premium carry.',
    guidance: 'Confirm monthly carry. Pre-filled from the Fund phase annual hazard premium divided by 12.'
  },
  {
    key: 'security',
    label: 'Security',
    dbField: 'holding_cost_security',
    desc: 'Cost of temporary site monitoring, sensors, cameras, and alert systems.',
    guidance: 'Vital to prevent vandalism, copper theft, and unauthorized entries during renovation.'
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    dbField: 'holding_cost_maintenance',
    legacyField: 'holdingCostMaintenance',
    desc: 'Lawn mowing, snow removal, minor repairs, and preservation costs.',
    guidance: 'Crucial for avoiding municipal citations and keeping the asset in presentable condition.'
  },
  {
    key: 'utilities',
    label: 'Utilities',
    dbField: 'holding_cost_utilities',
    legacyField: 'holdingCostUtilities',
    desc: 'Electricity, water, gas, internet, and trash carry during renovation.',
    guidance: 'Utilities must remain active for HVAC systems, contractors, and staging.'
  },
  {
    key: 'management',
    label: 'Management',
    dbField: 'holding_cost_management',
    legacyField: 'holdingCostManagement',
    desc: 'Monthly project/property management administrative fees.',
    guidance: 'Fees paid to general contractors, project managers, or rental managers during hold.'
  },
  {
    key: 'hoa',
    label: 'HOA Fees',
    dbField: 'holding_cost_hoa',
    legacyField: 'hoaMonthly',
    desc: 'Monthly homeowner association or condominium fees.',
    guidance: 'Unavoidable monthly fee if the property is located in an HOA subdivision.'
  },
  {
    key: 'capex',
    label: 'CapEx Reserve',
    dbField: 'holding_cost_capex',
    desc: 'Proactive reserve set aside for future major replacements (roof, HVAC).',
    guidance: 'Setting a monthly reserve protects your target margin from unexpected equipment failures.'
  }
];

export function HoldingCostsWizard({ projectId, financials, onSaveCategory, onAllCompleted }: Props) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const step = STEPS[currentStepIdx];

  // Derive Loan Carry
  const loanAmount = financials?.loanAmount || 0;
  const loanRate = financials?.loanRate || 0;
  const loanTermMonths = financials?.loanTermMonths || 0;
  const annualDebtService = financials?.annualDebtService || 0;

  const monthlyCarry = useMemo(() => {
    if (annualDebtService > 0) return annualDebtService / 12;
    // Calculate simple amortization
    if (loanAmount > 0 && loanTermMonths > 0) {
      const monthlyRate = (loanRate / 100) / 12;
      if (monthlyRate === 0) return loanAmount / loanTermMonths;
      return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) / (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
    }
    return 0;
  }, [annualDebtService, loanAmount, loanRate, loanTermMonths]);

  // Load existing database value or handle insurance F4.4 pre-fill
  useEffect(() => {
    const dbValue = financials?.[step.dbField] ?? financials?.[step.legacyField || ''];
    if (dbValue !== undefined && dbValue !== null) {
      setInputValue((dbValue / 100).toString());
    } else if (step.key === 'insurance' && financials?.insuranceCost) {
      // F4.4 Insurance Pre-fill confirmation
      const prefilledVal = Math.round(financials.insuranceCost / 12);
      setInputValue((prefilledVal / 100).toString());
      toast.success('Pre-filled monthly insurance premium from F4.4 annual quote!');
    } else {
      setInputValue('');
    }
  }, [currentStepIdx, financials, step]);

  const proposal = PLAID_RECURRING_PROPOSALS.find(p => p.category === step.key);

  const handleApplyProposal = () => {
    if (proposal) {
      setInputValue((proposal.amount / 100).toString());
      toast.success(`Applied Plaid proposed cost from ${proposal.merchant}`);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseFloat(inputValue.replace(/,/g, ''));
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveCategory(step.key, Math.round(parsed * 100));
      if (currentStepIdx < STEPS.length - 1) {
        setCurrentStepIdx(currentStepIdx + 1);
      } else {
        onAllCompleted();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  return (
    <div className="glass-card border border-white/5 rounded-xl p-5 space-y-5 text-left">
      {/* Header and Step Indicators */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-wider">
            Holding Costs Setup · Step {currentStepIdx + 1} of {STEPS.length}
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">
            {step.label} Cost
          </h3>
        </div>
        {/* Loan Carry Display (derived, read-only) */}
        <div className="bg-white/5 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/5 text-right font-mono">
          <Calculator className="w-3.5 h-3.5 text-[#7A9EAA]" />
          <div>
            <p className="text-[8px] text-[#9E9DA0] uppercase font-bold">Monthly Debt Carry</p>
            <p className="text-xs font-bold text-white">${(monthlyCarry / 100).toFixed(2)}/mo</p>
          </div>
        </div>
      </div>

      {/* Description & Cost Guidance */}
      <div className="space-y-3 bg-[#454955]/10 border border-[#454955]/20 p-4 rounded-xl">
        <p className="text-xs text-white leading-relaxed">{step.desc}</p>
        <p className="text-[10px] text-[#9E9DA0] leading-normal flex items-start gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-[#7A9EAA] shrink-0 mt-0.5" />
          <span>{step.guidance}</span>
        </p>
      </div>

      {/* Dynamic Plaid Proposals Section */}
      {proposal && (
        <div className="border border-[#7A9EAA]/30 bg-[#7A9EAA]/5 p-3 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7A9EAA] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7A9EAA]"></span>
            </span>
            <div className="text-[10px] text-[#9E9DA0]">
              <span className="font-bold text-[#7A9EAA]">Plaid Cost Proposal:</span> Found recurring bill of{' '}
              <strong className="text-white">${(proposal.amount / 100).toFixed(2)}/mo</strong> from{' '}
              <strong className="text-white">{proposal.merchant}</strong>
            </div>
          </div>
          <button
            onClick={handleApplyProposal}
            type="button"
            className="text-[9px] font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-2 py-1 rounded transition shrink-0 flex items-center gap-0.5"
          >
            <Check className="w-3 h-3" /> Pre-fill
          </button>
        </div>
      )}

      {/* Main input form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Monthly Cost Amount ($)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9E9DA0]">
              $
            </div>
            <input
              type="text"
              required
              placeholder="e.g. 150.00"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white w-full outline-none font-mono"
            />
          </div>
        </div>

        {/* Wizard Controls */}
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1 ${
              currentStepIdx === 0
                ? 'text-[#9E9DA0]/40 cursor-not-allowed'
                : 'text-[#9E9DA0] hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="text-xs font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-4 py-2 rounded-lg transition flex items-center gap-1 shadow-md"
          >
            {isSaving
              ? 'Saving...'
              : currentStepIdx === STEPS.length - 1
              ? 'Confirm & Finish'
              : 'Save & Next'}{' '}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
