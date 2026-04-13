'use client';

import React, { useMemo, useState } from 'react';
import { PropertyDeal } from '@/types/schema';
import {
  Calendar, TrendingUp, BarChart3, Receipt,
  DollarSign, Clock, CheckCircle, AlertTriangle,
  ChevronDown,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   YearlyPortfolioPerformance — Aggregated Annual Health Report

   Master view that aggregates autopsy data from ALL completed
   deals, grouped by exit year. Shows portfolio-level versions of
   the 5 autopsy metrics plus average profit per flip.

   Designed for light-themed Pipeline Command Center integration.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Health Band Logic (same thresholds as DealAutopsy) ─── */
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

const BAND_STYLE: Record<Band, { bg: string; text: string; border: string }> = {
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  yellow: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  red:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
};

const BAND_ICON: Record<Band, React.ReactNode> = {
  green:  <CheckCircle className="w-3 h-3 text-emerald-500" />,
  yellow: <AlertTriangle className="w-3 h-3 text-amber-500" />,
  red:    <AlertTriangle className="w-3 h-3 text-red-500" />,
};

/* ─── Per-Deal Computed Raw Values ─── */
interface DealSnapshot {
  dealId: string;
  propertyName: string;
  year: number;
  grossSalePrice: number;
  totalProjectCosts: number;
  sourcingClosingCosts: number;
  purchasePrice: number;
  netProfit: number;
  dom: number;
  holdDays: number;
}

/* ─── Aggregated Year Metrics ─── */
interface YearMetrics {
  year: number;
  dealCount: number;
  totalGrossSales: number;
  totalProjectCosts: number;
  totalNetProfit: number;
  totalSourcingClosing: number;
  totalPurchasePrice: number;
  totalDOM: number;
  gpm: number;
  roc: number;
  acquisitionCostPct: number;
  avgProfitPerFlip: number;
  avgDOM: number;
  deals: DealSnapshot[];
}

/**
 * Process all completed deals into year-grouped metrics.
 */
function computeYearlyMetrics(deals: PropertyDeal[]): YearMetrics[] {
  // Only sold deals with soldDate
  const soldDeals = deals.filter(d =>
    d.status === 'Sold' && d.financials?.soldDate
  );

  // Build per-deal snapshots
  const snapshots: DealSnapshot[] = soldDeals.map(deal => {
    const fin = deal.financials;
    const pp = fin?.purchasePrice || 0;
    const grossSalePrice = fin?.actualSalePrice || fin?.estimatedARV || 0;

    // Renovation costs
    let renovationCosts = 0;
    fin?.costs?.forEach(c => { if (c.approved) renovationCosts += c.amount; });
    fin?.inspections?.forEach(i => { renovationCosts += i.actualCost; });
    deal.rehabExpenses?.forEach(e => { renovationCosts += e.amount; });

    // Sourcing & Closing (buy-side)
    let sourcingClosingCosts = 0;
    if (fin?.loanAmount && fin?.loanOriginationPoints) {
      sourcingClosingCosts += fin.loanAmount * (fin.loanOriginationPoints / 100);
    }
    if (deal.costBasisLedger) {
      [
        ...(deal.costBasisLedger.directAcquisition || []),
        ...(deal.costBasisLedger.financing || []),
        ...(deal.costBasisLedger.preClosing || []),
      ].forEach(item => { sourcingClosingCosts += item.amount; });
    }

    // Holding costs
    let holdingCosts = 0;
    deal.holdingCosts?.forEach(hc => {
      holdingCosts += hc.monthlyAmount * hc.monthsPaid;
    });

    // Sell-side closing
    let sellClosing = fin?.finalClosingCosts || 0;
    sellClosing += grossSalePrice * ((fin?.buyersAgentCommission || 0) / 100);
    sellClosing += grossSalePrice * ((fin?.sellersAgentCommission || 0) / 100);
    deal.exitCosts?.forEach(ec => {
      sellClosing += ec.isPercentage && ec.percentageRate
        ? grossSalePrice * (ec.percentageRate / 100)
        : ec.amount;
    });

    const totalProjectCosts = pp + renovationCosts + sourcingClosingCosts + holdingCosts + sellClosing;
    const netProfit = grossSalePrice - totalProjectCosts;

    // Hold & DOM
    const created = new Date(deal.createdAt);
    const sold = new Date(fin!.soldDate!);
    const holdDays = Math.max(1, Math.round((sold.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    const rehabDays = fin?.estimatedTimelineDays || Math.round(holdDays * 0.7);
    const dom = Math.max(1, holdDays - rehabDays);

    const year = sold.getFullYear();

    return {
      dealId: deal.id,
      propertyName: deal.propertyName,
      year,
      grossSalePrice,
      totalProjectCosts,
      sourcingClosingCosts,
      purchasePrice: pp,
      netProfit,
      dom,
      holdDays,
    };
  });

  // Group by year
  const yearMap = new Map<number, DealSnapshot[]>();
  snapshots.forEach(s => {
    if (!yearMap.has(s.year)) yearMap.set(s.year, []);
    yearMap.get(s.year)!.push(s);
  });

  // Build aggregated metrics per year
  const results: YearMetrics[] = [];
  yearMap.forEach((yearDeals, year) => {
    const totalGrossSales = yearDeals.reduce((a, d) => a + d.grossSalePrice, 0);
    const totalCosts = yearDeals.reduce((a, d) => a + d.totalProjectCosts, 0);
    const totalNet = yearDeals.reduce((a, d) => a + d.netProfit, 0);
    const totalSC = yearDeals.reduce((a, d) => a + d.sourcingClosingCosts, 0);
    const totalPP = yearDeals.reduce((a, d) => a + d.purchasePrice, 0);
    const totalDOM = yearDeals.reduce((a, d) => a + d.dom, 0);

    results.push({
      year,
      dealCount: yearDeals.length,
      totalGrossSales: totalGrossSales,
      totalProjectCosts: totalCosts,
      totalNetProfit: totalNet,
      totalSourcingClosing: totalSC,
      totalPurchasePrice: totalPP,
      totalDOM,
      gpm: totalGrossSales > 0 ? (totalNet / totalGrossSales) * 100 : 0,
      roc: totalCosts > 0 ? (totalNet / totalCosts) * 100 : 0,
      acquisitionCostPct: totalPP > 0 ? (totalSC / totalPP) * 100 : 0,
      avgProfitPerFlip: yearDeals.length > 0 ? totalNet / yearDeals.length : 0,
      avgDOM: yearDeals.length > 0 ? Math.round(totalDOM / yearDeals.length) : 0,
      deals: yearDeals,
    });
  });

  // Sort descending (most recent year first)
  results.sort((a, b) => b.year - a.year);
  return results;
}

/* ─── KPI Tile ─── */
function KPITile({
  label,
  value,
  target,
  band,
  icon,
}: {
  label: string;
  value: string;
  target?: string;
  band?: Band;
  icon: React.ReactNode;
}) {
  const style = band ? BAND_STYLE[band] : undefined;

  return (
    <div className={`rounded-xl border p-4 transition-all hover:shadow-md ${
      style ? `${style.bg} ${style.border}` : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-gray-100/80">
            {icon}
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        </div>
        {band && BAND_ICON[band]}
      </div>
      <h4 className={`text-xl font-light tracking-tight ${
        style ? style.text : 'text-gray-900'
      }`}>
        {value}
      </h4>
      {target && (
        <p className="text-[9px] text-gray-400 mt-1">Target: {target}</p>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

interface YearlyPortfolioPerformanceProps {
  deals: PropertyDeal[];
}

export default function YearlyPortfolioPerformance({ deals }: YearlyPortfolioPerformanceProps) {
  const yearlyData = useMemo(() => computeYearlyMetrics(deals), [deals]);

  const [expandedYear, setExpandedYear] = useState<number | null>(
    yearlyData.length > 0 ? yearlyData[0].year : null
  );

  if (yearlyData.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">No Completed Exits</p>
        <p className="text-xs text-gray-400 mt-1">
          Post-mortem metrics will appear here once deals reach the &lsquo;Sold&rsquo; status in the Exit Hub.
        </p>
      </div>
    );
  }

  // Compute all-time aggregates
  const allTime = yearlyData.reduce(
    (acc: { sales: number; costs: number; profit: number; count: number }, y: YearMetrics) => ({
      sales: acc.sales + y.totalGrossSales,
      costs: acc.costs + y.totalProjectCosts,
      profit: acc.profit + y.totalNetProfit,
      count: acc.count + y.dealCount,
    }),
    { sales: 0, costs: 0, profit: 0, count: 0 }
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gray-50">
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Yearly Portfolio Performance
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {allTime.count} completed exit{allTime.count !== 1 ? 's' : ''} · All-time net: <span className={`font-mono font-medium ${allTime.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {allTime.profit >= 0 ? '' : '-'}${Math.abs(allTime.profit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Year Sections */}
      <div className="divide-y divide-gray-100">
        {yearlyData.map((ym: YearMetrics) => {
          const isExpanded = expandedYear === ym.year;

          return (
            <div key={ym.year}>
              {/* Year Header Row */}
              <button
                onClick={() => setExpandedYear(isExpanded ? null : ym.year)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-light text-gray-900 tracking-tight">{ym.year}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {ym.dealCount} flip{ym.dealCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-mono ${ym.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {ym.totalNetProfit >= 0 ? '+' : '-'}${Math.abs(ym.totalNetProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Expanded KPI Grid */}
              {isExpanded && (
                <div className="px-6 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <KPITile
                      icon={<TrendingUp className="w-3 h-3 text-gray-400" />}
                      label="GPM"
                      value={`${ym.gpm.toFixed(1)}%`}
                      band={gpmBand(ym.gpm)}
                      target="≥ 20%"
                    />
                    <KPITile
                      icon={<BarChart3 className="w-3 h-3 text-gray-400" />}
                      label="Return on Cost"
                      value={`${ym.roc.toFixed(1)}%`}
                      band={rocBand(ym.roc)}
                      target="≥ 25%"
                    />
                    <KPITile
                      icon={<Receipt className="w-3 h-3 text-gray-400" />}
                      label="Acq. Cost %"
                      value={`${ym.acquisitionCostPct.toFixed(1)}%`}
                      band={acqBand(ym.acquisitionCostPct)}
                      target="15–18%"
                    />
                    <KPITile
                      icon={<DollarSign className="w-3 h-3 text-gray-400" />}
                      label="Avg Profit / Flip"
                      value={`$${Math.abs(ym.avgProfitPerFlip).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    />
                    <KPITile
                      icon={<Clock className="w-3 h-3 text-gray-400" />}
                      label="Avg DOM"
                      value={`${ym.avgDOM}d`}
                    />
                    <KPITile
                      icon={<DollarSign className="w-3 h-3 text-gray-400" />}
                      label="Gross Sales"
                      value={`$${(ym.totalGrossSales / 1000).toFixed(0)}k`}
                    />
                  </div>

                  {/* Per-deal breakdown table */}
                  {ym.deals.length > 1 && (
                    <div className="mt-4 rounded-lg border border-gray-100 overflow-hidden">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-50/80 text-gray-400 uppercase tracking-wider">
                            <th className="py-2 px-3 text-left font-medium">Property</th>
                            <th className="py-2 px-3 text-right font-medium">Sale</th>
                            <th className="py-2 px-3 text-right font-medium">Net Profit</th>
                            <th className="py-2 px-3 text-right font-medium">GPM</th>
                            <th className="py-2 px-3 text-right font-medium">DOM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ym.deals.map((d: DealSnapshot) => {
                            const dealGPM = d.grossSalePrice > 0
                              ? (d.netProfit / d.grossSalePrice) * 100
                              : 0;
                            return (
                              <tr key={d.dealId} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-2 px-3 text-gray-700 font-medium">{d.propertyName}</td>
                                <td className="py-2 px-3 text-right text-gray-500 font-mono">
                                  ${d.grossSalePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td className={`py-2 px-3 text-right font-mono ${d.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {d.netProfit >= 0 ? '+' : '-'}${Math.abs(d.netProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td className={`py-2 px-3 text-right font-mono ${
                                  dealGPM >= 20 ? 'text-emerald-600' : dealGPM >= 10 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {dealGPM.toFixed(1)}%
                                </td>
                                <td className="py-2 px-3 text-right text-gray-500 font-mono">
                                  {d.dom}d
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
