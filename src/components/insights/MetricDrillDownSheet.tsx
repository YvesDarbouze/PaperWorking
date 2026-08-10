'use client';

import React, { useEffect, useRef } from 'react';
import type { MetricResult } from '@/lib/metrics/types';
import { MetricReadout, MetricFormat } from '@/components/metrics/MetricReadout';
import { X, ExternalLink, ArrowRight } from 'lucide-react';
import { getVariableProvenance } from '@/lib/identity/provenance';
import { ACQUISITION_VARIABLE_REGISTRY } from '@/lib/metrics/acquisitionVariableRegistry';

function getFieldRegistryId(path: string): string {
  const clean = path.split('.').pop() ?? path;
  
  const aliasMap: Record<string, string> = {
    monthlyGrossRent: 'gross_rent_per_unit',
    grossRent: 'gross_rent_per_unit',
    vacancyRatePercent: 'vacancy_pct',
    holdingCostTaxes: 'tax',
    taxes: 'tax',
    holdingCostInsurance: 'insurance',
    monthlyMaintenanceReserve: 'maintenance',
    maintenance_pct: 'maintenance_pct',
    propertyManagementFeePercent: 'management_pct',
    netOperatingIncome: 'operating_income',
    loanTermYears: 'loan_term',
    loanTerm: 'loan_term',
    loanInterestRate: 'loan_interest_rate',
    loanAmount: 'loan_amount',
    purchasePrice: 'purchase_price',
    projectedRehabCost: 'rehab_budget',
    rehabBudget: 'rehab_budget',
  };

  if (aliasMap[clean]) {
    return aliasMap[clean];
  }
  
  const direct = ACQUISITION_VARIABLE_REGISTRY.find(
    (f) => f.id === clean || f.fieldPath === path || f.id === path
  );
  if (direct) {
    return direct.id;
  }

  return clean.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function getFocusParamForField(registryId: string): string {
  const map: Record<string, string> = {
    purchase_price: 'purchasePrice',
    rehab_budget: 'rehab',
    projectedRehabCost: 'rehab',
    loan_amount: 'financing',
    loan_interest_rate: 'financing',
    loan_term: 'financing',
    loanOriginationPoints: 'financing',
    gross_rent_per_unit: 'income',
    vacancy_pct: 'income',
    tax: 'tax',
    insurance: 'tax',
    utilities: 'tax',
    management_pct: 'tax',
    management: 'tax',
    maintenance: 'tax',
    maintenance_pct: 'tax',
    HOA: 'tax',
    psa: 'psa',
    emdAmount: 'earnest_money',
    inspection: 'inspection',
    title: 'title',
  };
  return map[registryId] || registryId;
}

function getDocumentLabelForField(registryId: string): string {
  const map: Record<string, string> = {
    purchase_price: 'Purchase Agreement',
    rehab_budget: 'Rehab Bid / Estimate',
    projectedRehabCost: 'Rehab Bid / Estimate',
    loan_amount: 'Lender Term Sheet',
    loan_interest_rate: 'Lender Term Sheet',
    loan_term: 'Lender Term Sheet',
    loanOriginationPoints: 'Lender Term Sheet',
    gross_rent_per_unit: 'Lease Agreement',
    vacancy_pct: 'Market Report / Underwriting',
    tax: 'Property Tax Assessment',
    insurance: 'Insurance Quote',
    utilities: 'Utility Bill',
    management_pct: 'Management Agreement',
    management: 'Management Agreement',
    maintenance: 'Maintenance Ledger',
    maintenance_pct: 'Maintenance Ledger',
    HOA: 'HOA Statement',
    psa: 'Purchase Agreement',
    emdAmount: 'Earnest Money Escrow Receipt',
    inspection: 'Inspection Report',
    title: 'Title Commitment',
  };
  return map[registryId] || 'Document Attachment';
}



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
  PRICE_TO_RENT: {
    formula: 'Price-to-Rent = Median Home Price ÷ Average Annual Rent',
    description: 'Price-to-Rent Ratio compares home purchase prices to average rental rates. A high ratio indicates a better environment for renting out properties, as people are priced out of buying.',
    sourceRoute: '/dashboard/insights',
    sourceLabel: 'Insights Dashboard',
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
function formatInputValue(value: number | string, registryId?: string): string {
  if (typeof value === 'string') return value;

  let val = value;
  const centFields = ['purchase_price', 'loan_amount', 'rehab_budget', 'projectedRehabCost', 'asking_price', 'final_agreed_price'];
  if (registryId && centFields.includes(registryId)) {
    val = value / 100;
  }

  const isUsd = registryId ? (ACQUISITION_VARIABLE_REGISTRY.some(f => f.id === registryId && f.type === 'usd') || registryId === 'tax' || registryId === 'insurance' || registryId === 'utilities') : false;
  if (isUsd) {
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
    return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  if (Math.abs(val) < 1 && val !== 0) return `${(val * 100).toFixed(2)}%`;
  return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export interface MetricDrillDownSheetProps {
  isOpen: boolean;
  onClose: () => void;
  metricId: string;
  metricLabel: string;
  result: MetricResult;
  format: MetricFormat;
  project?: any;
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
  project,
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
                {inputEntries.map(([path, value]) => {
                  const registryId = getFieldRegistryId(path);
                  const provenance = project ? getVariableProvenance(registryId, project) : 'user_assumption';
                  const isDocument = provenance === 'document';
                  const focusParam = getFocusParamForField(registryId);
                  const docLabel = getDocumentLabelForField(registryId);

                  return (
                    <div
                      key={path}
                      className="py-2 border-b border-white/[0.04] last:border-0 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#9E9DA0]">{humanizeFieldPath(path)}</span>
                        <span className="text-xs font-mono font-semibold text-white tabular-nums">
                          {formatInputValue(value, registryId)}
                        </span>
                      </div>
                      {isDocument && project && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-300 font-medium">Source:</span>
                          <a
                            href={`/dashboard/projects/${project.id}/phase-1?focus=${focusParam}`}
                            className="text-[10px] text-slate-300/90 hover:text-slate-300 font-medium underline flex items-center gap-0.5"
                          >
                            {docLabel}
                            <ExternalLink className="w-2.5 h-2.5 inline" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
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
