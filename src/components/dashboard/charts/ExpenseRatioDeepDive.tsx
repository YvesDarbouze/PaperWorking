'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveDualScopeMetrics, computeNOIComponents } from '@/lib/metrics/reiMetrics';
import ExpenseRatioPieChart from '@/components/Charts/ExpenseRatioPieChart';
import ExpenseRatioBarChart from '@/components/Charts/ExpenseRatioBarChart';
import { PieChart as PieIcon, AlertTriangle, TrendingDown, DollarSign, Target, Layers } from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type ERGrade = 'excellent' | 'efficient' | 'average' | 'high' | 'critical';

function classifyER(rate: number): {
  grade: ERGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (rate <= 25) return { grade: 'excellent', label: 'Very Lean', description: 'Exceptional efficiency — typical of high-rent properties', color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)' };
  if (rate <= 35) return { grade: 'efficient', label: 'Efficient', description: 'Strong operational control — expenses well-managed', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (rate <= 45) return { grade: 'average', label: 'Typical', description: 'In line with industry average — room for optimization', color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)' };
  if (rate <= 60) return { grade: 'high', label: 'High Expenses', description: 'Investigate: below-market rents, deferred maintenance, or inefficient management', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'critical', label: 'Critical', description: 'Most of your rental income is consumed by operating costs', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}

const EXPENSE_COLORS: Record<string, string> = {
  'Property Taxes': '#595959',
  'Insurance': '#7F7F7F',
  'Utilities': '#A5A5A5',
  'Property Mgmt': '#595959',
  'Maintenance': '#EF4444',
  'HOA': '#8B5CF6',
};

// Tooltips removed since ECharts components handle their own Tooltip formatters

export default function ExpenseRatioDeepDive({ projects: propProjects }: Props) {
  const analysis = useMemo(() => {
    const projects = (propProjects || []).filter(p => p.financials);
    if (projects.length === 0) return null;

    const breakdowns = projects.map(p => {
      const { asset: m } = deriveDualScopeMetrics(p.financials!, undefined, p.strategyType, p.currentPhase);
      const noi = computeNOIComponents(p.financials!, p.strategyType, p.currentPhase);
      return {
        name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
        oer: m.oer,
        grossRent: noi.grossRentalIncome,
        totalExpenses: noi.totalOperatingExpenses,
        components: noi,
        noi: noi.noi,
      };
    }).slice(0, 8);

    const primary = breakdowns[0];
    if (primary.grossRent <= 0) return null;

    const classification = classifyER(primary.oer);

    // Build expense breakdown for pie chart
    const expenseItems = [
      { name: 'Property Taxes', value: primary.components.propertyTaxes, color: EXPENSE_COLORS['Property Taxes'] },
      { name: 'Insurance', value: primary.components.insurance, color: EXPENSE_COLORS['Insurance'] },
      { name: 'Utilities', value: primary.components.utilities, color: EXPENSE_COLORS['Utilities'] },
      { name: 'Property Mgmt', value: primary.components.propertyManagement, color: EXPENSE_COLORS['Property Mgmt'] },
      { name: 'Maintenance', value: primary.components.maintenance, color: EXPENSE_COLORS['Maintenance'] },
      { name: 'HOA', value: primary.components.hoa, color: EXPENSE_COLORS['HOA'] },
    ].filter(e => e.value > 0).map(e => ({
      ...e,
      pct: (e.value / primary.grossRent) * 100,
      monthly: Math.round(e.value / 12),
    }));

    // Biggest cost driver
    const sorted = [...expenseItems].sort((a, b) => b.value - a.value);
    const topDriver = sorted[0] || null;

    // "What if" — expense reduction scenarios
    const reductionScenarios = [0, 5, 10, 15, 20, 25].map(cutPct => {
      const reducedExpenses = primary.totalExpenses * (1 - cutPct / 100);
      const newRatio = primary.grossRent > 0 ? (reducedExpenses / primary.grossRent) * 100 : 0;
      const newNOI = primary.grossRent + primary.components.otherIncome - primary.components.vacancyLoss - reducedExpenses;
      const savedAnnual = primary.totalExpenses * (cutPct / 100);
      return {
        cut: cutPct,
        newRatio,
        newNOI,
        savedAnnual,
        isCurrent: cutPct === 0,
      };
    });

    // Rent-tier comparison
    const rentComparison = [800, 1200, 1500, 2000, 3000, 5000].map(rent => {
      const annualRent = rent * 12;
      const fixedExpenses = primary.totalExpenses; // same expenses, different rent
      const ratio = annualRent > 0 ? (fixedExpenses / annualRent) * 100 : 0;
      const isClose = Math.abs(rent - primary.grossRent / 12) < 150;
      return { rent, ratio, isClose };
    });

    return { breakdowns, primary, classification, expenseItems, topDriver, reductionScenarios, rentComparison };
  }, [propProjects]);

  if (!analysis) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <PieIcon className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add rental income and operating expense data to see your Expense Ratio analysis.
        </p>
      </div>
    );
  }

  const { primary, classification, expenseItems, topDriver, reductionScenarios, rentComparison } = analysis;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <PieIcon className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Expense Ratio</h3>
            <p className="text-xs text-text-secondary">What percentage of rental income gets consumed by operating costs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}>
          <PieIcon className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: PieIcon, label: 'Expense Ratio', value: fmtPct(primary.oer), sublabel: `${fmtUSD(Math.round(primary.totalExpenses))} of ${fmtUSD(Math.round(primary.grossRent))} income`, color: classification.color },
          { icon: DollarSign, label: 'Total Operating Costs', value: fmtUSD(Math.round(primary.totalExpenses)), sublabel: `${fmtUSD(Math.round(primary.totalExpenses / 12))}/mo`, color: '#EF4444' },
          { icon: Target, label: 'Income Retained', value: fmtPct(100 - primary.oer), sublabel: `${fmtUSD(Math.round(primary.grossRent - primary.totalExpenses))}/yr kept`, color: '#595959' },
          { icon: TrendingDown, label: 'Top Cost Driver', value: topDriver ? topDriver.name : 'N/A', sublabel: topDriver ? `${fmtUSD(topDriver.value)}/yr (${fmtPct(topDriver.pct)})` : '—', color: '#595959' },
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

      {/* Pie Chart + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col items-center" style={{ minHeight: '300px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4 self-start">Where Your Money Goes</h4>
          <div className="flex-1 w-full min-h-0" style={{ maxHeight: '220px' }}>
            <ExpenseRatioPieChart data={expenseItems} height="100%" />
          </div>
          {/* Big number center */}
          <div className="mt-2 text-center">
            <p className="text-3xl font-black tabular-nums" style={{ color: classification.color }}>{fmtPct(primary.oer)}</p>
            <p className="text-[10px] font-bold" style={{ color: classification.color }}>{classification.description}</p>
          </div>
        </div>

        {/* Line-item breakdown table */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Operating Expense Breakdown</h4>
          </div>
          <div className="space-y-3">
            {expenseItems.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtUSD(item.monthly)}/mo</span>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: item.color }}>{fmtUSD(item.value)}/yr</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-inset)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, item.pct * 2)}%`, background: item.color, opacity: 0.8 }} />
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border-ui)' }}>
              <div className="flex justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Total Operating Expenses</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: classification.color }}>{fmtUSD(Math.round(primary.totalExpenses))}/yr</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Reduction Scenarios */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4" style={{ color: '#595959' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;What If I Cut Expenses?&rdquo; — Impact on NOI</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Expense Cut', 'New Ratio', 'New NOI', 'Annual Savings', 'Verdict'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reductionScenarios.map((row) => {
                const cls = classifyER(row.newRatio);
                return (
                  <tr key={row.cut}>
                    <td className="px-3 py-2 font-bold" style={{ color: row.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.cut === 0 ? 'Current' : `-${row.cut}%`} {row.isCurrent ? '' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: cls.color, background: row.isCurrent ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtPct(row.newRatio)}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: row.newNOI >= 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtUSD(Math.round(row.newNOI))}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: row.savedAnnual > 0 ? '#595959' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.savedAnnual > 0 ? `+${fmtUSD(Math.round(row.savedAnnual))}` : '—'}
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

      {/* Rent-Tier Comparison */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4" style={{ color: '#8B5CF6' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;Rent Level Effect&rdquo; — Same Costs, Different Rents</h4>
        </div>
        <p className="text-[10px] text-text-secondary mb-4">
          Your fixed expenses ({fmtUSD(Math.round(primary.totalExpenses))}/yr) applied to different rent levels — shows why high-rent properties have lower expense ratios.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Monthly Rent', 'Annual Income', 'Expense Ratio', 'Classification'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentComparison.map((row) => {
                const cls = classifyER(row.ratio);
                return (
                  <tr key={row.rent}>
                    <td className="px-3 py-2 font-bold tabular-nums" style={{ color: row.isClose ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtUSD(row.rent)}/mo {row.isClose ? '← yours' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtUSD(row.rent * 12)}/yr
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: cls.color, background: row.isClose ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtPct(row.ratio)}
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
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">Expense Ratio by Property</h4>
          <div className="flex-1 min-h-0">
            <ExpenseRatioBarChart data={analysis.breakdowns.map(b => ({ name: b.name, ratio: b.oer, color: classifyER(b.oer).color }))} height="100%" />
          </div>
        </div>
      )}

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgba(89,89,89,0.05)', border: '1px solid rgba(89,89,89,0.15)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Formula:</strong>{' '}
        <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>Expense Ratio = (Operating Expenses ÷ Gross Rental Income) × 100</code>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>What drives high ratios?</strong>{' '}
        Three main culprits: rents below market rate, deferred maintenance creating costly emergency repairs, and inefficient property management. Older properties also tend to have higher ratios due to constant repair demands.
        <br />
        <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: '#A5A5A5' }} />
        <strong style={{ color: '#A5A5A5' }}>The rent-level effect:</strong>{' '}
        A luxury unit at $5,000/mo might run a lean 25% expense ratio while an $800/mo property hits 50% — because fixed costs (taxes, insurance, management) don&apos;t scale linearly with rent.
      </div>
    </div>
  );
}
