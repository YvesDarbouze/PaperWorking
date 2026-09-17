'use client';

import { useEffect, useState } from 'react';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';
import {
  PERIOD_REPORT_OPTIONS,
  formatReportMoney,
  resolveSeedProjectName,
} from '@/lib/reports/adapters';

interface PeriodReportPayload {
  period: string;
  periodStart: string;
  periodEnd: string;
  totals: {
    totalTransactions: number;
    totalExpenses: number;
    totalRevenue: number;
    netFlow: number;
  };
  transactions: Array<{
    id: string;
    payee: string;
    category: string;
    amount: number;
    transactionDate: string;
  }>;
  count: number;
  page: number;
  pages: number;
}

export default function ProjectReportsPanel({ projectId }: { projectId: string }) {
  const [period, setPeriod] = useState('monthly');
  const [payload, setPayload] = useState<PeriodReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = useOptionalAuth();
  const isAuthed = auth ? (auth.authenticated && !auth.loading) : true;

  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await bffFetch(
          `/api/reports/${period}?organizationId=org-1&projectId=${projectId}`,
          { cache: 'no-store' },
        );
        const body = (await response.json()) as PeriodReportPayload & { error?: string };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load period report');
        if (!cancelled) setPayload(body);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, projectId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-sm text-text-secondary">
        Loading project report…
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-sm text-danger">
        {error ?? 'Report unavailable'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Project reports
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
          {resolveSeedProjectName(projectId)}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Period ledger via `handleReportsPeriodGet` — {payload.periodStart.slice(0, 10)} to{' '}
          {payload.periodEnd.slice(0, 10)}.
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        {PERIOD_REPORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              period === option.value
                ? 'bg-accent text-surface font-semibold'
                : 'border border-border-subtle text-text-secondary hover:bg-elevated'
            }`}
          >
            {option.label}
          </button>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Transactions', value: String(payload.totals.totalTransactions) },
          { label: 'Expenses', value: formatReportMoney(payload.totals.totalExpenses) },
          { label: 'Revenue', value: formatReportMoney(payload.totals.totalRevenue) },
          { label: 'Net flow', value: formatReportMoney(payload.totals.netFlow) },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-border-subtle bg-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-text-primary">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border-subtle">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface text-text-muted border-b border-border-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Payee</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {payload.transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-elevated/40">
                <td className="px-4 py-3 text-text-secondary">{transaction.transactionDate}</td>
                <td className="px-4 py-3 text-text-primary">{transaction.payee}</td>
                <td className="px-4 py-3 text-text-secondary">{transaction.category}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{formatReportMoney(Math.abs(transaction.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payload.count === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted">No transactions in this period.</p>
        ) : null}
      </section>
    </div>
  );
}
