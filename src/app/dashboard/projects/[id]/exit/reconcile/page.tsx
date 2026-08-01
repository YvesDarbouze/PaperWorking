'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  CheckCircle,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  FileText,
  Upload,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Calendar,
  Layers,
  ChevronDown,
  HelpCircle,
  Check,
  X,
} from 'lucide-react';

interface ReconciliationItem {
  id: string;
  reconciliationPeriodId: string;
  financialTransactionId: string | null;
  plaidTransactionId: string | null;
  itemType: 'BANK_ONLY' | 'PAPERWORKING_ONLY' | 'MATCHED' | 'DISCREPANCY';
  bankAmount: number | null;
  paperWorkingAmount: number | null;
  description: string;
  date: string;
  status: 'PENDING' | 'VERIFIED' | 'ADJUSTED' | 'IGNORED';
  notes: string | null;
}

interface ReconciliationPeriod {
  id: string;
  projectId: string;
  month: number;
  year: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'RECONCILED' | 'DISCREPANCY_FOUND';
  bankStatementBalance: number;
  paperWorkingBalance: number;
  difference: number;
  reconciledAt: string | null;
  reconciledBy: string | null;
  notes: string | null;
  items: ReconciliationItem[];
}

export default function BankReconciliationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id || params?.projectId) as string;

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [period, setPeriod] = useState<ReconciliationPeriod | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [matching, setMatching] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Statement Balance Form
  const [statementBalanceInput, setStatementBalanceInput] = useState<string>('');
  const [showBalanceModal, setShowBalanceModal] = useState<boolean>(false);

  // Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<ReconciliationItem | null>(null);
  const [adjCategory, setAdjCategory] = useState<string>('MAINTENANCE_REPAIR');
  const [adjNotes, setAdjNotes] = useState<string>('');

  // Finalize Modal
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [finalizeNotes, setFinalizeNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }, []);

  const loadReconciliation = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/reconciliations?projectId=${projectId}&month=${selectedMonth}&year=${selectedYear}`, {
        headers,
      });
      const data = await res.json();

      if (data.success && data.periods && data.periods.length > 0) {
        // Fetch full period
        const periodRes = await fetch(`/api/reconciliations/${data.periods[0].id}`, { headers });
        const periodData = await periodRes.json();
        if (periodData.success) {
          setPeriod(periodData.period);
          setStatementBalanceInput(String(periodData.period.bankStatementBalance));
        }
      } else {
        setPeriod(null);
      }
    } catch (err: any) {
      console.error('Failed to load reconciliation:', err);
      setErrorMsg('Failed to load reconciliation period data.');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedMonth, selectedYear, getHeaders]);

  useEffect(() => {
    loadReconciliation();
  }, [loadReconciliation]);

  const handleStartReconciliation = async (balOverride?: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = await getHeaders();
      const bal = balOverride !== undefined ? balOverride : parseFloat(statementBalanceInput) || 0;
      const res = await fetch('/api/reconciliations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          month: selectedMonth,
          year: selectedYear,
          bankStatementBalance: bal,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to start reconciliation');
      }
      setPeriod(data.period);
      setShowBalanceModal(false);
      setSuccessMsg('Reconciliation period initialized.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error initializing reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!period) return;
    setMatching(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/reconciliations/${period.id}/match`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setPeriod(data.period);
        setSuccessMsg('Auto-matching algorithm complete.');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Auto-matching failed.');
    } finally {
      setMatching(false);
    }
  };

  const handleVerifyItem = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/reconciliations/items/${itemId}/verify`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setPeriod(data.period);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify item.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjustItem = async () => {
    if (!adjustingItem) return;
    setActionLoading(adjustingItem.id);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/reconciliations/items/${adjustingItem.id}/adjust`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: adjCategory,
          notes: adjNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPeriod(data.period);
        setAdjustingItem(null);
        setSuccessMsg('Item adjusted and ledger updated.');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to adjust item.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async () => {
    if (!period) return;
    setActionLoading('finalize');
    setErrorMsg(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/reconciliations/${period.id}/finalize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notes: finalizeNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setPeriod(data.period);
        setShowFinalizeModal(false);
        setSuccessMsg('Reconciliation period finalized!');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to finalize reconciliation.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadReport = async () => {
    if (!period) return;
    const headers = await getHeaders();
    window.open(`/api/reconciliations/${period.id}/report?format=html`, '_blank');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Bank Statement Reconciliation</h1>
            {period && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  period.status === 'RECONCILED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : period.status === 'DISCREPANCY_FOUND'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {period.status === 'RECONCILED' && <CheckCircle className="w-3 h-3 mr-1" />}
                {period.status}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Compare PaperWorking records against official bank statement ending balances.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg p-1">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer pr-2"
            >
              {monthNames.map((m, i) => (
                <option key={m} value={i + 1} className="bg-slate-800 text-white">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer pr-2"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-800 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleStartReconciliation()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-emerald-900/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {period ? 'Refresh' : 'Start Reconciliation'}
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-900/30 border border-rose-500/30 rounded-lg flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-lg flex items-center justify-between text-emerald-300 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Reconciliation Dashboard */}
      {!period ? (
        /* Empty / Initial State */
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center max-w-xl mx-auto space-y-4">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
          <h2 className="text-xl font-semibold text-white">No Active Reconciliation Period</h2>
          <p className="text-sm text-slate-400">
            Begin the finalization phase by matching PaperWorking ledger transactions against your bank statement for{' '}
            <span className="font-semibold text-slate-200">{monthNames[selectedMonth - 1]} {selectedYear}</span>.
          </p>

          <div className="pt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Ending Bank Statement Balance ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 75000.00"
                value={statementBalanceInput}
                onChange={(e) => setStatementBalanceInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-center font-mono text-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={() => handleStartReconciliation()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition"
            >
              Start Period Reconciliation
            </button>
          </div>
        </div>
      ) : (
        /* Period Loaded Dashboard */
        <div className="space-y-8">
          {/* Summary Balance Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bank Statement Balance
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-white">
                  ${Number(period.bankStatementBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => setShowBalanceModal(true)}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                PaperWorking Ledger Balance
              </span>
              <span className="block text-2xl font-bold font-mono text-white">
                ${Number(period.paperWorkingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Net Variance / Difference
              </span>
              <span
                className={`block text-2xl font-bold font-mono ${
                  Number(period.difference) === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${Number(period.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</span>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoMatch}
                  disabled={matching}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-medium rounded-lg transition text-slate-200 flex items-center justify-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${matching ? 'animate-spin' : ''}`} />
                  Auto-Match
                </button>

                <button
                  onClick={() => setShowFinalizeModal(true)}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-medium rounded-lg transition text-white"
                >
                  Finalize
                </button>

                <button
                  onClick={handleDownloadReport}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                  title="Download Report"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Ledger & Statement Item Review Section */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Reconciliation Ledger</h3>
                <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full font-mono">
                  {period.items.length} items
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Bank Statement</th>
                    <th className="py-3 px-4 text-right">PaperWorking</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {period.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No items found for this reconciliation period.
                      </td>
                    </tr>
                  ) : (
                    period.items.map((item) => {
                      const isPending = item.status === 'PENDING';
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                            {item.description}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-mono ${
                                item.itemType === 'MATCHED'
                                  ? 'bg-emerald-900/40 text-emerald-300'
                                  : item.itemType === 'BANK_ONLY'
                                  ? 'bg-blue-900/40 text-blue-300'
                                  : item.itemType === 'PAPERWORKING_ONLY'
                                  ? 'bg-amber-900/40 text-amber-300'
                                  : 'bg-rose-900/40 text-rose-300'
                              }`}
                            >
                              {item.itemType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {item.bankAmount !== null ? (
                              <span className={item.bankAmount >= 0 ? 'text-emerald-400' : 'text-slate-200'}>
                                ${Number(item.bankAmount).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {item.paperWorkingAmount !== null ? (
                              <span
                                className={
                                  item.paperWorkingAmount >= 0 ? 'text-emerald-400' : 'text-slate-200'
                                }
                              >
                                ${Number(item.paperWorkingAmount).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                item.status === 'VERIFIED' || item.status === 'ADJUSTED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : item.status === 'IGNORED'
                                  ? 'bg-slate-700 text-slate-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleVerifyItem(item.id)}
                                  disabled={actionLoading === item.id}
                                  className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium rounded transition"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => setAdjustingItem(item)}
                                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition"
                                >
                                  Adjust
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Update Statement Ending Balance</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Bank Statement Balance ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={statementBalanceInput}
                onChange={(e) => setStatementBalanceInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="px-4 py-2 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStartReconciliation(parseFloat(statementBalanceInput) || 0)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500"
              >
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Adjust Item: {adjustingItem.description}</h3>
            <p className="text-xs text-slate-400">
              Type: <span className="font-semibold text-slate-200">{adjustingItem.itemType}</span>
            </p>

            {adjustingItem.itemType === 'BANK_ONLY' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select P&L Category to Record Transaction
                </label>
                <select
                  value={adjCategory}
                  onChange={(e) => setAdjCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="RENT_INCOME">RENT_INCOME (Revenue)</option>
                  <option value="MAINTENANCE_REPAIR">MAINTENANCE_REPAIR (OpEx)</option>
                  <option value="UTILITIES">UTILITIES (OpEx)</option>
                  <option value="PROPERTY_TAX">PROPERTY_TAX (OpEx)</option>
                  <option value="MISC_INCOME">MISC_INCOME (Revenue)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Adjustment Notes
              </label>
              <textarea
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                placeholder="Reason for adjustment..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm h-24 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAdjustingItem(null)}
                className="px-4 py-2 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustItem}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Finalize Reconciliation</h3>
            <p className="text-sm text-slate-300">
              Confirm closing reconciliation for {monthNames[selectedMonth - 1]} {selectedYear}.
            </p>

            {period && Number(period.difference) !== 0 && (
              <div className="p-3 bg-amber-900/40 border border-amber-500/40 rounded-lg text-amber-300 text-xs space-y-1">
                <strong>Discrepancy Warning:</strong> Current difference is ${Number(period.difference).toFixed(2)}. An explanation note is required to finalize with a discrepancy.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Final Reconciliation Notes
              </label>
              <textarea
                value={finalizeNotes}
                onChange={(e) => setFinalizeNotes(e.target.value)}
                placeholder="Notes or explanation for discrepancy..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm h-24 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500"
              >
                Confirm & Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
