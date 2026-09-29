'use client';

import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import type {
  ProjectWorkspace,
  DebtServiceHoldDetails,
  PropertyTaxHoldDetails,
  InsuranceHoldDetails,
  UtilityHoldItem,
  HoaHoldDetails,
  CapExHoldItem,
  BookkeepingVarianceSummary,
} from '@/lib/projects/types';
import AssignOrInviteModal, { type AssigneeOption } from '../AssignOrInviteModal';
import VendorMarketplaceSuggestions from '../fund/VendorMarketplaceSuggestions';
import TeamTierUpgradeModal from '../fund/TeamTierUpgradeModal';

export interface HoldFinancialCarryingTasksProps {
  project: ProjectWorkspace;
  debtService: DebtServiceHoldDetails;
  onUpdateDebtService: (details: DebtServiceHoldDetails) => void;
  propertyTax: PropertyTaxHoldDetails;
  onUpdatePropertyTax: (details: PropertyTaxHoldDetails) => void;
  insurance: InsuranceHoldDetails;
  onUpdateInsurance: (details: InsuranceHoldDetails) => void;
  utilities: UtilityHoldItem[];
  onUpdateUtilities: (utilities: UtilityHoldItem[]) => void;
  hoa: HoaHoldDetails;
  onUpdateHoa: (hoa: HoaHoldDetails) => void;
  capexItems: CapExHoldItem[];
  onUpdateCapexItems: (items: CapExHoldItem[]) => void;
  bookkeepingSummary: BookkeepingVarianceSummary;
  onUpdateBookkeepingSummary: (summary: BookkeepingVarianceSummary) => void;
  userTier?: string;
  propertyState?: string;
  activeRoster?: AssigneeOption[];
  onUpdateProject?: (updated: ProjectWorkspace) => void;
}

export default function HoldFinancialCarryingTasks({
  project,
  debtService,
  onUpdateDebtService,
  propertyTax,
  onUpdatePropertyTax,
  insurance,
  onUpdateInsurance,
  utilities,
  onUpdateUtilities,
  hoa,
  onUpdateHoa,
  capexItems,
  onUpdateCapexItems,
  bookkeepingSummary,
  onUpdateBookkeepingSummary,
  userTier = 'Investment Team',
  propertyState = 'TX',
  activeRoster = [],
  onUpdateProject,
}: HoldFinancialCarryingTasksProps) {
  const isTeamTier = userTier.toLowerCase().includes('team') || userTier.toLowerCase().includes('enterprise');

  // Modal states
  const [activeVendorTrade, setActiveVendorTrade] = useState<string | null>(null);
  const [vendorTaskTitle, setVendorTaskTitle] = useState<string>('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeTaskTitle, setUpgradeTaskTitle] = useState('');
  const [assignModalTask, setAssignModalTask] = useState<{ id: string; title: string; currentAssignee?: string } | null>(null);

  const handleOpenAssign = (taskKey: string, taskTitle: string, currentAssignee?: string) => {
    if (!isTeamTier) {
      setUpgradeTaskTitle(taskTitle);
      setIsUpgradeModalOpen(true);
      return;
    }
    setAssignModalTask({ id: taskKey, title: taskTitle, currentAssignee });
  };

  const handleOpenVendor = (trade: string, taskTitle: string) => {
    setActiveVendorTrade(trade);
    setVendorTaskTitle(taskTitle);
  };

  // Calculations
  const grossRent = Number(project.underwriting?.rentRoll?.grossScheduledRent || 3800);
  const totalMonthlyUtilities = utilities.reduce((acc, u) => acc + (u.meterActive ? u.monthlyBudget : 0), 0);
  const totalMonthlyDebtAndHolding =
    debtService.monthlyPayment +
    propertyTax.monthlyEscrowAmount +
    insurance.monthlyPremium +
    totalMonthlyUtilities +
    (hoa.hasHoa ? hoa.monthlyDues : 0);

  const nonDebtOperatingBurn =
    propertyTax.monthlyEscrowAmount +
    insurance.monthlyPremium +
    totalMonthlyUtilities +
    (hoa.hasHoa ? hoa.monthlyDues : 0);

  const operatingRatioPct = grossRent > 0 ? (nonDebtOperatingBurn / grossRent) * 100 : 0;
  const isFiftyPercentPass = operatingRatioPct <= 50;

  const totalCapitalizedAmount = capexItems.reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="space-y-6" data-testid="hold-financial-carrying-tasks">
      {/* Pillar Header Card */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 font-bold uppercase rounded-none">
                Pillar 02: Financial Management & Carrying Costs
              </span>
              <span className="text-xs font-mono text-neutral-400">7 Core Activities</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              Debt Service, Taxes, Insurance & Operating Cash Burn
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Maintain loan payments, appeal unfair tax assessments, transition builder's risk to landlord insurance, and audit the 50% Rule.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-right rounded-none">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Total Monthly Burn</span>
              <span className="text-xs font-bold font-mono text-white">{formatCurrency(totalMonthlyDebtAndHolding)}/mo</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-right rounded-none">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">50% Rule Status</span>
              <span className={`text-xs font-bold font-mono uppercase ${isFiftyPercentPass ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isFiftyPercentPass ? 'PASS (≤ 50%)' : 'WARNING (> 50%)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task 8: Debt Service Payments */}
      <section
        data-testid="task-card-debt-service"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Activity 08</span>
              <span className="text-xs font-bold text-white">Debt Service Payments</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Maintain regular monthly mortgage payments (interest-only or principal and interest) on acquisition or construction loans.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('debt-service', 'Debt Service Payments')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Bookkeeper
          </button>
        </div>

        <div className="border-l-2 border-emerald-400 bg-emerald-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-emerald-300 font-semibold block mb-0.5">Why this matters:</strong>
          Missing a debt service payment incurs default interest penalties (often 18%+) and can trigger foreclosure acceleration.
          <span className="block mt-1 font-mono text-[11px] text-emerald-200">
            PaperWorking Benchmark: Bridge and rehab loans are often interest-only (I/O) during construction, switching to principal and interest (P&I) upon stabilization.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Monthly Payment ($)</label>
            <input
              type="number"
              min="0"
              step="50"
              value={debtService.monthlyPayment}
              onChange={(e) => onUpdateDebtService({ ...debtService, monthlyPayment: Number(e.target.value) })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Structure</label>
            <select
              value={debtService.paymentType}
              onChange={(e) => onUpdateDebtService({ ...debtService, paymentType: e.target.value as any })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
            >
              <option value="interest_only">Interest-Only (Rehab Period)</option>
              <option value="principal_and_interest">Principal & Interest (Amortized)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Lender / Servicer</label>
            <input
              type="text"
              value={debtService.lenderName}
              onChange={(e) => onUpdateDebtService({ ...debtService, lenderName: e.target.value })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Due Day / Autopay</label>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-neutral-300 font-mono">Day {debtService.dueDay} of Month</span>
              <button
                type="button"
                onClick={() => onUpdateDebtService({ ...debtService, autopayEnabled: !debtService.autopayEnabled })}
                className={`min-h-[36px] px-2 py-1 text-[10px] uppercase font-mono font-bold rounded-none border ${
                  debtService.autopayEnabled
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                }`}
              >
                {debtService.autopayEnabled ? 'Autopay Active' : 'Manual Remit'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Task 9: Property Tax Management */}
      <section
        data-testid="task-card-property-tax"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Activity 09</span>
              <span className="text-xs font-bold text-white">Property Tax Management</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Monitor, budget for, and pay local property taxes, including appealing unfair assessments if necessary.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenVendor('Tax Consultant', 'Property Tax Assessment Appeal')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Request Tax Protest Consultant
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssign('taxes', 'Property Tax Management')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Assign Tax Specialist
            </button>
          </div>
        </div>

        <div className="border-l-2 border-emerald-400 bg-emerald-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-emerald-300 font-semibold block mb-0.5">Why this matters:</strong>
          Municipal tax assessments can spike after acquisition. Protesting an unfair valuation can save thousands in annual carrying burn.
          <span className="block mt-1 font-mono text-[11px] text-emerald-200">
            PaperWorking Benchmark: Property taxes accrue daily. File an annual protest in jurisdictions where assessed value exceeds purchase price.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">County Parcel ID</label>
            <input
              type="text"
              value={propertyTax.countyParcelId}
              onChange={(e) => onUpdatePropertyTax({ ...propertyTax, countyParcelId: e.target.value })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Annual Tax ($)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={propertyTax.annualTaxAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdatePropertyTax({
                  ...propertyTax,
                  annualTaxAmount: val,
                  monthlyEscrowAmount: Math.round(val / 12),
                });
              }}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Monthly Escrow ($)</label>
            <input
              type="number"
              disabled
              value={propertyTax.monthlyEscrowAmount}
              className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-base md:text-xs text-neutral-400 font-mono rounded-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Appeal Status</label>
            <select
              value={propertyTax.appealStatus}
              onChange={(e) => onUpdatePropertyTax({ ...propertyTax, appealStatus: e.target.value as any })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
            >
              <option value="not_applicable">No Appeal Required</option>
              <option value="under_appeal">Protest Under Appeal</option>
              <option value="assessment_reduced">Assessment Reduced (Won)</option>
              <option value="appeal_denied">Appeal Denied</option>
            </select>
          </div>
        </div>
      </section>

      {/* Task 10: Insurance Maintenance */}
      <section
        data-testid="task-card-insurance"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Activity 10</span>
              <span className="text-xs font-bold text-white">Insurance Maintenance</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Secure and maintain builder's risk insurance during renovations, transitioning to landlord/commercial property insurance upon completion.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenVendor('Insurance', 'Builder Risk to Landlord DP-3 Transition')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Request Insurance Broker
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssign('insurance', 'Insurance Maintenance')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Assign Risk Officer
            </button>
          </div>
        </div>

        <div className="border-l-2 border-emerald-400 bg-emerald-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-emerald-300 font-semibold block mb-0.5">Why this matters:</strong>
          Standard homeowners or landlord policies deny claims for vacant buildings undergoing major construction. Builder's risk is mandatory during rehab.
          <span className="block mt-1 font-mono text-[11px] text-emerald-200">
            PaperWorking Benchmark: Maintain Builder's Risk throughout construction; bind a Landlord DP-3 policy with 15% to 20% landlord premium at substantial completion.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Active Policy</label>
            <select
              value={insurance.policyType}
              onChange={(e) => onUpdateInsurance({ ...insurance, policyType: e.target.value as any })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
            >
              <option value="builders_risk">Builder's Risk Policy (Under Renovation)</option>
              <option value="landlord_dp3">Landlord DP-3 Policy (Stabilized Rental)</option>
              <option value="commercial_property">Commercial Property Policy</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Carrier</label>
            <input
              type="text"
              value={insurance.carrier}
              onChange={(e) => onUpdateInsurance({ ...insurance, carrier: e.target.value })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Monthly Premium ($)</label>
            <input
              type="number"
              min="0"
              step="25"
              value={insurance.monthlyPremium}
              onChange={(e) => onUpdateInsurance({ ...insurance, monthlyPremium: Number(e.target.value) })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Coverage Limit ($)</label>
            <input
              type="number"
              min="50000"
              step="10000"
              value={insurance.coverageLimit}
              onChange={(e) => onUpdateInsurance({ ...insurance, coverageLimit: Number(e.target.value) })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
            />
          </div>
        </div>
      </section>

      {/* Task 11: Utility Management */}
      <section
        data-testid="task-card-utilities"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Activity 11</span>
              <span className="text-xs font-bold text-white">Utility Management</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Pay for holding-period utilities (electricity, water, gas, trash) required to keep the site operational and safe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('utilities', 'Utility Management')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Property Assistant
          </button>
        </div>

        <div className="border-l-2 border-emerald-400 bg-emerald-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-emerald-300 font-semibold block mb-0.5">Why this matters:</strong>
          Unheated pipes freeze and burst in winter, while power outages halt contractor tools. Keeping construction accounts active prevents project shutdowns.
          <span className="block mt-1 font-mono text-[11px] text-emerald-200">
            PaperWorking Benchmark: Maintain active electricity, water/sewer, and commercial dumpster accounts under the property entity name.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {utilities.map((u) => (
            <div
              key={u.id}
              className="border border-neutral-800 bg-neutral-900/60 p-3 text-xs rounded-none"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white capitalize">{u.type.replace('_', ' ')}</span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = utilities.map((x) => (x.id === u.id ? { ...x, meterActive: !x.meterActive } : x));
                    onUpdateUtilities(updated);
                  }}
                  className={`min-h-[36px] px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-none border ${
                    u.meterActive
                      ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {u.meterActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">{u.provider}</p>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Acct: {u.accountNumber}</p>
              <div className="mt-2 text-right font-mono font-bold text-white">
                {formatCurrency(u.monthlyBudget)}/mo
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Task 12: HOA/COA Fee Compliance */}
      <section
        data-testid="task-card-hoa"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Activity 12</span>
              <span className="text-xs font-bold text-white">HOA/COA Fee Compliance</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Remit ongoing dues to homeowners or condo associations if the property resides within a governed community.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('hoa', 'HOA/COA Fee Compliance')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Team Member
          </button>
        </div>

        <div className="border-l-2 border-emerald-400 bg-emerald-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-emerald-300 font-semibold block mb-0.5">Why this matters:</strong>
          Unpaid HOA dues result in priority statutory assessment liens that cloud title and threaten foreclosure. Unapproved exterior changes trigger heavy fines.
          <span className="block mt-1 font-mono text-[11px] text-emerald-200">
            PaperWorking Benchmark: Obtain Architectural Review Committee (ARC) approval for exterior paint, roof shingles, or siding prior to installation.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Community Type</label>
            <select
              value={hoa.hasHoa ? 'yes' : 'no'}
              onChange={(e) => onUpdateHoa({ ...hoa, hasHoa: e.target.value === 'yes' })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
            >
              <option value="no">Standalone (No HOA/COA)</option>
              <option value="yes">Governed HOA / Condo Association</option>
            </select>
          </div>
          {hoa.hasHoa && (
            <>
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Association Name</label>
                <input
                  type="text"
                  value={hoa.associationName || ''}
                  onChange={(e) => onUpdateHoa({ ...hoa, associationName: e.target.value })}
                  className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Monthly Dues ($)</label>
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={hoa.monthlyDues}
                  onChange={(e) => onUpdateHoa({ ...hoa, monthlyDues: Number(e.target.value) })}
                  className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">ARC Approval</label>
                <select
                  value={hoa.arcApprovalStatus || 'approved'}
                  onChange={(e) => onUpdateHoa({ ...hoa, arcApprovalStatus: e.target.value as any })}
                  className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
                >
                  <option value="approved">ARC Approved</option>
                  <option value="pending_submission">Pending Submission</option>
                  <option value="under_review">Under Review</option>
                  <option value="not_required">Not Required</option>
                </select>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Task 13: Capital Expenditure (CapEx) Tracking */}
      <section
        data-testid="task-card-capex"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Activity 13</span>
              <span className="text-xs font-bold text-white">Capital Expenditure (CapEx) Tracking</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Account for and capitalize major improvement expenses for tax and depreciation purposes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('capex', 'Capital Expenditure (CapEx) Tracking')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign CPA / Tax Lead
          </button>
        </div>

        <div className="border-l-2 border-emerald-400 bg-emerald-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-emerald-300 font-semibold block mb-0.5">Why this matters:</strong>
          IRS rules distinguish between routine repairs (deducted immediately) and capital improvements (depreciated over 27.5 years). Proper tracking maximizes tax sheltering.
          <span className="block mt-1 font-mono text-[11px] text-emerald-200">
            PaperWorking Benchmark: Roof replacements, new HVAC units, and structural additions must be capitalized on your asset depreciation schedule.
          </span>
        </div>

        <div className="space-y-2">
          {capexItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none"
            >
              <div>
                <span className="font-bold text-white">{item.title}</span>
                <p className="text-[11px] text-neutral-400 mt-0.5 capitalize">
                  Category: {item.category.replace('_', ' ')} | Recovery Life: {item.recoveryYears} Years
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-white block">{formatCurrency(item.amount)}</span>
                <span className="inline-block mt-0.5 border border-emerald-600 bg-emerald-950/40 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 uppercase rounded-none">
                  Capitalized for Tax
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Task 14: Bookkeeping and Cash Flow Monitoring */}
      <section
        data-testid="task-card-bookkeeping"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Activity 14</span>
              <span className="text-xs font-bold text-white">Bookkeeping & Cash Flow Monitoring</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Track all holding costs against the initial investment budget to prevent cost overruns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('bookkeeping', 'Bookkeeping & Cash Flow Monitoring')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Lead Underwriter
          </button>
        </div>

        <div className="border-l-2 border-emerald-400 bg-emerald-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-emerald-300 font-semibold block mb-0.5">Why this matters:</strong>
          Carrying cost creep is the silent deal killer. Tracking daily burn and 50% Rule operating headroom keeps the investment solvent.
          <span className="block mt-1 font-mono text-[11px] text-emerald-200">
            PaperWorking Benchmark: Non-debt operating expenses should not exceed 50% of gross scheduled rent. 180 days is the standard fix-and-flip holding cap.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Initial Holding Budget</span>
            <div className="mt-1 font-mono font-bold text-white text-sm">
              {formatCurrency(bookkeepingSummary.initialHoldingBudget)}
            </div>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Actual Holding Spend</span>
            <div className="mt-1 font-mono font-bold text-amber-400 text-sm">
              {formatCurrency(bookkeepingSummary.actualHoldingSpend)}
            </div>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">50% Rule Ratio</span>
            <div className={`mt-1 font-mono font-bold text-sm ${isFiftyPercentPass ? 'text-emerald-400' : 'text-amber-400'}`}>
              {operatingRatioPct.toFixed(1)}% of Gross Rent
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Marketplace Modal */}
      {activeVendorTrade && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-2xl border border-neutral-800 bg-[#0c0c0c] p-6 text-neutral-100 rounded-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Licensed Professional Assistance</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Requesting {activeVendorTrade} for: {vendorTaskTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVendorTrade(null)}
                className="min-h-[44px] min-w-[44px] text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <VendorMarketplaceSuggestions
              taskTitle={vendorTaskTitle}
              requiredTrade={activeVendorTrade}
              propertyState={propertyState}
              onAssignVendor={() => setActiveVendorTrade(null)}
            />
          </div>
        </div>
      )}

      {/* Team Member Assignment Modal */}
      {assignModalTask && (
        <AssignOrInviteModal
          isOpen={true}
          projectId={project.id}
          projectName={project.propertyName || project.address}
          task={{
            id: assignModalTask.id,
            title: assignModalTask.title,
            assignedTo: assignModalTask.currentAssignee,
            phase: 'hold',
          }}
          currentAssignee={assignModalTask.currentAssignee}
          existingMembers={activeRoster}
          userTier={userTier}
          propertyState={propertyState}
          onClose={() => setAssignModalTask(null)}
          onAssignExisting={(_taskIdOrPhaseKey, _assigneeName) => {
            setAssignModalTask(null);
          }}
          onMemberInvitedAndAssigned={(newMember: AssigneeOption) => {
            if (onUpdateProject) {
              const current = (project.teamMembers || []) as AssigneeOption[];
              onUpdateProject({ ...project, teamMembers: [...current, newMember] });
            }
            setAssignModalTask(null);
          }}
        />
      )}

      {/* Team Tier Upgrade Modal */}
      <TeamTierUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={userTier}
        targetTaskTitle={upgradeTaskTitle}
        onSwitchToVendors={() => {
          setIsUpgradeModalOpen(false);
          setActiveVendorTrade('Tax Consultant');
          setVendorTaskTitle(upgradeTaskTitle);
        }}
      />
    </div>
  );
}
