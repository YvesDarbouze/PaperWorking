'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Home, Activity, Hammer, Tag, TrendingUp, Percent, DollarSign, BarChart2 } from 'lucide-react';
import { Project, ProjectFinancials } from '@/types/schema';

export interface PortfolioSummaryBarProps {
  projects: Project[];
  isLoading?: boolean;
  className?: string;
}

function safe(n: number | undefined | null): number {
  return n != null && isFinite(n) ? n : 0;
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function computeNOI(fin: ProjectFinancials): number {
  const rent = safe(fin.monthlyGrossRent || fin.projectedMonthlyRent);
  const other = safe(fin.otherMonthlyIncome);
  const vacRate = safe(fin.vacancyRatePercent ?? fin.vacancyRate) / 100;
  const effectiveGrossIncome = (rent + other) * (1 - vacRate) * 12;
  const opex =
    safe(fin.holdingCostTaxes) * 12 +
    safe(fin.holdingCostInsurance) * 12 +
    safe(fin.monthlyMaintenanceReserve) * 12 +
    safe(fin.monthlyHOA) * 12;
  return effectiveGrossIncome - opex;
}

function computeCapRate(fin: ProjectFinancials): number {
  const noi = computeNOI(fin);
  const value = safe(fin.estimatedCurrentValue || fin.estimatedARV || fin.actualSalePrice);
  return value > 0 ? (noi / value) * 100 : 0;
}

function computeEquity(fin: ProjectFinancials): number {
  const value = safe(fin.estimatedCurrentValue || fin.estimatedARV);
  const debt  = safe(fin.estimatedExistingDebt || fin.loanAmount);
  return Math.max(0, value - debt);
}

function computeCashDeployed(fin: ProjectFinancials): number {
  const purchase = safe(fin.purchasePrice);
  const rehab = fin.costs?.reduce((s, c) => s + safe(c.amount), 0) ?? 0;
  return purchase + rehab;
}

interface MetricTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number | null;
  delay?: number;
}

function MetricTile({ icon, label, value, trend, delay = 0 }: MetricTileProps) {
  const hasTrend = trend != null;
  const positive  = hasTrend && trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="flex flex-col gap-1 px-4 py-3 min-w-0"
    >
      <div className="flex items-center gap-1.5 text-pw-muted">
        <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>
        <p className="text-[9px] font-mono uppercase tracking-widest truncate">{label}</p>
      </div>
      <p className="text-base font-mono font-normal text-pw-black tracking-tight">{value}</p>
      {hasTrend && (
        <p
          className="text-[9px] font-mono"
          style={{ color: positive ? '#0D0D0D' : '#A5A5A5' }}
        >
          {positive ? '+' : ''}{trend!.toFixed(1)}% MoM
        </p>
      )}
    </motion.div>
  );
}

const shimmerCls = 'animate-pulse bg-pw-border/30 rounded';

export function PortfolioSummaryBar({ projects, isLoading, className }: PortfolioSummaryBarProps) {
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'Active' || p.status === 'Under Contract').length;
    const rehab  = projects.filter(p => p.status === 'Renovating').length;
    const listed = projects.filter(p => p.status === 'Listed').length;

    const totalNOI = projects.reduce((s, p) => s + computeNOI(p.financials), 0);
    const capRates = projects.map(p => computeCapRate(p.financials)).filter(r => r > 0);
    const avgCapRate = capRates.length > 0 ? capRates.reduce((s, r) => s + r, 0) / capRates.length : 0;
    const cashDeployed = projects.reduce((s, p) => s + computeCashDeployed(p.financials), 0);
    const totalEquity  = projects.reduce((s, p) => s + computeEquity(p.financials), 0);

    return { total, active, rehab, listed, totalNOI, avgCapRate, cashDeployed, totalEquity };
  }, [projects]);

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-pw-border bg-pw-surface overflow-hidden ${className ?? ''}`}>
        <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-y divide-pw-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className={`h-2 w-16 ${shimmerCls}`} />
              <div className={`h-5 w-20 ${shimmerCls}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tiles: MetricTileProps[] = [
    { icon: <Home className="w-3.5 h-3.5" />,      label: 'Total Properties',   value: String(metrics.total) },
    { icon: <Activity className="w-3.5 h-3.5" />,  label: 'Active Deals',        value: String(metrics.active) },
    { icon: <Hammer className="w-3.5 h-3.5" />,    label: 'Under Rehab',         value: String(metrics.rehab) },
    { icon: <Tag className="w-3.5 h-3.5" />,       label: 'Properties Listed',   value: String(metrics.listed) },
    { icon: <TrendingUp className="w-3.5 h-3.5" />,label: 'Portfolio NOI',        value: fmtDollar(metrics.totalNOI) },
    { icon: <Percent className="w-3.5 h-3.5" />,   label: 'Avg Cap Rate',         value: fmtPct(metrics.avgCapRate) },
    { icon: <DollarSign className="w-3.5 h-3.5" />,label: 'Cash Deployed',        value: fmtDollar(metrics.cashDeployed) },
    { icon: <BarChart2 className="w-3.5 h-3.5" />, label: 'Total Equity',         value: fmtDollar(metrics.totalEquity) },
  ];

  return (
    <div
      className={`rounded-2xl border border-pw-border bg-pw-surface overflow-hidden ${className ?? ''}`}
      role="region"
      aria-label="Portfolio health summary"
    >
      <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-pw-border">
        {tiles.map((tile, i) => (
          <MetricTile key={tile.label} {...tile} delay={i * 0.05} />
        ))}
      </div>
    </div>
  );
}
