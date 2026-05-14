'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { Home, AlertTriangle, TrendingDown, DollarSign, Target, Users } from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type OccupancyGrade = 'excellent' | 'healthy' | 'caution' | 'risk' | 'critical';

function classifyOccupancy(rate: number): {
  grade: OccupancyGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (rate >= 97) return { grade: 'excellent', label: 'Near-Full Occupancy', description: 'Exceptional retention — consider if rents are below market', color: '#10B981', bgColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' };
  if (rate >= 93) return { grade: 'healthy', label: 'Healthy Occupancy', description: 'Strong demand with normal turnover — 5-7% vacancy is optimal', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' };
  if (rate >= 88) return { grade: 'caution', label: 'Below National Average', description: 'U.S. average is ~90% — review pricing, marketing, and property condition', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' };
  if (rate >= 80) return { grade: 'risk', label: 'High Vacancy Risk', description: 'Significant income loss — investigate market conditions and tenant retention', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'critical', label: 'Critical Vacancy', description: 'Severe cash flow impact — property may be losing money', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}

function OccTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg px-3 py-2 shadow-lg text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
      <p className="tabular-nums" style={{ color: '#3B82F6' }}>Occupancy: {fmtPct(d.occupancy)}</p>
      <p className="tabular-nums" style={{ color: '#EF4444' }}>Vacancy: {fmtPct(100 - d.occupancy)}</p>
    </div>
  );
}

export default function OccupancyDeepDive({ projects: propProjects }: Props) {
  const analysis = useMemo(() => {
    const projects = (propProjects || []).filter(p => p.financials);
    if (projects.length === 0) return null;

    const breakdowns = projects.map(p => {
      const m = deriveAllMetrics(p.financials!);
      return {
        name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
        occupancyRate: m.occupancyRate,
        vacancyRate: m.vacancyRate,
        breakEvenOccupancy: m.breakEvenOccupancyRate,
        annualCashFlow: m.annualCashFlow,
        noi: m.noi,
        grossRent: m.noiComponents.grossRentalIncome,
      };
    }).slice(0, 8);

    const primary = breakdowns[0];
    const classification = classifyOccupancy(primary.occupancyRate);

    // Revenue impact analysis: what cash flow looks like at different vacancy rates
    const vacancyScenarios = [0, 3, 5, 7, 10, 15, 20].map(vacPct => {
      const effectiveIncome = primary.grossRent * (1 - vacPct / 100);
      const noiAtVac = effectiveIncome - (primary.grossRent - primary.noi - (primary.grossRent * primary.vacancyRate / 100));
      // Simplified: just show revenue lost
      const revenueLost = primary.grossRent * (vacPct / 100);
      const monthlyLost = revenueLost / 12;
      return {
        vacancy: vacPct,
        occupancy: 100 - vacPct,
        revenueLost,
        monthlyLost,
        isCurrent: Math.abs(vacPct - primary.vacancyRate) < 1,
      };
    });

    // Occupancy vs break-even gap
    const cushion = primary.occupancyRate - primary.breakEvenOccupancy;

    return { breakdowns, primary, classification, vacancyScenarios, cushion };
  }, [propProjects]);

  if (!analysis) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Home className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add rental income data to see your Occupancy Rate analysis.
        </p>
      </div>
    );
  }

  const { primary, classification, vacancyScenarios, cushion } = analysis;

  const gaugeSegments = [
    { min: 0, max: 80, label: '<80%', color: '#DC2626', desc: 'Critical' },
    { min: 80, max: 88, label: '80-88%', color: '#EF4444', desc: 'High Risk' },
    { min: 88, max: 93, label: '88-93%', color: '#F59E0B', desc: 'Below Avg' },
    { min: 93, max: 97, label: '93-97%', color: '#3B82F6', desc: 'Healthy' },
    { min: 97, max: 100, label: '97%+', color: '#10B981', desc: 'Full' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <Home className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Occupancy Rate</h3>
            <p className="text-xs text-text-secondary">How much of the year your property has paying tenants — U.S. average is ~90%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}>
          <Home className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Home, label: 'Occupancy Rate', value: fmtPct(primary.occupancyRate), sublabel: `${fmtPct(primary.vacancyRate)} vacancy`, color: classification.color },
          { icon: TrendingDown, label: 'Break-Even Occupancy', value: fmtPct(primary.breakEvenOccupancy), sublabel: 'Min occupancy to cover all costs', color: '#F59E0B' },
          { icon: DollarSign, label: 'Vacancy Cost', value: `${fmtUSD(Math.round(primary.grossRent * primary.vacancyRate / 100))}/yr`, sublabel: `${fmtUSD(Math.round(primary.grossRent * primary.vacancyRate / 100 / 12))}/mo lost to vacancy`, color: '#EF4444' },
          { icon: Target, label: 'Occupancy Cushion', value: `${cushion >= 0 ? '+' : ''}${cushion.toFixed(1)}%`, sublabel: cushion >= 0 ? 'Above break-even — safe margin' : 'BELOW break-even — losing money', color: cushion >= 0 ? '#10B981' : '#EF4444' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg p-4 flex flex-col gap-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{kpi.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Gauge + Break-Even Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Gauge */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">Occupancy Classification</h4>
          <div className="flex w-full rounded-lg overflow-hidden" style={{ height: '28px' }}>
            {gaugeSegments.map((seg, i) => {
              const isActive = primary.occupancyRate >= seg.min && primary.occupancyRate < (i === gaugeSegments.length - 1 ? 101 : seg.max);
              return (
                <div key={i} className="flex-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-wider transition-all relative"
                  style={{ background: isActive ? seg.color : `${seg.color}22`, color: isActive ? '#fff' : seg.color, opacity: isActive ? 1 : 0.6, borderRight: i < gaugeSegments.length - 1 ? '1px solid var(--bg-surface)' : 'none' }}>
                  {seg.label}
                  {isActive && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold" style={{ color: seg.color }}>▲ {fmtPct(primary.occupancyRate)}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-7 px-1">
            {gaugeSegments.map((seg, i) => <span key={i} className="text-[9px] font-medium flex-1 text-center" style={{ color: seg.color }}>{seg.desc}</span>)}
          </div>
          {/* Big number */}
          <div className="mt-6 text-center">
            <p className="text-4xl font-black tabular-nums" style={{ color: classification.color }}>{fmtPct(primary.occupancyRate)}</p>
            <p className="text-[10px] font-bold mt-1" style={{ color: classification.color }}>{classification.description}</p>
          </div>
        </div>

        {/* Break-Even vs Actual */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: '#6366F1' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Break-Even vs Actual Occupancy</h4>
          </div>

          {/* Visual bar comparison */}
          <div className="space-y-4 mt-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>Actual Occupancy</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: classification.color }}>{fmtPct(primary.occupancyRate)}</span>
              </div>
              <div className="w-full h-4 rounded-full" style={{ background: 'var(--bg-inset)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${primary.occupancyRate}%`, background: classification.color }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>Break-Even Required</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: '#F59E0B' }}>{fmtPct(primary.breakEvenOccupancy)}</span>
              </div>
              <div className="w-full h-4 rounded-full" style={{ background: 'var(--bg-inset)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, primary.breakEvenOccupancy)}%`, background: '#F59E0B' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>U.S. National Average</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: '#6B7280' }}>90.0%</span>
              </div>
              <div className="w-full h-4 rounded-full" style={{ background: 'var(--bg-inset)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: '90%', background: '#6B7280' }} />
              </div>
            </div>
          </div>

          {/* Cushion callout */}
          <div className="mt-4 p-3 rounded-lg" style={{ background: cushion >= 5 ? 'rgba(16,185,129,0.06)' : cushion >= 0 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${cushion >= 5 ? 'rgba(16,185,129,0.15)' : cushion >= 0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
            <p className="text-[10px] font-bold" style={{ color: cushion >= 5 ? '#10B981' : cushion >= 0 ? '#F59E0B' : '#EF4444' }}>
              {cushion >= 5 && `✓ ${cushion.toFixed(1)}% cushion above break-even — comfortable safety margin.`}
              {cushion >= 0 && cushion < 5 && `⚠ Only ${cushion.toFixed(1)}% above break-even — thin margin, minor vacancy increase could erode cash flow.`}
              {cushion < 0 && `✗ ${Math.abs(cushion).toFixed(1)}% BELOW break-even — property is losing money at current occupancy.`}
            </p>
          </div>
        </div>
      </div>

      {/* Vacancy Impact Table */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4" style={{ color: '#EF4444' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;What If Vacancy Changes?&rdquo; — Revenue Impact</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Vacancy Rate', 'Occupancy', 'Annual Revenue Lost', 'Monthly Impact', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vacancyScenarios.map((row) => {
                const cls = classifyOccupancy(row.occupancy);
                return (
                  <tr key={row.vacancy}>
                    <td className="px-3 py-2 font-bold" style={{ color: row.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.vacancy}% {row.isCurrent ? '← current' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: cls.color, background: row.isCurrent ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtPct(row.occupancy)}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: row.revenueLost > 0 ? '#EF4444' : '#10B981', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.revenueLost > 0 ? `-${fmtUSD(Math.round(row.revenueLost))}` : '$0'}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: row.monthlyLost > 0 ? '#EF4444' : '#10B981', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.monthlyLost > 0 ? `-${fmtUSD(Math.round(row.monthlyLost))}/mo` : '$0/mo'}
                    </td>
                    <td className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: cls.color, borderBottom: '1px solid var(--border-ui)' }}>
                      {cls.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Comparison */}
      {analysis.breakdowns.length > 1 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '280px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">Occupancy by Property</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.breakdowns.map(b => ({ name: b.name, occupancy: b.occupancyRate }))} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={40} />
                <YAxis fontSize={10} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} width={35} domain={[0, 100]} />
                <Tooltip content={<OccTooltip />} />
                <ReferenceLine y={90} stroke="#6B7280" strokeDasharray="4 4" label={{ value: '90% U.S. avg', position: 'right', fontSize: 9, fill: '#6B7280' }} />
                <Bar dataKey="occupancy" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {analysis.breakdowns.map((b, i) => <Cell key={i} fill={classifyOccupancy(b.occupancyRate).color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Formula:</strong>{' '}
        <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>Occupancy Rate = (Days Occupied ÷ Total Days) × 100</code>
        <br />
        <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: '#F59E0B' }} />
        <strong style={{ color: '#F59E0B' }}>The 100% trap:</strong>{' '}
        Pro forma projections from sellers often assume 100% occupancy. The U.S. average is ~90%. If your cash flow projections assume 100% but you achieve 92%, you&apos;re short ~8% of expected annual income — enough to turn a profitable deal into a loss.
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Best practice:</strong>{' '}
        Build in 5-10% vacancy. A 5-7% rate signals healthy demand and good tenant retention.
      </div>
    </div>
  );
}
