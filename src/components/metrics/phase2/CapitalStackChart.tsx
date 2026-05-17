'use client';

import React, { useMemo } from 'react';
import { ProjectFinancials } from '@/types/schema';

function formatCurrency(val: number) {
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
  return `${sign}$${absVal.toLocaleString()}`;
}

export interface CapitalStackChartProps {
  financials: ProjectFinancials;
  className?: string;
  isLoading?: boolean;
}

interface StackSegment {
  key: string;
  label: string;
  amount: number;
  color: string;
  textColor: string;
}

function buildSegments(financials: ProjectFinancials): StackSegment[] {
  const {
    purchasePrice = 0,
    loanAmount = 0,
    fixedAcquisitionCosts = 0,
    projectedRehabCost = 0,
  } = financials;

  const equity = Math.max(purchasePrice - loanAmount, 0);
  const reserve = (financials.financingCashInvested || 0) > equity
    ? financials.financingCashInvested! - equity
    : 0;

  return [
    { key: 'equity', label: 'Equity', amount: equity, color: '#0D0D0D', textColor: '#FFFFFF' },
    { key: 'debt', label: 'Debt', amount: loanAmount, color: '#595959', textColor: '#FFFFFF' },
    { key: 'acquisition', label: 'Acq. Costs', amount: fixedAcquisitionCosts, color: '#7F7F7F', textColor: '#FFFFFF' },
    { key: 'rehab', label: 'Rehab', amount: projectedRehabCost, color: '#A5A5A5', textColor: '#595959' },
    { key: 'reserve', label: 'Reserve', amount: reserve, color: '#CCCCCC', textColor: '#595959' },
  ].filter((s) => s.amount > 0);
}

export default function CapitalStackChart({
  financials,
  className = '',
  isLoading = false,
}: CapitalStackChartProps) {
  const segments = useMemo(() => buildSegments(financials), [financials]);

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-[#CCCCCC] p-6 space-y-4 ${className}`} style={{ background: '#FFFFFF' }}>
        <div className="h-4 w-36 animate-shimmer rounded" />
        <div className="h-12 animate-shimmer rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-shimmer rounded" />
          ))}
        </div>
      </div>
    );
  }

  const total = segments.reduce((acc, s) => acc + s.amount, 0);

  if (total === 0) {
    return (
      <div
        className={`rounded-lg border border-[#CCCCCC] p-6 flex items-center justify-center min-h-[160px] ${className}`}
        style={{ background: '#FFFFFF' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#A5A5A5]">
          No capital data — enter financials to visualize stack
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-[#CCCCCC] overflow-hidden ${className}`}
      style={{ background: '#FFFFFF' }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F7F7F]">Capital Stack</p>
            <p
              className="text-2xl font-normal tracking-tighter text-[#0D0D0D] mt-1"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              {formatCurrency(total)}
            </p>
            <p className="text-[10px] text-[#A5A5A5] mt-0.5">Total deployment</p>
          </div>
        </div>

        <div
          className="flex h-12 rounded-lg overflow-hidden w-full mb-5"
          role="img"
          aria-label="Capital stack horizontal bar chart"
        >
          {segments.map((seg) => {
            const pct = (seg.amount / total) * 100;
            return (
              <div
                key={seg.key}
                className="relative flex items-center justify-center h-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: seg.color,
                  minWidth: pct < 3 ? '2px' : undefined,
                }}
                title={`${seg.label}: ${formatCurrency(seg.amount)} (${pct.toFixed(1)}%)`}
              >
                {pct > 8 && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide select-none"
                    style={{ color: seg.textColor }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-px bg-[#F2F2F2] rounded-lg overflow-hidden border border-[#F2F2F2]">
          {segments.map((seg) => {
            const pct = total > 0 ? (seg.amount / total) * 100 : 0;
            return (
              <div key={seg.key} className="bg-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: seg.color }} />
                  <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.12em]">
                    {seg.label}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <span
                    className="text-sm font-bold tracking-tight text-[#0D0D0D] tabular-nums"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {formatCurrency(seg.amount)}
                  </span>
                  <span className="text-[10px] font-bold text-[#A5A5A5] w-10 text-right tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded bg-[#F2F2F2] px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A5A5A5]">LTV</p>
            <p className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {(financials.purchasePrice ?? 0) > 0
                ? `${(((financials.loanAmount ?? 0) / (financials.purchasePrice ?? 1)) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </div>
          <div className="rounded bg-[#F2F2F2] px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A5A5A5]">Equity %</p>
            <p className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {total > 0
                ? `${(((segments.find((s) => s.key === 'equity')?.amount ?? 0) / total) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
