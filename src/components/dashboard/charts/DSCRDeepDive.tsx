'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveDualScopeMetrics } from '@/lib/metrics/reiMetrics';
import DSCRChart from '@/components/Charts/DSCRChart';
import { Shield, AlertTriangle, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type DSCRGrade = 'excellent' | 'strong' | 'acceptable' | 'marginal' | 'failing';

function classifyDSCR(dscr: number, isAllCash?: boolean): {
  grade: DSCRGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (isAllCash) return { grade: 'all-cash' as any, label: 'All-Cash (No Debt)', description: 'No mortgage debt service — DSCR is not applicable', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (dscr >= 1.5) return { grade: 'excellent', label: 'Excellent Coverage', description: 'Strong buffer above debt obligations — lender-preferred territory', color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)' };
  if (dscr >= 1.25) return { grade: 'strong', label: 'Strong — Meets Lender Minimums', description: 'Most lenders require ≥1.25 — this property qualifies', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (dscr >= 1.0) return { grade: 'acceptable', label: 'Thin Margin', description: 'Covers debt but with little room for unexpected expenses', color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)' };
  if (dscr >= 0.8) return { grade: 'marginal', label: 'Below Breakeven', description: 'Property cannot cover its own mortgage — negative cash flow', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'failing', label: 'Critical — Deep Negative', description: 'Severe shortfall — property is a significant cash drain', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}

interface PropertyDSCRData {
  name: string; dscr: number; noi: number; annualDebtService: number;
  monthlySurplus: number; classification: ReturnType<typeof classifyDSCR>;
  isAllCash: boolean;
}

function deriveDSCRBreakdowns(projects: Project[]): PropertyDSCRData[] {
  return projects.filter(p => p.financials).map((p) => {
    const f = p.financials!;
    const { asset: metrics } = deriveDualScopeMetrics(f, undefined, p.strategyType, p.currentPhase);
    const surplus = metrics.noi - metrics.annualDebtService;
    const isAllCash = (f.loanAmount ?? 0) === 0 || metrics.annualDebtService === 0;
    return {
      name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
      dscr: metrics.dscr, noi: metrics.noi,
      annualDebtService: metrics.annualDebtService,
      monthlySurplus: surplus / 12,
      classification: classifyDSCR(metrics.dscr, isAllCash),
      isAllCash,
    };
  }).slice(0, 8);
}


export default function DSCRDeepDive({ projects: propProjects }: Props) {
  const breakdowns = useMemo(() => deriveDSCRBreakdowns(propProjects || []), [propProjects]);

  const aggregate = useMemo(() => {
    if (breakdowns.length === 0) return null;
    const totalNOI = breakdowns.reduce((s, b) => s + b.noi, 0);
    const totalDebt = breakdowns.reduce((s, b) => s + b.annualDebtService, 0);
    const portfolioDSCR = totalDebt > 0 ? totalNOI / totalDebt : totalNOI > 0 ? Infinity : 0;
    const annualSurplus = totalNOI - totalDebt;
    const isAllCash = totalDebt === 0;
    return {
      totalNOI, totalDebt, portfolioDSCR: Math.round(portfolioDSCR * 1000) / 1000,
      annualSurplus, monthlySurplus: annualSurplus / 12,
      isAllCash,
    };
  }, [breakdowns]);

  if (!aggregate || (aggregate.totalNOI === 0 && aggregate.totalDebt === 0)) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Shield className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add income and financing data to see your Debt Service Coverage Ratio.
        </p>
      </div>
    );
  }

  const classification = classifyDSCR(aggregate.portfolioDSCR, aggregate.isAllCash);
  const dscrDisplay = aggregate.isAllCash ? 'N/A' : (aggregate.portfolioDSCR === Infinity ? '∞' : aggregate.portfolioDSCR.toFixed(2));

  const gaugeSegments = [
    { min: 0, max: 0.8, label: '<0.8', color: '#DC2626', desc: 'Critical' },
    { min: 0.8, max: 1.0, label: '0.8–1.0', color: '#EF4444', desc: 'Below Breakeven' },
    { min: 1.0, max: 1.25, label: '1.0–1.25', color: '#A5A5A5', desc: 'Thin Margin' },
    { min: 1.25, max: 1.5, label: '1.25–1.5', color: '#7F7F7F', desc: 'Lender Min' },
    { min: 1.5, max: 2.0, label: '1.5+', color: '#595959', desc: 'Excellent' },
  ];

  // Sensitivity: what if NOI changes?
  const noiDeltas = [-30, -20, -10, 0, 10, 20];
  const sensitivityRows = noiDeltas.map(d => {
    const adj = aggregate.totalNOI * (1 + d / 100);
    const adjDSCR = aggregate.totalDebt > 0 ? adj / aggregate.totalDebt : 0;
    return { delta: d, noi: adj, dscr: Math.round(adjDSCR * 1000) / 1000 };
  });

  // Lender threshold analysis
  const lenderThresholds = [
    { name: 'DSCR Loan Min', threshold: 1.0, color: '#EF4444' },
    { name: 'Conventional Min', threshold: 1.25, color: '#A5A5A5' },
    { name: 'Preferred Rate', threshold: 1.5, color: '#595959' },
  ];
  const noiNeededFor125 = 1.25 * aggregate.totalDebt;
  const noiGap = noiNeededFor125 - aggregate.totalNOI;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <Shield className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Debt Service Coverage Ratio (DSCR)</h3>
            <p className="text-xs text-text-secondary">DSCR = Net Operating Income ÷ Annual Debt Service (Can this property cover its mortgage?)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}>
          <Shield className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Shield, label: 'DSCR', value: aggregate.isAllCash ? 'N/A' : `${dscrDisplay}×`, sublabel: aggregate.isAllCash ? `${fmtUSD(aggregate.totalNOI)} NOI ÷ $0 Debt (All-Cash)` : `${fmtUSD(aggregate.totalNOI)} NOI ÷ ${fmtUSD(aggregate.totalDebt)} debt`, color: classification.color },
          { icon: DollarSign, label: 'Net Operating Income', value: fmtUSD(aggregate.totalNOI), sublabel: 'Annual income after operating expenses', color: '#595959' },
          { icon: Target, label: 'Annual Debt Service', value: aggregate.isAllCash ? 'N/A' : fmtUSD(aggregate.totalDebt), sublabel: aggregate.isAllCash ? 'No mortgage debt (All-Cash Deal)' : `${fmtUSD(Math.round(aggregate.totalDebt / 12))}/mo mortgage payment`, color: aggregate.isAllCash ? '#7F7F7F' : '#EF4444' },
          { icon: TrendingUp, label: 'Monthly Surplus/Deficit', value: aggregate.isAllCash ? fmtUSD(Math.round(aggregate.totalNOI / 12)) : `${aggregate.monthlySurplus >= 0 ? '+' : ''}${fmtUSD(Math.round(aggregate.monthlySurplus))}/mo`, sublabel: aggregate.isAllCash ? 'Net rental income (unleveraged)' : (aggregate.monthlySurplus >= 0 ? 'Income exceeds debt obligations' : 'Mortgage exceeds property income'), color: aggregate.isAllCash ? '#595959' : (aggregate.monthlySurplus >= 0 ? '#595959' : '#EF4444') },
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

      {/* DSCR Gauge + Lender Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gauge */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col justify-between" style={{ minHeight: '220px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">DSCR Classification</h4>
          {aggregate.isAllCash ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Shield className="w-8 h-8 opacity-30 mb-2" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-xs font-bold text-text-primary">N/A — All-Cash Portfolio</p>
              <p className="text-[10px] text-text-secondary opacity-60 max-w-xs mt-1">
                There are no mortgage debt payments in this portfolio. DSCR is not applicable.
              </p>
            </div>
          ) : (
            <>
              <div className="flex w-full rounded-lg overflow-hidden" style={{ height: '28px' }}>
                {gaugeSegments.map((seg, i) => {
                  const isActive = aggregate.portfolioDSCR >= seg.min && aggregate.portfolioDSCR < (i === gaugeSegments.length - 1 ? Infinity : seg.max);
                  return (
                    <div key={i} className="flex-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-wider transition-all relative"
                      style={{ background: isActive ? seg.color : `${seg.color}22`, color: isActive ? '#fff' : seg.color, opacity: isActive ? 1 : 0.6, borderRight: i < gaugeSegments.length - 1 ? '1px solid var(--bg-surface)' : 'none' }}>
                      {seg.label}
                      {isActive && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold" style={{ color: seg.color }}>▲ {dscrDisplay}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-7 px-1">
                {gaugeSegments.map((seg, i) => <span key={i} className="text-[9px] font-medium flex-1 text-center" style={{ color: seg.color }}>{seg.desc}</span>)}
              </div>
              {/* Big number */}
              <div className="mt-6 text-center">
                <p className="text-4xl font-black tabular-nums" style={{ color: classification.color }}>{dscrDisplay}×</p>
                <p className="text-[10px] font-bold mt-1" style={{ color: classification.color }}>{classification.description}</p>
              </div>
            </>
          )}
        </div>

        {/* Lender Threshold Analysis */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Lender Qualification Check</h4>
          </div>
          {aggregate.isAllCash ? (
            <div className="flex flex-col items-center justify-center py-8 text-center" style={{ minHeight: '180px' }}>
              <Shield className="w-8 h-8 opacity-30 mb-2" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-xs font-bold text-text-primary">Lender Check N/A</p>
              <p className="text-[10px] text-text-secondary opacity-60 max-w-xs mt-1">
                Lenders evaluate DSCR for properties requiring financing. With zero debt, this portfolio is 100% equity-financed.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {lenderThresholds.map((t, i) => {
                  const meets = aggregate.portfolioDSCR >= t.threshold;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: meets ? `${t.color}22` : 'rgba(239,68,68,0.1)', color: meets ? t.color : '#EF4444' }}>
                        {meets ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                          <span className="text-[10px] font-bold tabular-nums" style={{ color: t.color }}>{t.threshold.toFixed(2)}×</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full mt-1" style={{ background: 'var(--bg-inset)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (aggregate.portfolioDSCR / t.threshold) * 100)}%`, background: meets ? t.color : '#EF4444' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* NOI gap */}
              {noiGap > 0 && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(165,165,165,0.06)', border: '1px solid rgba(165,165,165,0.15)' }}>
                  <p className="text-[10px] font-bold" style={{ color: '#A5A5A5' }}>
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    To hit 1.25× DSCR, you need {fmtUSD(Math.round(noiGap))}/yr more NOI ({fmtUSD(Math.round(noiGap / 12))}/mo in rent or reduced expenses).
                  </p>
                </div>
              )}
              {noiGap <= 0 && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(89,89,89,0.06)', border: '1px solid rgba(89,89,89,0.15)' }}>
                  <p className="text-[10px] font-bold" style={{ color: '#595959' }}>
                    ✓ Property exceeds the 1.25× lender minimum by {fmtUSD(Math.round(Math.abs(noiGap)))}/yr.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sensitivity Table */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">DSCR Sensitivity — "What If NOI Changes?"</h4>
        </div>
        {aggregate.isAllCash ? (
          <p className="text-xs text-text-secondary opacity-60 py-4 text-center">
            Sensitivity analysis is not applicable because there is no debt service to cover.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  {['NOI Change', 'Net Operating Income', 'DSCR', 'Lender Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensitivityRows.map((row) => {
                  const cls = classifyDSCR(row.dscr);
                  const isCurrent = row.delta === 0;
                  return (
                    <tr key={row.delta}>
                      <td className="px-3 py-2 font-bold" style={{ color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                        {isCurrent ? 'Current' : `${row.delta > 0 ? '+' : ''}${row.delta}%`}
                      </td>
                      <td className="px-3 py-2 tabular-nums" style={{ color: '#595959', fontWeight: isCurrent ? 700 : 500, borderBottom: '1px solid var(--border-ui)' }}>{fmtUSD(Math.round(row.noi))}/yr</td>
                      <td className="px-3 py-2 tabular-nums" style={{ color: cls.color, fontWeight: isCurrent ? 700 : 500, background: isCurrent ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>{row.dscr.toFixed(2)}×</td>
                      <td className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: row.dscr >= 1.25 ? '#595959' : row.dscr >= 1.0 ? '#A5A5A5' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>
                        {row.dscr >= 1.25 ? 'Qualifies' : row.dscr >= 1.0 ? 'Marginal' : 'Rejected'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Portfolio Comparison */}
      {(() => {
        const chartData = breakdowns.filter(b => !b.isAllCash);
        if (chartData.length <= 1) return null;
        return (
          <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '300px' }}>
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">DSCR by Property — Lender Readiness</h4>
            <div className="flex-1 min-h-0 pt-4">
              <DSCRChart data={chartData} height="100%" />
            </div>
          </div>
        );
      })()}

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed animate-fade-in" style={{ background: 'rgba(127,127,127,0.05)', border: '1px solid rgba(127,127,127,0.15)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>DSCR Formula:</strong>{' '}
        <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>
          DSCR = Net Operating Income ÷ Annual Debt Service
        </code>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Example:</strong>{' '}
        <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>
          $12,486 NOI ÷ $10,764 annual mortgage = 1.16 DSCR
        </code>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>All-Cash Guardrail:</strong>{' '}
        For properties with no financing (all-cash deals), there is no debt service. In these cases, DSCR is displayed as <strong style={{ color: 'var(--text-primary)' }}>N/A</strong> rather than attempting a divide-by-zero or displaying infinity.
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>What lenders see:</strong>{' '}
        <span style={{ color: '#DC2626' }}>■ &lt;1.0 Rejected (Below Break-even)</span> •{' '}
        <span style={{ color: '#A5A5A5' }}>■ 1.0–1.25 Marginal (Thin Margin)</span> •{' '}
        <span style={{ color: '#7F7F7F' }}>■ 1.25–1.5 Qualifies (Typical Lender Minimum)</span> •{' '}
        <span style={{ color: '#595959' }}>■ ≥1.5 Preferred (Excellent Coverage)</span>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Why it matters:</strong>{' '}
        A DSCR below 1.0 means the property cannot cover its own mortgage — you&apos;re paying out of pocket. Most lenders require ≥1.25, meaning 25% more income than your mortgage payment.
      </div>
    </div>
  );
}
