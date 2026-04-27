'use client';
import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { TrendingUp, DollarSign, BarChart3, ArrowUpRight } from 'lucide-react';
import { calculatePortfolioSummary } from '@/lib/analyticsUtils';

/* ═══════════════════════════════════════════════════════════════
   PortfolioKPIStrip — Institutional Performance Indicators
   
   Displays aggregated portfolio metrics using unified logic.
   Aesthetics: Glassmorphism, mono typography for values, bold tracking.
   ═══════════════════════════════════════════════════════════════ */

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  trend?: string;
}

function KPICard({ icon, label, value, subtext, trend }: KPICardProps) {
  return (
    <div className="ag-card relative overflow-hidden bg-bg-surface border border-border-accent/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px] group transition-all duration-500 hover:shadow-xl hover:border-pw-black/20">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl pointer-events-none" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-bg-primary flex items-center justify-center text-text-secondary group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500 shadow-sm">
            {icon}
          </div>
          <p className="ag-label opacity-40 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-[0.2em] text-[10px]">
            {label}
          </p>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>

      <div className="mt-8 relative z-10">
        <h3 className="text-4xl font-light text-text-primary tracking-tighter leading-none font-mono">
          {value}
        </h3>
        <p className="text-[11px] text-text-secondary mt-4 font-medium tracking-tight opacity-50 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-pw-border group-hover:bg-pw-black transition-colors" />
          {subtext}
        </p>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value === 0) return '—';
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value).toLocaleString()}`;
}

interface PortfolioKPIStripProps {
  projects: Project[];
}

export default function PortfolioKPIStrip({ projects }: PortfolioKPIStripProps) {
  const kpis = useMemo(() => calculatePortfolioSummary(projects), [projects]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <KPICard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Avg. Net Profit"
        value={formatCurrency(kpis.avgGrossProfit)}
        subtext={`${kpis.soldCount} realized exits`}
        trend={kpis.avgROI > 0 ? `${kpis.avgROI.toFixed(1)}% ROI` : undefined}
      />
      <KPICard
        icon={<DollarSign className="w-5 h-5" />}
        label="Median Resale"
        value={formatCurrency(kpis.medianResalePrice)}
        subtext="Market value benchmark"
      />
      <KPICard
        icon={<BarChart3 className="w-5 h-5" />}
        label="Capital Deployed"
        value={formatCurrency(kpis.activeCapitalDeployed)}
        subtext={`${kpis.activeCount} active positions`}
      />
    </section>
  );
}
