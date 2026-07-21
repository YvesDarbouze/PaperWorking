'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveDualScopeMetrics } from '@/lib/metrics/reiMetrics';
import AppreciationChart from '@/components/Charts/AppreciationChart';
import { TrendingUp, AlertTriangle, DollarSign, Calendar, Target, Building, ShieldCheck } from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type AppreciationGrade = 'exceptional' | 'strong' | 'moderate' | 'below' | 'flat';

function classifyAppreciation(rate: number): {
  grade: AppreciationGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (rate >= 6) return { grade: 'exceptional', label: 'Above-Average Growth', description: 'Exceeds recent national averages (3-5%/yr)', color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)' };
  if (rate >= 4.5) return { grade: 'strong', label: 'Strong Appreciation', description: 'Above the historical 4% long-run baseline', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (rate >= 3) return { grade: 'moderate', label: 'Steady Growth', description: 'In line with the 3-5% baseline average', color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)' };
  if (rate >= 1) return { grade: 'below', label: 'Below Average', description: 'Underperforming historical inflation averages', color: '#F06543', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'flat', label: 'Stagnant / Declining', description: 'Minimal growth or depreciation', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}

export default function AppreciationDeepDive({ projects: propProjects }: Props) {
  const analysis = useMemo(() => {
    const projects = (propProjects || []).filter(p => p.financials);
    if (projects.length === 0) return null;

    const p = projects[0];
    const f = p.financials!;
    const { asset: metrics } = deriveDualScopeMetrics(f, undefined, p.dispositionType, p.currentPhase, p.createdAt);

    const purchasePrice = f.purchasePrice ?? 0;
    if (purchasePrice <= 0) return null;

    const acquisitionBasis = purchasePrice + (f.fixedAcquisitionCosts ?? 0);
    const holdMonths = f.projectedHoldTimeMonths ?? 60;
    const holdYears = Math.max(1, Math.round(holdMonths / 12));
    const marketRate = f.annualAppreciationPercent ?? 3;

    // Projection calculation: CAGR over years
    const projectionYears = Math.min(Math.max(holdYears + 5, 15), 30);
    const initialVal = f.estimatedARV ?? purchasePrice;

    const projectionData = Array.from({ length: projectionYears }, (_, i) => {
      const year = i + 1;
      // Property value projection including rehab value jump at year 1
      const projectedVal = initialVal * Math.pow(1 + marketRate / 100, year - 1);
      const rate = acquisitionBasis > 0 ? (Math.pow(projectedVal / acquisitionBasis, 1 / year) - 1) * 100 : 0;

      return {
        year,
        rate,
        isRealized: metrics.isAppreciationRealized && year <= holdYears,
      };
    });

    const atHoldEnd = projectionData[holdYears - 1] || projectionData[projectionData.length - 1];
    const at5 = projectionData[4] || atHoldEnd;
    const at10 = projectionData[9] || atHoldEnd;
    const at20 = projectionData[19] || null;

    // Total growth projection
    const atHoldEndValue = initialVal * Math.pow(1 + marketRate / 100, holdYears - 1);
    const classification = classifyAppreciation(metrics.annualizedAppreciation);

    // Rate scenario table
    const rateScenarios = [1, 2, 3, 4, 5, 6, 7, 8].map(rate => {
      const futureVal = initialVal * Math.pow(1 + rate / 100, holdYears - 1);
      const scenarioCAGR = acquisitionBasis > 0 ? (Math.pow(futureVal / acquisitionBasis, 1 / holdYears) - 1) * 100 : 0;
      return {
        rate,
        futureValue: Math.round(futureVal),
        scenarioCAGR,
        isCurrent: Math.abs(rate - marketRate) < 0.1,
      };
    });

    return {
      purchasePrice,
      acquisitionBasis,
      holdYears,
      classification,
      projectionData,
      atHoldEnd,
      at5,
      at10,
      at20,
      atHoldEndValue,
      rateScenarios,
      metrics,
    };
  }, [propProjects]);

  if (!analysis) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <TrendingUp className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add purchase price and appreciation data to see your Annualized Appreciation analysis.
        </p>
      </div>
    );
  }

  const { metrics, acquisitionBasis, holdYears, classification, projectionData, atHoldEnd, atHoldEndValue, rateScenarios } = analysis;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <TrendingUp className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Annualized Appreciation</h3>
            <p className="text-xs text-text-secondary">Compound annual growth rate (CAGR) from acquisition basis to current/sale value</p>
          </div>
        </div>

        {/* Realized vs Estimated Guardrail Badge */}
        {metrics.isAppreciationRealized ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-black text-white">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Realized (Sale Closed)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border-ui text-text-secondary bg-bg-surface">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>Estimated (Unrealized)</span>
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building, label: 'Acquisition Basis', value: fmtUSD(acquisitionBasis), sublabel: 'Purchase Price + Closing', color: '#6B7280' },
          { icon: TrendingUp, label: metrics.isAppreciationRealized ? 'Realized Sale Value' : `Value at Year ${holdYears}`, value: fmtUSD(metrics.isAppreciationRealized ? (metrics.noiComponents.grossRentalIncome /* placeholder if sold */ ? (propProjects?.[0]?.financials?.actualSalePrice ?? 0) : 0) : atHoldEndValue), sublabel: metrics.isAppreciationRealized ? 'Final realized value' : 'Projected at exit', color: classification.color },
          { icon: DollarSign, label: 'Total Value Gain', value: fmtUSD(metrics.isAppreciationRealized ? (propProjects?.[0]?.financials?.actualSalePrice ?? 0) - acquisitionBasis : atHoldEndValue - acquisitionBasis), sublabel: metrics.isAppreciationRealized ? 'Realized appreciation' : 'Projected gain', color: '#595959' },
          { icon: Target, label: 'Annualized CAGR', value: fmtPct(metrics.annualizedAppreciation), sublabel: metrics.isAppreciationRealized ? 'Realized annual return' : 'Estimated annual return', color: '#7F7F7F' },
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

      {/* Annualized Appreciation Chart */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '320px' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">CAGR (%) Convergence Curve</h4>
        </div>
        <div className="flex-1 min-h-0">
          <AppreciationChart data={projectionData} holdYears={holdYears} />
        </div>
      </div>

      {/* Milestones & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value Milestones */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Annualized CAGR Milestones</h4>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Year 1 (Forced Rehab Growth)', rate: projectionData[0]?.rate ?? 0, year: 1 },
              { label: 'Year 5 Milestone', rate: analysis.at5.rate, year: 5 },
              { label: 'Year 10 Milestone', rate: analysis.at10.rate, year: 10 },
              ...(analysis.at20 ? [{ label: 'Year 20 Milestone', rate: analysis.at20.rate, year: 20 }] : []),
            ].map((m, i) => (
              <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-ui)' }}>
                <div>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                  <p className="text-[9px]" style={{ color: '#595959' }}>{m.year === 1 ? 'Reflects initial forced equity' : 'Long-term compound convergence'}</p>
                </div>
                <p className="text-sm font-bold tabular-nums" style={{ color: m.rate >= 4 ? '#595959' : '#F06543' }}>{fmtPct(m.rate)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sensitivity Scenarios */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;What If Market Appreciation Differs?&rdquo;</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  {['Market Growth', `Value at Year ${holdYears}`, 'Annualized CAGR', 'Classification'].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rateScenarios.map((row) => {
                  const cls = classifyAppreciation(row.scenarioCAGR);
                  return (
                    <tr key={row.rate}>
                      <td className="px-2 py-2 font-bold" style={{ color: row.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                        {row.rate}%/yr {row.isCurrent ? '← current' : ''}
                      </td>
                      <td className="px-2 py-2 tabular-nums" style={{ borderBottom: '1px solid var(--border-ui)' }}>
                        {fmtUSD(row.futureValue)}
                      </td>
                      <td className="px-2 py-2 tabular-nums font-bold" style={{ color: cls.color, background: row.isCurrent ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                        {fmtPct(row.scenarioCAGR)}
                      </td>
                      <td className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: cls.color, borderBottom: '1px solid var(--border-ui)' }}>
                        {cls.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgba(127,127,127,0.05)', border: '1px solid rgba(127,127,127,0.15)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Historical Context:</strong>{' '}
        U.S. residential property values have appreciated at a long-run historical baseline of <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>3.00% to 5.00%</code> annually since 1967, averaging approximately <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>4.00%</code>.
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Estimated vs. Realized:</strong>{' '}
        Appreciation is strictly an **estimation** during the hold phase. Value growth is only **realized** and locked in upon a final, closed transaction (Sale phase).
      </div>
    </div>
  );
}
