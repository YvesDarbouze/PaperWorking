'use client';

import { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  deriveAllMetrics,
  computeIRR,
  buildIRRCashFlows,
} from '@/lib/metrics/reiMetrics';

// ── Types ──────────────────────────────────────────────────────

export type ScopeMode = 'property' | 'myShare';
export type PeriodFilter = 'M' | 'Q' | 'Y' | 'ALL';

interface CommandCenterKPIStripProps {
  projects: Project[];
  scope: ScopeMode;
  period: PeriodFilter;
}

// ── Helpers ────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '--';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPercent(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '--';
  return `${value.toFixed(1)}%`;
}

function formatRatio(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '--';
  return value.toFixed(2);
}

function periodCutoff(period: PeriodFilter): Date | null {
  if (period === 'ALL') return null;
  const now = new Date();
  const days = period === 'M' ? 30 : period === 'Q' ? 90 : 365;
  return new Date(now.getTime() - days * 86_400_000);
}

// ── Sparkline (decorative micro-viz) ────────────────────────────
 
function MiniSparkline({
  variant,
  health,
}: {
  variant: 'bars' | 'flat' | 'gauge';
  health: 'positive' | 'warning' | 'error';
}) {
  const colorClass =
    health === 'positive'
      ? 'bg-primary'
      : health === 'warning'
      ? 'bg-[#ffac5a]'
      : 'bg-error';

  if (variant === 'bars') {
    return (
      <div className="flex items-end gap-px mt-1.5 opacity-40">
        <div className={`w-1.5 h-1 ${colorClass} rounded-sm`} />
        <div className={`w-1.5 h-2 ${colorClass} rounded-sm`} />
        <div className={`w-1.5 h-3 ${colorClass} rounded-sm`} />
        <div className={`w-1.5 h-4 ${colorClass} rounded-sm`} />
      </div>
    );
  }
  if (variant === 'flat') {
    return (
      <div className="mt-1.5 opacity-40">
        <div className={`w-12 h-px ${colorClass} rounded-full`} />
      </div>
    );
  }
  // gauge bar
  return (
    <div className="mt-1.5 w-12 h-1 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} opacity-60 rounded-full`} style={{ width: '65%' }} />
    </div>
  );
}

// ── Helpers for Health and State ───────────────────────────────

function getMetricHealth(label: string, valueStr: string): 'positive' | 'warning' | 'error' {
  if (valueStr === '--' || valueStr === '') return 'warning';
  
  // Extract number from string
  const cleanVal = parseFloat(valueStr.replace(/[^\d.-]/g, ''));
  if (isNaN(cleanVal)) return 'warning';

  switch (label) {
    case 'NOI':
    case 'Cash Flow':
    case 'Cap Raised':
      return cleanVal > 0 ? 'positive' : cleanVal < 0 ? 'error' : 'warning';
    
    case 'Cap Rate':
      return cleanVal >= 6.0 ? 'positive' : cleanVal >= 4.0 ? 'warning' : 'error';
      
    case 'CoC':
      return cleanVal >= 8.0 ? 'positive' : cleanVal >= 4.0 ? 'warning' : 'error';
      
    case 'GRM':
      // Lower is better for GRM
      return cleanVal <= 10.0 ? 'positive' : cleanVal <= 15.0 ? 'warning' : 'error';
      
    case 'DSCR':
      return cleanVal >= 1.25 ? 'positive' : cleanVal >= 1.0 ? 'warning' : 'error';
      
    case 'IRR':
      return cleanVal >= 12.0 ? 'positive' : cleanVal >= 8.0 ? 'warning' : 'error';
      
    case 'Occupancy':
      return cleanVal >= 90.0 ? 'positive' : cleanVal >= 80.0 ? 'warning' : 'error';
      
    case 'Exp Ratio':
      // Lower is better for OER
      return cleanVal <= 50.0 ? 'positive' : cleanVal <= 65.0 ? 'warning' : 'error';
      
    case 'Appreciation':
      return cleanVal >= 3.0 ? 'positive' : cleanVal >= 1.0 ? 'warning' : 'error';
      
    default:
      return 'positive';
  }
}

function getMetricState(metric: string, projects: Project[]): 'PROJECTED' | 'LIVE' | 'REALIZED' {
  if (projects.length === 0) return 'PROJECTED';
  
  // Specific override for forecasting/fundraising metrics
  if (metric === 'appreciation') return 'PROJECTED';
  if (metric === 'capRaised') return 'PROJECTED';
  if (metric === 'irr') {
    return projects.every(p => p.status === 'Sold') ? 'REALIZED' : 'PROJECTED';
  }

  const allSold = projects.every(p => p.status === 'Sold');
  if (allSold) return 'REALIZED';

  const allAcquisition = projects.every(p => p.status === 'Lead' || p.status === 'Under Contract');
  if (allAcquisition) return 'PROJECTED';

  return 'LIVE';
}

function getHealthStyles(health: 'positive' | 'warning' | 'error') {
  switch (health) {
    case 'positive':
      return {
        borderClass: 'border-l-4 border-l-primary/60',
        textClass: 'text-primary',
      };
    case 'warning':
      return {
        borderClass: 'border-l-4 border-l-[#ffac5a]/60',
        textClass: 'text-[#ffac5a]',
      };
    case 'error':
      return {
        borderClass: 'border-l-4 border-l-error/60',
        textClass: 'text-error',
      };
  }
}

function getBadgeStyles(state: 'PROJECTED' | 'LIVE' | 'REALIZED') {
  switch (state) {
    case 'LIVE':
      return {
        color: 'var(--color-primary)',
        background: 'rgba(45, 212, 191, 0.1)',
        border: '1px solid rgba(45, 212, 191, 0.15)',
      };
    case 'REALIZED':
      return {
        color: 'var(--color-on-surface-variant)',
        background: 'var(--color-surface-container-highest)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      };
    case 'PROJECTED':
      return {
        color: '#ffb875',
        background: 'rgba(255, 184, 117, 0.1)',
        border: '1px solid rgba(255, 184, 117, 0.15)',
      };
  }
}

// ── KPI Card ────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  health: 'positive' | 'warning' | 'error';
  state: 'PROJECTED' | 'LIVE' | 'REALIZED';
  sparkline: 'bars' | 'flat' | 'gauge';
}

function KPICard({ label, value, health, state, sparkline }: KPICardProps) {
  const healthStyles = getHealthStyles(health);
  const badgeStyles = getBadgeStyles(state);

  return (
    <div
      className={`
        w-36 h-36 flex-shrink-0 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden
        bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] ${healthStyles.borderClass}
      `}
    >
      <div className="flex justify-between items-start gap-1">
        <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold truncate max-w-[65%]">
          {label}
        </span>
        <span
          className="text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90 origin-right"
          style={badgeStyles}
        >
          {state}
        </span>
      </div>
      <div className="my-auto">
        <span className={`block text-xl font-bold font-display leading-none tracking-tight ${healthStyles.textClass}`}>
          {value}
        </span>
      </div>
      <MiniSparkline variant={sparkline} health={health} />
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────

export default function CommandCenterKPIStrip({
  projects,
  scope,
  period,
}: CommandCenterKPIStripProps) {
  const filteredProjects = useMemo(() => {
    const cutoff = periodCutoff(period);
    return cutoff
      ? projects.filter(p => {
          const created = p.createdAt ? new Date(p.createdAt as any) : null;
          return created && created >= cutoff;
        })
      : projects;
  }, [projects, period]);

  const kpis = useMemo(() => {
    if (filteredProjects.length === 0) {
      return {
        noi: '--',
        cashFlow: '--',
        capRate: '--',
        coc: '--',
        grm: '--',
        dscr: '--',
        irr: '--',
        occupancy: '--',
        expRatio: '--',
        appreciation: '--',
        capRaised: '--',
      };
    }

    let totalNOI = 0;
    let totalCashFlow = 0;
    let totalCapRateWeighted = 0;
    let totalCoCWeighted = 0;
    let totalGRMWeighted = 0;
    let totalDSCRWeighted = 0;
    let totalOccupancyWeighted = 0;
    let totalOERWeighted = 0;
    let totalAppreciationWeighted = 0;
    let totalCapRaised = 0;
    let totalWeight = 0;

    const allIRRFlows: number[][] = [];

    for (const p of filteredProjects) {
      if (!p.financials) continue;

      const metrics = deriveAllMetrics(
        p.financials,
        p.financials.estimatedCurrentValue,
        p.strategyType,
        p.currentPhase,
        p.createdAt as any
      );

      const ownershipFactor = scope === 'myShare'
        ? ((p.financials as any).ownershipPercentage ?? 100) / 100
        : 1;

      const purchasePrice = p.financials.purchasePrice ?? 0;
      const weight = purchasePrice > 0 ? purchasePrice : 1;

      totalNOI += metrics.noi * ownershipFactor;
      totalCashFlow += metrics.annualCashFlow * ownershipFactor;
      totalCapRateWeighted += metrics.capRate * weight;
      totalCoCWeighted += metrics.cashOnCashReturn * weight;
      totalGRMWeighted += metrics.grossRentMultiplier * weight;
      totalDSCRWeighted += (isFinite(metrics.dscr) ? metrics.dscr : 0) * weight;
      totalOccupancyWeighted += metrics.occupancyRate * weight;
      totalOERWeighted += metrics.oer * weight;
      totalAppreciationWeighted += metrics.annualizedAppreciation * weight;
      totalWeight += weight;

      // Capital raised
      totalCapRaised += ((p.financials.capitalRaiseTarget ?? 0) * ownershipFactor);

      // IRR cash flows
      const holdYears = p.financials.loanTermYears ?? 5;
      const flows = buildIRRCashFlows(
        metrics.totalCashInvested * ownershipFactor,
        metrics.annualCashFlow * ownershipFactor,
        Math.min(holdYears, 10),
        p.financials.purchasePrice ?? 0,
        metrics.annualizedAppreciation || 3,
        (p.financials.loanAmount ?? 0) * ownershipFactor,
        p.financials.loanInterestRate ?? 0,
        p.financials.loanTermYears ?? 30,
      );
      if (flows.length >= 2) allIRRFlows.push(flows);
    }

    // Portfolio IRR: merge all project cash flows by year
    let portfolioIRR: number | null = null;
    if (allIRRFlows.length > 0) {
      const maxLen = Math.max(...allIRRFlows.map(f => f.length));
      const merged: number[] = Array(maxLen).fill(0);
      for (const flows of allIRRFlows) {
        for (let i = 0; i < flows.length; i++) {
          merged[i] += flows[i];
        }
      }
      portfolioIRR = computeIRR(merged);
    }

    const w = totalWeight || 1;

    return {
      noi: formatCurrency(totalNOI),
      cashFlow: formatCurrency(totalCashFlow),
      capRate: formatPercent(totalCapRateWeighted / w),
      coc: formatPercent(totalCoCWeighted / w),
      grm: formatRatio(totalGRMWeighted / w),
      dscr: formatRatio(totalDSCRWeighted / w),
      irr: portfolioIRR != null ? formatPercent(portfolioIRR * 100) : '--',
      occupancy: formatPercent(totalOccupancyWeighted / w),
      expRatio: formatPercent(totalOERWeighted / w),
      appreciation: formatPercent(totalAppreciationWeighted / w),
      capRaised: formatCurrency(totalCapRaised),
    };
  }, [filteredProjects, scope]);

  return (
    <section className="overflow-x-auto no-scrollbar -mx-4 px-4">
      <div className="flex gap-3 w-max">
        <KPICard
          label="NOI"
          value={kpis.noi}
          health={getMetricHealth('NOI', kpis.noi)}
          state={getMetricState('noi', filteredProjects)}
          sparkline="bars"
        />
        <KPICard
          label="Cash Flow"
          value={kpis.cashFlow}
          health={getMetricHealth('Cash Flow', kpis.cashFlow)}
          state={getMetricState('cashFlow', filteredProjects)}
          sparkline="flat"
        />
        <KPICard
          label="Cap Rate"
          value={kpis.capRate}
          health={getMetricHealth('Cap Rate', kpis.capRate)}
          state={getMetricState('capRate', filteredProjects)}
          sparkline="gauge"
        />
        <KPICard
          label="CoC"
          value={kpis.coc}
          health={getMetricHealth('CoC', kpis.coc)}
          state={getMetricState('coc', filteredProjects)}
          sparkline="gauge"
        />
        <KPICard
          label="GRM"
          value={kpis.grm}
          health={getMetricHealth('GRM', kpis.grm)}
          state={getMetricState('grm', filteredProjects)}
          sparkline="gauge"
        />
        <KPICard
          label="DSCR"
          value={kpis.dscr}
          health={getMetricHealth('DSCR', kpis.dscr)}
          state={getMetricState('dscr', filteredProjects)}
          sparkline="gauge"
        />
        <KPICard
          label="IRR"
          value={kpis.irr}
          health={getMetricHealth('IRR', kpis.irr)}
          state={getMetricState('irr', filteredProjects)}
          sparkline="bars"
        />
        <KPICard
          label="Occupancy"
          value={kpis.occupancy}
          health={getMetricHealth('Occupancy', kpis.occupancy)}
          state={getMetricState('occupancy', filteredProjects)}
          sparkline="gauge"
        />
        <KPICard
          label="Exp Ratio"
          value={kpis.expRatio}
          health={getMetricHealth('Exp Ratio', kpis.expRatio)}
          state={getMetricState('expRatio', filteredProjects)}
          sparkline="gauge"
        />
        <KPICard
          label="Appreciation"
          value={kpis.appreciation}
          health={getMetricHealth('Appreciation', kpis.appreciation)}
          state={getMetricState('appreciation', filteredProjects)}
          sparkline="bars"
        />
        <KPICard
          label="Cap Raised"
          value={kpis.capRaised}
          health={getMetricHealth('Cap Raised', kpis.capRaised)}
          state={getMetricState('capRaised', filteredProjects)}
          sparkline="flat"
        />
      </div>
    </section>
  );
}
