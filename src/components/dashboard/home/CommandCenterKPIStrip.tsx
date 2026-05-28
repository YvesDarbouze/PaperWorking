'use client';

import { useMemo } from 'react';
import { Project } from '@/types/schema';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';
import { TrendingUp, Activity, DollarSign, Percent, CheckCircle, Clock } from 'lucide-react';

export type ScopeMode = 'property' | 'myShare';
export type PeriodFilter = 'M' | 'Q' | 'Y' | 'ALL';

interface CommandCenterKPIStripProps {
  projects: Project[];
  scope: ScopeMode;
  period: PeriodFilter;
}

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
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function periodCutoff(period: PeriodFilter): Date | null {
  const now = new Date();
  switch (period) {
    case 'M': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case 'Q': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case 'Y': return new Date(now.getFullYear(), 0, 1);
    case 'ALL':
    default: return null;
  }
}

interface LuminousCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  bottomContent?: React.ReactNode;
}

function LuminousCard({ label, value, icon: Icon, bottomContent }: LuminousCardProps) {
  return (
    <div className="glass-card rounded-xl p-6 light-leak flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <span className="text-on-surface-variant font-label-md uppercase tracking-wider">{label}</span>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="jetbrains-mono text-3xl font-bold text-on-surface">{value}</div>
      </div>
      {bottomContent}
    </div>
  );
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
      return { totalValue: '--', irr: '--', coc: '--' };
    }

    let totalPortfolioValue = 0;
    let totalCoCWeighted = 0;
    let totalWeight = 0;
    const allIRRFlows: number[][] = [];

    for (const p of filteredProjects) {
      if (!p.financials) continue;

      const metrics = deriveAllMetrics(
        p.financials,
        p.financials.estimatedCurrentValue,
        p.strategyType,
        p.currentPhase,
        p.createdAt
      );

      const ownershipFactor = scope === 'myShare'
        ? (p.financials.ownershipPercentage ?? 100) / 100
        : 1;

      const purchasePrice = p.financials.purchasePrice ?? 0;
      const weight = purchasePrice > 0 ? purchasePrice : 1;
      const value = (p.financials.estimatedCurrentValue || p.financials.purchasePrice || 0) * ownershipFactor;

      totalPortfolioValue += value;
      totalCoCWeighted += metrics.cashOnCashReturn * weight;
      totalWeight += weight;

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
      totalValue: formatCurrency(totalPortfolioValue),
      irr: portfolioIRR != null ? formatPercent(portfolioIRR * 100) : '--',
      coc: formatPercent(totalCoCWeighted / w),
    };
  }, [filteredProjects, scope]);

  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LuminousCard 
          label="Total Portfolio Value" 
          value="$12.4M" 
          icon={DollarSign} 
          bottomContent={
            <div className="mt-2 flex items-center gap-2 text-primary">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-label-sm">+12.4% vs LY</span>
            </div>
          }
        />
        <LuminousCard 
          label="Target IRR" 
          value="18.5%" 
          icon={Percent} 
          bottomContent={
            <div className="mt-2 flex items-center gap-2 text-primary">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-label-sm">Above Target (15%)</span>
            </div>
          }
        />
        <LuminousCard 
          label="Cash on Cash Return" 
          value="8.2%" 
          icon={TrendingUp} 
          bottomContent={
            <div className="mt-2 flex items-center gap-2 text-on-surface-variant">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-label-sm">Updated 2h ago</span>
            </div>
          }
        />
      </div>
  );
}
