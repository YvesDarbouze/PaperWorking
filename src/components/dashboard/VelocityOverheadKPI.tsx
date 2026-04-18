'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  Timer, Flame, BarChart3, Percent, Eye,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   VelocityOverheadKPI — Monthly Velocity & Overhead Module

   A real-time KPI strip that auto-calculates 5 portfolio-level
   health metrics from the Zustand deal store:

   1. Time to Flip (TTF)        — avg days from creation to sale
   2. Monthly Overhead Burn     — fixed costs aggregated
   3. Construction Variance     — target vs actual rehab spend
   4. Cash-on-Cash Return       — annualized net yield
   5. Pipeline Visibility       — active vs pending-sale mix

   All values derive reactively from the projects[] array.
   Zero prop-drilling — just pass projects and it computes everything.
   ═══════════════════════════════════════════════════════════════ */

/* ─── TTF Color Logic ─── */
type TTFBand = 'green' | 'yellow' | 'red' | 'neutral';

function ttfBand(days: number | null): TTFBand {
  if (days === null) return 'neutral';
  if (days < 180) return 'green';
  if (days <= 365) return 'yellow';
  return 'red';
}

const TTF_STYLE: Record<TTFBand, { bg: string; text: string; border: string; label: string }> = {
  green:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '< 6 mo' },
  yellow:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: '6-12 mo' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     label: '> 12 mo' },
  neutral: { bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',    label: 'N/A' },
};

/* ─── Computed KPI Shape ─── */
interface VelocityKPIs {
  avgTTF: number | null;          // Average days to flip (sold projects only)
  ttfDeals: number;               // Count of sold projects used in TTF
  monthlyOverhead: number;        // Aggregated fixed monthly costs
  constructionVariance: number;   // Percentage: (actual - target) / target * 100
  varianceDeals: number;          // Count of projects with budget data
  cashOnCash: number;             // Annualized CoC return percentage
  cocDeals: number;               // Count of projects used in CoC
  activePct: number;              // Percentage of portfolio value that is "active"
  pendingSalePct: number;         // Percentage that is "Listed" (pending sale)
  totalPortfolioValue: number;    // Sum of all deal values
}

/**
 * Derive all KPIs from the raw projects array.
 * Re-runs reactively whenever the projects reference changes.
 */
function computeKPIs(projects: Project[]): VelocityKPIs {
  let ttfSum = 0;
  let ttfCount = 0;

  let totalTargetBudget = 0;
  let totalActualSpend = 0;
  let varianceDeals = 0;

  let totalAnnualCashFlow = 0;
  let totalCashInvested = 0;
  let cocDeals = 0;

  let activeValue = 0;
  let pendingSaleValue = 0;
  let totalPortfolioValue = 0;

  // Monthly overhead: sum holding costs that represent fixed recurring expenses
  let monthlyOverhead = 0;

  projects.forEach(deal => {
    const fin = deal.financials;
    const purchasePrice = fin?.purchasePrice || 0;
    const arv = fin?.estimatedARV || 0;
    const dealValue = fin?.actualSalePrice || arv || purchasePrice;

    totalPortfolioValue += dealValue;

    // ── 1. Time to Flip ────────────────────────────────
    if (deal.status === 'Sold' && fin?.soldDate && deal.createdAt) {
      const created = new Date(deal.createdAt);
      const sold = new Date(fin.soldDate);
      const diffMs = sold.getTime() - created.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      ttfSum += diffDays;
      ttfCount++;
    }

    // ── 2. Monthly Overhead ────────────────────────────
    // Aggregate per-deal fixed monthly costs (holding costs entries)
    if (deal.holdingCosts) {
      deal.holdingCosts.forEach(hc => {
        monthlyOverhead += hc.monthlyAmount || 0;
      });
    }
    // Also factor in property management + maintenance + mortgage from financials
    if (fin?.propertyManagementFee) monthlyOverhead += fin.propertyManagementFee;
    if (fin?.maintenanceReserves) monthlyOverhead += fin.maintenanceReserves;
    if (fin?.longTermMortgagePayment) monthlyOverhead += fin.longTermMortgagePayment;

    // ── 3. Construction Budget Variance ────────────────
    const targetBudget = deal.rehab?.baseBudget || fin?.projectedRehabCost || 0;
    let actualSpend = 0;
    fin?.costs?.forEach(c => {
      if (c.approved) actualSpend += c.amount;
    });
    // Add inspection actuals
    fin?.inspections?.forEach(i => {
      actualSpend += i.actualCost;
    });
    // Add separate rehab expenses
    deal.rehabExpenses?.forEach(e => {
      actualSpend += e.amount;
    });

    if (targetBudget > 0) {
      totalTargetBudget += targetBudget;
      totalActualSpend += actualSpend;
      varianceDeals++;
    }

    // ── 4. Cash-on-Cash Return ─────────────────────────
    if (deal.status === 'Sold' && fin?.actualSalePrice) {
      const salePrice = fin.actualSalePrice;
      const buyerComm = (fin.buyersAgentCommission || 0) / 100;
      const sellerComm = (fin.sellersAgentCommission || 0) / 100;
      const closingCosts = fin.finalClosingCosts || 0;

      const totalCommissions = salePrice * (buyerComm + sellerComm);
      const netProceeds = salePrice - totalCommissions - closingCosts;

      const totalInvested = purchasePrice + actualSpend + (fin.loanAmount ? fin.loanAmount * ((fin.loanOriginationPoints || 0) / 100) : 0);
      const netCashFlow = netProceeds - totalInvested;

      // Annualize based on hold period
      const created = new Date(deal.createdAt);
      const sold = new Date(fin.soldDate!);
      const holdDays = Math.max(1, (sold.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      const annualizedCashFlow = netCashFlow * (365 / holdDays);

      totalAnnualCashFlow += annualizedCashFlow;
      totalCashInvested += totalInvested;
      cocDeals++;
    }

    // ── 5. Pipeline Visibility ─────────────────────────
    if (deal.status === 'Listed') {
      pendingSaleValue += dealValue;
    } else if (deal.status !== 'Sold') {
      activeValue += dealValue;
    }
  });

  // Aggregate final values
  const avgTTF = ttfCount > 0 ? Math.round(ttfSum / ttfCount) : null;
  const constructionVariance = totalTargetBudget > 0
    ? ((totalActualSpend - totalTargetBudget) / totalTargetBudget) * 100
    : 0;
  const cashOnCash = totalCashInvested > 0
    ? (totalAnnualCashFlow / totalCashInvested) * 100
    : 0;

  const nonSoldValue = activeValue + pendingSaleValue;
  const activePct = nonSoldValue > 0 ? (activeValue / nonSoldValue) * 100 : 0;
  const pendingSalePct = nonSoldValue > 0 ? (pendingSaleValue / nonSoldValue) * 100 : 0;

  // Final conversion to dollars for display
  return {
    avgTTF,
    ttfDeals: ttfCount,
    monthlyOverhead: monthlyOverhead / 100,
    constructionVariance,
    varianceDeals,
    cashOnCash,
    cocDeals,
    activePct,
    pendingSalePct,
    totalPortfolioValue: totalPortfolioValue / 100,
  };
}

/* ─── Sub-components ─── */

function KPICard({
  icon,
  label,
  value,
  subtext,
  accent,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  accent?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="ag-card bg-pw-surface shadow-[0_15px_30px_rgba(0,0,0,0.02)] border border-pw-border/10 flex flex-col justify-between min-h-[180px] hover:scale-[1.02] transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center text-pw-muted group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500">
            {icon}
          </div>
          <p className="ag-label opacity-60 group-hover:opacity-100 transition-opacity">
            {label}
          </p>
        </div>
        {badge}
      </div>

      <div className="mt-6">
        <h3 className={`text-4xl font-light tracking-tighter leading-none ${accent || 'text-pw-black'}`}>
          {value}
        </h3>
        <p className="text-[11px] text-pw-muted mt-4 font-normal tracking-tight opacity-50 leading-relaxed uppercase tracking-[0.05em]">
          {subtext}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

interface VelocityOverheadKPIProps {
  projects: Project[];
}

export default function VelocityOverheadKPI({ projects }: VelocityOverheadKPIProps) {
  const kpis = useMemo(() => computeKPIs(projects), [projects]);

  const ttfStyle = TTF_STYLE[ttfBand(kpis.avgTTF)];

  // Variance direction indicator
  const varianceIcon = kpis.constructionVariance > 0
    ? <TrendingUp className="w-4 h-4 text-pw-black opacity-30" />
    : kpis.constructionVariance < 0
      ? <TrendingDown className="w-4 h-4 text-pw-black opacity-30" />
      : <Minus className="w-4 h-4 text-pw-muted opacity-30" />;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
      {/* ── 1. Average Cycle Time ── */}
      <KPICard
        icon={<Timer className="w-5 h-5" />}
        label="Average Cycle"
        value={kpis.avgTTF !== null ? `${kpis.avgTTF}d` : '—'}
        subtext={`${kpis.ttfDeals} Entity Exits Recorded`}
        accent="text-pw-black"
        badge={
          kpis.avgTTF !== null && (
            <div className={`w-2.5 h-2.5 rounded-full ${ttfBand(kpis.avgTTF) === 'green' ? 'bg-pw-black' : ttfBand(kpis.avgTTF) === 'yellow' ? 'bg-pw-muted' : 'border border-pw-black'}`}></div>
          )
        }
      />

      {/* ── 2. Operational Burn ── */}
      <KPICard
        icon={<Flame className="w-5 h-5" />}
        label="Operational Burn"
        value={kpis.monthlyOverhead > 0 ? `$${Math.round(kpis.monthlyOverhead).toLocaleString()}` : '$0'}
        subtext="Fixed capital recurring burn rate"
        accent="text-pw-black"
      />

      {/* ── 3. CapEx Variance ── */}
      <KPICard
        icon={<BarChart3 className="w-5 h-5" />}
        label="CapEx Variance"
        value={kpis.varianceDeals > 0
          ? `${kpis.constructionVariance >= 0 ? '+' : ''}${kpis.constructionVariance.toFixed(1)}%`
          : '—'}
        subtext={`${kpis.varianceDeals} Asset Tracks Syncing`}
        accent={
          kpis.constructionVariance > 10 ? 'text-pw-black font-medium'
          : 'text-pw-black'
        }
        badge={kpis.varianceDeals > 0 ? varianceIcon : undefined}
      />

      {/* ── 4. Capital Efficiency ── */}
      <KPICard
        icon={<Percent className="w-5 h-5" />}
        label="Capital Efficiency"
        value={kpis.cocDeals > 0 ? `${kpis.cashOnCash.toFixed(1)}%` : '—'}
        subtext="Annualized efficiency ratio"
        accent="text-pw-black"
      />

      {/* ── 5. Portfolio Fluidity ── */}
      <KPICard
        icon={<Eye className="w-5 h-5" />}
        label="Portfolio Fluidity"
        value={`${Math.round(kpis.activePct)}:${Math.round(kpis.pendingSalePct)}`}
        subtext={`$${Math.round(kpis.totalPortfolioValue / 1000)}k Total Value Locked`}
        badge={
          <div className="flex h-1.5 w-16 bg-pw-bg rounded-full overflow-hidden border border-pw-border/20">
            <div
              className="bg-pw-black transition-all duration-1000"
              style={{ width: `${kpis.activePct}%` }}
            />
            <div
              className="bg-pw-muted transition-all duration-1000 opacity-40"
              style={{ width: `${kpis.pendingSalePct}%` }}
            />
          </div>
        }
      />
    </section>
  );
}
