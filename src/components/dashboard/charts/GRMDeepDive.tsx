'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveAllMetrics, computeGRM } from '@/lib/metrics/reiMetrics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Filter, TrendingDown, AlertTriangle, Search,
  DollarSign, BarChart3, Info, ArrowDownUp,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   GROSS RENT MULTIPLIER (GRM) DEEP DIVE
   GRM = Property Price ÷ Gross Annual Rent

   Quick-filter metric to screen properties BEFORE deep analysis.
   Lower GRM = more rent relative to price.

   Sections:
   1. KPI strip: GRM, Purchase Price, Annual Rent, Monthly Rent
   2. GRM gauge — visual classification
   3. GRM vs deeper metrics radar (shows what GRM ignores)
   4. Portfolio comparison bar chart
   5. "What GRM doesn't show" educational callout
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  projects?: Project[];
}

/* ── Formatting ── */
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/* ── GRM Classification ── */
type GRMGrade = 'excellent' | 'strong' | 'moderate' | 'high' | 'very-high';

function classifyGRM(grm: number): {
  grade: GRMGrade;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (grm <= 0) return {
    grade: 'very-high', label: 'No Data',
    description: 'Missing price or rent data',
    color: '#94A3B8', bgColor: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.2)',
  };
  if (grm <= 8) return {
    grade: 'excellent', label: 'Excellent — High Relative Rent',
    description: 'Strong rent relative to price. Worth full analysis.',
    color: '#10B981', bgColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)',
  };
  if (grm <= 12) return {
    grade: 'strong', label: 'Acceptable — Typical Range',
    description: 'Reasonable rent-to-price. Common in stable markets.',
    color: '#3B82F6', bgColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)',
  };
  if (grm <= 15) return {
    grade: 'moderate', label: 'Moderate — Run Deeper Numbers',
    description: 'Rent may not justify price. Verify with NOI and Cash Flow.',
    color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)',
  };
  if (grm <= 20) return {
    grade: 'high', label: 'High — Appreciation Play?',
    description: 'Low rent relative to price. Only works if appreciation is strong.',
    color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)',
  };
  return {
    grade: 'very-high', label: 'Very High — Proceed with Caution',
    description: 'Rent barely covers price. Unlikely to cash-flow without major concessions.',
    color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)',
  };
}

/* ── Per-property data ── */
interface PropertyGRMData {
  name: string;
  grm: number;
  purchasePrice: number;
  grossAnnualRent: number;
  monthlyRent: number;
  // Deeper metrics for radar comparison
  capRate: number;
  cocReturn: number;
  noi: number;
  cashFlow: number;
  classification: ReturnType<typeof classifyGRM>;
}

function deriveGRMBreakdowns(projects: Project[]): PropertyGRMData[] {
  return projects
    .filter(p => p.financials)
    .map((p) => {
      const f = p.financials!;
      const metrics = deriveAllMetrics(f);
      const purchasePrice = f.purchasePrice ?? 0;
      const monthlyRent = f.monthlyGrossRent ?? 0;
      const grossAnnualRent = monthlyRent * 12;

      return {
        name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
        grm: metrics.grossRentMultiplier,
        purchasePrice,
        grossAnnualRent,
        monthlyRent,
        capRate: metrics.capRate,
        cocReturn: metrics.cashOnCashReturn,
        noi: metrics.noi,
        cashFlow: metrics.annualCashFlow,
        classification: classifyGRM(metrics.grossRentMultiplier),
      };
    })
    .slice(0, 8);
}

/* ── Custom tooltip ── */
function GRMTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg text-xs"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
      <p className="tabular-nums" style={{ color: '#3B82F6' }}>
        GRM: {(d.GRM ?? d.grm ?? 0).toFixed(1)}×
      </p>
      <p className="tabular-nums" style={{ color: '#10B981' }}>
        Annual Rent: {fmtUSD(d.grossAnnualRent ?? 0)}
      </p>
      <p className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        Price: {fmtUSD(d.purchasePrice ?? 0)}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function GRMDeepDive({ projects: propProjects }: Props) {
  const breakdowns = useMemo(
    () => deriveGRMBreakdowns(propProjects || []),
    [propProjects]
  );

  /* ── Portfolio aggregation ── */
  const aggregate = useMemo(() => {
    if (breakdowns.length === 0) return null;
    const totalPrice = breakdowns.reduce((s, b) => s + b.purchasePrice, 0);
    const totalRent = breakdowns.reduce((s, b) => s + b.grossAnnualRent, 0);
    const portfolioGRM = totalRent > 0 ? totalPrice / totalRent : 0;
    const avgCapRate = breakdowns.reduce((s, b) => s + b.capRate, 0) / breakdowns.length;
    const avgCoCReturn = breakdowns.reduce((s, b) => s + b.cocReturn, 0) / breakdowns.length;
    const totalNOI = breakdowns.reduce((s, b) => s + b.noi, 0);
    const totalCashFlow = breakdowns.reduce((s, b) => s + b.cashFlow, 0);
    return {
      totalPrice,
      totalRent,
      portfolioGRM: Math.round(portfolioGRM * 100) / 100,
      avgCapRate,
      avgCoCReturn,
      totalNOI,
      totalCashFlow,
    };
  }, [breakdowns]);

  if (!aggregate || aggregate.totalRent === 0) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Search className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add a property with purchase price and monthly rent to see your Gross Rent Multiplier.
        </p>
      </div>
    );
  }

  const classification = classifyGRM(aggregate.portfolioGRM);

  /* ── GRM gauge segments ── */
  const gaugeSegments = [
    { min: 0, max: 8, label: '≤8', color: '#10B981', description: 'Excellent' },
    { min: 8, max: 12, label: '8–12', color: '#3B82F6', description: 'Typical' },
    { min: 12, max: 15, label: '12–15', color: '#F59E0B', description: 'Moderate' },
    { min: 15, max: 20, label: '15–20', color: '#EF4444', description: 'High' },
    { min: 20, max: 25, label: '20+', color: '#DC2626', description: 'Very High' },
  ];

  /* ── "What GRM ignores" radar ── */
  const radarData = breakdowns.length === 1
    ? (() => {
        const b = breakdowns[0];
        // Normalize each metric to 0-100 for radar display
        const normGRM = Math.max(0, 100 - (b.grm / 25) * 100); // Inverted: lower GRM = higher score
        const normCapRate = Math.min(100, (b.capRate / 10) * 100);
        const normCoC = Math.min(100, (b.cocReturn / 15) * 100);
        const normNOI = Math.min(100, (b.noi / 20000) * 100);
        const normCF = Math.min(100, Math.max(0, (b.cashFlow / 10000) * 100));
        return [
          { metric: 'GRM Score', value: normGRM, fullMark: 100 },
          { metric: 'Cap Rate', value: normCapRate, fullMark: 100 },
          { metric: 'CoC Return', value: normCoC, fullMark: 100 },
          { metric: 'NOI', value: normNOI, fullMark: 100 },
          { metric: 'Cash Flow', value: normCF, fullMark: 100 },
        ];
      })()
    : null;

  /* ── What-if: different purchase prices ── */
  const priceScenarios = [-20, -10, 0, 10, 20, 30].map(pctDelta => {
    const adjustedPrice = aggregate.totalPrice * (1 + pctDelta / 100);
    const adjustedGRM = aggregate.totalRent > 0 ? adjustedPrice / aggregate.totalRent : 0;
    return {
      delta: pctDelta,
      price: adjustedPrice,
      grm: Math.round(adjustedGRM * 100) / 100,
    };
  });

  return (
    <div className="w-full space-y-6">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <Filter className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Gross Rent Multiplier (GRM) — Quick Screen
            </h3>
            <p className="text-xs text-text-secondary">
              Property Price ÷ Annual Rent = how many years of rent to pay off the price
            </p>
          </div>
        </div>
        {/* Classification badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Filter,
            label: 'Gross Rent Multiplier',
            value: `${aggregate.portfolioGRM.toFixed(1)}×`,
            sublabel: `${fmtUSD(aggregate.totalPrice)} ÷ ${fmtUSD(aggregate.totalRent)}/yr`,
            color: classification.color,
          },
          {
            icon: DollarSign,
            label: 'Purchase Price',
            value: fmtUSD(aggregate.totalPrice),
            sublabel: `Across ${breakdowns.length} propert${breakdowns.length > 1 ? 'ies' : 'y'}`,
            color: 'var(--text-primary)',
          },
          {
            icon: TrendingDown,
            label: 'Gross Annual Rent',
            value: fmtUSD(aggregate.totalRent),
            sublabel: `${fmtUSD(Math.round(aggregate.totalRent / 12))}/mo before expenses`,
            color: '#10B981',
          },
          {
            icon: Search,
            label: 'Screening Verdict',
            value: aggregate.portfolioGRM <= 12 ? 'Pass' : aggregate.portfolioGRM <= 15 ? 'Review' : 'Caution',
            sublabel: aggregate.portfolioGRM <= 12
              ? 'Rent-to-price ratio supports further analysis'
              : aggregate.portfolioGRM <= 15
                ? 'Borderline — verify with NOI and cash flow'
                : 'High GRM — likely needs strong appreciation',
            color: aggregate.portfolioGRM <= 12 ? '#10B981' : aggregate.portfolioGRM <= 15 ? '#F59E0B' : '#EF4444',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="rounded-lg p-4 flex flex-col gap-2"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {kpi.label}
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {kpi.value}
            </p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              {kpi.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* ── GRM Gauge ── */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
          GRM Classification Scale
        </h4>
        <div className="flex w-full rounded-lg overflow-hidden" style={{ height: '28px' }}>
          {gaugeSegments.map((seg, i) => {
            const isActive = aggregate.portfolioGRM >= seg.min && aggregate.portfolioGRM < (i === gaugeSegments.length - 1 ? Infinity : seg.max);
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-wider transition-all relative"
                style={{
                  background: isActive ? seg.color : `${seg.color}22`,
                  color: isActive ? '#fff' : seg.color,
                  opacity: isActive ? 1 : 0.6,
                  borderRight: i < gaugeSegments.length - 1 ? '1px solid var(--bg-surface)' : 'none',
                }}
              >
                {seg.label}
                {isActive && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold" style={{ color: seg.color }}>
                    ▲ {aggregate.portfolioGRM.toFixed(1)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-7 px-1">
          {gaugeSegments.map((seg, i) => (
            <span key={i} className="text-[9px] font-medium flex-1 text-center" style={{ color: seg.color }}>
              {seg.description}
            </span>
          ))}
        </div>
      </div>

      {/* ── Radar: GRM vs Deeper Metrics + Sensitivity Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar — single property only */}
        {radarData && (
          <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col items-center" style={{ minHeight: '280px' }}>
            <div className="flex items-center gap-2 mb-3 self-start">
              <Info className="w-4 h-4" style={{ color: '#6366F1' }} />
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
                GRM vs Deeper Metrics
              </h4>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--text-secondary)' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Property Score"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-[9px] text-text-secondary opacity-50 mt-1 text-center">
              Higher area = stronger performance across all metrics. GRM alone fills only one axis.
            </p>
          </div>
        )}

        {/* Price Sensitivity Table */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
              GRM Sensitivity — "What If the Price Changes?"
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                    Price Change
                  </th>
                  <th className="px-3 py-2 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                    Purchase Price
                  </th>
                  <th className="px-3 py-2 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                    GRM
                  </th>
                  <th className="px-3 py-2 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                    Screening
                  </th>
                </tr>
              </thead>
              <tbody>
                {priceScenarios.map((row) => {
                  const cls = classifyGRM(row.grm);
                  const isCurrent = row.delta === 0;
                  return (
                    <tr key={row.delta}>
                      <td
                        className="px-3 py-2 font-bold"
                        style={{
                          color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                          borderBottom: '1px solid var(--border-ui)',
                        }}
                      >
                        {isCurrent ? 'Current' : `${row.delta > 0 ? '+' : ''}${row.delta}%`}
                      </td>
                      <td
                        className="px-3 py-2 text-center tabular-nums"
                        style={{
                          color: 'var(--text-primary)',
                          fontWeight: isCurrent ? 700 : 500,
                          borderBottom: '1px solid var(--border-ui)',
                        }}
                      >
                        {fmtUSD(Math.round(row.price))}
                      </td>
                      <td
                        className="px-3 py-2 text-center tabular-nums"
                        style={{
                          color: cls.color,
                          fontWeight: isCurrent ? 700 : 500,
                          background: isCurrent ? cls.bgColor : 'transparent',
                          borderRadius: isCurrent ? '4px' : '0',
                          borderBottom: '1px solid var(--border-ui)',
                        }}
                      >
                        {row.grm.toFixed(1)}×
                      </td>
                      <td
                        className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: cls.color, borderBottom: '1px solid var(--border-ui)' }}
                      >
                        {row.grm <= 12 ? 'Pass' : row.grm <= 15 ? 'Review' : 'Caution'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Per-Property Comparison ── */}
      {breakdowns.length > 1 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '300px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            GRM by Property — Lower = Better Rent-to-Price
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdowns.map(b => ({
                  name: b.name,
                  GRM: b.grm,
                  grossAnnualRent: b.grossAnnualRent,
                  purchasePrice: b.purchasePrice,
                }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  fontSize={10}
                  tickFormatter={(v: number) => `${v}×`}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<GRMTooltip />} />
                {/* Zone lines */}
                <ReferenceLine y={8} stroke="#10B981" strokeDasharray="4 4" label={{ value: '8× excellent', position: 'right', fontSize: 9, fill: '#10B981' }} />
                <ReferenceLine y={12} stroke="#3B82F6" strokeDasharray="4 4" label={{ value: '12× typical', position: 'right', fontSize: 9, fill: '#3B82F6' }} />
                <ReferenceLine y={15} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: '15× moderate', position: 'right', fontSize: 9, fill: '#F59E0B' }} />
                <Bar dataKey="GRM" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {breakdowns.map((b, i) => (
                    <Cell key={i} fill={b.classification.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── What GRM Doesn't Tell You ── */}
      <div
        className="rounded-xl p-5"
        style={{
          background: 'rgba(245,158,11,0.04)',
          border: '1px solid rgba(245,158,11,0.15)',
        }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <div className="space-y-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>GRM is a screening tool, not a decision tool.</strong>{' '}
              It answers "Is this property worth analyzing further?" — not "Is this a good investment?"
            </p>
            <p>
              <strong style={{ color: '#EF4444' }}>What GRM ignores:</strong>{' '}
              Operating expenses (taxes, insurance, maintenance, management), vacancy losses, financing costs (mortgage),
              and closing costs. A property with a low GRM but sky-high maintenance could still lose money.
            </p>
            <p>
              <strong style={{ color: '#10B981' }}>When to use:</strong>{' '}
              Screen dozens of properties quickly. If GRM ≤ 12, run the full analysis (NOI → Cash Flow → Cap Rate → CoC Return).
              If GRM &gt; 15, the property needs strong appreciation to make sense.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Formula:</strong>{' '}
              <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>
                GRM = Purchase Price ÷ Gross Annual Rent
              </code>{' '}
              — Lower is better. Think of it as "years of rent to pay off the price."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
