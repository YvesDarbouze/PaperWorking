'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import type { HoldingCostItem, HoldingCostCategory, ProjectWorkspace } from '@/lib/projects/types';

interface CarryingCostsLedgerCardProps {
  project: ProjectWorkspace;
  holdingCosts: HoldingCostItem[];
  onUpdateHoldingCosts: (costs: HoldingCostItem[]) => void;
  isSelfManaged: boolean;
  onToggleSelfManaged: (selfManaged: boolean) => void;
  propertyManagementFeePct: number;
  onChangeManagementFeePct: (pct: number) => void;
}

export const HOLDING_PILLAR_DEFINITIONS: Record<
  HoldingCostCategory,
  {
    title: string;
    description: string;
    benchmarkRule: string;
  }
> = {
  piti_debt_service: {
    title: 'Principal & Interest Debt Service',
    description: 'Monthly loan payment or interest-only construction bridge debt service.',
    benchmarkRule: 'Determined by loan amount, locked rate, and amortization structure.',
  },
  piti_property_taxes: {
    title: 'Property Taxes Escrow',
    description: 'County and municipal real estate ad valorem taxes held in escrow.',
    benchmarkRule: 'Typically 1.0% to 2.5% of assessed property value annually depending on county.',
  },
  piti_insurance: {
    title: 'Landlord Hazard & Liability Insurance',
    description: 'DP-3 landlord insurance policy protecting building, premises liability, and loss of rent.',
    benchmarkRule: 'Landlord policies typically cost 15% to 20% more than standard homeowner policies.',
  },
  maintenance_repairs: {
    title: 'Routine Maintenance & Repairs',
    description: 'Day-to-day upkeep including pest control, landscaping, and unexpected service calls.',
    benchmarkRule: 'Rule of thumb: 1% of the property value per year budgeted for maintenance.',
  },
  capex_reserves: {
    title: 'CapEx Reserves',
    description: 'Funds set aside for large long-term replacements: roof, HVAC heat pump, appliances.',
    benchmarkRule: 'Rule of thumb: Reserve 5% to 10% of gross rental income for CapEx.',
  },
  vacancy_buffer: {
    title: 'Vacancy & Turnover Buffer',
    description: 'Carrying reserve for uncollected rent and make-ready turnover costs between leases.',
    benchmarkRule: 'Typically modeled as 5% to 8% vacancy allowance against gross rent.',
  },
  property_management: {
    title: 'Property Management Fees',
    description: 'Professional management oversight for tenant relations, rent collection, and repairs.',
    benchmarkRule: 'Professional managers typically charge between 8% to 12% of collected monthly rent.',
  },
  utilities: {
    title: 'Landlord-Paid Utilities',
    description: 'Electric, gas, water/sewer, and trash paid by owner during turnover or rehab.',
    benchmarkRule: 'Estimated based on local utility tariffs and active meter services.',
  },
  hoa_dues: {
    title: 'HOA & Condo Association Fees',
    description: 'Regular recurring association dues that must be paid regardless of occupancy.',
    benchmarkRule: 'Mandatory recurring fee set by homeowner association bylaws.',
  },
  municipal_fees_taxes: {
    title: 'Local Taxes, Licenses & Municipal Fees',
    description: 'City rental licenses, annual HPD filings, code compliance, and safety inspections.',
    benchmarkRule: 'Jurisdiction-specific annual filings (e.g. NYC HPD registration, Austin rental license).',
  },
};

export default function CarryingCostsLedgerCard({
  project,
  holdingCosts,
  onUpdateHoldingCosts,
  isSelfManaged,
  onToggleSelfManaged,
  propertyManagementFeePct,
  onChangeManagementFeePct,
}: CarryingCostsLedgerCardProps) {
  const propertyPrice = Number(project.purchasePrice || project.purchase_price || 485000);
  const grossRent = Number(project.underwriting?.rentRoll?.grossScheduledRent || 3800);

  // Benchmarks
  const maintenanceAnnualBenchmark = Math.round(propertyPrice * 0.01);
  const maintenanceMonthlyBenchmark = Math.round(maintenanceAnnualBenchmark / 12);
  const capexMinMonthlyBenchmark = Math.round(grossRent * 0.05);
  const capexMaxMonthlyBenchmark = Math.round(grossRent * 0.1);
  const managementCalculatedFee = isSelfManaged ? 0 : Math.round(grossRent * (propertyManagementFeePct / 100));

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState<HoldingCostCategory>('maintenance_repairs');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState(250);
  const [newDueDay, setNewDueDay] = useState(1);
  const [newNotes, setNewNotes] = useState('');

  const totalMonthlyBurn = useMemo(
    () => holdingCosts.reduce((acc, item) => acc + item.monthlyAmount, 0),
    [holdingCosts]
  );
  const dailyCarryingCost = Math.round((totalMonthlyBurn * 12) / 365);
  const annualTotalBurn = totalMonthlyBurn * 12;

  // 50% Rule Calculations
  // Operating expenses exclude senior debt service (Principal & Interest)
  const monthlyOperatingBurn = useMemo(
    () =>
      holdingCosts
        .filter((item) => item.category !== 'piti_debt_service')
        .reduce((acc, item) => acc + item.monthlyAmount, 0),
    [holdingCosts]
  );
  const max50PctOperatingBudget = Math.round(grossRent * 0.5);
  const operatingExpenseRatioPct = grossRent > 0 ? (monthlyOperatingBurn / grossRent) * 100 : 0;
  const isFiftyPercentPass = operatingExpenseRatioPct <= 50;
  const fiftyPercentVariance = max50PctOperatingBudget - monthlyOperatingBurn;

  const handleToggleItemStatus = (id: string) => {
    const updated = holdingCosts.map((item) => {
      if (item.id === id) {
        const nextStatus: HoldingCostItem['status'] =
          item.status === 'paid' ? 'active' : 'paid';
        return { ...item, status: nextStatus };
      }
      return item;
    });
    onUpdateHoldingCosts(updated);
  };

  const handleUpdateAmount = (id: string, amount: number) => {
    const updated = holdingCosts.map((item) => {
      if (item.id === id) {
        return { ...item, monthlyAmount: Math.max(0, amount) };
      }
      return item;
    });
    onUpdateHoldingCosts(updated);
  };

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newAmount <= 0) return;
    const newItem: HoldingCostItem = {
      id: `cc-${Date.now()}`,
      category: newCategory,
      name: newName.trim(),
      frequency: 'monthly',
      monthlyAmount: Number(newAmount),
      dueDay: Number(newDueDay) || 1,
      notes: newNotes.trim() || HOLDING_PILLAR_DEFINITIONS[newCategory].benchmarkRule,
      status: 'active',
    };
    onUpdateHoldingCosts([...holdingCosts, newItem]);
    setNewName('');
    setNewAmount(250);
    setNewNotes('');
    setShowAddModal(false);
  };

  const handleDeleteCost = (id: string) => {
    onUpdateHoldingCosts(holdingCosts.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6" data-testid="carrying-costs-ledger-card">
      {/* Carrying Burn Summary Cards */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              The 8 Core Carrying Cost Pillars
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Operating & Holding Cost Ledger
            </h2>
          </div>
          <button
            type="button"
            data-testid="add-carrying-cost-btn"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] px-4 py-2 border border-neutral-700 bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 transition rounded-none flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Add Carrying Cost Item</span>
          </button>
        </div>

        {/* 3 Burn KPI Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Monthly Carrying Burn</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {formatCurrency(totalMonthlyBurn)}/mo
            </span>
            <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
              {holdingCosts.length} active recurring obligations
            </span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Daily Holding Run Rate</span>
            <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
              {formatCurrency(dailyCarryingCost)}/day
            </span>
            <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
              (Monthly Burn * 12) / 365
            </span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-4 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Annualized Carrying Cost</span>
            <span className="text-xl font-bold font-mono text-neutral-200 mt-1 block">
              {formatCurrency(annualTotalBurn)}/yr
            </span>
            <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
              Baseline holding drag over 12 months
            </span>
          </div>
        </div>

        {/* 50% Rule Guideline Assessment Card */}
        <div
          data-testid="fifty-percent-rule-indicator"
          className="mt-4 pt-4 border-t border-neutral-800 bg-neutral-900/40 p-4 rounded-none space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                  Underwriting Guideline
                </span>
                <span
                  data-testid="fifty-percent-rule-badge"
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold border rounded-none ${
                    isFiftyPercentPass
                      ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                      : 'border-amber-600 bg-amber-950/40 text-amber-300'
                  }`}
                >
                  {isFiftyPercentPass ? 'PASS (≤ 50% Rule)' : 'WARNING (> 50% Rule)'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                50% Rule Operating Expense Ratio Assessment
              </h3>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                Operating Cost Ratio
              </span>
              <span
                data-testid="fifty-percent-ratio-value"
                className={`text-base font-bold font-mono ${
                  isFiftyPercentPass ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {`${operatingExpenseRatioPct.toFixed(1)}% of Gross Rent`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-neutral-800/80 font-mono text-xs">
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">Gross Scheduled Rent</span>
              <span className="text-white font-bold block mt-0.5">{formatCurrency(grossRent)}/mo</span>
            </div>
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">50% Rule Cap (Max OpEx)</span>
              <span className="text-white font-bold block mt-0.5">{formatCurrency(max50PctOperatingBudget)}/mo</span>
            </div>
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">Operating Burn (Non-Debt)</span>
              <span className={`font-bold block mt-0.5 ${isFiftyPercentPass ? 'text-white' : 'text-amber-300'}`}>
                {formatCurrency(monthlyOperatingBurn)}/mo
              </span>
            </div>
            <div className="border border-neutral-800/60 bg-neutral-950/50 p-2.5">
              <span className="text-[10px] text-neutral-400 block uppercase">Operating Headroom</span>
              <span className={`font-bold block mt-0.5 ${fiftyPercentVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fiftyPercentVariance >= 0 ? `+${formatCurrency(fiftyPercentVariance)}/mo` : `-${formatCurrency(Math.abs(fiftyPercentVariance))}/mo`}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {isFiftyPercentPass
              ? 'Operating overhead (property taxes, insurance, maintenance, capex, and management) stays within the 50% guideline, preserving sufficient NOI to service mortgage debt and deliver positive cash yields.'
              : 'Operating expenses exceed 50% of gross scheduled rent. Review line items such as property management, taxes, or utilities to prevent cash flow erosion.'}
          </p>
        </div>

        {/* Rule of Thumb Benchmark Callouts */}
        <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Maintenance 1% Rule */}
          <div className="border border-neutral-800 bg-neutral-900/40 p-3 rounded-none text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Maintenance 1% Rule</span>
              <span className="text-[10px] font-mono text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 rounded-none">
                Benchmark
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              1% of purchase price ({formatCurrency(propertyPrice)}) = <strong className="text-white">{formatCurrency(maintenanceAnnualBenchmark)}/yr</strong> ({formatCurrency(maintenanceMonthlyBenchmark)}/mo).
            </p>
          </div>

          {/* CapEx 5-10% Rule */}
          <div className="border border-neutral-800 bg-neutral-900/40 p-3 rounded-none text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">CapEx 5% - 10% Reserve</span>
              <span className="text-[10px] font-mono text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 rounded-none">
                Benchmark
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              5% to 10% of gross rent ({formatCurrency(grossRent)}) = <strong className="text-white">{formatCurrency(capexMinMonthlyBenchmark)} - {formatCurrency(capexMaxMonthlyBenchmark)}/mo</strong> reserve target.
            </p>
          </div>

          {/* Landlord Policy +15-20% Rule */}
          <div className="border border-neutral-800 bg-neutral-900/40 p-3 rounded-none text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Landlord Insurance (DP-3)</span>
              <span className="text-[10px] font-mono text-amber-300 border border-amber-800 bg-amber-950/40 px-1.5 py-0.5 rounded-none">
                +15% - 20%
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Landlord hazard & liability policies are 15% to 20% higher than standard homeowners insurance.
            </p>
          </div>
        </div>
      </div>

      {/* Property Management Fee Setting Card */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Pillar 5: Property Management Strategy
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Professional Manager vs. Self-Managed
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Benchmark for professional management: 8% to 12% of collected rent.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-neutral-800 bg-neutral-900 p-0.5 rounded-none">
              <button
                type="button"
                data-testid="toggle-self-managed"
                onClick={() => onToggleSelfManaged(true)}
                className={`min-h-[44px] px-3.5 py-1 text-xs font-semibold rounded-none transition ${
                  isSelfManaged ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Self-Managed ($0/mo)
              </button>
              <button
                type="button"
                data-testid="toggle-pro-managed"
                onClick={() => onToggleSelfManaged(false)}
                className={`min-h-[44px] px-3.5 py-1 text-xs font-semibold rounded-none transition ${
                  !isSelfManaged ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Professional (8-12%)
              </button>
            </div>
            {!isSelfManaged && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-400 font-mono">Fee %:</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={propertyManagementFeePct}
                  onChange={(e) => onChangeManagementFeePct(Number(e.target.value))}
                  className="w-16 min-h-[44px] border border-neutral-800 bg-neutral-900 px-2 py-1 text-white font-mono text-xs rounded-none text-right outline-none focus:border-white"
                  aria-label="Property management fee percentage"
                />
                <span className="text-xs font-mono text-neutral-300">
                  ({formatCurrency(managementCalculatedFee)}/mo)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holding Costs Ledger Table */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono mb-4">
          Itemized Carrying Costs & Recurring Obligations
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 pr-4">Obligation Name</th>
                <th className="py-2.5 px-4">Pillar Category</th>
                <th className="py-2.5 px-4 text-center">Due Day</th>
                <th className="py-2.5 px-4 text-right">Monthly Amount</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-200">
              {holdingCosts.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-900/40 transition">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-white">{item.name}</p>
                    {item.notes && <p className="text-[11px] text-neutral-400">{item.notes}</p>}
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-300">
                    <span className="capitalize">
                      {HOLDING_PILLAR_DEFINITIONS[item.category]?.title || item.category.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-neutral-400">
                    Day {item.dueDay ?? 1}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-neutral-400">$</span>
                      <input
                        type="number"
                        min="0"
                        value={item.monthlyAmount}
                        onChange={(e) => handleUpdateAmount(item.id, Number(e.target.value))}
                        className="w-24 min-h-[36px] border border-neutral-800 bg-neutral-900 px-2 py-1 text-white font-mono text-xs text-right rounded-none outline-none focus:border-white"
                        aria-label={`Monthly amount for ${item.name}`}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleItemStatus(item.id)}
                      className={`px-2.5 py-1 text-[10px] font-mono uppercase border rounded-none transition ${
                        item.status === 'paid'
                          ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                          : 'border-amber-600 bg-amber-950/40 text-amber-300'
                      }`}
                    >
                      {item.status}
                    </button>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteCost(item.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-red-400 transition"
                      title="Remove carrying obligation"
                      aria-label={`Remove ${item.name}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Carrying Cost Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleAddCost}
            className="w-full max-w-md border border-neutral-700 bg-neutral-950 p-6 space-y-4 rounded-none shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Add Carrying Cost Obligation</h3>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Holding Pillar Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as HoldingCostCategory)}
                className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
              >
                {Object.entries(HOLDING_PILLAR_DEFINITIONS).map(([key, def]) => (
                  <option key={key} value={key}>
                    {def.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Obligation Name / Payee</label>
              <input
                type="text"
                required
                placeholder="e.g. Travelers Landlord DP-3 Policy"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Monthly Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono text-base sm:text-xs outline-none focus:border-white rounded-none"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Due Day of Month (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newDueDay}
                  onChange={(e) => setNewDueDay(Number(e.target.value))}
                  className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono text-base sm:text-xs outline-none focus:border-white rounded-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Notes / Policy Details</label>
              <input
                type="text"
                placeholder="e.g. Includes loss-of-rents and premises liability endorsements."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[44px] px-4 py-2 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-900 rounded-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 bg-white text-black text-xs font-bold hover:bg-neutral-200 transition rounded-none"
              >
                Add Obligation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
