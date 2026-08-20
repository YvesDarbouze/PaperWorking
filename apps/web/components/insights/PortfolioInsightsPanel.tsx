'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  DEFAULT_PORTFOLIO_33_KPIS,
  money,
  pct,
  type Portfolio33KPIs,
} from '@/lib/insights/portfolio-33-kpis';

function KPICard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-white/10 bg-slate-900/90 p-4 backdrop-blur-sm transition hover:border-white/20">
      <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </span>
      <p className="truncate text-lg font-black text-white">{value}</p>
      <span className="block truncate text-[10px] text-emerald-400">{sub}</span>
    </div>
  );
}

function CategoryHeading({
  icon,
  colorClass,
  children,
}: {
  icon: string;
  colorClass: string;
  children: ReactNode;
}) {
  return (
    <h2
      className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider ${colorClass}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {children}
    </h2>
  );
}

export default function PortfolioInsightsPanel() {
  const [kpis, setKpis] = useState<Portfolio33KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const res = await fetch('/api/reports/portfolio?period=overall', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as { kpis33?: Portfolio33KPIs };
          if (!cancelled && data.kpis33) setKpis(data.kpis33);
        }
      } catch {
        // Keep seed fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 text-white">
        <div className="animate-pulse space-y-3 text-center">
          <span className="material-symbols-outlined mx-auto block animate-spin text-3xl text-emerald-400">
            progress_activity
          </span>
          <p className="text-sm font-semibold text-slate-400">
            Aggregating 33 Deep Portfolio KPIs...
          </p>
        </div>
      </div>
    );
  }

  const kpiData = kpis ?? DEFAULT_PORTFOLIO_33_KPIS;

  return (
    <div
      data-testid="insights-tab"
      className="mx-auto max-w-7xl space-y-8 p-6 text-white md:p-10"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
            <span className="material-symbols-outlined text-[28px] text-emerald-400">monitoring</span>
            PaperWorking — Portfolio Insights & Analytics
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time Bloomberg Terminal analytics aggregated across all active real estate
            investments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            33 KPIs Live Synchronized
          </span>
        </div>
      </div>

      <section className="space-y-4">
        <CategoryHeading icon="work" colorClass="text-emerald-400">
          1. Acquisition & Sourcing KPIs (7)
        </CategoryHeading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard title="Offers Sent" value={kpiData.offersSentTotal.toString()} sub="Total deal offers" />
          <KPICard title="Response Rate" value={pct(kpiData.responseRatePct)} sub="Seller response" />
          <KPICard
            title="Avg Offer Amount"
            value={money(kpiData.avgOfferAmount)}
            sub="Capital committed per offer"
          />
          <KPICard
            title="Deals Under Contract"
            value={kpiData.dealsUnderContract.toString()}
            sub="Active escrow"
          />
          <KPICard
            title="Acceptance Rate"
            value={pct(kpiData.acceptanceRatePct)}
            sub="Offer conversion"
          />
          <KPICard
            title="Crowdfunded Capital"
            value={money(kpiData.crowdfundingRaisedTotal)}
            sub="Investor equity"
          />
          <KPICard
            title="Total Investors"
            value={kpiData.investorCountTotal.toString()}
            sub="Active LP partners"
          />
        </div>
      </section>

      <section className="space-y-4">
        <CategoryHeading icon="fact_check" colorClass="text-blue-400">
          2. Purchase & Escrow KPIs (6)
        </CategoryHeading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KPICard
            title="Avg Closing Time"
            value={`${kpiData.avgClosingDays} Days`}
            sub="PSA to Title closing"
          />
          <KPICard
            title="Loan Approval Rate"
            value={pct(kpiData.loanApprovalRatePct)}
            sub="Underwriting pass rate"
          />
          <KPICard
            title="Doc Completion"
            value={pct(kpiData.docCompletionRatePct)}
            sub="Checklist status"
          />
          <KPICard
            title="Total Closing Costs"
            value={money(kpiData.totalClosingCosts)}
            sub="Title & settlement fees"
          />
          <KPICard
            title="Origination Fees"
            value={money(kpiData.totalOriginationFees)}
            sub="Lender points"
          />
          <KPICard
            title="Title Insurance"
            value={money(kpiData.totalTitleInsurance)}
            sub="Policy premiums"
          />
        </div>
      </section>

      <section className="space-y-4">
        <CategoryHeading icon="home_work" colorClass="text-amber-400">
          3. Hold & Operations KPIs (7)
        </CategoryHeading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            title="Avg Daily Holding Cost"
            value={`$${kpiData.avgDailyHoldingCost}`}
            sub="Mortgage, tax, insurance"
          />
          <KPICard title="Rehab Overrun" value={pct(kpiData.rehabOverrunPct)} sub="Budget variance" />
          <KPICard
            title="Rental Occupancy"
            value={pct(kpiData.rentalOccupancyRatePct)}
            sub="Lease fulfillment"
          />
          <KPICard
            title="Cash-on-Cash Return"
            value={pct(kpiData.cashOnCashReturnPct)}
            sub="Annual yield"
          />
          <KPICard title="Cap Rate" value={pct(kpiData.capRatePct)} sub="Unleveraged return" />
          <KPICard
            title="Monthly Gross Rent"
            value={money(kpiData.monthlyGrossRentTotal)}
            sub="Rental income stream"
          />
          <KPICard
            title="Monthly Expenses"
            value={money(kpiData.monthlyExpensesTotal)}
            sub="OpEx sum"
          />
        </div>
      </section>

      <section className="space-y-4">
        <CategoryHeading icon="trending_up" colorClass="text-purple-400">
          4. Exit & Capital Gains KPIs (7)
        </CategoryHeading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            title="Avg Days on Market"
            value={`${kpiData.avgDaysOnMarket} Days`}
            sub="Listing to contract"
          />
          <KPICard
            title="Sale-to-List Ratio"
            value={pct(kpiData.saleToListRatioPct)}
            sub="Listing price realization"
          />
          <KPICard
            title="Avg Net Profit / Deal"
            value={money(kpiData.avgNetProfitPerDeal)}
            sub="Net returns per flip"
          />
          <KPICard
            title="Annualized ROI"
            value={pct(kpiData.annualizedROIPct)}
            sub="IRR estimate"
          />
          <KPICard
            title="Total Capital Gains"
            value={money(kpiData.totalCapitalGains)}
            sub="Taxable gain sum"
          />
          <KPICard
            title="1031 Exchange Rate"
            value={pct(kpiData.exchange1031RatePct)}
            sub="Tax deferred sales"
          />
          <KPICard
            title="Total Exit Revenue"
            value={money(kpiData.totalExitRevenue)}
            sub="Gross disposition sales"
          />
        </div>
      </section>

      <section className="space-y-4">
        <CategoryHeading icon="verified_user" colorClass="text-rose-400">
          5. Tax & IRS Compliance KPIs (6)
        </CategoryHeading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KPICard
            title="Est. Quarterly Tax"
            value={money(kpiData.estQuarterlyTaxLiability)}
            sub="Form 1040-ES liability"
          />
          <KPICard
            title="YTD Depreciation"
            value={money(kpiData.ytdDepreciationTotal)}
            sub="Form 4562 deduction"
          />
          <KPICard
            title="1099s Required"
            value={kpiData.total1099sIssued.toString()}
            sub="Contractors >$600"
          />
          <KPICard
            title="Schedule E Income"
            value={money(kpiData.scheduleENetIncomeTotal)}
            sub="Net rental P&L"
          />
          <KPICard
            title="Safe Harbor Met"
            value={pct(kpiData.safeHarborMetPct)}
            sub="Penalty protection"
          />
          <KPICard
            title="Tax Docs Generated"
            value={kpiData.totalTaxDocumentsGenerated.toString()}
            sub="Vault storage count"
          />
        </div>
      </section>
    </div>
  );
}
