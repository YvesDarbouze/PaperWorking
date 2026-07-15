'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveDualScopeMetrics } from '@/lib/metrics/reiMetrics';
import { Home, AlertTriangle, TrendingDown, DollarSign, Target, SlidersHorizontal } from 'lucide-react';
import OccupancyChart from '@/components/Charts/OccupancyChart';

interface Props { projects?: Project[]; }

const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type OccupancyGrade = 'excellent' | 'healthy' | 'caution' | 'risk' | 'critical';

function classifyOccupancy(rate: number): {
  grade: OccupancyGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (rate >= 97) return { grade: 'excellent', label: 'Near-Full Occupancy', description: 'Exceptional retention — consider if rents are below market', color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)' };
  if (rate >= 93) return { grade: 'healthy', label: 'Healthy Occupancy', description: 'Strong demand with normal turnover — 5-7% vacancy is optimal', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (rate >= 90) return { grade: 'caution', label: 'Average Occupancy', description: 'Meeting national average ~90% benchmark', color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)' };
  if (rate >= 80) return { grade: 'risk', label: 'Sub-90% Occupancy', description: 'Sustained sub-90% occupancy indicates tenant retention or vacancy issues', color: '#F06543', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'critical', label: 'Critical Vacancy', description: 'Severe cash flow impact — property may be losing money', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}

export default function OccupancyDeepDive({ projects: propProjects }: Props) {
  const isFlip = useMemo(() => {
    const projects = propProjects || [];
    if (projects.length === 0) return false;
    const p = projects[0];
    return p.dispositionType === 'SALE';
  }, [propProjects]);

  const analysis = useMemo(() => {
    const projects = (propProjects || []).filter(p => p.financials);
    if (projects.length === 0) return null;

    const breakdowns = projects
      .filter(p => p.dispositionType !== 'SALE')
      .map(p => {
        const { asset: m } = deriveDualScopeMetrics(p.financials!, undefined, p.dispositionType, p.currentPhase);
        return {
          name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
          occupancyRate: m.occupancyRate,
          vacancyRate: m.vacancyRate,
          breakEvenOccupancy: m.breakEvenOccupancyRate,
          annualCashFlow: m.annualCashFlow,
          noi: m.noi,
          grossRent: m.noiComponents.grossRentalIncome,
          isOccupancyAssumption: m.isOccupancyAssumption,
        };
      })
      .slice(0, 8);

    if (breakdowns.length === 0) return null;

    const primary = breakdowns[0];
    const classification = classifyOccupancy(primary.occupancyRate);

    // Revenue impact analysis: what cash flow looks like at different vacancy rates
    const vacancyScenarios = [0, 3, 5, 7, 10, 15, 20].map(vacPct => {
      const effectiveIncome = primary.grossRent * (1 - vacPct / 100);
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

  if (isFlip) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center space-y-4">
        <div className="p-3 bg-bg-inset rounded-full w-12 h-12 mx-auto flex items-center justify-center">
          <Home className="w-6 h-6 opacity-30 text-text-secondary" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-sm font-bold text-text-primary">Not Applicable (Flip Strategy)</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Occupancy Rate metrics are only tracked for rental properties (Rental and Buy &amp; Hold strategies).
            Fix &amp; Flip projects are short-term renovations targeted for resale and do not generate standard tenancy periods.
          </p>
        </div>
      </div>
    );
  }

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

  const { breakdowns, primary, classification, vacancyScenarios, cushion } = analysis;

  const gaugeSegments = [
    { min: 0, max: 80, label: '<80%', color: '#DC2626', desc: 'Critical' },
    { min: 80, max: 90, label: '80-90%', color: '#F06543', desc: 'Sustained Risk' },
    { min: 90, max: 93, label: '90-93%', color: '#A5A5A5', desc: 'Below Avg' },
    { min: 93, max: 97, label: '93-97%', color: '#7F7F7F', desc: 'Healthy' },
    { min: 97, max: 101, label: '97%+', color: '#595959', desc: 'Full' },
  ];

  // Dynamic KPI Card Strip
  const kpiCards = [
    {
      icon: Home,
      label: 'Occupancy Rate',
      value: fmtPct(primary.occupancyRate),
      sublabel: primary.isOccupancyAssumption ? 'Vacancy rate assumption' : 'Based on real tenancy records',
      color: classification.color,
      isOccupancyCard: true,
      borderStyle: primary.isOccupancyAssumption ? 'dashed' : 'solid'
    },
    { icon: TrendingDown, label: 'Break-Even Occupancy', value: fmtPct(primary.breakEvenOccupancy), sublabel: 'Min occupancy to cover all costs', color: '#A5A5A5' },
    { icon: DollarSign, label: 'Vacancy Cost', value: `${fmtUSD(Math.round(primary.grossRent * primary.vacancyRate / 100))}/yr`, sublabel: `${fmtUSD(Math.round(primary.grossRent * primary.vacancyRate / 100 / 12))}/mo lost to vacancy`, color: '#F06543' },
    { icon: Target, label: 'Occupancy Cushion', value: `${cushion >= 0 ? '+' : ''}${cushion.toFixed(1)}%`, sublabel: cushion >= 0 ? 'Above break-even — safe margin' : 'BELOW break-even — losing money', color: cushion >= 0 ? '#595959' : '#F06543' },
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
            <p className="text-xs text-text-secondary">Days Occupied &divide; Total Days &mdash; U.S. National Average is ~90%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}>
          <Home className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            className="rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: kpi.borderStyle === 'dashed' ? '1px dashed var(--border-ui)' : '1px solid var(--border-ui)'
            }}
          >
            {kpi.isOccupancyCard && (
              <div
                className="absolute top-2 right-2 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{
                  background: primary.isOccupancyAssumption ? 'rgba(165,165,165,0.08)' : 'var(--text-primary)',
                  color: primary.isOccupancyAssumption ? 'var(--text-secondary)' : 'var(--bg-surface)',
                  border: primary.isOccupancyAssumption ? '1px dashed var(--border-ui)' : '1px solid var(--text-primary)'
                }}
              >
                {primary.isOccupancyAssumption ? 'Assumption' : 'Actual'}
              </div>
            )}
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight animate-fade-in" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
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
              const isActive = primary.occupancyRate >= seg.min && primary.occupancyRate < (i === gaugeSegments.length - 1 ? 102 : seg.max);
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
            <p className="text-4xl font-black tabular-nums animate-fade-in" style={{ color: classification.color }}>{fmtPct(primary.occupancyRate)}</p>
            <p className="text-[10px] font-bold mt-1" style={{ color: classification.color }}>{classification.description}</p>
          </div>
        </div>

        {/* Break-Even vs Actual */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: '#595959' }} />
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
                <span className="text-[10px] font-bold tabular-nums" style={{ color: '#A5A5A5' }}>{fmtPct(primary.breakEvenOccupancy)}</span>
              </div>
              <div className="w-full h-4 rounded-full" style={{ background: 'var(--bg-inset)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, primary.breakEvenOccupancy)}%`, background: '#A5A5A5' }} />
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
          <div className="mt-4 p-3 rounded-lg" style={{ background: cushion >= 5 ? 'rgba(89,89,89,0.06)' : cushion >= 0 ? 'rgba(165,165,165,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${cushion >= 5 ? 'rgba(89,89,89,0.15)' : cushion >= 0 ? 'rgba(165,165,165,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
            <p className="text-[10px] font-bold" style={{ color: cushion >= 5 ? '#595959' : cushion >= 0 ? '#A5A5A5' : '#F06543' }}>
              {cushion >= 5 && `✓ ${cushion.toFixed(1)}% cushion above break-even — comfortable safety margin.`}
              {cushion >= 0 && cushion < 5 && `⚠️ Only ${cushion.toFixed(1)}% above break-even — thin margin, minor vacancy increase could erode cash flow.`}
              {cushion < 0 && `✗ ${Math.abs(cushion).toFixed(1)}% BELOW break-even — property is losing money at current occupancy.`}
            </p>
          </div>
        </div>
      </div>

      {/* Vacancy Impact Table */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4" style={{ color: '#F06543' }} />
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
                    <td className="px-3 py-2 tabular-nums" style={{ color: row.revenueLost > 0 ? '#F06543' : '#595959', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.revenueLost > 0 ? `-${fmtUSD(Math.round(row.revenueLost))}` : '$0'}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: row.monthlyLost > 0 ? '#F06543' : '#595959', borderBottom: '1px solid var(--border-ui)' }}>
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
      {breakdowns.length > 1 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '280px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">Occupancy by Property</h4>
          <div className="flex-1 min-h-0 w-full relative">
            <div className="absolute inset-0">
              <OccupancyChart data={breakdowns} height="100%" />
            </div>
          </div>
        </div>
      )}

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed space-y-1.5" style={{ background: 'rgba(127,127,127,0.05)', border: '1px solid rgba(127,127,127,0.15)', color: 'var(--text-secondary)' }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Formula &amp; Calculation:</strong>{' '}
          <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>Occupancy Rate = (Days Occupied &divide; Total Days) &times; 100</code>
        </div>
        <div className="flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#595959' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Data Guardrail:</strong>{' '}
            {primary.isOccupancyAssumption ? (
              <span className="text-amber-800 dark:text-amber-400">
                ⚠️ **Vacancy Assumption in Use:** This property does not currently have historical tenancy records (days occupied/total hold days). The occupancy rate shown is derived from pro forma vacancy assumptions. Projections can be misleading; verify with real lease ledgers where possible.
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400">
                ✓ **Actual Records in Use:** This calculation is verified using real historical tenancy records (`daysOccupied` and `totalHoldDays`).
              </span>
            )}
          </div>
        </div>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>The 90% Benchmark:</strong>{' '}
          The U.S. average occupancy rate is ~90%. Sustained occupancy below 90% is a critical warning sign indicating potential issues with pricing, property condition, tenant satisfaction, or local market demand. Pro forma sheets often assume 100% occupancy, which can mask deal viability issues.
        </div>
      </div>
    </div>
  );
}
