'use client';

import React, { useMemo } from 'react';
import { PropertyDeal } from '@/types/schema';
import {
  TrendingUp, BarChart3, Receipt, DollarSign,
  Clock, CheckCircle, AlertTriangle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DealAutopsy — Individual Deal Post-Mortem
  
   Shows granular financial health metrics for a single completed
   deal within the Exit Hub. Designed for dark-themed integration.
  
   Metrics:
   ┌──────────────────────────────────────────────────────┐
   │ 1. Gross Profit Margin   (GPM)  — ≥20% = Green      │
   │ 2. Return on Cost        (ROC)  — ≥25% = Green      │
   │ 3. Acquisition Cost %           — 15-18% = Green     │
   │ 4. Net Profit            ($)    — Dynamic            │
   │ 5. Days on Market        (DOM)  — Dynamic            │
   └──────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════ */

/* ─── Health Band Logic ─── */
type Band = 'green' | 'yellow' | 'red';

function gpmBand(v: number): Band {
  if (v >= 20) return 'green';
  if (v >= 10) return 'yellow';
  return 'red';
}

function rocBand(v: number): Band {
  if (v >= 25) return 'green';
  if (v >= 15) return 'yellow';
  return 'red';
}

function acqBand(v: number): Band {
  if (v >= 15 && v <= 18) return 'green';
  if (v >= 12 && v <= 22) return 'yellow';
  return 'red';
}

const BAND_COLORS: Record<Band, { bg: string; border: string; text: string; glow: string }> = {
  green:  { bg: 'bg-emerald-900/30', border: 'border-emerald-700', text: 'text-emerald-400', glow: 'shadow-emerald-900/30' },
  yellow: { bg: 'bg-amber-900/30',   border: 'border-amber-700',   text: 'text-amber-400',   glow: 'shadow-amber-900/30' },
  red:    { bg: 'bg-red-900/30',     border: 'border-red-700',     text: 'text-red-400',     glow: 'shadow-red-900/30' },
};

const BAND_ICON: Record<Band, React.ReactNode> = {
  green:  <CheckCircle className="w-3 h-3 text-emerald-500" />,
  yellow: <AlertTriangle className="w-3 h-3 text-amber-500" />,
  red:    <AlertTriangle className="w-3 h-3 text-red-500" />,
};

/* ─── Derived Autopsy Shape ─── */
interface AutopsyMetrics {
  grossSalePrice: number;
  totalProjectCosts: number;
  sourcingClosingCosts: number;
  purchasePrice: number;
  netProfit: number;
  gpm: number;
  roc: number;
  acquisitionCostPct: number;
  dom: number | null;       // Days on market
  holdDays: number | null;  // Total hold time
}

/**
 * Compute all autopsy metrics for a single deal.
 */
function computeAutopsy(deal: PropertyDeal): AutopsyMetrics {
  const fin = deal.financials;
  const pp = fin?.purchasePrice || 0;

  // Gross Sale Price
  const grossSalePrice = fin?.actualSalePrice || fin?.estimatedARV || 0;

  // Renovation costs (approved cost entries + inspection actuals + rehab expenses)
  let renovationCosts = 0;
  fin?.costs?.forEach(c => { if (c.approved) renovationCosts += c.amount; });
  fin?.inspections?.forEach(i => { renovationCosts += i.actualCost; });
  deal.rehabExpenses?.forEach(e => { renovationCosts += e.amount; });

  // Sourcing & Closing Costs (buy-side)
  let sourcingClosingCosts = 0;
  // Origination points on loan
  if (fin?.loanAmount && fin?.loanOriginationPoints) {
    sourcingClosingCosts += fin.loanAmount * (fin.loanOriginationPoints / 100);
  }
  // Cost basis ledger entries (everything acquisition-related)
  if (deal.costBasisLedger) {
    const allBasis = [
      ...(deal.costBasisLedger.directAcquisition || []),
      ...(deal.costBasisLedger.financing || []),
      ...(deal.costBasisLedger.preClosing || []),
    ];
    allBasis.forEach(item => { sourcingClosingCosts += item.amount; });
  }

  // Holding costs
  let holdingCosts = 0;
  deal.holdingCosts?.forEach(hc => {
    holdingCosts += hc.monthlyAmount * hc.monthsPaid;
  });

  // Sell-side closing costs
  let sellClosingCosts = fin?.finalClosingCosts || 0;
  // Agent commissions
  const buyerCommDollar = grossSalePrice * ((fin?.buyersAgentCommission || 0) / 100);
  const sellerCommDollar = grossSalePrice * ((fin?.sellersAgentCommission || 0) / 100);
  sellClosingCosts += buyerCommDollar + sellerCommDollar;
  // Exit cost ledger
  deal.exitCosts?.forEach(ec => {
    if (ec.isPercentage && ec.percentageRate) {
      sellClosingCosts += grossSalePrice * (ec.percentageRate / 100);
    } else {
      sellClosingCosts += ec.amount;
    }
  });

  // Total project costs
  const totalProjectCosts = pp + renovationCosts + sourcingClosingCosts + holdingCosts + sellClosingCosts;

  // Net profit
  const netProfit = grossSalePrice - totalProjectCosts;

  // GPM: (Net Profit / Gross Sale Price) * 100
  const gpm = grossSalePrice > 0 ? (netProfit / grossSalePrice) * 100 : 0;

  // ROC: (Net Profit / Total Project Costs) * 100
  const roc = totalProjectCosts > 0 ? (netProfit / totalProjectCosts) * 100 : 0;

  // Acquisition Cost %: (Sourcing & Closing / Purchase Price) * 100
  const acquisitionCostPct = pp > 0 ? (sourcingClosingCosts / pp) * 100 : 0;

  // Days on Market: Listed → Sold (or createdAt → Sold if no listing date tracked)
  let dom: number | null = null;
  let holdDays: number | null = null;
  if (fin?.soldDate && deal.createdAt) {
    const created = new Date(deal.createdAt);
    const sold = new Date(fin.soldDate);
    holdDays = Math.max(1, Math.round((sold.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    // DOM is estimated as ~30% of hold time for reno-exit projects (listed near end)
    // If the deal has estimatedTimelineDays for rehab, use that to estimate listing start
    const rehabDays = fin?.estimatedTimelineDays || Math.round(holdDays * 0.7);
    dom = Math.max(1, holdDays - rehabDays);
  }

  return {
    grossSalePrice,
    totalProjectCosts,
    sourcingClosingCosts,
    purchasePrice: pp,
    netProfit,
    gpm,
    roc,
    acquisitionCostPct,
    dom,
    holdDays,
  };
}

/* ─── Metric Row Sub-Component ─── */
function MetricRow({
  icon,
  label,
  value,
  band,
  target,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  band?: Band;
  target?: string;
}) {
  const style = band ? BAND_COLORS[band] : null;

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
      style ? `${style.bg} ${style.border} shadow-md ${style.glow}` : 'border-gray-800 bg-black/40'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded bg-white/5">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-300">{label}</p>
          {target && <p className="text-xs text-gray-500 mt-0.5">Target: {target}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-light tracking-tight font-mono ${
          style ? style.text : 'text-white'
        }`}>
          {value}
        </span>
        {band && BAND_ICON[band]}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

interface DealAutopsyProps {
  deal: PropertyDeal;
}

export default function DealAutopsy({ deal }: DealAutopsyProps) {
  const autopsy = useMemo(() => computeAutopsy(deal), [deal]);

  const isSold = deal.status === 'Sold';

  return (
    <div className="bg-pw-black border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-mono tracking-widest text-emerald-500 uppercase flex items-center">
          <BarChart3 className="w-3 h-3 mr-2" /> Project Autopsy
        </h3>
        {isSold ? (
          <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-700 text-emerald-400">
            Finalized
          </span>
        ) : (
          <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-900/40 border border-amber-700 text-amber-400">
            Projected
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {/* 1. Gross Profit Margin */}
        <MetricRow
          icon={<TrendingUp className="w-3.5 h-3.5 text-gray-400" />}
          label="Gross Profit Margin"
          value={`${autopsy.gpm.toFixed(1)}%`}
          band={gpmBand(autopsy.gpm)}
          target="≥ 20%"
        />

        {/* 2. Return on Cost */}
        <MetricRow
          icon={<BarChart3 className="w-3.5 h-3.5 text-gray-400" />}
          label="Return on Cost"
          value={`${autopsy.roc.toFixed(1)}%`}
          band={rocBand(autopsy.roc)}
          target="≥ 25%"
        />

        {/* 3. Acquisition Cost % */}
        <MetricRow
          icon={<Receipt className="w-3.5 h-3.5 text-gray-400" />}
          label="Acquisition Cost %"
          value={`${autopsy.acquisitionCostPct.toFixed(1)}%`}
          band={acqBand(autopsy.acquisitionCostPct)}
          target="15–18%"
        />

        {/* 4. Net Profit */}
        <MetricRow
          icon={<DollarSign className="w-3.5 h-3.5 text-gray-400" />}
          label="Net Profit"
          value={`${autopsy.netProfit >= 0 ? '' : '-'}$${Math.abs(autopsy.netProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />

        {/* 5. Days on Market */}
        <MetricRow
          icon={<Clock className="w-3.5 h-3.5 text-gray-400" />}
          label="Days on Market"
          value={autopsy.dom !== null ? `${autopsy.dom}d` : '—'}
        />
      </div>

      {/* Summary bar */}
      <div className="mt-5 pt-4 border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-500">
        <span>
          Total Project Costs: <span className="text-gray-300 font-mono">${autopsy.totalProjectCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </span>
        {autopsy.holdDays !== null && (
          <span>
            Hold Period: <span className="text-gray-300 font-mono">{autopsy.holdDays}d</span>
          </span>
        )}
      </div>
    </div>
  );
}
