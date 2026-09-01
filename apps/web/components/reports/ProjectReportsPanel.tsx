'use client';

import { useEffect, useState } from 'react';
import {
  PERIOD_REPORT_OPTIONS,
  formatReportMoney,
  resolveSeedProjectName,
} from '@/lib/reports/adapters';
import { getPeriodReportFromBff } from '@/lib/reports/reports-api';

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Auth + project ACL on Nest — never hardcode organizationId.
        const body = (await getPeriodReportFromBff(period, projectId)) as PeriodReportPayload & {
          error?: string;
        };
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
      <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-sm text-white/65">
        Loading project report…
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-6 text-sm text-red-100">
        {error ?? 'Report unavailable'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
          Project reports
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">
          {resolveSeedProjectName(projectId)}
        </h2>
        <p className="mt-2 text-sm text-white/65">
          Period ledger — {payload.periodStart.slice(0, 10)} to {payload.periodEnd.slice(0, 10)}.
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
                ? 'bg-white text-black'
                : 'border border-white/15 text-white/70 hover:bg-white/5'
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
          <article key={item.label} className="rounded-2xl border border-white/8 bg-black/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{item.label}</p>
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-white/55">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Payee</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payload.transactions.map((transaction) => (
              <tr key={transaction.id} className="border-t border-white/8">
                <td className="px-4 py-3 text-white/70">{transaction.transactionDate}</td>
                <td className="px-4 py-3">{transaction.payee}</td>
                <td className="px-4 py-3 text-white/70">{transaction.category}</td>
                <td className="px-4 py-3 font-medium">{formatReportMoney(Math.abs(transaction.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payload.count === 0 ? (
          <p className="px-4 py-6 text-sm text-white/55">No transactions in this period.</p>
        ) : null}
      </section>
    </div>
  );
}
