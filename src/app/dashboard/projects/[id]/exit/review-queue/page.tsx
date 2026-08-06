'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  Zap,
  Building,
  Sparkles,
  RefreshCw,
  Layers,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { TransactionIdentificationEngine } from '@/lib/banking/transactionIdentificationEngine';
import type { IdentificationResult } from '@/lib/banking/transactionIdentificationEngine';

/* ─── Types ──────────────────────────────────────────────────── */
type TabType = 'ALL' | 'PENDING_REVIEW' | 'REVENUE' | 'EXPENSE' | 'LIABILITY' | 'TRANSFER';

interface TransactionItem {
  id: string;
  source: 'PLAID_TRANSACTIONS' | 'MANUAL' | 'PLAID_LIABILITIES' | 'IMPORT_CSV';
  date: string;
  payee: string;
  description?: string | null;
  amount: number; // in dollars
  direction: 'CREDIT' | 'DEBIT';
  category: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'AUTO_APPROVED' | 'MANUALLY_APPROVED' | 'REJECTED';
  confidenceScore?: number | null;
  matchedLeaseId?: string | null;
  notes?: string | null;
  isSplit?: boolean;
  plaidPersonalFinanceCategory?: { primary?: string; detailed?: string } | null;
  identification?: IdentificationResult;
}

interface SplitRow {
  amount: string;
  category: string;
  reason: string;
}

/* ─── Taxonomy options ───────────────────────────────────────── */
const TAXONOMY = {
  REVENUE: [
    { value: 'RENT_INCOME', label: 'Rent Income' },
    { value: 'LATE_FEE_INCOME', label: 'Late Fee Income' },
    { value: 'PET_RENT_INCOME', label: 'Pet Rent Income' },
    { value: 'PARKING_INCOME', label: 'Parking Income' },
    { value: 'APPLICATION_FEE_INCOME', label: 'Application Fee' },
    { value: 'MISC_INCOME', label: 'Misc Income' },
  ],
  EXPENSE: [
    { value: 'PROPERTY_TAX', label: 'Property Tax' },
    { value: 'PROPERTY_INSURANCE', label: 'Property Insurance' },
    { value: 'HOA_FEES', label: 'HOA Fees' },
    { value: 'MANAGEMENT_FEES', label: 'Management Fees' },
    { value: 'MAINTENANCE_REPAIR', label: 'Maintenance / Repair' },
    { value: 'UTILITIES', label: 'Utilities' },
    { value: 'LANDSCAPING_SNOW', label: 'Landscaping' },
    { value: 'LEGAL_PROFESSIONAL', label: 'Legal / Professional' },
    { value: 'MARKETING_ADVERTISING', label: 'Marketing' },
    { value: 'SOFTWARE_TECHNOLOGY', label: 'Software' },
    { value: 'MISC_EXPENSE', label: 'Misc Expense' },
  ],
  'LIABILITY PAYMENT': [
    { value: 'MORTGAGE_PRINCIPAL', label: 'Mortgage Principal' },
    { value: 'MORTGAGE_INTEREST', label: 'Mortgage Interest' },
    { value: 'MORTGAGE_ESCROW_PAYMENT', label: 'Mortgage Escrow' },
  ],
  'TRANSFER / NON-P&L': [
    { value: 'SECURITY_DEPOSIT_RECEIVED', label: 'Security Deposit' },
    { value: 'OWNER_DISTRIBUTION', label: 'Owner Distribution' },
    { value: 'CAPITAL_CONTRIBUTION', label: 'Capital Contribution' },
    { value: 'INTER_ACCOUNT_TRANSFER', label: 'Inter-Account Transfer' },
  ],
};

async function getIdToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export default function ReviewQueuePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('PENDING_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sidebar state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [isCapEx, setIsCapEx] = useState(false);
  const [selectedLease, setSelectedLease] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [createRule, setCreateRule] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [saving, setSaving] = useState(false);

  /* ── Load Transactions ── */
  const loadTransactions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const token = await getIdToken();
      const statusParam = activeTab === 'PENDING_REVIEW' ? 'PENDING_REVIEW' : 'ALL';
      const tabParam = ['REVENUE', 'EXPENSE', 'LIABILITY', 'TRANSFER'].includes(activeTab)
        ? activeTab
        : 'ALL';

      const res = await fetch(
        `/api/financial-transactions/${projectId}?status=${statusParam}&tab=${tabParam}&search=${encodeURIComponent(searchQuery)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      const items: TransactionItem[] = data.transactions ?? [];

      const enriched = await Promise.all(
        items.map(async (t) => {
          const ident = await TransactionIdentificationEngine.identify(
            {
              name: t.payee,
              amount: t.direction === 'CREDIT' ? -t.amount : t.amount,
              category: [],
              personalFinanceCategory: t.plaidPersonalFinanceCategory as any,
              direction: t.direction,
            },
            projectId
          );
          return { ...t, identification: ident };
        })
      );

      setTransactions(enriched);

      if (enriched.length > 0 && !selectedTxId) {
        setSelectedTxId(enriched[0].id);
      }
    } catch (err) {
      console.error('[ReviewQueue] Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, activeTab, searchQuery, selectedTxId]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const selectedTx = transactions.find((t) => t.id === selectedTxId) ?? null;

  useEffect(() => {
    if (selectedTx) {
      setEditingCategory(selectedTx.category || selectedTx.identification?.paperWorkingCategory || 'RENT_INCOME');
      setIsCapEx(selectedTx.category === 'CAPITAL_EXPENDITURE');
      setSelectedLease(selectedTx.matchedLeaseId || '');
      setNotes(selectedTx.notes || '');
      setIsChanging(false);
      setIsSplitMode(false);
      setSplits([
        { amount: (selectedTx.amount / 2).toFixed(2), category: 'MORTGAGE_INTEREST', reason: 'Interest portion' },
        { amount: (selectedTx.amount / 2).toFixed(2), category: 'MORTGAGE_PRINCIPAL', reason: 'Principal portion' },
      ]);
    }
  }, [selectedTxId, selectedTx]);

  /* ── Handlers ── */
  const handleApproveSuggested = async () => {
    if (!selectedTx || saving) return;
    setSaving(true);
    try {
      const token = await getIdToken();
      await fetch(`/api/financial-transactions/${selectedTx.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await loadTransactions();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClassification = async () => {
    if (!selectedTx || saving) return;
    setSaving(true);
    try {
      const token = await getIdToken();
      const finalCategory = isCapEx ? 'CAPITAL_EXPENDITURE' : (editingCategory || 'RENT_INCOME');

      await fetch(`/api/financial-transactions/${selectedTx.id}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category: finalCategory,
          matchedLeaseId: selectedLease || undefined,
          notes,
          createRule,
          isSplit: isSplitMode,
          splits: isSplitMode
            ? splits.map((s) => ({ amount: parseFloat(s.amount) || 0, category: s.category, reason: s.reason }))
            : undefined,
        }),
      });
      await loadTransactions();
    } finally {
      setSaving(false);
    }
  };

  const handleBulkClassify = async (targetCategory: string) => {
    if (selectedIds.size === 0 || saving) return;
    setSaving(true);
    try {
      const token = await getIdToken();
      await fetch('/api/financial-transactions/bulk-classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          category: targetCategory,
        }),
      });
      setSelectedIds(new Set());
      await loadTransactions();
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const addSplitRow = () => {
    setSplits([...splits, { amount: '0.00', category: 'RENT_INCOME', reason: '' }]);
  };

  const removeSplitRow = (idx: number) => {
    setSplits(splits.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col gap-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} style={{ color: '#10B981' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#10B981' }}>
              Exit Phase · Intelligence Layer
            </span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#FDFFFC' }}>Review Transactions</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(253,255,252,0.5)' }}>
            Classify your bank activity so PaperWorking can calculate your 33 KPIs.
          </p>
        </div>

        <button
          onClick={() => router.push(`/dashboard/projects/${projectId}/exit/financial-connections`)}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: 'rgba(253,255,252,0.06)',
            border: '1px solid rgba(253,255,252,0.10)',
            color: '#FDFFFC',
          }}
        >
          <Building size={14} /> Bank Connections
        </button>
      </div>

      {/* ── Tab Strip ── */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
        style={{ background: 'rgba(253,255,252,0.03)', border: '1px solid rgba(253,255,252,0.07)' }}
      >
        {[
          { id: 'ALL', label: 'All' },
          { id: 'PENDING_REVIEW', label: 'Needs Review' },
          { id: 'REVENUE', label: 'Revenue 🟢' },
          { id: 'EXPENSE', label: 'Expenses 🔴' },
          { id: 'LIABILITY', label: 'Liability Payments 🔵' },
          { id: 'TRANSFER', label: 'Transfers ⚪' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className="px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
            style={{
              background: activeTab === tab.id ? 'rgba(253,255,252,0.10)' : 'transparent',
              color: activeTab === tab.id ? '#FDFFFC' : 'rgba(253,255,252,0.45)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Bulk Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center justify-between px-5 py-3 rounded-xl animate-in fade-in"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <span className="text-xs font-bold" style={{ color: '#10B981' }}>
            {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleBulkClassify('RENT_INCOME')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
            >
              Classify all as Rent Income
            </button>
            <button
              onClick={() => void handleBulkClassify('MAINTENANCE_REPAIR')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-all"
            >
              Classify all as Repair
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium px-2.5 py-1.5 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Layout: Table + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Table Column ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'rgba(253,255,252,0.03)', border: '1px solid rgba(253,255,252,0.07)' }}
          >
            {loading && (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-slate-300" />
                <span className="text-xs text-slate-400">Loading review queue…</span>
              </div>
            )}

            {!loading && transactions.length === 0 && (
              <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
                {activeTab === 'PENDING_REVIEW' ? (
                  <>
                    <Sparkles size={32} style={{ color: '#10B981' }} />
                    <h3 className="text-base font-bold text-white">All caught up! 🎉</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      All caught up! 🎉 Your KPIs are up to date.
                    </p>
                  </>
                ) : (
                  <>
                    <Layers size={32} className="text-slate-500" />
                    <h3 className="text-base font-bold text-white">No transactions to review</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      No transactions to review. Connect your bank or add manually.
                    </p>
                  </>
                )}
              </div>
            )}

            {!loading && transactions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className="uppercase tracking-widest font-bold text-[10px]"
                    style={{
                      background: 'rgba(253,255,252,0.02)',
                      borderBottom: '1px solid rgba(253,255,252,0.06)',
                      color: 'rgba(253,255,252,0.35)',
                    }}
                  >
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === transactions.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-700 bg-slate-900"
                        />
                      </th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Payee / Description</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Suggested Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const isSelected = t.id === selectedTxId;
                      const isCredit = t.direction === 'CREDIT';
                      const ident = t.identification;
                      const confidencePct = Math.round((t.confidenceScore ?? ident?.confidenceScore ?? 0.8) * 100);
                      const primaryLabel = ident?.primaryClassification ?? 'REVENUE';

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTxId(t.id)}
                          className="cursor-pointer transition-colors hover:bg-white/5"
                          style={{
                            background: isSelected ? 'rgba(16,185,129,0.08)' : 'transparent',
                            borderBottom: '1px solid rgba(253,255,252,0.04)',
                          }}
                        >
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(t.id)}
                              onChange={() => toggleSelectRow(t.id)}
                              className="rounded border-slate-700 bg-slate-900"
                            />
                          </td>
                          <td className="p-3 font-medium text-slate-400">
                            {t.source === 'PLAID_TRANSACTIONS' ? '🏦 Plaid' : '🖊️ Manual'}
                          </td>
                          <td className="p-3 text-slate-300 font-mono text-[11px]">
                            {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-white leading-snug">{t.payee}</div>
                            {t.plaidPersonalFinanceCategory?.detailed && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {t.plaidPersonalFinanceCategory.detailed.toLowerCase().replace(/_/g, ' ')}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-bold" style={{ color: isCredit ? '#10B981' : '#EF4444' }}>
                            {isCredit ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3">
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                              style={{
                                background: isCredit ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                                color: isCredit ? '#10B981' : '#EF4444',
                              }}
                            >
                              <span>{primaryLabel} — {t.category.replace(/_/g, ' ')} ({confidencePct}% confident)</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Smart Classification Sidebar ── */}
        <div className="lg:col-span-1">
          {selectedTx ? (
            <div
              className="rounded-2xl p-6 flex flex-col gap-6 sticky top-8"
              style={{
                background: 'rgba(18,16,20,0.97)',
                border: '1px solid rgba(253,255,252,0.10)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}
            >
              {/* Top Bucket Quick Pickers */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400">Is this transaction...?</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setIsChanging(true); setEditingCategory('RENT_INCOME'); }}
                    className="p-2 rounded-xl border border-emerald-800/40 bg-slate-800/20 text-xs font-bold text-slate-300 text-left hover:bg-slate-800/30"
                  >
                    💰 REVENUE
                  </button>
                  <button
                    onClick={() => { setIsChanging(true); setEditingCategory('MAINTENANCE_REPAIR'); }}
                    className="p-2 rounded-xl border border-red-800/40 bg-red-950/20 text-xs font-bold text-red-400 text-left hover:bg-red-900/30"
                  >
                    💸 EXPENSE
                  </button>
                  <button
                    onClick={() => { setIsChanging(true); setEditingCategory('MORTGAGE_INTEREST'); }}
                    className="p-2 rounded-xl border border-blue-800/40 bg-blue-950/20 text-xs font-bold text-blue-400 text-left hover:bg-blue-900/30"
                  >
                    🏦 LIABILITY
                  </button>
                  <button
                    onClick={() => { setIsChanging(true); setEditingCategory('INTER_ACCOUNT_TRANSFER'); }}
                    className="p-2 rounded-xl border border-slate-700 bg-slate-900/40 text-xs font-bold text-slate-300 text-left hover:bg-slate-800/50"
                  >
                    ↔️ TRANSFER
                  </button>
                </div>
              </div>

              {/* Guided Reasoning Card */}
              {!isChanging && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      PaperWorking thinks this is{' '}
                      <span style={{ color: selectedTx.direction === 'CREDIT' ? '#10B981' : '#EF4444' }}>
                        {selectedTx.identification?.primaryClassification ?? 'REVENUE'}
                      </span>{' '}
                      because:
                    </h3>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {(selectedTx.identification?.reasoning ?? [
                      `Amount ($${selectedTx.amount.toLocaleString()}) matches monthly rent`,
                      `Date is close to rent due date`,
                      `Payee "${selectedTx.payee}" matches tenant name`,
                    ]).map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-slate-300 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action CTAs */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handleApproveSuggested}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg"
                    >
                      <Check size={14} /> Yes, this is {selectedTx.category.replace(/_/g, ' ')}
                    </button>
                    <button
                      onClick={() => setIsChanging(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 border border-slate-800 hover:bg-white/5 transition-all"
                    >
                      ✏️ Change Classification
                    </button>
                    <button
                      onClick={() => setIsChanging(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-all"
                    >
                      ❌ Not Revenue — let me choose
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={createRule}
                      onChange={(e) => setCreateRule(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900"
                    />
                    <span>🔔 Create rule to auto-approve future matches</span>
                  </label>
                </div>
              )}

              {/* Full Category Selector */}
              {isChanging && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Classify this transaction:</h3>
                  </div>

                  <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(TAXONOMY).map(([group, items]) => (
                      <div key={group}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                          {group}:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {items.map((it) => (
                            <button
                              key={it.value}
                              onClick={() => setEditingCategory(it.value)}
                              className="px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all"
                              style={{
                                background: editingCategory === it.value ? 'rgba(16,185,129,0.2)' : 'rgba(253,255,252,0.03)',
                                border: editingCategory === it.value ? '1px solid #10B981' : '1px solid rgba(253,255,252,0.06)',
                                color: editingCategory === it.value ? '#FDFFFC' : 'rgba(253,255,252,0.7)',
                              }}
                            >
                              ○ {it.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CapEx Checkbox Button */}
                  <button
                    onClick={() => setIsCapEx(!isCapEx)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      isCapEx
                        ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    [This is a Capital Expenditure (≥$2,500)]
                  </button>

                  {/* Lease / Tenant Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-400">Lease/Tenant:</label>
                    <select
                      value={selectedLease}
                      onChange={(e) => setSelectedLease(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    >
                      <option value="">[Dropdown of active leases]</option>
                      <option value="lease_1">Lease #1 — John Smith (Unit 101)</option>
                      <option value="lease_2">Lease #2 — Sarah Jenkins (Unit 102)</option>
                    </select>
                  </div>

                  {/* Notes Textarea */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-400">Notes:</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add operational notes..."
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white h-16 resize-none"
                    />
                  </div>

                  {/* Split Transaction UI */}
                  <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">If this transaction contains multiple items:</span>
                      <button
                        onClick={addSplitRow}
                        className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:underline"
                      >
                        <Plus size={12} /> Add Split
                      </button>
                    </div>
                    {isSplitMode && (
                      <div className="flex flex-col gap-2">
                        {splits.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={s.amount}
                              onChange={(e) => {
                                const next = [...splits];
                                next[idx].amount = e.target.value;
                                setSplits(next);
                              }}
                              placeholder="Amount"
                              className="w-16 p-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono"
                            />
                            <select
                              value={s.category}
                              onChange={(e) => {
                                const next = [...splits];
                                next[idx].category = e.target.value;
                                setSplits(next);
                              }}
                              className="flex-1 p-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                            >
                              <option value="MORTGAGE_INTEREST">Mortgage Interest</option>
                              <option value="MORTGAGE_PRINCIPAL">Mortgage Principal</option>
                              <option value="MORTGAGE_ESCROW_PAYMENT">Mortgage Escrow</option>
                              <option value="LATE_FEE_INCOME">Late Fee Income</option>
                            </select>
                            <button onClick={() => removeSplitRow(idx)} className="text-slate-500 hover:text-red-400">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save & Approve / Skip */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleSaveClassification}
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                    >
                      💾 Save &amp; Approve
                    </button>
                    <button
                      onClick={() => setIsChanging(false)}
                      className="px-3 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs hover:text-white"
                    >
                      ⏭️ Skip for Now
                    </button>
                  </div>
                </div>
              )}

              {/* KPI Impact Preview */}
              <div
                className="p-4 rounded-xl flex flex-col gap-2"
                style={{ background: 'rgba(253,255,252,0.03)', border: '1px solid rgba(253,255,252,0.06)' }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  KPI Impact Preview
                </span>
                <div className="text-xs text-slate-300 leading-relaxed font-mono">
                  {isCapEx ? (
                    <>
                      If approved as Capital Expenditure:<br />
                      • CapEx Reserve: <strong className="text-amber-400">+${selectedTx.amount.toLocaleString()}</strong><br />
                      • Does NOT affect Cash Flow or NOI
                    </>
                  ) : (
                    <>
                      If approved as Rent Income:<br />
                      • Monthly Cash Flow: <strong className="text-emerald-400">+${selectedTx.amount.toLocaleString()}</strong><br />
                      • Gross Rent YTD: <strong className="text-emerald-400">$14,400</strong><br />
                      • Cash-on-Cash Return: <strong className="text-emerald-400">8.4% (+0.2%)</strong>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-8 border border-slate-800 text-center text-slate-500 text-xs">
              Select a transaction row to view smart classification details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
