'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  deriveDualScopeMetrics,
  computeCapRate,
  computeNOIComponents,
} from '@/lib/metrics/reiMetrics';
import CapRateCompareChart from '@/components/Charts/CapRateCompareChart';
import {
  Target, TrendingUp, AlertTriangle, ShieldCheck,
  Info, ArrowRight, Gauge, Building2,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CAP RATE DEEP DIVE
   Cap Rate = NOI ÷ Property Purchase Price

   Provides:
   1. Gauge visualization with market-risk color zones
   2. KPI strip: Cap Rate %, NOI, Purchase Price, Market Classification
   3. Sensitivity table: "What if purchase price or NOI changes?"
   4. Per-property comparison bar chart (portfolio)
   5. Educational callout with context on when to use cap rate
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  projects?: Project[];
}

/* ── Formatting ── */
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

/* ── Market classification ── */
type MarketZone = 'premium' | 'stable' | 'balanced' | 'yield' | 'high-yield';

function classifyCapRate(rate: number): {
  zone: MarketZone;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (rate <= 0) return {
    zone: 'premium', label: 'No Income', description: 'Property has no net income',
    color: '#6B7280', bgColor: 'rgba(107,114,128,0.08)', borderColor: 'rgba(107,114,128,0.2)',
  };
  if (rate < 4) return {
    zone: 'premium', label: 'Premium / Appreciating Market',
    description: 'Low yield but strong appreciation potential — gateway cities, Class A assets',
    color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)',
  };
  if (rate < 6) return {
    zone: 'stable', label: 'Stable / Low-Risk Market',
    description: 'Sweet spot for SFR investors — steady returns, predictable appreciation',
    color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)',
  };
  if (rate < 8) return {
    zone: 'balanced', label: 'Balanced Market',
    description: 'Good cash flow with moderate appreciation — suburban and secondary markets',
    color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)',
  };
  if (rate < 10) return {
    zone: 'yield', label: 'Higher-Yield Market',
    description: 'Strong cash flow but may carry higher vacancy or deferred maintenance risk',
    color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)',
  };
  return {
    zone: 'high-yield', label: 'Aggressive / High-Risk',
    description: 'Very high yield often signals distressed areas or significant property risk',
    color: '#F06543', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)',
  };
}

/* ── Per-property data ── */
interface PropertyCapRateData {
  name: string;
  capRate: number;
  noi: number;
  purchasePrice: number;
  estimatedARV: number;
  arvCapRate: number;
  classification: ReturnType<typeof classifyCapRate>;
}

function deriveCapRateBreakdowns(projects: Project[]): PropertyCapRateData[] {
  return projects
    .filter(p => p.financials)
    .map((p) => {
      const f = p.financials!;
      const { asset: metrics } = deriveDualScopeMetrics(f, undefined, p.strategyType, p.currentPhase);
      const purchasePrice = f.purchasePrice ?? 0;
      const estimatedARV = f.estimatedARV ?? purchasePrice;
      const arvCapRate = metrics.arvCapRate;

      return {
        name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
        capRate: metrics.capRate,
        noi: metrics.noi,
        purchasePrice,
        estimatedARV,
        arvCapRate,
        classification: classifyCapRate(metrics.capRate),
      };
    })
    .slice(0, 8);
}



/* ── Gauge component ── */
function CapRateGauge({ capRate }: { capRate: number }) {
  // Clamp to 0-15% range for display
  const displayRate = Math.min(Math.max(capRate, 0), 15);
  const fillPercent = (displayRate / 15) * 100;

  // Zone colors for the gauge background
  const zones = [
    { start: 0, end: 4, color: '#595959', label: '<4%' },
    { start: 4, end: 6, color: '#595959', label: '4-6%' },
    { start: 6, end: 8, color: '#7F7F7F', label: '6-8%' },
    { start: 8, end: 10, color: '#A5A5A5', label: '8-10%' },
    { start: 10, end: 15, color: '#F06543', label: '10%+' },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Gauge bar */}
      <div className="w-full max-w-xs">
        <div className="relative h-4 rounded-full overflow-hidden flex">
          {zones.map((z, i) => (
            <div
              key={i}
              className="h-full"
              style={{
                width: `${((z.end - z.start) / 15) * 100}%`,
                background: z.color,
                opacity: 0.25,
              }}
            />
          ))}
          {/* Needle indicator */}
          <div
            className="absolute top-0 h-full w-1 rounded-full shadow-lg transition-all duration-700 ease-out"
            style={{
              left: `${fillPercent}%`,
              background: classifyCapRate(capRate).color,
              boxShadow: `0 0 8px ${classifyCapRate(capRate).color}`,
              transform: 'translateX(-50%)',
            }}
          />
        </div>
        {/* Zone labels */}
        <div className="flex justify-between mt-2">
          {zones.map((z, i) => (
            <span
              key={i}
              className="text-[8px] font-bold uppercase tracking-wider"
              style={{
                color: z.color,
                opacity: 0.6,
                width: `${((z.end - z.start) / 15) * 100}%`,
                textAlign: 'center',
              }}
            >
              {z.label}
            </span>
          ))}
        </div>
      </div>

      {/* Cap rate value */}
      <div className="text-center">
        <p
          className="text-4xl font-bold tabular-nums tracking-tight"
          style={{ color: classifyCapRate(capRate).color }}
        >
          {fmtPct(capRate)}
        </p>
        <p className="text-xs font-bold uppercase tracking-[0.12em] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Capitalization Rate
        </p>
      </div>
    </div>
  );
}

/* ── Sensitivity table ── */
function SensitivityTable({ noi, purchasePrice }: { noi: number; purchasePrice: number }) {
  const priceDeltas = [-10, -5, 0, 5, 10]; // % change in price
  const noiDeltas = [-10, -5, 0, 5, 10]; // % change in NOI

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr>
            <th
              className="px-2 py-2 text-left font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}
            >
              NOI ↓ / Price →
            </th>
            {priceDeltas.map(d => (
              <th
                key={d}
                className="px-2 py-2 text-center font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}
              >
                {d === 0 ? 'Current' : `${d > 0 ? '+' : ''}${d}%`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {noiDeltas.map(nd => {
            const adjustedNOI = noi * (1 + nd / 100);
            return (
              <tr key={nd}>
                <td
                  className="px-2 py-1.5 font-bold"
                  style={{
                    color: nd === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-ui)',
                  }}
                >
                  {nd === 0 ? `${fmtUSD(noi)} (current)` : `${nd > 0 ? '+' : ''}${nd}%`}
                </td>
                {priceDeltas.map(pd => {
                  const adjustedPrice = purchasePrice * (1 + pd / 100);
                  const cr = adjustedPrice > 0 ? (adjustedNOI / adjustedPrice) * 100 : 0;
                  const isCurrent = nd === 0 && pd === 0;
                  const cls = classifyCapRate(cr);
                  return (
                    <td
                      key={pd}
                      className="px-2 py-1.5 text-center tabular-nums"
                      style={{
                        color: cls.color,
                        fontWeight: isCurrent ? 700 : 500,
                        background: isCurrent ? cls.bgColor : 'transparent',
                        borderBottom: '1px solid var(--border-ui)',
                        borderRadius: isCurrent ? '4px' : '0',
                      }}
                    >
                      {fmtPct(cr)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function CapRateDeepDive({ projects: propProjects }: Props) {
  const breakdowns = useMemo(
    () => deriveCapRateBreakdowns(propProjects || []),
    [propProjects]
  );

  /* ── Portfolio aggregation ── */
  const aggregate = useMemo(() => {
    if (breakdowns.length === 0) return null;
    const totalNOI = breakdowns.reduce((s, b) => s + b.noi, 0);
    const totalPrice = breakdowns.reduce((s, b) => s + b.purchasePrice, 0);
    const totalARV = breakdowns.reduce((s, b) => s + b.estimatedARV, 0);
    const portfolioCapRate = totalPrice > 0 ? (totalNOI / totalPrice) * 100 : 0;
    const portfolioARVCapRate = totalARV > 0 ? (totalNOI / totalARV) * 100 : 0;
    return {
      totalNOI,
      totalPrice,
      totalARV,
      capRate: Math.round(portfolioCapRate * 100) / 100,
      arvCapRate: Math.round(portfolioARVCapRate * 100) / 100,
    };
  }, [breakdowns]);

  if (!aggregate || aggregate.totalPrice === 0) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Info className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add a property with purchase price and income data to see your Cap Rate analysis.
        </p>
      </div>
    );
  }

  const classification = classifyCapRate(aggregate.capRate);

  return (
    <div className="w-full space-y-6">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <Target className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Cap Rate Analysis
            </h3>
            <p className="text-xs text-text-secondary">
              NOI ÷ Purchase Price = Property income potential
            </p>
          </div>
        </div>
        {/* Market classification badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* ── Gauge + KPI Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gauge — 2 cols */}
        <div
          className="lg:col-span-2 bg-bg-surface border border-border-accent rounded-xl p-6 flex flex-col items-center justify-center"
          style={{ minHeight: '280px' }}
        >
          <CapRateGauge capRate={aggregate.capRate} />
          <p
            className="text-xs text-center mt-4 max-w-[200px] leading-relaxed"
            style={{ color: classification.color }}
          >
            {classification.description}
          </p>
        </div>

        {/* KPIs — 3 cols */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          {[
            {
              icon: Target,
              label: 'Purchase Cap Rate',
              value: fmtPct(aggregate.capRate),
              sublabel: `NOI ${fmtUSD(aggregate.totalNOI)} ÷ Price ${fmtUSD(aggregate.totalPrice)}`,
              color: classification.color,
            },
            {
              icon: TrendingUp,
              label: 'ARV Cap Rate',
              value: fmtPct(aggregate.arvCapRate),
              sublabel: `NOI ÷ ARV ${fmtUSD(aggregate.totalARV)}`,
              color: '#20B2AA',
            },
            {
              icon: Gauge,
              label: 'Annual NOI',
              value: fmtUSD(aggregate.totalNOI),
              sublabel: `${fmtUSD(Math.round(aggregate.totalNOI / 12))}/mo operational income`,
              color: '#595959',
            },
            {
              icon: Building2,
              label: 'Portfolio Value',
              value: fmtUSD(aggregate.totalPrice),
              sublabel: `${breakdowns.length} ${breakdowns.length === 1 ? 'property' : 'properties'}`,
              color: 'var(--text-primary)',
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
      </div>

      {/* ── Sensitivity Matrix ── */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
            Cap Rate Sensitivity — "What If" Analysis
          </h4>
        </div>
        <p className="text-[10px] mb-4" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
          See how your cap rate shifts with ±5–10% changes in NOI or purchase price.
        </p>
        <SensitivityTable noi={aggregate.totalNOI} purchasePrice={aggregate.totalPrice} />
      </div>

      {/* ── Per-Property Comparison ── */}
      {breakdowns.length > 1 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '300px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            Cap Rate by Property — Portfolio Comparison
          </h4>
          <div className="flex-1 min-h-0">
            <CapRateCompareChart
              data={breakdowns.map(b => ({
                name: b.name,
                capRate: b.capRate,
                arvCapRate: b.arvCapRate,
                color: b.classification.color
              }))}
            />
          </div>
        </div>
      )}

      {/* ── Educational Callout ── */}
      <div
        className="px-4 py-3 rounded-lg text-[11px] leading-relaxed"
        style={{
          background: 'rgba(89,89,89,0.05)',
          border: '1px solid rgba(89,89,89,0.15)',
          color: 'var(--text-secondary)',
        }}
      >
        <strong style={{ color: 'var(--text-primary)' }}>Cap Rate Formula:</strong>{' '}
        <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>
          Cap Rate = Net Operating Income ÷ Property Purchase Price
        </code>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Reading the zones:</strong>{' '}
        <span style={{ color: '#595959' }}>■ &lt;4% Premium/Appreciating</span> •{' '}
        <span style={{ color: '#595959' }}>■ 4–6% Stable/Low-Risk</span> •{' '}
        <span style={{ color: '#7F7F7F' }}>■ 6–8% Balanced</span> •{' '}
        <span style={{ color: '#A5A5A5' }}>■ 8–10% Higher-Yield</span> •{' '}
        <span style={{ color: '#F06543' }}>■ 10%+ Aggressive</span>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>When to use:</strong>{' '}
        Cap rate works best for comparing two properties of the same type in the same market.
        It isn't suitable for value-add deals where significant renovations are planned — use ARV cap rate for that.
        A high cap rate isn't always better — it often signals higher risk.
      </div>
    </div>
  );
}
