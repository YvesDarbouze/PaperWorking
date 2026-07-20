'use client';

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent, Calendar, Activity, ShieldCheck } from 'lucide-react';
import type { Project, ProjectFinancials } from '@/types/schema';
import type { DerivedMetrics } from '@/lib/metrics/reiMetrics';

interface ActualScorecardProps {
  project: Project;
  strategy: 'Sell' | 'Rent' | 'Lease';
  liveMetrics: DerivedMetrics | null;
  autopsy: any; // Autopsy metrics from computeAutopsyMetrics
  metricsScope: 'property' | 'myShare';
  setMetricsScope: (scope: 'property' | 'myShare') => void;
  isRealized: boolean;
}

export function ActualScorecard({
  project,
  strategy,
  liveMetrics,
  autopsy,
  metricsScope,
  setMetricsScope,
  isRealized,
}: ActualScorecardProps) {
  const fin = project.financials || {} as ProjectFinancials;
  const ownershipPct = fin.ownershipPercentage ?? 100;
  const shareMultiplier = metricsScope === 'myShare' ? ownershipPct / 100 : 1;

  // Formatting helpers
  const fmtCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const fmtPct = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `${val.toFixed(1)}%`;
  };

  const fmtDays = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `${Math.round(val)} days`;
  };

  // Helper to calculate variance
  const getVariance = (actual: number | null, projected: number | null, type: 'currency' | 'percent' | 'days', higherIsBetter = true) => {
    if (actual === null || projected === null) return null;
    const diff = actual - projected;
    const isPositive = diff >= 0;
    const isGood = higherIsBetter ? isPositive : !isPositive;
    
    let formattedDiff = '';
    if (type === 'currency') {
      formattedDiff = `${isPositive ? '+' : ''}${fmtCurrency(diff)}`;
    } else if (type === 'percent') {
      formattedDiff = `${isPositive ? '+' : ''}${diff.toFixed(1)}%`;
    } else {
      formattedDiff = `${isPositive ? '+' : ''}${Math.round(diff)} days`;
    }

    return {
      diff,
      formattedDiff,
      isGood,
      isNeutral: Math.abs(diff) < 0.01,
    };
  };

  // Determine IRR to display
  // IRR becomes actual at sale; projected-IRR renders until then, labeled
  const projectedIrrVal = (liveMetrics?.kpi33?.IRR?.projected ?? liveMetrics?.irr ?? 0) * 100;
  const actualIrrVal = isRealized
    ? (liveMetrics?.kpi33?.IRR?.actual !== null ? (liveMetrics?.kpi33?.IRR?.actual ?? 0) * 100 : (autopsy?.annualizedIrr ?? 0))
    : null;

  const irrLabel = isRealized ? 'Actual IRR' : 'Projected IRR';
  const irrValue = isRealized ? actualIrrVal : projectedIrrVal;

  // IRR variance relative to projection if realized
  const irrVariance = isRealized ? getVariance(actualIrrVal, projectedIrrVal, 'percent') : null;

  // Define metrics list based on Strategy
  const isRentOrLease = strategy === 'Rent' || strategy === 'Lease';

  // Projected vs Actual scorecard rows
  const scorecardRows = isRentOrLease
    ? [
        {
          label: 'Net Operating Income (NOI)',
          desc: 'Annualized net revenue after opex',
          projected: (liveMetrics?.kpi33?.NOI?.projected ?? 0) * shareMultiplier,
          actual: (liveMetrics?.kpi33?.NOI?.actual ?? 0) * shareMultiplier,
          format: 'currency',
          higherIsBetter: true,
        },
        {
          label: 'Cash-on-Cash Return',
          desc: 'Annual cash flow relative to cash invested',
          projected: liveMetrics?.kpi33?.COC?.projected ?? 0,
          actual: liveMetrics?.kpi33?.COC?.actual ?? 0,
          format: 'percent',
          higherIsBetter: true,
        },
        {
          label: 'Cap Rate',
          desc: 'Net return on property market value',
          projected: liveMetrics?.kpi33?.CAP_RATE?.projected ?? 0,
          actual: liveMetrics?.kpi33?.CAP_RATE?.actual ?? 0,
          format: 'percent',
          higherIsBetter: true,
        },
        {
          label: 'Annual Cash Flow',
          desc: 'Net income after debt service',
          projected: (liveMetrics?.kpi33?.CASH_FLOW?.projected ?? 0) * shareMultiplier,
          actual: (liveMetrics?.kpi33?.CASH_FLOW?.actual ?? 0) * shareMultiplier,
          format: 'currency',
          higherIsBetter: true,
        },
        {
          label: 'Operating Expense Ratio (OER)',
          desc: 'OpEx relative to gross operating income',
          projected: liveMetrics?.kpi33?.OER?.projected ?? 0,
          actual: liveMetrics?.kpi33?.OER?.actual ?? 0,
          format: 'percent',
          higherIsBetter: false,
        },
        {
          label: 'Occupancy Rate',
          desc: 'Days occupied relative to total hold days',
          projected: liveMetrics?.kpi33?.OCCUPANCY?.projected ?? 100,
          actual: liveMetrics?.kpi33?.OCCUPANCY?.actual ?? 0,
          format: 'percent',
          higherIsBetter: true,
        },
      ]
    : [
        {
          label: 'Net Profit',
          desc: 'Final cash return at exit after all expenses',
          projected: (autopsy?.projectedNetProfit ?? 0) * shareMultiplier,
          actual: (autopsy?.netProfit ?? 0) * shareMultiplier,
          format: 'currency',
          higherIsBetter: true,
        },
        {
          label: 'Net ROI',
          desc: 'Total return percentage on capitalization',
          projected: (autopsy?.projectedNetProfit && autopsy?.projectedTotalCost) 
            ? (autopsy.projectedNetProfit / autopsy.projectedTotalCost) * 100 
            : 0,
          actual: autopsy?.roi ?? 0,
          format: 'percent',
          higherIsBetter: true,
        },
        {
          label: 'Total Appreciation',
          desc: 'Growth in value from purchase price',
          projected: ((fin.estimatedARV || 0) - (fin.purchasePrice || 0)) * shareMultiplier,
          actual: ((autopsy?.grossSalePrice || 0) - (fin.purchasePrice || 0)) * shareMultiplier,
          format: 'currency',
          higherIsBetter: true,
        },
        {
          label: 'Renovation Costs',
          desc: 'Total capital expenditures for rehab',
          projected: (fin.projectedRehabCost || 0) * shareMultiplier,
          actual: (autopsy?.actualRehabCost || 0) * shareMultiplier,
          format: 'currency',
          higherIsBetter: false,
        },
        {
          label: 'Hold Timeline',
          desc: 'Duration of property hold period',
          projected: fin.estimatedTimelineDays ?? 90,
          actual: autopsy?.holdDays ?? 0,
          format: 'days',
          higherIsBetter: false,
        },
      ];

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6 border border-[#454955]/20">
      {/* Header Row with Scope Selector Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-wider block">
            Exit Analytics (Card E3.2)
          </span>
          <h3 className="text-xl font-bold text-white uppercase tracking-wide mt-0.5">
            Actual Scorecard
          </h3>
        </div>
        <div className="bg-[#262328]/50 p-1 rounded-lg flex gap-1 self-start sm:self-auto">
          {(['property', 'myShare'] as const).map((scope) => (
            <button
              key={scope}
              onClick={() => setMetricsScope(scope)}
              className={`px-3 py-1 rounded text-[12px] leading-[14px] tracking-[0.05em] font-medium transition-all ${
                metricsScope === scope
                  ? 'bg-[#7A9EAA] text-black font-bold'
                  : 'text-[#9E9DA0] hover:text-[#9E9DA0]/80 hover:bg-white/5'
              }`}
            >
              {scope === 'property' ? 'Property' : 'My Share'}
            </button>
          ))}
        </div>
      </div>

      {/* Golden Highlight band for IRR */}
      <div
        className="glass-card rounded-2xl p-5 border border-[#ffd1aa]/20 relative overflow-hidden"
        style={{
          borderLeft: '4px solid #ffd1aa',
          background: 'linear-gradient(90deg, rgba(255, 209, 170, 0.08) 0%, transparent 100%)',
        }}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] leading-[14px] tracking-[0.05em] font-bold text-[#ffd1aa] uppercase">
              {irrLabel}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-[42px] leading-[48px] font-extrabold tracking-[-0.02em] text-[#ffd1aa] tabular-nums">
                {irrValue !== null && irrValue !== undefined ? irrValue.toFixed(1) : '—'}
                <span className="text-[20px] font-bold ml-0.5">%</span>
              </p>
              {isRealized && irrVariance && !irrVariance.isNeutral && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    irrVariance.isGood ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {irrVariance.isGood ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {irrVariance.formattedDiff}
                </span>
              )}
            </div>
          </div>
          <Activity className="w-8 h-8 text-[#ffd1aa]/30" />
        </div>

        {/* Side-by-side projected vs actual for IRR */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-[#ffd1aa]/10 text-xs">
          <div>
            <p className="text-[#9E9DA0] font-medium">Acquisition Projection</p>
            <p className="text-white font-mono font-bold mt-0.5">
              {projectedIrrVal !== null && projectedIrrVal !== undefined ? `${projectedIrrVal.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[#9E9DA0] font-medium">Actual Result</p>
            <p className="text-white font-mono font-bold mt-0.5">
              {isRealized && actualIrrVal !== null ? `${actualIrrVal.toFixed(1)}%` : 'Projected until sale'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scorecardRows.map((row, idx) => {
          const varObj = getVariance(row.actual, row.projected, row.format as any, row.higherIsBetter);
          const showActual = isRentOrLease || isRealized || row.label === 'Renovation Costs' || row.label === 'Hold Timeline';

          const displayProjected = row.format === 'currency'
            ? fmtCurrency(row.projected)
            : row.format === 'percent'
            ? fmtPct(row.projected)
            : fmtDays(row.projected);

          const displayActual = showActual
            ? row.format === 'currency'
              ? fmtCurrency(row.actual)
              : row.format === 'percent'
              ? fmtPct(row.actual)
              : fmtDays(row.actual)
            : '—';

          return (
            <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-sm font-bold text-white tracking-wide">{row.label}</h4>
                  {varObj && showActual && !varObj.isNeutral && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        varObj.isGood ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {varObj.isGood ? '+' : ''}
                      {varObj.formattedDiff}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#9E9DA0] mt-0.5">{row.desc}</p>
              </div>

              {/* Side-by-Side values */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#9E9DA0] tracking-wider block">Projected</span>
                  <span className="font-mono text-sm font-bold text-[#9E9DA0] mt-0.5 block">{displayProjected}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A9EAA] tracking-wider block">Actual / Live</span>
                  <span className="font-mono text-sm font-bold text-white mt-0.5 block">{displayActual}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
