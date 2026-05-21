'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import AppreciationChart from '@/components/Charts/AppreciationChart';
import { TrendingUp, AlertTriangle, DollarSign, Calendar, Target, Building } from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type AppreciationGrade = 'exceptional' | 'strong' | 'moderate' | 'below' | 'flat';

function classifyAppreciation(rate: number): {
  grade: AppreciationGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (rate >= 7) return { grade: 'exceptional', label: 'Above-Average Growth', description: 'Exceeds recent national averages (6-7%/yr) — verify with local comps', color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)' };
  if (rate >= 5) return { grade: 'strong', label: 'Strong Appreciation', description: 'Above the historical 4% baseline — markets with job growth', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (rate >= 3) return { grade: 'moderate', label: 'Steady Growth', description: 'In line with the 3-5% baseline expectation since 1967', color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)' };
  if (rate >= 1) return { grade: 'below', label: 'Below Average', description: 'Underperforming inflation — consider market fundamentals', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'flat', label: 'Stagnant / Declining', description: 'No growth or depreciation — high risk for long-term holds', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}


export default function AppreciationDeepDive({ projects: propProjects }: Props) {
  const analysis = useMemo(() => {
    const projects = (propProjects || []).filter(p => p.financials);
    if (projects.length === 0) return null;

    const p = projects[0];
    const f = p.financials!;
    const metrics = deriveAllMetrics(f);

    const purchasePrice = f.purchasePrice ?? 0;
    if (purchasePrice <= 0) return null;

    const appreciation = f.annualAppreciationPercent ?? 3;
    const holdMonths = f.projectedHoldTimeMonths ?? 60;
    const holdYears = Math.max(1, Math.round(holdMonths / 12));
    const loanAmount = f.loanAmount ?? 0;
    const loanRate = f.loanInterestRate ?? 0;
    const loanTermYears = f.loanTermYears ?? 30;

    const classification = classifyAppreciation(appreciation);

    // Projection: 1–30 years at 3 rates
    const maxYears = Math.max(holdYears + 5, 15);
    const projectionYears = Math.min(maxYears, 30);

    const projectionData = Array.from({ length: projectionYears }, (_, i) => {
      const year = i + 1;
      const conservative = purchasePrice * Math.pow(1.03, year);
      const projected = purchasePrice * Math.pow(1 + appreciation / 100, year);
      const optimistic = purchasePrice * Math.pow(1.07, year);

      // Equity from appreciation alone (projected rate)
      const equityGained = projected - purchasePrice;

      return {
        year,
        conservative: Math.round(conservative),
        projected: Math.round(projected),
        optimistic: Math.round(optimistic),
        equityGained: Math.round(equityGained),
        projRate: appreciation,
      };
    });

    // Milestone values
    const atHoldEnd = projectionData[holdYears - 1] || projectionData[projectionData.length - 1];
    const at5 = projectionData[4] || atHoldEnd;
    const at10 = projectionData[9] || atHoldEnd;
    const at20 = projectionData[19] || null;

    // Total wealth built: appreciation + mortgage paydown
    const monthlyRate = loanRate > 0 ? (loanRate / 100) / 12 : 0;
    const totalPayments = loanTermYears * 12;
    let mortgagePaidDown = 0;
    if (monthlyRate > 0 && totalPayments > 0 && loanAmount > 0) {
      const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      const paymentsMade = holdYears * 12;
      const remainingBalance = loanAmount * Math.pow(1 + monthlyRate, paymentsMade) -
        monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
      mortgagePaidDown = Math.max(0, loanAmount - Math.max(0, remainingBalance));
    }

    const totalEquityAtHold = atHoldEnd.equityGained + mortgagePaidDown;

    // Rate comparison table
    const rateScenarios = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(rate => {
      const futureVal = purchasePrice * Math.pow(1 + rate / 100, holdYears);
      const gain = futureVal - purchasePrice;
      return {
        rate,
        futureValue: Math.round(futureVal),
        gain: Math.round(gain),
        isCurrent: Math.abs(rate - appreciation) < 0.5,
      };
    });

    return {
      purchasePrice, appreciation, holdYears, classification,
      projectionData, atHoldEnd, at5, at10, at20,
      mortgagePaidDown: Math.round(mortgagePaidDown),
      totalEquityAtHold: Math.round(totalEquityAtHold),
      rateScenarios, metrics,
    };
  }, [propProjects]);

  if (!analysis) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <TrendingUp className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add purchase price and appreciation data to see your Long-Term Appreciation Potential.
        </p>
      </div>
    );
  }

  const { classification, projectionData, atHoldEnd, rateScenarios } = analysis;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <TrendingUp className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Long-Term Appreciation Potential</h3>
            <p className="text-xs text-text-secondary">Projected property value growth — U.S. homes have averaged ~4%/yr since 1967</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building, label: 'Current Value', value: fmtUSD(analysis.purchasePrice), sublabel: 'Purchase / basis price', color: '#6B7280' },
          { icon: TrendingUp, label: `Value at Year ${analysis.holdYears}`, value: fmtUSD(atHoldEnd.projected), sublabel: `+${fmtUSD(atHoldEnd.equityGained)} appreciation`, color: classification.color },
          { icon: DollarSign, label: 'Total Equity Built', value: fmtUSD(analysis.totalEquityAtHold), sublabel: `Appreciation + ${fmtUSD(analysis.mortgagePaidDown)} paydown`, color: '#595959' },
          { icon: Calendar, label: 'Growth Rate', value: `${analysis.appreciation}%/yr`, sublabel: classification.description, color: '#7F7F7F' },
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

      {/* Appreciation Projection Chart */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '320px' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Property Value Projection — 3 Scenarios</h4>
        </div>
        <div className="flex-1 min-h-0">
          <AppreciationChart data={projectionData} holdYears={analysis.holdYears} appreciationRate={analysis.appreciation} />
        </div>
      </div>

      {/* Milestone Cards + Equity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value Milestones */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Value Milestones at {analysis.appreciation}%/yr</h4>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Purchase Price', value: analysis.purchasePrice, gain: 0, year: 0 },
              { label: '5-Year Value', value: analysis.at5.projected, gain: analysis.at5.equityGained, year: 5 },
              { label: '10-Year Value', value: analysis.at10.projected, gain: analysis.at10.equityGained, year: 10 },
              ...(analysis.at20 ? [{ label: '20-Year Value', value: analysis.at20.projected, gain: analysis.at20.equityGained, year: 20 }] : []),
            ].map((m, i) => (
              <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-ui)' }}>
                <div>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                  {m.year > 0 && <p className="text-[9px]" style={{ color: '#595959' }}>+{fmtUSD(m.gain)} equity</p>}
                </div>
                <p className="text-sm font-bold tabular-nums" style={{ color: m.year === 0 ? 'var(--text-secondary)' : classification.color }}>{fmtUSD(m.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Equity Composition at Hold End */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Total Equity Built — Year {analysis.holdYears}</h4>
          </div>
          <div className="text-center mb-4">
            <p className="text-4xl font-black tabular-nums" style={{ color: '#595959' }}>{fmtUSD(analysis.totalEquityAtHold)}</p>
            <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>Combined appreciation + mortgage paydown</p>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>Appreciation Gain</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: '#7F7F7F' }}>{fmtUSD(atHoldEnd.equityGained)}</span>
              </div>
              <div className="w-full h-3 rounded-full" style={{ background: 'var(--bg-inset)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, analysis.totalEquityAtHold > 0 ? (atHoldEnd.equityGained / analysis.totalEquityAtHold) * 100 : 50)}%`, background: '#7F7F7F' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>Mortgage Paydown</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: '#595959' }}>{fmtUSD(analysis.mortgagePaidDown)}</span>
              </div>
              <div className="w-full h-3 rounded-full" style={{ background: 'var(--bg-inset)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, analysis.totalEquityAtHold > 0 ? (analysis.mortgagePaidDown / analysis.totalEquityAtHold) * 100 : 50)}%`, background: '#595959' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Comparison Table */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;What If Appreciation Differs?&rdquo; — {analysis.holdYears}-Year Projection</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Annual Rate', `Value at Year ${analysis.holdYears}`, 'Total Gain', 'Classification'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateScenarios.map((row) => {
                const cls = classifyAppreciation(row.rate);
                return (
                  <tr key={row.rate}>
                    <td className="px-3 py-2 font-bold" style={{ color: row.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.rate}%/yr {row.isCurrent ? '← yours' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: cls.color, background: row.isCurrent ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtUSD(row.futureValue)}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: row.gain > 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.gain > 0 ? `+${fmtUSD(row.gain)}` : fmtUSD(row.gain)}
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

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgba(127,127,127,0.05)', border: '1px solid rgba(127,127,127,0.15)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Historical context:</strong>{' '}
        U.S. home values have appreciated ~4%/yr since 1967. Recent years have seen 6-7%/yr (Redfin). The baseline expectation is 3-5%/yr.
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>What drives appreciation?</strong>{' '}
        Job creation → population growth → sustained housing demand. Also evaluate infrastructure investments (transit lines, schools, commercial development) and 5-10 year sales trends.
        <br />
        <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: '#A5A5A5' }} />
        <strong style={{ color: '#A5A5A5' }}>Short-term spikes can be deceiving.</strong>{' '}
        Review 5-10 year trends for steady patterns. Cash flow keeps you solvent month to month, but appreciation builds generational wealth.
      </div>
    </div>
  );
}
