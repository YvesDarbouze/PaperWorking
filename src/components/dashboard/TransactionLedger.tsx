'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Search,
  Landmark,
} from 'lucide-react';

export type TransactionBucket = 'REVENUE' | 'EXPENSE' | 'LIABILITY' | 'TRANSFER';

interface LedgerTransaction {
  id: string;
  plaidId: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number; // cents
  reiCategory: string | null;
  bucket?: TransactionBucket;
  projectId: string | null;
  confidence: number | null;
  pending: boolean;
}

const BUCKET_CONFIG: Record<TransactionBucket, { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
  REVENUE:   { label: 'Revenue',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',  icon: ArrowDownCircle },
  EXPENSE:   { label: 'Expense',   color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',        icon: ArrowUpCircle },
  LIABILITY: { label: 'Liability', color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',    icon: CreditCard },
  TRANSFER:  { label: 'Transfer',  color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',     icon: ArrowLeftRight },
};

const CATEGORY_TO_BUCKET: Record<string, TransactionBucket> = {
  rental_income: 'REVENUE',
  late_fees: 'REVENUE',
  pet_rent: 'REVENUE',
  parking: 'REVENUE',
  application_fees: 'REVENUE',
  laundry_vending: 'REVENUE',
  misc_income: 'REVENUE',
  debt_service: 'LIABILITY',
  escrow: 'LIABILITY',
  security_deposit: 'TRANSFER',
  owner_draw: 'TRANSFER',
  capex_reserve: 'TRANSFER',
  bank_transfer: 'TRANSFER',
};

function getBucket(reiCategory: string | null): TransactionBucket {
  if (!reiCategory || reiCategory === 'unknown') return 'EXPENSE';
  return CATEGORY_TO_BUCKET[reiCategory] ?? 'EXPENSE';
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(cents) / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function humanCategory(cat: string | null): string {
  if (!cat || cat === 'unknown') return 'Uncategorized';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

interface TransactionLedgerProps {
  /** Optional: limit to transactions for a specific project */
  projectId?: string;
  /** Max rows to display */
  limit?: number;
  className?: string;
}

/**
 * TransactionLedger
 *
 * Displays Plaid-synced transactions with 4-bucket badges and confidence scores.
 * Rows are fetched from GET /api/transactions.
 */
export function TransactionLedger({ projectId, limit = 50, className = '' }: TransactionLedgerProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<TransactionBucket | 'ALL'>('ALL');

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams({ limit: String(limit) });
      if (projectId) params.set('projectId', projectId);
      const res = await fetch(`/api/transactions?${params}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Failed to load transactions');
      setTransactions(data.transactions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [user, projectId, limit]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = transactions
    .filter((t) => {
      const bucket = getBucket(t.reiCategory);
      if (bucketFilter !== 'ALL' && bucket !== bucketFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(s) ||
          (t.merchantName ?? '').toLowerCase().includes(s) ||
          (t.reiCategory ?? '').toLowerCase().includes(s)
        );
      }
      return true;
    });

  return (
    <div className={`bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Landmark className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Transaction Ledger</h3>
        </div>
        <button
          onClick={fetchTransactions}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-50 bg-slate-50/50">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-7 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-1">
          {(['ALL', 'REVENUE', 'EXPENSE', 'LIABILITY', 'TRANSFER'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBucketFilter(b)}
              className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors border ${
                bucketFilter === b
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {b === 'ALL' ? 'All' : b.charAt(0) + b.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
                <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-5 py-6 text-amber-600">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Landmark className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-400">
            {transactions.length === 0
              ? 'Connect a bank to see your transactions'
              : 'No transactions match your filters'}
          </p>
          {transactions.length === 0 && (
            <a
              href="/dashboard/settings/integrations"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
            >
              Settings → Integrations
            </a>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {filtered.map((tx) => {
            const bucket = getBucket(tx.reiCategory);
            const { label, color, bg, icon: BucketIcon } = BUCKET_CONFIG[bucket];
            const isInflow = tx.amount > 0;

            return (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                {/* Bucket Icon */}
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${bg}`}>
                  <BucketIcon className={`w-3.5 h-3.5 ${color}`} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">
                    {tx.merchantName ?? tx.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{formatDate(tx.date)}</span>
                    <span className={`text-[10px] font-medium border rounded px-1 py-px ${bg} ${color}`}>
                      {label}
                    </span>
                    <span className="text-[10px] text-slate-400">{humanCategory(tx.reiCategory)}</span>
                    {tx.pending && (
                      <span className="text-[10px] text-amber-500 font-medium">Pending</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className={`text-[13px] font-bold ${isInflow ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isInflow ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  {tx.confidence != null && tx.confidence > 0 && (
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {Math.round(tx.confidence * 100)}% conf.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">{filtered.length} transactions</p>
          <p className="text-[11px] text-slate-300">Updated every 6 hours via Plaid sync</p>
        </div>
      )}
    </div>
  );
}
