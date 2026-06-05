'use client';

import React, { useEffect, useRef } from 'react';
import type { MetricResult } from '@/lib/metrics/types';
import { MetricReadout, MetricFormat } from '@/components/metrics/MetricReadout';
import { X, ExternalLink, ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   MetricDrillDownSheet — Slide-in right panel for metric details

   Triggered by clicking any metric card in the Insights hub.
   Shows: chart, current value + state pill, formula display,
   inputs used, and "Navigate to source" deep links.
   ═══════════════════════════════════════════════════════════════ */

/** Configuration for each metric's formula + source screen */
const METRIC_CONFIG: Record<string, {
  formula: string;
  description: string;
  sourceRoute: string;
  sourceLabel: string;
}> = {
  NOI: {
    formula: 'NOI = Gross Rental Income + Other Income − Vacancy Loss − Operating Expenses',
    description: 'Net Operating Income measures property-level profitability before debt service.',
    sourceRoute: '/dashboard/intelligence/noi',
    sourceLabel: 'NOI Detail',
  },
  CASH_FLOW: {
    formula: 'Cash Flow = NOI − Annual Debt Service',
    description: 'After-debt cash flow available to the investor.',
    sourceRoute: '/dashboard/intelligence/cash-flow',
    sourceLabel: 'Cash Flow Detail',
  },
  CAP_RATE: {
    formula: 'Cap Rate = NOI ÷ Property Value × 100',
    description: 'Capitalization rate measuring return on property value.',
    sourceRoute: '/dashboard/intelligence/cap-rate',
    sourceLabel: 'Cap Rate Detail',
  },
  COC: {
    formula: 'CoC = Annual Cash Flow ÷ Total Cash Invested × 100',
    description: 'Cash-on-Cash return measuring cash yield relative to equity deployed.',
    sourceRoute: '/dashboard/intelligence/coc',
    sourceLabel: 'CoC Detail',
  },
  DSCR: {
    formula: 'DSCR = NOI ÷ Annual Debt Service',
    description: 'Debt Service Coverage Ratio — must be >1.0 for positive cash flow.',
    sourceRoute: '/dashboard/intelligence/dscr',
    sourceLabel: 'DSCR Detail',
  },
  GRM: {
    formula: 'GRM = Property Value ÷ Annual Gross Rent',
    description: 'Gross Rent Multiplier — lower = better value per rent dollar.',
    sourceRoute: '/dashboard/intelligence/grm',
    sourceLabel: 'GRM Detail',
  },
  IRR: {
    formula: 'IRR = Rate where NPV of all cash flows = 0',
    description: 'Internal Rate of Return accounting for time value of money.',
    sourceRoute: '/dashboard/intelligence/irr',
    sourceLabel: 'IRR Detail',
  },
  OCCUPANCY: {
    formula: 'Occupancy = Occupied Units ÷ Total Units × 100',
    description: 'Percentage of available units currently generating income.',
    sourceRoute: '/dashboard/intelligence/occupancy',
    sourceLabel: 'Occupancy Detail',
  },
  OER: {
    formula: 'OER = Total Operating Expenses ÷ Gross Operating Income × 100',
    description: 'Operating Expense Ratio — lower is more efficient.',
    sourceRoute: '/dashboard/intelligence/oer',
    sourceLabel: 'Expense Ratio Detail',
  },
  APPRECIATION: {
    formula: 'Appreciation = (Current Value − Purchase Price) ÷ Purchase Price × 100',
    description: 'Annual property value appreciation rate.',
    sourceRoute: '/dashboard/intelligence/appreciation',
    sourceLabel: 'Appreciation Detail',
  },
};

/** Convert a field path to a readable label */
function humanizeFieldPath(path: string): string {
  const field = path.split('.').pop() ?? path;
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/** Format values for the inputs table */
function formatInputValue(value: number | string): string {
  if (typeof value === 'string') return value;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  if (Math.abs(value) < 1 && value !== 0) return `${(value * 100).toFixed(2)}%`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export interface MetricDrillDownSheetProps {
  isOpen: boolean;
  onClose: () => void;
  metricId: string;
  metricLabel: string;
  result: MetricResult;
  format: MetricFormat;
  /** Optional sparkline data for the mini chart */
  sparklineData?: { date: string; value: number }[];
}

export function MetricDrillDownSheet({
  isOpen,
  onClose,
  metricId,
  metricLabel,
  result,
  format,
  sparklineData,
}: MetricDrillDownSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [isOpen, onClose]);

  const config = METRIC_CONFIG[metricId];
  const inputEntries = Object.entries(result.inputsUsed);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 bottom-0 z-50 w-[440px] max-w-[90vw] flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(24,33,39,0.97) 0%, rgba(13,10,11,0.99) 100%)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-0.5">
              Metric Detail
            </p>
            <h2 className="text-xl font-bold text-white tracking-tight">{metricLabel}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-[#9E9DA0] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">

          {/* Current value card */}
          <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <MetricReadout
              label={metricLabel}
              result={result}
              format={format}
              compact={false}
            />
          </div>

          {/* Sparkline chart (simple SVG) */}
          {sparklineData && sparklineData.length >= 2 && (
            <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-3">
                Historical Trend
              </p>
              <MiniSparkline data={sparklineData} />
            </div>
          )}

          {/* Formula display */}
          {config && (
            <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-2">
                Formula
              </p>
              <p className="text-sm text-[#6E7480] font-mono leading-relaxed">
                {config.formula}
              </p>
              <p className="text-xs text-[#9E9DA0] mt-2 leading-relaxed">
                {config.description}
              </p>
            </div>
          )}

          {/* Inputs used */}
          {inputEntries.length > 0 && (
            <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-3">
                Inputs Used
              </p>
              <div className="space-y-2">
                {inputEntries.map(([path, value]) => (
                  <div
                    key={path}
                    className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
                  >
                    <span className="text-xs text-[#9E9DA0]">{humanizeFieldPath(path)}</span>
                    <span className="text-xs font-mono font-semibold text-white tabular-nums">
                      {formatInputValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing inputs */}
          {result.inputsMissing.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 p-5" style={{ background: 'rgba(245,158,11,0.05)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 mb-2">
                Missing Inputs
              </p>
              <ul className="space-y-1.5">
                {result.inputsMissing.map((field) => (
                  <li key={field} className="text-xs text-amber-300/70 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50 shrink-0" />
                    {humanizeFieldPath(field)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer — Navigate to source */}
        {config && (
          <div className="px-6 py-4 border-t border-white/[0.08]">
            <a
              href={config.sourceRoute}
              className="w-full py-3 rounded-xl border border-[#454955]/30 bg-[#454955]/10 hover:bg-[#454955]/20
                transition-all font-semibold text-sm text-[#6E7480] flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open {config.sourceLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </>
  );
}

/** Lightweight SVG sparkline for the drill-down sheet */
function MiniSparkline({ data }: { data: { date: string; value: number }[] }) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const w = 360;
  const h = 80;
  const padding = 8;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * innerW;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  // Area fill path
  const firstX = padding;
  const lastX = padding + innerW;
  const areaPath = `M${firstX},${h - padding} L${points.replace(/,/g, ' ').split(' ').reduce((acc, _, i, arr) => {
    if (i % 2 === 0) acc.push(`${arr[i]},${arr[i + 1]}`);
    return acc;
  }, [] as string[]).join(' L')} L${lastX},${h - padding} Z`;

  const lastVal = values[values.length - 1];
  const prevVal = values[values.length - 2];
  const isUp = lastVal >= prevVal;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? 'rgba(69, 73, 85,0.3)' : 'rgba(239,68,68,0.3)'} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkGrad)" />
        <polyline
          points={points}
          fill="none"
          stroke={isUp ? '#454955' : '#F06543'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Latest point dot */}
        {values.length > 0 && (() => {
          const lastI = values.length - 1;
          const cx = padding + (lastI / (values.length - 1)) * innerW;
          const cy = padding + innerH - ((values[lastI] - min) / range) * innerH;
          return (
            <circle cx={cx} cy={cy} r="4" fill={isUp ? '#454955' : '#F06543'} stroke="#0d0a0b" strokeWidth="2" />
          );
        })()}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#6B6870] font-mono">{data[0]?.date}</span>
        <span className="text-[9px] text-[#6B6870] font-mono">{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export default MetricDrillDownSheet;
