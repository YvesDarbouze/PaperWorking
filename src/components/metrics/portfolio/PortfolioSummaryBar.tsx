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
      <>
        <style dangerouslySetInnerHTML={{__html: `
          .luminous-glass-panel {
            background: linear-gradient(135deg, rgba(45, 54, 61, 0.4) 0%, rgba(20, 29, 35, 0.6) 100%) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-left: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
          }
          .luminous-pipeline-segment {
            position: relative;
          }
          @media (min-width: 768px) {
            .luminous-pipeline-segment:not(:last-child)::after {
              content: '';
              position: absolute;
              right: 0;
              top: 15%;
              height: 70%;
              width: 1px;
              background: rgba(255, 255, 255, 0.1);
            }
          }
          @media (max-width: 767px) {
            .luminous-pipeline-segment:not(:last-child)::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 5%;
              width: 90%;
              height: 1px;
              background: rgba(255, 255, 255, 0.1);
            }
          }
        `}} />
        <div className={`luminous-glass-panel rounded-xl overflow-hidden flex flex-col md:flex-row w-full shadow-lg ${className ?? ''}`}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 p-6 h-[140px] animate-pulse bg-white/5 luminous-pipeline-segment" />
          ))}
        </div>
      </>
    );
  }

  const items = [
    {
      key: 'acquisition',
      title: 'Acquisition',
      dotClass: 'bg-primary-container shadow-[0_0_8px_rgba(45,212,191,0.6)]',
      hoverTextClass: 'group-hover:text-primary-container',
      value: metrics.acquisition.val,
      count: metrics.acquisition.count,
      icon: 'search',
      pillClass: 'bg-surface-container-high border border-white/5 text-on-surface-variant font-label-sm text-label-sm',
    },
    {
      key: 'purchase',
      title: 'Purchase',
      dotClass: 'bg-secondary-fixed-dim shadow-[0_0_8px_rgba(173,198,255,0.6)]',
      hoverTextClass: 'group-hover:text-secondary-fixed-dim',
      value: metrics.purchase.val,
      count: metrics.purchase.count,
      icon: 'gavel',
      pillClass: 'bg-surface-container-high border border-white/5 text-on-surface-variant font-label-sm text-label-sm',
    },
    {
      key: 'hold',
      title: 'Hold',
      dotClass: 'bg-tertiary shadow-[0_0_8px_rgba(255,209,170,0.6)]',
      hoverTextClass: 'group-hover:text-tertiary',
      value: metrics.hold.val,
      count: metrics.hold.count,
      icon: 'home_work',
      pillClass: 'bg-surface-container-high border border-white/5 text-on-surface-variant font-label-sm text-label-sm',
    },
    {
      key: 'exit',
      title: 'Exit',
      dotClass: 'bg-[#2c3a4c] shadow-[0_0_8px_rgba(44,58,76,0.6)]',
      hoverTextClass: 'group-hover:text-[#8ea2bb]',
      value: metrics.exit.val,
      count: metrics.exit.count,
      icon: 'sell',
      pillClass: 'bg-surface-container-high border border-white/5 text-on-surface-variant opacity-70 font-label-sm text-label-sm',
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .luminous-glass-panel {
          background: linear-gradient(135deg, rgba(45, 54, 61, 0.4) 0%, rgba(20, 29, 35, 0.6) 100%) !important;
          backdrop-filter: blur(24px) !important;
          -webkit-backdrop-filter: blur(24px) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-left: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.04) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        }
        .luminous-pipeline-segment {
          position: relative;
        }
        @media (min-width: 768px) {
          .luminous-pipeline-segment:not(:last-child)::after {
            content: '';
            position: absolute;
            right: 0;
            top: 15%;
            height: 70%;
            width: 1px;
            background: rgba(255, 255, 255, 0.1);
          }
        }
        @media (max-width: 767px) {
          .luminous-pipeline-segment:not(:last-child)::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 5%;
            width: 90%;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
          }
        }
      `}} />
      <div className={`luminous-glass-panel rounded-xl overflow-hidden flex flex-col md:flex-row w-full shadow-lg ${className ?? ''}`}>
        {items.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="luminous-pipeline-segment flex-1 p-6 hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${item.dotClass}`}></div>
              <h3 className={`font-label-md text-label-md uppercase tracking-widest text-on-surface ${item.hoverTextClass} transition-colors`}>
                {item.title}
              </h3>
            </div>
            <div className="space-y-1">
              <div className={`font-mono text-3xl font-bold text-on-background ${item.key === 'exit' && item.count === 0 ? 'text-on-surface-variant' : ''}`}>
                {fmtDollar(item.value)}
              </div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full ${item.pillClass}`}>
                <span className="material-symbols-outlined text-[14px] mr-1">{item.icon}</span>
                {item.count} {item.count === 1 ? 'Property' : 'Properties'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
