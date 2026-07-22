'use client';

import { useMemo } from 'react';
import { Project } from '@/types/schema';
import { computePortfolioKPIs } from '@/lib/metrics/reiMetrics';

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
    const results = computePortfolioKPIs(filteredProjects, scope);
    return {
      irr: results.targetIRR,
      equityMultiple: results.equityMultiple,
      realizedProfit: results.realizedProfit,
      capitalDeployed: results.capitalDeployed,
    };
  }, [filteredProjects, scope]);

  const profit = formatCurrency(kpis.realizedProfit);

  const cards = [
    {
      label: 'Target IRR',
      icon: 'trending_up',
      accentColor: '#454955',
      accentFrom: 'from-[#454955]',
      value: kpis.irr > 0 ? `${kpis.irr.toFixed(1)}` : '--',
      suffix: kpis.irr > 0 ? '%' : '',
      suffixColor: '#454955',
      delta: kpis.irr > 0 ? '+2.1%' : null,
      deltaLabel: 'vs last quarter',
      deltaPositive: true,
    },
    {
      label: 'Equity Multiple',
      icon: 'layers',
      accentColor: '#7A9EAA',
      accentFrom: 'from-[#7A9EAA]',
      value: kpis.equityMultiple > 0 ? `${kpis.equityMultiple.toFixed(1)}x` : '--',
      suffix: '',
      suffixColor: '#7A9EAA',
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
      suffixColor: '#9E9DA0',
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
              style={{ color: '#9E9DA0', letterSpacing: '0.02em', fontWeight: 600 }}
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
            <div className="flex items-baseline gap-1 font-tabular">
              <span
                className="text-[48px] leading-[56px] font-bold tracking-tight"
                style={{ color: 'rgba(253,255,252,0.95)', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}
              >
                {card.value}
              </span>
              {card.suffix && (
                <span
                  className="text-[24px] font-semibold ml-1"
                  style={{ color: 'rgba(253,255,252,0.55)' }}
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
                    background: card.deltaPositive ? 'var(--pw-success-container)' : 'rgba(240,101,67,0.15)',
                    color: card.deltaPositive ? 'var(--pw-success)' : '#F06543',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {card.deltaPositive ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  {card.delta}
                </span>
              )}
              <span style={{ color: 'rgba(253,255,252,0.38)' }}>{card.deltaLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
