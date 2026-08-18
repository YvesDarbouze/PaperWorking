'use client';

import React, { useState } from 'react';
import { ProjectMetricsResult } from '@/lib/metrics/types';
import { MetricCard } from './MetricCard';
import { MetricDonut } from '../Charts/MetricDonut';
import { MetricStackedBar } from '../Charts/MetricStackedBar';
import { MetricRadar } from '../Charts/MetricRadar';
import { MetricFunnel } from '../Charts/MetricFunnel';
import { MetricThermometer } from '../Charts/MetricThermometer';

interface InsightsPanelProps {
  metrics: ProjectMetricsResult;
}

export function InsightsPanel({ metrics }: InsightsPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    financial: true,
    operational: true,
    assetPortfolio: true,
    marketingSales: true,
    riskCompliance: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { insights, projectId } = metrics || {};
  if (!insights) return <div className="p-6 text-slate-400">No insights metrics available.</div>;

  const { financial, operational, assetPortfolio, marketingSales, riskCompliance } = insights;

  return (
    <div data-testid="insights-tab" className="space-y-6">
      {/* 1. FINANCIAL PERFORMANCE SECTION */}
      <section className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden">
        <button
          onClick={() => toggleSection('financial')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition-colors"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Performance (9 KPIs)</h3>
          <span className="text-slate-400 text-xs">{openSections.financial ? '▼' : '►'}</span>
        </button>

        {openSections.financial && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard title="LTV" metric={financial.ltv} format="percent" projectId={projectId} />
              <MetricCard title="Equity-to-Value" metric={financial.equityToValue} format="percent" projectId={projectId} />
              <MetricCard title="Interest Coverage" metric={financial.interestCoverageRatio} format="ratio" projectId={projectId} />
              <MetricCard title="ROI" metric={financial.roi} format="percent" projectId={projectId} />
              <MetricCard title="CapEx" metric={financial.capex} format="currency" projectId={projectId} />
              <MetricCard title="GOI" metric={financial.goi} format="currency" projectId={projectId} />
              <MetricCard title="AAR" metric={financial.aar} format="percent" projectId={projectId} />
              <MetricCard title="Equity Multiple" metric={financial.equityMultiple} format="ratio" projectId={projectId} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricDonut />
              <MetricStackedBar />
            </div>
          </div>
        )}
      </section>

      {/* 2. OPERATIONAL EFFICIENCY SECTION */}
      <section className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden">
        <button
          onClick={() => toggleSection('operational')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition-colors"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operational Efficiency (6 KPIs)</h3>
          <span className="text-slate-400 text-xs">{openSections.operational ? '▼' : '►'}</span>
        </button>

        {openSections.operational && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard title="Tenant Turnover" metric={operational.tenantTurnover} format="percent" projectId={projectId} />
              <MetricCard title="Avg Rent / Property" metric={operational.averageRentPerProperty} format="currency" projectId={projectId} />
              <MetricCard title="Lease Renewal Rate" metric={operational.leaseRenewalRate} format="percent" projectId={projectId} />
              <MetricCard title="Maintenance / Unit" metric={operational.maintenanceCostPerUnit} format="currency" projectId={projectId} />
              <MetricCard title="Days on Market" metric={operational.dom} format="number" unitLabel="days" projectId={projectId} />
              <MetricCard title="Construction Cost / SqFt" metric={operational.constructionCostPerSqFt} format="currency" projectId={projectId} />
            </div>
          </div>
        )}
      </section>

      {/* 3. ASSET & PORTFOLIO SECTION */}
      <section className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden">
        <button
          onClick={() => toggleSection('assetPortfolio')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition-colors"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Asset & Portfolio Management (5 KPIs)</h3>
          <span className="text-slate-400 text-xs">{openSections.assetPortfolio ? '▼' : '►'}</span>
        </button>

        {openSections.assetPortfolio && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard title="Portfolio Value Growth" metric={assetPortfolio.portfolioValueGrowth} format="percent" projectId={projectId} />
              <MetricCard title="Payback Period" metric={assetPortfolio.paybackPeriod} format="number" unitLabel="yrs" projectId={projectId} />
              <MetricCard title="YoY Sold Price Variance" metric={assetPortfolio.yoyVarianceAvgSoldPrice} format="percent" projectId={projectId} />
              <MetricCard title="Sold Homes / Inventory" metric={assetPortfolio.soldHomesPerInventory} format="ratio" projectId={projectId} />
              <MetricCard title="Demand Growth" metric={assetPortfolio.demandGrowth} format="percent" projectId={projectId} />
            </div>
          </div>
        )}
      </section>

      {/* 4. MARKETING & SALES SECTION */}
      <section className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden">
        <button
          onClick={() => toggleSection('marketingSales')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition-colors"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Marketing & Sales (2 KPIs)</h3>
          <span className="text-slate-400 text-xs">{openSections.marketingSales ? '▼' : '►'}</span>
        </button>

        {openSections.marketingSales && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard title="Listing-to-Meeting Ratio" metric={marketingSales.listingToMeetingRatio} format="percent" projectId={projectId} />
              <MetricCard title="Avg Commission / Sale" metric={marketingSales.averageCommissionPerSale} format="currency" projectId={projectId} />
            </div>
            <MetricFunnel />
          </div>
        )}
      </section>

      {/* 5. RISK & COMPLIANCE SECTION */}
      <section className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden">
        <button
          onClick={() => toggleSection('riskCompliance')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/80 hover:bg-slate-900 transition-colors"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Risk & Compliance (2 KPIs)</h3>
          <span className="text-slate-400 text-xs">{openSections.riskCompliance ? '▼' : '►'}</span>
        </button>

        {openSections.riskCompliance && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricRadar />
              <MetricThermometer value={riskCompliance.complianceRate.value} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
