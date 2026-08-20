'use client';

import { useEffect, useState } from 'react';
import MetricCard from '@/components/insights/MetricCard';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

interface InsightsPayload {
  success?: boolean;
  persona?: string;
  totalProjects?: number;
  categories?: Array<{
    category: string;
    metrics: Array<{
      id: string;
      name: string;
      value: string | number;
      trend?: 'up' | 'down' | 'flat';
      isWarning?: boolean;
      category: string;
    }>;
  }>;
}

interface PortfolioMetricsPayload {
  success?: boolean;
  portfolio?: {
    totalActiveProjects: number;
    totalPortfolioValue: number;
    totalCashInvested: number;
    portfolioNoi: number;
    portfolioCashFlow: number;
    portfolioCapRate: number;
  };
}

const CATEGORY_STYLES: Record<string, { accent: string; border: string; label: string }> = {
  Acquisition: { accent: '#F59E0B', border: 'rgba(245,158,11,0.35)', label: 'Acquisition' },
  Purchase: { accent: '#3B82F6', border: 'rgba(59,130,246,0.35)', label: 'Fund / Purchase' },
  Fund: { accent: '#3B82F6', border: 'rgba(59,130,246,0.35)', label: 'Fund / Purchase' },
  Hold: { accent: '#F97316', border: 'rgba(249,115,22,0.35)', label: 'Hold' },
  Exit: { accent: '#10B981', border: 'rgba(16,185,129,0.35)', label: 'Exit' },
  Tax: { accent: '#a78bfa', border: 'rgba(167,139,250,0.35)', label: 'Tax' },
  'Financial Performance': {
    accent: '#7A9EAA',
    border: 'rgba(122,158,170,0.35)',
    label: 'Financial Performance',
  },
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function styleForCategory(category: string) {
  for (const [key, value] of Object.entries(CATEGORY_STYLES)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return { accent: '#7A9EAA', border: 'rgba(122,158,170,0.35)', label: category };
}

export default function PortfolioInsightsPanel() {
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [insightsRes, portfolioRes] = await Promise.all([
          fetch('/api/insights?userId=dev-user-1', { cache: 'no-store' }),
          fetch('/api/portfolio/metrics', { cache: 'no-store' }),
        ]);

        const insightsBody = (await insightsRes.json()) as InsightsPayload & { error?: string };
        const portfolioBody = (await portfolioRes.json()) as PortfolioMetricsPayload & {
          error?: string;
        };

        if (!insightsRes.ok) throw new Error(insightsBody.error ?? 'Insights request failed');
        if (!portfolioRes.ok) throw new Error(portfolioBody.error ?? 'Portfolio metrics failed');

        if (!cancelled) {
          setInsights(insightsBody);
          setPortfolio(portfolioBody);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load insights');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = portfolio?.portfolio;
  const metricCount =
    insights?.categories?.reduce((sum, group) => sum + group.metrics.length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Insights"
        subtitle={
          loading
            ? 'Loading portfolio KPIs…'
            : `${metricCount} KPIs live · ${insights?.totalProjects ?? 0} projects in scope`
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-8 text-sm text-white/60">
          Loading portfolio insights…
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {!loading && !error && summary ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Active projects', value: String(summary.totalActiveProjects) },
            { label: 'Portfolio value', value: formatMoney(summary.totalPortfolioValue) },
            { label: 'Portfolio NOI', value: formatMoney(summary.portfolioNoi) },
            { label: 'Cap rate', value: `${summary.portfolioCapRate.toFixed(1)}%` },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#fdfffc]">{item.value}</p>
            </article>
          ))}
        </section>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          {(insights?.categories ?? []).map((group) => {
            const style = styleForCategory(group.category);
            return (
              <section
                key={group.category}
                className="rounded-2xl border bg-[#121014]/90 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
                style={{ borderColor: style.border }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: style.accent }}
                  />
                  <h3 className="text-sm font-bold uppercase tracking-[0.08em]" style={{ color: style.accent }}>
                    {style.label}
                  </h3>
                  <span className="font-mono text-[11px] text-white/40">{group.metrics.length}</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.metrics.map((metric) => (
                    <MetricCard
                      key={metric.id}
                      name={metric.name}
                      value={metric.value}
                      category={group.category}
                      trend={metric.trend}
                      isWarning={metric.isWarning}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
