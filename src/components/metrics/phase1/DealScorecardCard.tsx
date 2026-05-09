'use client';

import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { ProjectFinancials } from '@/types/schema';

function formatCurrency(val: number) {
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
  return `${sign}$${absVal.toLocaleString()}`;
}

export interface DealScorecardCardProps {
  financials: ProjectFinancials;
  className?: string;
  isLoading?: boolean;
}

interface MetricTile {
  label: string;
  value: string;
  sub?: string;
  trend: 'up' | 'down' | 'neutral';
  benchmark: string;
  pass: boolean | null;
}

function buildMetrics(financials: ProjectFinancials): MetricTile[] {
  const {
    purchasePrice = 0,
    projectedRehabCost = 0,
    fixedAcquisitionCosts = 0,
    estimatedARV = 0,
    projectedMonthlyRent,
    vacancyRatePercent,
  } = financials;

  const allInCost = purchasePrice + projectedRehabCost + fixedAcquisitionCosts;

  const mao = estimatedARV * 0.7 - projectedRehabCost;
  const rulePass = purchasePrice > 0 && purchasePrice <= mao;

  const grossRent = projectedMonthlyRent || 0;
  const vacancyFactor = 1 - (vacancyRatePercent ?? 7) / 100;
  const annualEffectiveIncome = grossRent * 12 * vacancyFactor;
  const annualOperatingExpenses = annualEffectiveIncome * 0.35;
  const noi = annualEffectiveIncome - annualOperatingExpenses;
  const capRate = estimatedARV > 0 && noi > 0 ? (noi / estimatedARV) * 100 : 0;

  const annualHoldingCosts =
    (financials.holdingCostTaxes || 0) * 12 +
    (financials.holdingCostInsurance || 0) * 12 +
    (financials.holdingCostUtilities || 0) * 12;
  const annualLoanInterest =
    (financials.loanAmount || 0) *
    ((financials.loanInterestRate || 0) / 100);
  const estimatedAnnualCashFlow = noi - annualHoldingCosts - annualLoanInterest;

  const allInRatio = estimatedARV > 0 ? allInCost / estimatedARV : 0;

  const getTrend = (val: number, goodThreshold: number, badThreshold: number): 'up' | 'down' | 'neutral' => {
    if (val >= goodThreshold) return 'up';
    if (val <= badThreshold) return 'down';
    return 'neutral';
  };

  return [
    {
      label: 'Est. Cap Rate',
      value: capRate > 0 ? `${capRate.toFixed(2)}%` : '—',
      sub: capRate > 0 ? `NOI ${formatCurrency(noi)}` : 'Needs rental data',
      trend: getTrend(capRate, 6, 4),
      benchmark: '≥ 6% target',
      pass: capRate > 0 ? capRate >= 5 : null,
    },
    {
      label: 'Est. Cash Flow',
      value: estimatedAnnualCashFlow !== 0 ? formatCurrency(estimatedAnnualCashFlow) : '—',
      sub: estimatedAnnualCashFlow !== 0 ? `${formatCurrency(Math.round(estimatedAnnualCashFlow / 12))}/mo` : 'Needs rental data',
      trend: getTrend(estimatedAnnualCashFlow, 5000, 0),
      benchmark: '> $0 annual',
      pass: estimatedAnnualCashFlow !== 0 ? estimatedAnnualCashFlow > 0 : null,
    },
    {
      label: '70% Rule',
      value: rulePass ? 'PASS' : purchasePrice > 0 ? 'FAIL' : '—',
      sub: `MAO ${formatCurrency(mao)}`,
      trend: rulePass ? 'up' : purchasePrice > 0 ? 'down' : 'neutral',
      benchmark: 'Purchase ≤ MAO',
      pass: purchasePrice > 0 ? rulePass : null,
    },
    {
      label: 'All-In / ARV',
      value: allInRatio > 0 ? `${(allInRatio * 100).toFixed(1)}%` : '—',
      sub: `${formatCurrency(allInCost)} of ${formatCurrency(estimatedARV)}`,
      trend: getTrend(100 - allInRatio * 100, 25, 15),
      benchmark: '≤ 80% recommended',
      pass: allInRatio > 0 ? allInRatio <= 0.8 : null,
    },
  ];
}

const TREND_META = {
  up: { Icon: ArrowUpRight, color: '#16a34a', bg: '#f0fdf4' },
  down: { Icon: ArrowDownRight, color: '#dc2626', bg: '#fef2f2' },
  neutral: { Icon: Minus, color: 'var(--text-secondary)', bg: 'var(--bg-canvas)' },
};

export default function DealScorecardCard({
  financials,
  className = '',
  isLoading = false,
}: DealScorecardCardProps) {
  const metrics = useMemo(() => buildMetrics(financials), [financials]);

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-[#CCCCCC] overflow-hidden ${className}`} style={{ background: '#FFFFFF' }}>
        <div className="p-5 border-b border-[#F2F2F2]">
          <div className="h-4 w-36 animate-shimmer rounded" />
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#F2F2F2]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 space-y-2">
              <div className="h-3 w-24 animate-shimmer rounded" />
              <div className="h-6 w-20 animate-shimmer rounded" />
              <div className="h-3 w-28 animate-shimmer rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-[#CCCCCC] overflow-hidden ${className}`}
      style={{ background: '#FFFFFF' }}
    >
      <div className="px-5 py-4 border-b border-[#F2F2F2]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F7F7F]">
          Pre-Deal Scorecard
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#F2F2F2]">
        {metrics.map((tile) => {
          const { Icon, color, bg } = TREND_META[tile.trend];

          return (
            <div key={tile.label} className="bg-white p-5 flex flex-col justify-between min-h-[110px]">
              <div className="flex items-start justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#A5A5A5]">
                  {tile.label}
                </p>
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                  style={{ background: bg, color }}
                >
                  <Icon className="w-2.5 h-2.5" aria-hidden="true" />
                  {tile.pass !== null ? (tile.pass ? 'On Track' : 'Review') : 'N/A'}
                </div>
              </div>

              <div className="mt-2">
                <p
                  className="text-xl font-normal tracking-tighter text-[#0D0D0D]"
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                >
                  {tile.value}
                </p>
                {tile.sub && (
                  <p className="text-[10px] text-[#A5A5A5] font-medium mt-0.5">{tile.sub}</p>
                )}
              </div>

              <p className="text-[8px] font-bold uppercase tracking-widest text-[#CCCCCC] mt-2">
                {tile.benchmark}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
