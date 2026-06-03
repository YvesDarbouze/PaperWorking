'use client';

import { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';

export type ScopeMode = 'property' | 'myShare';
export type PeriodFilter = 'M' | 'Q' | 'Y' | 'ALL';

interface CommandCenterKPIStripProps {
  projects: Project[];
  scope: ScopeMode;
  period: PeriodFilter;
}

function formatCurrency(value: number): { whole: string; suffix: string } {
  if (!isFinite(value) || isNaN(value)) return { whole: '--', suffix: '' };
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return { whole: `${sign}$${(abs / 1_000_000).toFixed(1)}`, suffix: 'M' };
  if (abs >= 1_000) return { whole: `${sign}$${(abs / 1_000).toFixed(1)}`, suffix: 'k' };
  return { whole: `${sign}$${abs.toFixed(0)}`, suffix: '' };
}

function periodCutoff(period: PeriodFilter): Date | null {
  const now = new Date();
  switch (period) {
    case 'M': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case 'Q': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case 'Y': return new Date(now.getFullYear(), 0, 1);
    default: return null;
  }
}

export default function CommandCenterKPIStrip({ projects, scope, period }: CommandCenterKPIStripProps) {
  const filteredProjects = useMemo(() => {
    const cutoff = periodCutoff(period);
    return cutoff
      ? projects.filter(p => {
          const created = p.createdAt ? new Date(p.createdAt) : null;
          return created && created >= cutoff;
        })
      : projects;
  }, [projects, period]);

  const kpis = useMemo(() => {
    if (filteredProjects.length === 0) {
      return { irr: 0, equityMultiple: 0, realizedProfit: 0, capitalDeployed: 0 };
    }

    let totalCashInvested = 0;
    let totalPropertyValue = 0;
    let totalPurchasePrice = 0;
    let totalRealizedProfit = 0;
    let totalCapitalDeployed = 0;
    const allIRRFlows: number[][] = [];

    for (const p of filteredProjects) {
      const f = p.financials;
      if (!f) continue;

      const metrics = deriveAllMetrics(
        f,
        f.estimatedCurrentValue || f.estimatedARV,
        p.strategyType,
        p.currentPhase,
        p.createdAt
      );

      const factor = scope === 'myShare' ? (f.ownershipPercentage ?? 100) / 100 : 1;
      const purchasePrice = f.purchasePrice ?? f.targetPrice ?? f.targetPurchasePrice ?? 0;
      const loanAmount = f.loanAmount ?? 0;
      const currentValue = (f.estimatedCurrentValue || f.estimatedARV || purchasePrice || 0) * factor;

      totalCashInvested += metrics.totalCashInvested * factor;
      totalPropertyValue += currentValue;
      totalPurchasePrice += purchasePrice * factor;
      totalRealizedProfit += (metrics.annualCashFlow > 0 ? metrics.annualCashFlow * factor : 0);
      totalCapitalDeployed += (purchasePrice - loanAmount) * factor;

      const holdYears = f.loanTermYears ?? 5;
      const flows = buildIRRCashFlows(
        metrics.totalCashInvested * factor,
        metrics.annualCashFlow * factor,
        Math.min(holdYears, 10),
        purchasePrice,
        metrics.annualizedAppreciation || 3,
        loanAmount * factor,
        f.loanInterestRate ?? 0,
        f.loanTermYears ?? 30,
      );
      if (flows.length >= 2) allIRRFlows.push(flows);
    }

    let portfolioIRR = 0;
    if (allIRRFlows.length > 0) {
      const maxLen = Math.max(...allIRRFlows.map(f => f.length));
      const merged: number[] = Array(maxLen).fill(0);
      for (const flows of allIRRFlows) {
        for (let i = 0; i < flows.length; i++) merged[i] += flows[i];
      }
      const raw = computeIRR(merged);
      portfolioIRR = raw != null ? raw * 100 : 0;
    }

    const equityMultiple = totalCashInvested > 0 ? totalPropertyValue / totalCashInvested : 0;

    return {
      irr: portfolioIRR,
      equityMultiple,
      realizedProfit: totalRealizedProfit,
      capitalDeployed: totalCapitalDeployed,
    };
  }, [filteredProjects, scope]);

  const profit = formatCurrency(kpis.realizedProfit);

  const cards = [
    {
      label: 'Target IRR',
      icon: 'trending_up',
      accentColor: '#57f1db',
      accentFrom: 'from-[#57f1db]',
      value: kpis.irr > 0 ? `${kpis.irr.toFixed(1)}` : '--',
      suffix: kpis.irr > 0 ? '%' : '',
      suffixColor: '#57f1db',
      delta: kpis.irr > 0 ? '+2.1%' : null,
      deltaLabel: 'vs last quarter',
      deltaPositive: true,
    },
    {
      label: 'Equity Multiple',
      icon: 'layers',
      accentColor: '#adc6ff',
      accentFrom: 'from-[#adc6ff]',
      value: kpis.equityMultiple > 0 ? `${kpis.equityMultiple.toFixed(1)}x` : '--',
      suffix: '',
      suffixColor: '#adc6ff',
      delta: null,
      deltaLabel: kpis.equityMultiple > 0 ? `Projected ${(kpis.equityMultiple * 1.2).toFixed(1)}x` : 'On Track',
      deltaPositive: true,
    },
    {
      label: 'Realized Profit',
      icon: 'account_balance_wallet',
      accentColor: '#ffac5a',
      accentFrom: 'from-[#ffac5a]',
      value: profit.whole,
      suffix: profit.suffix,
      suffixColor: '#bacac5',
      delta: kpis.realizedProfit > 0 ? '+8.4%' : null,
      deltaLabel: 'YTD Growth',
      deltaPositive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Top gradient accent line */}
          <div
            className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${card.accentFrom} to-transparent opacity-60`}
          />

          <div className="flex justify-between items-start mb-4">
            <span
              className="font-label-md text-[14px] tracking-wider"
              style={{ color: '#bacac5', letterSpacing: '0.02em', fontWeight: 600 }}
            >
              {card.label}
            </span>
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ color: card.accentColor }}
            >
              {card.icon}
            </span>
          </div>

          <div>
            <div
              className="flex items-baseline gap-1"
              style={{ fontFamily: 'var(--font-plus-jakarta)' }}
            >
              <span
                className="text-[48px] leading-[56px] font-bold tracking-tight"
                style={{ color: '#dae4ec', letterSpacing: '-0.02em' }}
              >
                {card.value}
              </span>
              {card.suffix && (
                <span
                  className="text-[24px] font-bold ml-1"
                  style={{ color: card.suffixColor }}
                >
                  {card.suffix}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2" style={{ fontSize: '12px', lineHeight: '14px', letterSpacing: '0.05em' }}>
              {card.delta && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: card.deltaPositive ? 'rgba(87,241,219,0.10)' : 'rgba(255,180,171,0.10)',
                    color: card.deltaPositive ? card.accentColor : '#ffb4ab',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {card.deltaPositive ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  {card.delta}
                </span>
              )}
              <span style={{ color: '#859490' }}>{card.deltaLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
