'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
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

function computeCashDeployed(fin: ProjectFinancials): number {
  const purchase = safe(fin.purchasePrice);
  const rehab = fin.costs?.reduce((s, c) => s + safe(c.amount), 0) ?? 0;
  return purchase + rehab;
}

export function PortfolioSummaryBar({ projects, isLoading, className }: PortfolioSummaryBarProps) {
  const metrics = useMemo(() => {
    const acquisition = projects.filter(p => p.status === 'Lead');
    const purchase = projects.filter(p => p.status === 'Under Contract');
    const hold = projects.filter(p => p.status === 'Renovating' || p.status === 'Active');
    const exit = projects.filter(p => p.status === 'Listed' || p.status === 'Sold');

    const acquisitionVal = acquisition.reduce((s, p) => s + computeCashDeployed(p.financials), 0);
    const purchaseVal = purchase.reduce((s, p) => s + computeCashDeployed(p.financials), 0);
    const holdVal = hold.reduce((s, p) => s + computeCashDeployed(p.financials), 0);
    const exitVal = exit.reduce((s, p) => s + computeCashDeployed(p.financials), 0);

    return {
      acquisition: { count: acquisition.length, val: acquisitionVal },
      purchase: { count: purchase.length, val: purchaseVal },
      hold: { count: hold.length, val: holdVal },
      exit: { count: exit.length, val: exitVal },
    };
  }, [projects]);

  if (isLoading) {
    return (
      <section className={`grid grid-cols-2 md:grid-cols-4 gap-2 ${className ?? ''}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-2 rounded-xl h-[80px] animate-pulse bg-white/5" />
        ))}
      </section>
    );
  }

  return (
    <section className={`grid grid-cols-2 md:grid-cols-4 gap-2 ${className ?? ''}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="glass-card p-2 rounded-xl text-center border-l-[3px] border-primary"
      >
        <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">Acquisition</span>
        <span className="block font-headline-md text-primary text-lg font-black leading-none mt-1">{metrics.acquisition.count}</span>
        <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">{fmtDollar(metrics.acquisition.val)}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-card p-2 rounded-xl text-center border-l-[3px] border-secondary"
      >
        <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">Purchase</span>
        <span className="block font-headline-md text-secondary text-lg font-black leading-none mt-1">{metrics.purchase.count}</span>
        <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">{fmtDollar(metrics.purchase.val)}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="glass-card p-2 rounded-xl text-center border-l-[3px] border-on-surface-variant"
      >
        <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">Hold</span>
        <span className="block font-headline-md text-on-surface text-lg font-black leading-none mt-1">{metrics.hold.count}</span>
        <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">{fmtDollar(metrics.hold.val)}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="glass-card p-2 rounded-xl text-center border-l-[3px] border-error"
      >
        <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">Exit/Rent</span>
        <span className="block font-headline-md text-error text-lg font-black leading-none mt-1">{metrics.exit.count}</span>
        <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">{fmtDollar(metrics.exit.val)}</span>
      </motion.div>
    </section>
  );
}
