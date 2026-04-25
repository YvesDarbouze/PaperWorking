'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PortfolioKPIStrip — 3 High-Level Summary Cards

   1. Average Gross Profit (from sold deals)
   2. Median Resale Price (from sold deals)
   3. Active Capital Deployed (from active deals)

   All derived from Zustand projectStore.projects[].
   ═══════════════════════════════════════════════════════════════ */

interface PortfolioKPIs {
  avgGrossProfit: number;
  medianResalePrice: number;
  activeCapitalDeployed: number;
  soldCount: number;
  activeCount: number;
}

function computePortfolioKPIs(projects: Project[]): PortfolioKPIs {
  const soldDeals = projects.filter(d => d.status === 'Sold');
  const activeDeals = projects.filter(d => d.status !== 'Sold');

  // Average Gross Profit from sold deals
  let totalGrossProfit = 0;
  const salePrices: number[] = [];

  soldDeals.forEach(deal => {
    const salePrice = deal.financials?.actualSalePrice || 0;
    const purchasePrice = deal.financials?.purchasePrice || 0;
    const grossProfit = salePrice - purchasePrice;
    totalGrossProfit += grossProfit;
    if (salePrice > 0) salePrices.push(salePrice);
  });

  const avgGrossProfit = soldDeals.length > 0 ? totalGrossProfit / soldDeals.length : 0;

  // Median Resale Price
  salePrices.sort((a, b) => a - b);
  let medianResalePrice = 0;
  if (salePrices.length > 0) {
    const mid = Math.floor(salePrices.length / 2);
    medianResalePrice = salePrices.length % 2 === 0
      ? (salePrices[mid - 1] + salePrices[mid]) / 2
      : salePrices[mid];
  }

  // Active Capital Deployed
  let activeCapitalDeployed = 0;
  activeDeals.forEach(deal => {
    const purchasePrice = deal.financials?.purchasePrice || 0;
    let approvedCosts = 0;
    deal.financials?.costs?.forEach(c => {
      if (c.approved) approvedCosts += c.amount;
    });
    const inspections = deal.financials?.inspections?.reduce((sum, i) => sum + i.actualCost, 0) || 0;
    activeCapitalDeployed += purchasePrice + approvedCosts + inspections;
  });

  return {
    avgGrossProfit,
    medianResalePrice,
    activeCapitalDeployed,
    soldCount: soldDeals.length,
    activeCount: activeDeals.length,
  };
}

function formatCurrency(value: number): string {
  if (value === 0) return '—';
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toLocaleString()}`;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}

function KPICard({ icon, label, value, subtext }: KPICardProps) {
  return (
    <div className="ag-card bg-bg-surface border border-border-accent/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px] hover:scale-[1.02] transition-all duration-300 group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-bg-primary flex items-center justify-center text-text-secondary group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500">
          {icon}
        </div>
        <p className="ag-label opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
      </div>
      <div className="mt-6">
        <h3 className="text-4xl font-light text-text-primary tracking-tighter leading-none">{value}</h3>
        <p className="text-[11px] text-text-secondary mt-3 font-normal tracking-tight opacity-50 uppercase tracking-wide">
          {subtext}
        </p>
      </div>
    </div>
  );
}

interface PortfolioKPIStripProps {
  projects: Project[];
}

export default function PortfolioKPIStrip({ projects }: PortfolioKPIStripProps) {
  const kpis = useMemo(() => computePortfolioKPIs(projects), [projects]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <KPICard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Avg. Gross Profit"
        value={formatCurrency(kpis.avgGrossProfit)}
        subtext={`Across ${kpis.soldCount} realized exits`}
      />
      <KPICard
        icon={<DollarSign className="w-5 h-5" />}
        label="Median Resale Price"
        value={formatCurrency(kpis.medianResalePrice)}
        subtext={`${kpis.soldCount} sold properties indexed`}
      />
      <KPICard
        icon={<BarChart3 className="w-5 h-5" />}
        label="Active Capital Deployed"
        value={formatCurrency(kpis.activeCapitalDeployed)}
        subtext={`${kpis.activeCount} active positions`}
      />
    </section>
  );
}
