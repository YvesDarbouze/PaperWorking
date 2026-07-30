'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Landmark,
  TrendingDown,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Shield,
} from 'lucide-react';

interface MortgageLiabilityRecord {
  id: string;
  connectionId: string;
  accountId: string;
  institutionName: string | null;
  lender: string | null;
  balance: number | null;
  originalBalance: number | null;
  interestRatePct: number | null;
  apr: number | null;
  nextPaymentDueDate: string | null;
  nextPaymentAmount: number | null;
  ytdInterestPaid: number | null;
  escrowBalance: number | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  fetchedAt: string;
}

function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface MortgageSummaryCardProps {
  /** Optional: filter to liabilities for a specific connectionId */
  connectionId?: string;
  className?: string;
}

/**
 * MortgageSummaryCard
 *
 * Displays synced Plaid mortgage/liability data including balance, rate,
 * next payment, YTD interest, and escrow balance.
 */
export function MortgageSummaryCard({ connectionId, className = '' }: MortgageSummaryCardProps) {
  const { user } = useAuth();
  const [liabilities, setLiabilities] = useState<MortgageLiabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiabilities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/plaid/liabilities', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Failed to load liabilities');
      const all: MortgageLiabilityRecord[] = data.liabilities ?? [];
      setLiabilities(
        connectionId ? all.filter((l) => l.connectionId === connectionId) : all
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mortgage data');
    } finally {
      setLoading(false);
    }
  }, [user, connectionId]);

  useEffect(() => { fetchLiabilities(); }, [fetchLiabilities]);

  if (loading) {
    return (
      <div className={`bg-white border border-slate-100 rounded-xl p-6 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-amber-100 rounded-xl p-6 shadow-sm ${className}`}>
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium">Could not load mortgage data</p>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">{error}</p>
        <button
          onClick={fetchLiabilities}
          className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (liabilities.length === 0) {
    return (
      <div className={`bg-white border border-slate-100 rounded-xl p-6 shadow-sm ${className}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Landmark className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mortgage Data</h3>
            <p className="text-xs text-slate-400">No mortgage accounts linked</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Connect a bank account with mortgage data in{' '}
          <a href="/dashboard/settings/integrations" className="text-blue-600 hover:underline">Settings → Integrations</a>{' '}
          to see balance, interest rate, and payment info here.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {liabilities.map((ml) => (
        <div key={ml.id} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {ml.lender ?? ml.institutionName ?? 'Mortgage'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Synced {formatDate(ml.fetchedAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full font-medium">
              <Shield className="w-2.5 h-2.5" />
              Live
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Loan Balance */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Balance</span>
              </div>
              <p className="text-[15px] font-bold text-slate-900">{formatCurrency(ml.balance)}</p>
              {ml.originalBalance && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  of {formatCurrency(ml.originalBalance)} original
                </p>
              )}
            </div>

            {/* Interest Rate */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Rate / APR</span>
              </div>
              <p className="text-[15px] font-bold text-slate-900">
                {ml.interestRatePct != null ? `${ml.interestRatePct.toFixed(2)}%` : '—'}
              </p>
              {ml.apr != null && ml.apr !== ml.interestRatePct && (
                <p className="text-[10px] text-slate-400 mt-0.5">APR {ml.apr.toFixed(2)}%</p>
              )}
            </div>

            {/* Next Payment */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">Next Payment</span>
              </div>
              <p className="text-[15px] font-bold text-slate-900">{formatCurrency(ml.nextPaymentAmount)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Due {formatDate(ml.nextPaymentDueDate)}</p>
            </div>

            {/* YTD Interest */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">YTD Interest</span>
              </div>
              <p className="text-[15px] font-bold text-slate-900">{formatCurrency(ml.ytdInterestPaid)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Paid this year</p>
            </div>
          </div>

          {/* Escrow */}
          {ml.escrowBalance != null && (
            <div className="mt-3 flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500">Escrow Balance</span>
              <span className="text-[13px] font-bold text-slate-800">{formatCurrency(ml.escrowBalance)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
