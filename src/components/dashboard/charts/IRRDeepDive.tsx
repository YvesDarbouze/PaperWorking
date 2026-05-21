'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';
import IRRChart from '@/components/Charts/IRRChart';
import { TrendingUp, Calendar, DollarSign, Target, BarChart3, AlertTriangle } from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtPct = (v: number) => `${v >= 0 ? '' : ''}${(v * 100).toFixed(1)}%`;
const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type IRRGrade = 'excellent' | 'strong' | 'acceptable' | 'weak' | 'negative';

function classifyIRR(irr: number | null): {
  grade: IRRGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (irr === null) return { grade: 'weak', label: 'Cannot Calculate', description: 'Insufficient data for IRR computation', color: '#6B7280', bgColor: 'rgba(107,114,128,0.08)', borderColor: 'rgba(107,114,128,0.2)' };
  const pct = irr * 100;
  if (pct >= 20) return { grade: 'excellent', label: 'Exceptional Return', description: 'Significantly outperforms most alternative investments', color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)' };
  if (pct >= 12) return { grade: 'strong', label: 'Strong Return', description: 'Outperforms typical stock market returns (~10% avg)', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (pct >= 6) return { grade: 'acceptable', label: 'Moderate Return', description: 'Reasonable return — consider risk vs alternatives', color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)' };
  if (pct >= 0) return { grade: 'weak', label: 'Low Return', description: 'May underperform safer alternatives like index funds', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'negative', label: 'Negative Return', description: 'This investment is projected to lose money', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}



export default function IRRDeepDive({ projects: propProjects }: Props) {
  const analysis = useMemo(() => {
    const projects = propProjects || [];
    if (projects.length === 0 || !projects[0]?.financials) return null;

    const p = projects[0];
    const f = p.financials!;
    const metrics = deriveAllMetrics(f);

    const purchasePrice = f.purchasePrice ?? 0;
    const annualAppreciation = f.annualAppreciationPercent ?? 3;
    const loanAmount = f.loanAmount ?? 0;
    const loanRate = f.loanInterestRate ?? 0;
    const loanTerm = f.loanTermYears ?? 30;
    const holdMonths = f.projectedHoldTimeMonths ?? 60; // default 5 years
    const baseHoldYears = Math.max(1, Math.round(holdMonths / 12));

    if (metrics.totalCashInvested <= 0 || purchasePrice <= 0) return null;

    // Compute IRR for base hold period
    const baseCashFlows = buildIRRCashFlows(
      metrics.totalCashInvested, metrics.annualCashFlow, baseHoldYears,
      purchasePrice, annualAppreciation, loanAmount, loanRate, loanTerm
    );
    const baseIRR = computeIRR(baseCashFlows);

    // Multi-year comparison (1–15 years)
    const holdComparison = Array.from({ length: 15 }, (_, i) => {
      const years = i + 1;
      const flows = buildIRRCashFlows(
        metrics.totalCashInvested, metrics.annualCashFlow, years,
        purchasePrice, annualAppreciation, loanAmount, loanRate, loanTerm
      );
      const irr = computeIRR(flows);
      const exitValue = purchasePrice * Math.pow(1 + annualAppreciation / 100, years);
      const totalCashFlows = flows.reduce((s, f) => s + f, 0);
      return { year: years, irr, exitValue, totalCashFlows, irrPct: irr !== null ? irr * 100 : null };
    });

    // Appreciation sensitivity
    const appreciationRates = [0, 2, 3, 4, 5, 7];
    const sensitivityRows = appreciationRates.map(rate => {
      const flows = buildIRRCashFlows(
        metrics.totalCashInvested, metrics.annualCashFlow, baseHoldYears,
        purchasePrice, rate, loanAmount, loanRate, loanTerm
      );
      const irr = computeIRR(flows);
      return { rate, irr, isCurrent: rate === annualAppreciation };
    });

    // Cash flow timeline for base period
    const cashFlowTimeline = baseCashFlows.map((cf, i) => ({
      year: i === 0 ? 'Initial' : `Yr ${i}`,
      cashFlow: cf,
      cumulative: baseCashFlows.slice(0, i + 1).reduce((s, f) => s + f, 0),
    }));

    return {
      baseIRR, baseHoldYears, holdComparison, sensitivityRows,
      cashFlowTimeline, metrics, annualAppreciation, purchasePrice,
      totalCashInvested: metrics.totalCashInvested,
      annualCashFlow: metrics.annualCashFlow,
    };
  }, [propProjects]);

  if (!analysis) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <TrendingUp className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add purchase price, financing, and income data to see your Internal Rate of Return projection.
        </p>
      </div>
    );
  }

  const classification = classifyIRR(analysis.baseIRR);
  const irrDisplay = analysis.baseIRR !== null ? fmtPct(analysis.baseIRR) : 'N/A';

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <TrendingUp className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Internal Rate of Return (IRR)</h3>
            <p className="text-xs text-text-secondary">Total annualized return across the entire hold period — accounts for time value of money</p>
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
          { icon: TrendingUp, label: 'Projected IRR', value: irrDisplay, sublabel: `${analysis.baseHoldYears}-year hold period`, color: classification.color },
          { icon: DollarSign, label: 'Total Cash Invested', value: fmtUSD(analysis.totalCashInvested), sublabel: 'Down payment + closing + rehab', color: '#EF4444' },
          { icon: Calendar, label: 'Annual Cash Flow', value: fmtUSD(analysis.annualCashFlow), sublabel: `${fmtUSD(Math.round(analysis.annualCashFlow / 12))}/mo net income`, color: '#595959' },
          { icon: Target, label: 'Appreciation Rate', value: `${analysis.annualAppreciation}%/yr`, sublabel: `${fmtUSD(Math.round(analysis.purchasePrice))} → ${fmtUSD(Math.round(analysis.purchasePrice * Math.pow(1 + analysis.annualAppreciation / 100, analysis.baseHoldYears)))}`, color: '#7F7F7F' },
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

      {/* IRR by Hold Period Chart + Big Number */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Big IRR Display */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Projected IRR</p>
          <p className="text-5xl font-black tabular-nums" style={{ color: classification.color }}>{irrDisplay}</p>
          <p className="text-[10px] font-bold mt-2" style={{ color: classification.color }}>{classification.description}</p>
          <div className="mt-4 text-[10px] text-center space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <p>vs. S&P 500 avg: ~10%/yr</p>
            <p>vs. 10yr Treasury: ~4.5%/yr</p>
            <p>vs. Savings account: ~4%/yr</p>
          </div>
        </div>

        {/* Hold Period Comparison Line Chart */}
        <div className="lg:col-span-2 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '280px' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;5-Year vs 10-Year Hold&rdquo; — IRR by Hold Period</h4>
          </div>
          <div className="flex-1 min-h-0 pt-4">
            <IRRChart data={analysis.holdComparison} height="100%" />
          </div>
        </div>
      </div>

      {/* Appreciation Sensitivity */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">IRR Sensitivity — &ldquo;What If Appreciation Changes?&rdquo;</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Annual Appreciation', `IRR (${analysis.baseHoldYears}-yr hold)`, 'Verdict', 'vs S&P 500'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.sensitivityRows.map((row) => {
                const cls = classifyIRR(row.irr);
                const irrPct = row.irr !== null ? row.irr * 100 : null;
                return (
                  <tr key={row.rate}>
                    <td className="px-3 py-2 font-bold" style={{ color: row.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.rate}%/yr {row.isCurrent ? '← current' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: cls.color, background: row.isCurrent ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.irr !== null ? fmtPct(row.irr) : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: cls.color, borderBottom: '1px solid var(--border-ui)' }}>
                      {cls.label}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: irrPct !== null && irrPct > 10 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>
                      {irrPct !== null ? `${irrPct > 10 ? '+' : ''}${(irrPct - 10).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Flow Timeline */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4" style={{ color: '#595959' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Cash Flow Timeline — {analysis.baseHoldYears}-Year Projection</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Period', 'Cash Flow', 'Cumulative', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.cashFlowTimeline.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)' }}>{row.year}</td>
                  <td className="px-3 py-2 tabular-nums font-bold" style={{ color: row.cashFlow >= 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>{fmtUSD(Math.round(row.cashFlow))}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: row.cumulative >= 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>{fmtUSD(Math.round(row.cumulative))}</td>
                  <td className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: row.cumulative >= 0 ? '#595959' : '#A5A5A5', borderBottom: '1px solid var(--border-ui)' }}>
                    {i === 0 ? 'Invested' : row.cumulative >= 0 ? 'Profitable' : 'Recovering'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgba(89,89,89,0.05)', border: '1px solid rgba(89,89,89,0.15)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>IRR Explained:</strong>{' '}
        IRR is the discount rate that makes the Net Present Value (NPV) of all cash flows equal to zero — it captures the{' '}
        <strong>time value of money</strong>.
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>What it includes:</strong>{' '}
        Initial investment, annual cash flows, property appreciation, mortgage paydown, and exit proceeds.
        <br />
        <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: '#A5A5A5' }} />
        <strong style={{ color: '#A5A5A5' }}>Forecasting caveat:</strong>{' '}
        IRR relies on projected appreciation and future cash flows. Actual returns will differ. Use it to <em>compare scenarios</em>, not as a guarantee.
      </div>
    </div>
  );
}
