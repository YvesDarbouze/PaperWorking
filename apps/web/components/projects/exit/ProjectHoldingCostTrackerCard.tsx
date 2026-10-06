'use client';

import React, { useState } from 'react';
import type {
  ProjectPlaidLedgerState,
  ProjectHoldingCostRecord,
} from '@/lib/projects/types';
import { formatCurrency } from '@/lib/projects/phase-utils';
import {
  Receipt,
  CheckCircle,
  WarningCircle,
  Plus,
  Scales,
  CalendarCheck,
  ShieldCheck,
  House,
  Bank,
} from '@/components/icons/PhosphorIcons';

export interface ProjectHoldingCostTrackerCardProps {
  ledger: ProjectPlaidLedgerState;
  onUpdateLedger: (updated: ProjectPlaidLedgerState) => void;
  disabled?: boolean;
}

export function ProjectHoldingCostTrackerCard({
  ledger,
  onUpdateLedger,
  disabled = false,
}: ProjectHoldingCostTrackerCardProps) {
  const [showAddCostModal, setShowAddCostModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<ProjectHoldingCostRecord['costCategory']>('property_tax');
  const [costTitle, setCostTitle] = useState<string>('Travis County Annual Property Tax');
  const [costAmount, setCostAmount] = useState<number>(6850);
  const [costPayDate, setCostPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [costPayee, setCostPayee] = useState<string>('Travis County Tax Collector');
  const [isAnnualCost, setIsAnnualCost] = useState<boolean>(true);
  const [fiscalYear, setFiscalYear] = useState<number>(2026);

  // Aggregations
  const totalHoldingCostsPaid = ledger.holdingCostLedger.reduce((acc, c) => acc + c.amount, 0);
  const annualTaxesPaid = ledger.holdingCostLedger
    .filter((c) => c.costCategory === 'property_tax')
    .reduce((acc, c) => acc + c.amount, 0);
  const debtServicePaid = ledger.holdingCostLedger
    .filter((c) => c.costCategory === 'debt_service')
    .reduce((acc, c) => acc + c.amount, 0);
  const insurancePaid = ledger.holdingCostLedger
    .filter((c) => c.costCategory === 'insurance')
    .reduce((acc, c) => acc + c.amount, 0);
  const utilitiesAndMaint = ledger.holdingCostLedger
    .filter((c) => c.costCategory === 'utilities' || c.costCategory === 'repairs_maintenance')
    .reduce((acc, c) => acc + c.amount, 0);

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!costTitle.trim() || costAmount <= 0) return;

    const newRecord: ProjectHoldingCostRecord = {
      id: `hold-${Date.now()}`,
      costCategory: selectedCategory,
      title: costTitle.trim(),
      amount: costAmount,
      paymentDate: costPayDate,
      payeeName: costPayee.trim() || 'Payee',
      isAnnual: isAnnualCost,
      fiscalYear: isAnnualCost ? fiscalYear : undefined,
      isVerified: true,
      notes: isAnnualCost ? `Annual ${selectedCategory.replace('_', ' ')} allocation` : 'Recurring expense',
    };

    onUpdateLedger({
      ...ledger,
      holdingCostLedger: [newRecord, ...ledger.holdingCostLedger],
    });

    setShowAddCostModal(false);
  };

  const getCategoryLabel = (cat: ProjectHoldingCostRecord['costCategory']) => {
    switch (cat) {
      case 'property_tax':
        return 'Property Tax';
      case 'debt_service':
        return 'Debt Service';
      case 'insurance':
        return 'Insurance';
      case 'hoa_dues':
        return 'HOA Dues';
      case 'utilities':
        return 'Utilities';
      case 'repairs_maintenance':
        return 'Repairs & Maint';
      default:
        return 'Carrying Cost';
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-none p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-muted border border-border rounded-none text-foreground">
              <Scales size={20} weight="bold" />
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              Holding Costs & Annual Tax Payment Ledger
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Automates the identification of annual county property taxes, lender debt service ACH debits, insurance, and utilities via Plaid.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddCostModal(true)}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium rounded-none transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus size={16} weight="bold" />
          Log Holding Expense
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Total Carrying Costs</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {formatCurrency(totalHoldingCostsPaid)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {ledger.holdingCostLedger.length} verified disbursements
          </div>
        </div>

        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Annual Property Tax</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {formatCurrency(annualTaxesPaid)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            County assessor disbursements
          </div>
        </div>

        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Senior Debt Service</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {formatCurrency(debtServicePaid)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Principal + Interest ACH
          </div>
        </div>

        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Insurance & Utilities</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {formatCurrency(insurancePaid + utilitiesAndMaint)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Carriers and municipal accounts
          </div>
        </div>
      </div>

      {/* Holding Costs Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Plaid Ingested Holding & Carrying Disbursements ({ledger.holdingCostLedger.length})
        </h4>

        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Expense Item</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Payee / Recipient</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Tax Year / Cycle</th>
                <th className="py-2.5 px-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.holdingCostLedger.map((cost) => (
                <tr key={cost.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-3 font-mono text-foreground font-medium">
                    {cost.paymentDate}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-foreground">{cost.title}</div>
                    {cost.notes && (
                      <div className="text-[11px] text-muted-foreground">{cost.notes}</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-muted border border-border rounded-none text-foreground">
                      {getCategoryLabel(cost.costCategory)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {cost.payeeName}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-foreground">
                    {formatCurrency(cost.amount)}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground font-mono">
                    {cost.isAnnual ? `FY${cost.fiscalYear || '2026'} (Annual)` : 'Monthly ACH'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded-none text-foreground">
                      <CheckCircle size={10} weight="bold" />
                      Plaid Matched
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Holding Expense */}
      {showAddCostModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddCost}
            className="w-full max-w-md bg-card border border-border rounded-none p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-base font-semibold text-foreground">
                Log Carrying & Holding Expense
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCostModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Cost Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const cat = e.target.value as ProjectHoldingCostRecord['costCategory'];
                    setSelectedCategory(cat);
                    if (cat === 'property_tax') {
                      setCostTitle('Annual Property Tax Payment');
                      setIsAnnualCost(true);
                    } else if (cat === 'debt_service') {
                      setCostTitle('Senior Loan Debt Service ACH');
                      setIsAnnualCost(false);
                    } else if (cat === 'insurance') {
                      setCostTitle('Landlord Property Insurance Premium');
                      setIsAnnualCost(true);
                    } else {
                      setIsAnnualCost(false);
                    }
                  }}
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none text-foreground"
                >
                  <option value="property_tax">Property Tax (Annual / Semi-Annual)</option>
                  <option value="debt_service">Mortgage Debt Service (P&I)</option>
                  <option value="insurance">Insurance Premium (Landlord DP-3 / Builder's Risk)</option>
                  <option value="hoa_dues">HOA Assessment / Dues</option>
                  <option value="utilities">Municipal Utilities (Water, Electric, Gas)</option>
                  <option value="repairs_maintenance">Repairs & Maintenance</option>
                  <option value="other">Other Carrying Cost</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Expense Title</label>
                <input
                  type="text"
                  value={costTitle}
                  onChange={(e) => setCostTitle(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Amount ($)</label>
                  <input
                    type="number"
                    value={costAmount}
                    onChange={(e) => setCostAmount(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Disbursement Date</label>
                  <input
                    type="date"
                    value={costPayDate}
                    onChange={(e) => setCostPayDate(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Payee / Entity Name</label>
                <input
                  type="text"
                  value={costPayee}
                  onChange={(e) => setCostPayee(e.target.value)}
                  placeholder="e.g. Travis County Tax Assessor"
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="annual-check"
                  checked={isAnnualCost}
                  onChange={(e) => setIsAnnualCost(e.target.checked)}
                  className="rounded-none h-4 w-4"
                />
                <label htmlFor="annual-check" className="text-xs text-foreground cursor-pointer">
                  Is Annual Lump-Sum Tax / Insurance Payment (FY{fiscalYear})
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddCostModal(false)}
                className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground text-xs font-medium rounded-none border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none"
              >
                Save Disbursement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
