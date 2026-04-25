'use client';

import React, { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { TrendingUp, TrendingDown, ToggleLeft, ToggleRight, Building2, Briefcase } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Profit & Loss Statement
   ─────────────────────────────────────────────────────
   Revenue, COGS (Rehab + Acquisition), Operating Expenses
   Toggle: By Specific Property  |  By Entire Portfolio
   ═══════════════════════════════════════════════════════ */

interface PLLineItem {
  label: string;
  amount: number;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  highlight?: 'positive' | 'negative';
}

function formatCurrency(val: number): string {
  const neg = val < 0;
  return `${neg ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProfitAndLoss() {
  const projects = useProjectStore(s => s.projects);
  const currentProject = useProjectStore(s => s.currentProject);
  const setDeal = useProjectStore(s => s.setDeal);
  const [viewMode, setViewMode] = useState<'property' | 'portfolio'>('property');

  const targetDeals = useMemo(() => {
    if (viewMode === 'portfolio') return projects;
    if (currentProject) return [currentProject];
    return projects.length > 0 ? [projects[0]] : [];
  }, [viewMode, projects, currentProject]);

  const pl = useMemo(() => {
    let revenue = 0;
    let purchaseCost = 0;
    let rehabCosts = 0;
    let acquisitionCosts = 0;
    let financingCosts = 0;
    let holdingCosts = 0;
    let exitCosts = 0;

    targetDeals.forEach(deal => {
      const fin = deal.financials;
      if (!fin) return;

      // Revenue
      const salePrice = fin.actualSalePrice || fin.estimatedARV || 0;
      revenue += salePrice;

      // COGS — Purchase Price
      purchaseCost += fin.purchasePrice || 0;

      // COGS — Rehab Costs (approved entries)
      const approved = fin.costs?.filter(c => c.approved) || [];
      rehabCosts += approved.reduce((s, c) => s + c.amount, 0);

      // COGS — Acquisition Costs (CostBasisLedger)
      if (deal.costBasisLedger) {
        const cb = deal.costBasisLedger;
        acquisitionCosts += [...(cb.directAcquisition || []), ...(cb.preClosing || [])].reduce((s, i) => s + i.amount, 0);
        financingCosts += (cb.financing || []).reduce((s, i) => s + i.amount, 0);
      }

      // Operating — Holding Costs
      if (deal.holdingCosts) {
        holdingCosts += deal.holdingCosts.reduce((s, h) => s + h.monthlyAmount * h.monthsPaid, 0);
      }

      // Operating — Financing (interest accrual)
      const loanAmount = fin.loanAmount || (fin.purchasePrice || 0);
      const interestRate = (fin.loanInterestRate || 0) / 100;
      const holdDays = fin.estimatedTimelineDays || 90;
      financingCosts += loanAmount * interestRate * (holdDays / 365);

      // Operating — Exit Costs
      if (deal.exitCosts) {
        deal.exitCosts.forEach(ec => {
          if (ec.isPercentage && ec.percentageRate) {
            exitCosts += (ec.percentageRate / 100) * salePrice;
          } else {
            exitCosts += ec.amount;
          }
        });
      }

      // Agent Commissions (if not already in exitCosts)
      const buyerComm = salePrice * ((fin.buyersAgentCommission || 0) / 100);
      const sellerComm = salePrice * ((fin.sellersAgentCommission || 0) / 100);
      exitCosts += buyerComm + sellerComm + (fin.finalClosingCosts || 0);
    });

    const cogs = purchaseCost + rehabCosts + acquisitionCosts;
    const grossProfit = revenue - cogs;
    const totalOpex = holdingCosts + financingCosts + exitCosts;
    const netProfit = grossProfit - totalOpex;

    return {
      revenue,
      purchaseCost,
      rehabCosts,
      acquisitionCosts,
      cogs,
      grossProfit,
      holdingCosts,
      financingCosts,
      exitCosts,
      totalOpex,
      netProfit,
    };
  }, [targetDeals]);

  const lines: PLLineItem[] = [
    { label: 'Revenue', amount: 0, bold: true, separator: true },
    { label: 'Sale Proceeds (Actual or Projected ARV)', amount: pl.revenue, indent: true },
    { label: 'Total Revenue', amount: pl.revenue, bold: true },
    { label: '', amount: 0, separator: true },
    { label: 'Cost of Goods Sold', amount: 0, bold: true, separator: true },
    { label: 'Purchase Price', amount: pl.purchaseCost, indent: true },
    { label: 'Rehab & Renovation Costs', amount: pl.rehabCosts, indent: true },
    { label: 'Acquisition & Pre-Closing Costs', amount: pl.acquisitionCosts, indent: true },
    { label: 'Total COGS', amount: pl.cogs, bold: true },
    { label: '', amount: 0, separator: true },
    { label: 'GROSS PROFIT', amount: pl.grossProfit, bold: true, highlight: pl.grossProfit >= 0 ? 'positive' : 'negative' },
    { label: '', amount: 0, separator: true },
    { label: 'Operating Expenses', amount: 0, bold: true, separator: true },
    { label: 'Holding Costs (Tax, Insurance, Utilities)', amount: pl.holdingCosts, indent: true },
    { label: 'Financing Costs (Interest, Origination)', amount: pl.financingCosts, indent: true },
    { label: 'Exit Costs (Broker, Staging, Marketing)', amount: pl.exitCosts, indent: true },
    { label: 'Total Operating Expenses', amount: pl.totalOpex, bold: true },
    { label: '', amount: 0, separator: true },
    { label: 'NET PROFIT / (LOSS)', amount: pl.netProfit, bold: true, highlight: pl.netProfit >= 0 ? 'positive' : 'negative' },
  ];

  return (
    <div className="space-y-5">
      {/* Toggle + Property Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'property' ? 'portfolio' : 'property')}
            className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-text-primary transition"
          >
            {viewMode === 'property' ? (
              <>
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>By Property</span>
                <ToggleLeft className="w-5 h-5 text-text-secondary" />
              </>
            ) : (
              <>
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Portfolio View</span>
                <ToggleRight className="w-5 h-5 text-emerald-500" />
              </>
            )}
          </button>
        </div>

        {viewMode === 'property' && projects.length > 0 && (
          <select
            className="border border-border-accent rounded-lg text-sm py-1.5 px-3 focus:ring-1 focus:ring-gray-400 outline-none bg-bg-surface"
            value={currentProject?.id || ''}
            onChange={e => {
              const d = projects.find(d => d.id === e.target.value);
              if (d) setDeal(d);
            }}
          >
            <option value="" disabled>Select Property...</option>
            {projects.map(d => (
              <option key={d.id} value={d.id}>{d.propertyName} ({d.status})</option>
            ))}
          </select>
        )}
      </div>

      {/* Statement Header */}
      <div className="border-b-2 border-gray-900 pb-2">
        <h4 className="text-sm font-bold tracking-widest uppercase text-text-primary">
          Profit & Loss Statement
        </h4>
        <p className="text-xs text-text-secondary mt-0.5">
          {viewMode === 'portfolio'
            ? `Portfolio — ${targetDeals.length} properties`
            : currentProject?.propertyName || 'No property selected'
          }
          {' · '}
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Statement Body */}
      <div className="border border-border-accent rounded-lg overflow-hidden">
        <table className="w-full text-sm" id="pl-statement-table">
          <thead>
            <tr className="bg-bg-primary">
              <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-text-secondary">Account</th>
              <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-text-secondary">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((line, i) => {
              if (line.separator && !line.label) {
                return <tr key={i}><td colSpan={2} className="h-2 bg-bg-primary"></td></tr>;
              }
              return (
                <tr
                  key={i}
                  className={`${line.bold ? 'bg-bg-primary' : 'hover:bg-bg-primary'} transition-colors`}
                >
                  <td className={`px-4 py-2.5 ${line.indent ? 'pl-8' : ''} ${line.bold ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                    {line.label}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${
                    line.highlight === 'positive' ? 'text-emerald-700 font-bold' :
                    line.highlight === 'negative' ? 'text-red-600 font-bold' :
                    line.bold ? 'font-semibold text-text-primary' :
                    'text-text-primary'
                  }`}>
                    {(line.bold && !line.highlight && line.amount === 0 && line.separator) ? '' : formatCurrency(line.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-bg-primary rounded-lg text-center border border-border-accent">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Gross Margin</p>
          <p className={`text-lg font-light ${pl.grossProfit >= 0 ? 'text-text-primary' : 'text-red-600'}`}>
            {pl.revenue > 0 ? ((pl.grossProfit / pl.revenue) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
        <div className="p-3 bg-bg-primary rounded-lg text-center border border-border-accent">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Net Margin</p>
          <p className={`text-lg font-light flex items-center justify-center gap-1 ${pl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {pl.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {pl.revenue > 0 ? ((pl.netProfit / pl.revenue) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
        <div className="p-3 bg-bg-primary rounded-lg text-center border border-border-accent">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Net P&L</p>
          <p className={`text-lg font-light ${pl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(pl.netProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}
