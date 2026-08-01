'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Link2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaidTransaction {
  id: string;
  plaidId: string;
  amount: number; // cents; positive = expense, negative = income (Plaid convention)
  date: string; // ISO string
  merchantName: string | null;
  reiCategory: string | null;
  confidence: number | null;
  pending: boolean;
  reviewedByUser: boolean;
  attributedAt: string | null;
  category: string[];
}

interface TransactionLedgerProps {
  projectId: string;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const REI_CATEGORY_LABELS: Record<string, string> = {
  rental_income: 'Rental Income',
  debt_service: 'Debt Service',
  hoa_fees: 'HOA',
  insurance: 'Insurance',
  property_tax: 'Property Tax',
  maintenance: 'Maintenance',
  utilities: 'Utilities',
  property_management: 'Mgmt Fee',
  closing_costs: 'Closing',
  rehab_staging: 'Rehab / Staging',
  unknown: 'Unclassified',
};

const REI_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  rental_income: { bg: 'bg-emerald-50',   text: 'text-emerald-700' },
  debt_service:  { bg: 'bg-blue-50',      text: 'text-blue-700' },
  hoa_fees:      { bg: 'bg-violet-50',    text: 'text-violet-700' },
  insurance:     { bg: 'bg-sky-50',       text: 'text-sky-700' },
  property_tax:  { bg: 'bg-orange-50',    text: 'text-orange-700' },
  maintenance:   { bg: 'bg-amber-50',     text: 'text-amber-700' },
  utilities:     { bg: 'bg-yellow-50',    text: 'text-yellow-700' },
  property_management: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  closing_costs: { bg: 'bg-rose-50',     text: 'text-rose-700' },
  rehab_staging: { bg: 'bg-lime-50',     text: 'text-lime-700' },
  unknown:       { bg: 'bg-slate-100',   text: 'text-slate-500' },
};

function formatCents(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function isIncome(amount: number): boolean {
  // Plaid: positive amount = money leaving account (expense), negative = money entering (income)
  return amount < 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  const key = category ?? 'unknown';
  const label = REI_CATEGORY_LABELS[key] ?? key;
  const colors = REI_CATEGORY_COLORS[key] ?? REI_CATEGORY_COLORS.unknown;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ reviewed, pending }: { reviewed: boolean; pending: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }
  if (reviewed) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
        <CheckCircle2 className="w-3 h-3" />
        Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
      <Clock className="w-3 h-3" />
      Unreviewed
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * TransactionLedger
 *
 * Displays all Plaid-attributed transactions for a project.
 * Handles loading, error, empty, and paginated list states.
 *
 * Data source: GET /api/projects/[projectId]/transactions
 */
export default function TransactionLedger({ projectId }: TransactionLedgerProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTransactions = useCallback(
    async (cursor?: string) => {
      if (!user) return;
      try {
        const idToken = await user.getIdToken();
        const url = new URL(
          `/api/projects/${projectId}/transactions`,
          window.location.origin
        );
        url.searchParams.set('limit', '50');
        if (cursor) url.searchParams.set('cursor', cursor);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? 'Failed to load transactions');
        }

        setTransactions((prev) =>
          cursor ? [...prev, ...(data.transactions ?? [])] : (data.transactions ?? [])
        );
        setNextCursor(data.nextCursor ?? null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, projectId]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetchTransactions(nextCursor);
  };

  const handleMarkReviewed = async (plaidId: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/transactions/${encodeURIComponent(plaidId)}/attribution`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'mark_reviewed' }),
      });
      if (!res.ok) throw new Error('Failed to mark as reviewed');

      // Optimistic update
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.plaidId === plaidId ? { ...tx, reviewedByUser: true } : tx
        )
      );
    } catch (err) {
      console.error('[TransactionLedger] mark reviewed failed:', err);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-6 space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchTransactions(); }}
            className="text-xs text-red-600 underline underline-offset-2 hover:text-red-800 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 flex flex-col items-center text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <Landmark className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">No bank transactions yet</p>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Connect a bank account in{' '}
          <a
            href="/dashboard/settings/integrations"
            className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
          >
            Settings → Integrations
          </a>{' '}
          to see live transactions automatically attributed to this project.
        </p>
      </div>
    );
  }

  // ── Transaction list ───────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Bank Transactions
          </span>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
            {transactions.length}{nextCursor ? '+' : ''}
          </span>
        </div>
        <button
          onClick={() => { setLoading(true); setTransactions([]); setNextCursor(null); fetchTransactions(); }}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_140px_100px_90px_80px] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
          {['Description', 'Category', 'Amount', 'Date', 'Status'].map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {transactions.map((tx) => {
          const income = isIncome(tx.amount);
          const dateLabel = new Date(tx.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={tx.id}
              className="grid grid-cols-[1fr_140px_100px_90px_80px] gap-3 px-4 py-3 items-center border-b border-slate-50 hover:bg-slate-50/60 transition-colors group"
            >
              {/* Description */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    income
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {income ? (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">
                    {tx.merchantName || tx.category[0] || 'Unknown'}
                  </p>
                  {tx.pending && (
                    <p className="text-[10px] text-amber-500 font-medium">Pending</p>
                  )}
                </div>
              </div>

              {/* Category */}
              <CategoryBadge category={tx.reiCategory} />

              {/* Amount */}
              <span
                className={`text-xs font-semibold tabular-nums ${
                  income ? 'text-emerald-600' : 'text-slate-700'
                }`}
              >
                {income ? '+' : '–'}{formatCents(tx.amount)}
              </span>

              {/* Date */}
              <span className="text-xs text-slate-400">{dateLabel}</span>

              {/* Status + action */}
              <div className="flex items-center gap-1">
                <StatusBadge reviewed={tx.reviewedByUser} pending={tx.pending} />
                {!tx.reviewedByUser && !tx.pending && (
                  <button
                    onClick={() => handleMarkReviewed(tx.plaidId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[10px] text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
                  >
                    Mark reviewed
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Load more */}
        {nextCursor && (
          <div className="px-4 py-3 flex justify-center border-t border-slate-50">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </>
              ) : (
                'Load more transactions'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Source attribution */}
      <p className="text-[10px] text-slate-400 text-right">
        Transactions synced via Plaid · auto-attributed by rule engine
      </p>
    </div>
  );
}
