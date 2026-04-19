'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import type { LedgerItem } from '@/types/schema';
import {
  HardHat,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  AlertTriangle,
  Banknote,
  Users,
  FileCheck,
  TrendingUp,
} from 'lucide-react';

// ── Component-local types ─────────────────────────────────────
// Persisted as extra fields on project.rehab via updateRehabModule.
// The store merge spreads the object, so extra keys survive JSON serialization.

interface BudgetLine {
  id: string;
  category: string;
  estimated: number;
}

interface ActualEntry {
  id: string;
  budgetLineId: string;
  vendor: string;
  description: string;
  amount: number;
  createdAt: string; // ISO string — avoids Date serialization issues
}

interface W9Record {
  vendor: string;
  w9Received: boolean;
}

interface DrawEntry {
  id: string;
  description: string;
  totalAmount: number;
  drawnAmount: number;
  pendingAmount: number;
  status: 'Pending Inspector' | 'Approved' | 'Rejected';
  requestedAt: string;
}

interface PermitEntry {
  id: string;
  type: string;
  municipality: string;
  appliedAt: string | null;
  approvedAt: string | null;
  finalSignOffAt: string | null;
  status: 'Not Filed' | 'Filed' | 'Approved' | 'Final Sign-Off' | 'Denied';
}

interface TrackerData {
  budgetLines: BudgetLine[];
  actualEntries: ActualEntry[];
  w9Records: W9Record[];
  drawEntries: DrawEntry[];
  permitEntries: PermitEntry[];
  contingencyPct: number;
  totalLoanAmount: number;
}

// ── Helpers ───────────────────────────────────────────────────

const EMPTY_TRACKER: TrackerData = {
  budgetLines: [],
  actualEntries: [],
  w9Records: [],
  drawEntries: [],
  permitEntries: [],
  contingencyPct: 0.15,
  totalLoanAmount: 0,
};

const DEFAULT_CATEGORIES = [
  'Demo', 'Foundation', 'Framing', 'Roofing', 'Plumbing',
  'Electrical', 'HVAC', 'Drywall', 'Flooring', 'Painting', 'Landscaping', 'Other',
];

function toLedgerCategory(cat: string): LedgerItem['category'] {
  const map: Record<string, LedgerItem['category']> = {
    Plumbing: 'Plumbing',
    Electrical: 'Electrical',
    Framing: 'Framing',
    HVAC: 'HVAC',
    Foundation: 'Foundation',
    Other: 'Other',
  };
  return map[cat] ?? 'General';
}

const fmt = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const PERMIT_BADGE: Record<PermitEntry['status'], string> = {
  'Not Filed': 'bg-gray-100 text-gray-500',
  'Filed': 'bg-blue-50 text-blue-700',
  'Approved': 'bg-green-50 text-green-700',
  'Final Sign-Off': 'bg-emerald-50 text-emerald-700',
  'Denied': 'bg-red-50 text-red-600',
};

const DRAW_BADGE: Record<DrawEntry['status'], string> = {
  'Pending Inspector': 'bg-amber-50 text-amber-700',
  'Approved': 'bg-green-50 text-green-700',
  'Rejected': 'bg-red-50 text-red-600',
};

// ── Component ─────────────────────────────────────────────────

export default function RehabTracker() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateRehabModule = useProjectStore(s => s.updateRehabModule);
  const setLedgerItems = useProjectStore(s => s.setLedgerItems);
  const getLedgerItemsForDeal = useProjectStore(s => s.getLedgerItemsForDeal);

  const [data, setData] = useState<TrackerData>(() => {
    const stored = (currentProject?.rehab as any)?.rehabTracker as TrackerData | undefined;
    return stored ?? EMPTY_TRACKER;
  });

  const [open, setOpen] = useState({
    budget: true,
    contingency: true,
    contractors: false,
    draws: false,
    permits: false,
  });
  const toggle = (k: keyof typeof open) => setOpen(s => ({ ...s, [k]: !s[k] }));

  // ── Persist to store + ledger rollup ─────────────────────────
  const persist = useCallback(
    (next: TrackerData) => {
      setData(next);
      if (!currentProject) return;

      updateRehabModule(currentProject.id, {
        rehabTracker: next,
        baseBudget: next.budgetLines.reduce((s, l) => s + l.estimated, 0),
        contingencyBufferPercentage: next.contingencyPct,
      } as any);

      // Roll every actual cost entry into the global TransactionLedger so
      // recalculateMetrics() picks them up as 'Approved' renovation costs.
      const existing = getLedgerItemsForDeal(currentProject.id);
      const nonTracker = existing.filter(i => !i.id.startsWith('rehab-tracker-'));
      const trackerItems: LedgerItem[] = next.actualEntries.map(e => ({
        id: `rehab-tracker-${e.id}`,
        projectId: currentProject.id,
        organizationId: currentProject.organizationId,
        type: 'expense' as const,
        category: toLedgerCategory(
          next.budgetLines.find(l => l.id === e.budgetLineId)?.category ?? 'Other'
        ),
        description: `${e.description} — ${e.vendor}`,
        amount: e.amount,
        status: 'Approved' as const,
        submittedByUid: 'rehab-tracker',
        createdAt: new Date(e.createdAt),
      }));
      setLedgerItems(currentProject.id, [...nonTracker, ...trackerItems]);
    },
    [currentProject, updateRehabModule, getLedgerItemsForDeal, setLedgerItems]
  );

  // ── Derived values ────────────────────────────────────────────
  const { budgetLines, actualEntries, w9Records, drawEntries, permitEntries, contingencyPct, totalLoanAmount } = data;

  const actualsByLine = useMemo(() => {
    const map: Record<string, number> = {};
    actualEntries.forEach(e => { map[e.budgetLineId] = (map[e.budgetLineId] ?? 0) + e.amount; });
    return map;
  }, [actualEntries]);

  const totalEstimated = budgetLines.reduce((s, l) => s + l.estimated, 0);
  const totalActual = actualEntries.reduce((s, e) => s + e.amount, 0);
  const totalVariance = totalEstimated - totalActual;

  const contingencyAmount = totalEstimated * contingencyPct;
  const overBudgetTotal = budgetLines.reduce((s, l) => {
    const actual = actualsByLine[l.id] ?? 0;
    return actual > l.estimated ? s + (actual - l.estimated) : s;
  }, 0);
  const contingencyUsedPct = contingencyAmount > 0
    ? Math.min((overBudgetTotal / contingencyAmount) * 100, 100)
    : 0;

  const vendorTotals = useMemo(() => {
    const map: Record<string, number> = {};
    actualEntries.forEach(e => { if (e.vendor) map[e.vendor] = (map[e.vendor] ?? 0) + e.amount; });
    return map;
  }, [actualEntries]);

  const totalDrawn = drawEntries.reduce((s, d) => s + d.drawnAmount, 0);
  const totalPendingDraw = drawEntries.reduce((s, d) => s + d.pendingAmount, 0);
  const drawPct = totalLoanAmount > 0 ? Math.min((totalDrawn / totalLoanAmount) * 100, 100) : 0;

  // ── Budget form state ─────────────────────────────────────────
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetCat, setBudgetCat] = useState(DEFAULT_CATEGORIES[0]);
  const [budgetEst, setBudgetEst] = useState('');

  const addBudgetLine = () => {
    if (!budgetEst) return;
    persist({
      ...data,
      budgetLines: [...budgetLines, { id: `bl-${Date.now()}`, category: budgetCat, estimated: parseFloat(budgetEst) || 0 }],
    });
    setBudgetEst('');
    setShowBudgetForm(false);
  };

  const removeBudgetLine = (id: string) =>
    persist({
      ...data,
      budgetLines: budgetLines.filter(l => l.id !== id),
      actualEntries: actualEntries.filter(e => e.budgetLineId !== id),
    });

  // ── Actual cost entry state (inline per row) ──────────────────
  const [activeActualRow, setActiveActualRow] = useState<string | null>(null);
  const [actualVendor, setActualVendor] = useState('');
  const [actualDesc, setActualDesc] = useState('');
  const [actualAmt, setActualAmt] = useState('');

  const addActualEntry = (lineId: string) => {
    if (!actualAmt || !actualVendor) return;
    const entry: ActualEntry = {
      id: `ae-${Date.now()}`,
      budgetLineId: lineId,
      vendor: actualVendor,
      description: actualDesc || actualVendor,
      amount: parseFloat(actualAmt) || 0,
      createdAt: new Date().toISOString(),
    };
    const nextW9 = w9Records.find(r => r.vendor === actualVendor)
      ? w9Records
      : [...w9Records, { vendor: actualVendor, w9Received: false }];
    persist({ ...data, actualEntries: [...actualEntries, entry], w9Records: nextW9 });
    setActualVendor('');
    setActualDesc('');
    setActualAmt('');
    setActiveActualRow(null);
  };

  // ── Draw form state ───────────────────────────────────────────
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawDesc, setDrawDesc] = useState('');
  const [drawTotal, setDrawTotal] = useState('');
  const [drawDrawn, setDrawDrawn] = useState('');
  const [drawPending, setDrawPending] = useState('');

  const addDrawEntry = () => {
    if (!drawDesc || !drawTotal) return;
    persist({
      ...data,
      drawEntries: [...drawEntries, {
        id: `de-${Date.now()}`,
        description: drawDesc,
        totalAmount: parseFloat(drawTotal) || 0,
        drawnAmount: parseFloat(drawDrawn) || 0,
        pendingAmount: parseFloat(drawPending) || 0,
        status: 'Pending Inspector',
        requestedAt: new Date().toISOString(),
      }],
    });
    setDrawDesc(''); setDrawTotal(''); setDrawDrawn(''); setDrawPending('');
    setShowDrawForm(false);
  };

  const updateDrawStatus = (id: string, status: DrawEntry['status']) =>
    persist({ ...data, drawEntries: drawEntries.map(d => d.id === id ? { ...d, status } : d) });

  // ── Permit form state ─────────────────────────────────────────
  const [showPermitForm, setShowPermitForm] = useState(false);
  const [permitType, setPermitType] = useState('');
  const [permitMuni, setPermitMuni] = useState('');

  const addPermit = () => {
    if (!permitType) return;
    persist({
      ...data,
      permitEntries: [...permitEntries, {
        id: `pe-${Date.now()}`,
        type: permitType,
        municipality: permitMuni,
        appliedAt: null,
        approvedAt: null,
        finalSignOffAt: null,
        status: 'Not Filed',
      }],
    });
    setPermitType(''); setPermitMuni('');
    setShowPermitForm(false);
  };

  const advancePermit = (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    persist({
      ...data,
      permitEntries: permitEntries.map(p => {
        if (p.id !== id) return p;
        if (p.status === 'Not Filed') return { ...p, status: 'Filed' as const, appliedAt: today };
        if (p.status === 'Filed') return { ...p, status: 'Approved' as const, approvedAt: today };
        if (p.status === 'Approved') return { ...p, status: 'Final Sign-Off' as const, finalSignOffAt: today };
        return p;
      }),
    });
  };

  const toggleW9 = (vendor: string) =>
    persist({
      ...data,
      w9Records: w9Records.map(r => r.vendor === vendor ? { ...r, w9Received: !r.w9Received } : r),
    });

  if (!currentProject) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-sm text-gray-400">
        No active deal selected.
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── HEADER SUMMARY ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <HardHat className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-medium tracking-tight text-gray-900">Rehab Tracker</h2>
              <p className="text-xs text-gray-400 mt-0.5">Construction velocity & budget burn rate — Phase 3</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center min-w-[100px]">
              <p className="text-xs uppercase tracking-widest text-gray-400">Budget</p>
              <p className="text-xl font-light text-gray-900">{fmt(totalEstimated)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center min-w-[100px]">
              <p className="text-xs uppercase tracking-widest text-gray-400">Actual</p>
              <p className={`text-xl font-light ${totalActual > totalEstimated ? 'text-red-600' : 'text-gray-900'}`}>
                {fmt(totalActual)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center min-w-[100px]">
              <p className="text-xs uppercase tracking-widest text-gray-400">Variance</p>
              <p className={`text-xl font-light ${totalVariance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {totalVariance < 0 ? '−' : '+'}{fmt(Math.abs(totalVariance))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: BUDGET VS ACTUAL ───────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggle('budget')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            {open.budget ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-800">Line-Item Budget vs. Actual</span>
            <span className="text-xs text-gray-400 ml-1">{budgetLines.length} categories</span>
          </div>
          <span className={`text-xs font-mono font-medium px-2 py-1 rounded ${
            totalVariance < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
          }`}>
            {totalVariance < 0 ? 'OVER BUDGET' : 'ON TRACK'}
          </span>
        </button>

        {open.budget && (
          <div>
            {budgetLines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal w-44">Category</th>
                      <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Estimated Cost</th>
                      <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Actual Cost Logged</th>
                      <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Variance</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {budgetLines.map(line => {
                      const actual = actualsByLine[line.id] ?? 0;
                      const variance = line.estimated - actual;
                      const overBudget = variance < 0;
                      const lineActuals = actualEntries.filter(e => e.budgetLineId === line.id);

                      return (
                        <React.Fragment key={line.id}>
                          <tr className={`group ${overBudget ? 'bg-red-50/30' : ''}`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                {overBudget && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                                <span className="font-medium text-gray-800">{line.category}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(line.estimated)}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(actual)}</td>
                            <td className={`px-4 py-3 text-right font-mono font-medium ${overBudget ? 'text-red-600' : 'text-green-700'}`}>
                              {overBudget ? '−' : '+'}{fmt(Math.abs(variance))}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => setActiveActualRow(activeActualRow === line.id ? null : line.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 transition whitespace-nowrap"
                                >
                                  + Log
                                </button>
                                <button
                                  onClick={() => removeBudgetLine(line.id)}
                                  className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Sub-rows: logged actuals */}
                          {lineActuals.length > 0 && (
                            <tr>
                              <td colSpan={5} className="px-5 pb-2 pt-0">
                                <div className="ml-4 space-y-1">
                                  {lineActuals.map(e => (
                                    <div key={e.id} className="flex items-center gap-3 text-xs text-gray-500">
                                      <span className="text-gray-300">└</span>
                                      <span className="text-gray-600 flex-1">{e.description}</span>
                                      <span className="text-gray-400">{e.vendor}</span>
                                      <span className="font-mono">{fmt(e.amount)}</span>
                                      <button
                                        onClick={() => persist({ ...data, actualEntries: actualEntries.filter(a => a.id !== e.id) })}
                                        className="text-gray-300 hover:text-red-500 transition"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Inline actual cost entry form */}
                          {activeActualRow === line.id && (
                            <tr>
                              <td colSpan={5} className="px-5 pb-3">
                                <div className="ml-4 bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      value={actualVendor}
                                      onChange={e => setActualVendor(e.target.value)}
                                      placeholder="Vendor / Contractor *"
                                      className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-400 outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={actualDesc}
                                      onChange={e => setActualDesc(e.target.value)}
                                      placeholder="Description (optional)"
                                      className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-400 outline-none"
                                    />
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-400 text-xs">$</span>
                                      <input
                                        type="number"
                                        value={actualAmt}
                                        onChange={e => setActualAmt(e.target.value)}
                                        placeholder="Amount *"
                                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-400 outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => addActualEntry(line.id)}
                                      disabled={!actualAmt || !actualVendor}
                                      className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded hover:bg-gray-800 transition disabled:opacity-40"
                                    >
                                      Log Cost
                                    </button>
                                    <button
                                      onClick={() => setActiveActualRow(null)}
                                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Totals row */}
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="px-5 py-3 text-sm text-gray-700">Total</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">{fmt(totalEstimated)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">{fmt(totalActual)}</td>
                      <td className={`px-4 py-3 text-right font-mono text-sm ${totalVariance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {totalVariance < 0 ? '−' : '+'}{fmt(Math.abs(totalVariance))}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {budgetLines.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                No budget categories yet. Add your first line item below.
              </p>
            )}

            {/* Add budget line */}
            <div className="px-5 py-4 border-t border-gray-100">
              {!showBudgetForm ? (
                <button
                  onClick={() => setShowBudgetForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
                >
                  <Plus className="w-3 h-3" /> Add Budget Category
                </button>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Category</label>
                    <select
                      value={budgetCat}
                      onChange={e => setBudgetCat(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                    >
                      {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Estimated Budget</label>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={budgetEst}
                        onChange={e => setBudgetEst(e.target.value)}
                        placeholder="0"
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addBudgetLine}
                    disabled={!budgetEst}
                    className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowBudgetForm(false)}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 2: CONTINGENCY TRACKER ────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggle('contingency')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            {open.contingency ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-800">Contingency Buffer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{(contingencyPct * 100).toFixed(0)}% reserve</span>
            <span className={`text-xs font-mono font-medium px-2 py-1 rounded ${
              contingencyUsedPct >= 90 ? 'bg-red-50 text-red-600' :
              contingencyUsedPct >= 60 ? 'bg-amber-50 text-amber-700' :
              'bg-green-50 text-green-700'
            }`}>
              {contingencyUsedPct.toFixed(0)}% consumed
            </span>
          </div>
        </button>

        {open.contingency && (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Reserve ({(contingencyPct * 100).toFixed(0)}%)</p>
                <p className="text-xl font-light text-gray-900">{fmt(contingencyAmount)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Consumed by Overruns</p>
                <p className={`text-xl font-light ${overBudgetTotal > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {fmt(overBudgetTotal)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Remaining Reserve</p>
                <p className={`text-xl font-light ${contingencyAmount - overBudgetTotal < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmt(Math.max(0, contingencyAmount - overBudgetTotal))}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Buffer consumed by overruns</span>
                <span>{contingencyUsedPct.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    contingencyUsedPct >= 90 ? 'bg-red-500' :
                    contingencyUsedPct >= 60 ? 'bg-amber-400' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${contingencyUsedPct}%` }}
                />
              </div>
              {contingencyUsedPct >= 90 && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Contingency buffer critically low. Review scope immediately.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-gray-500">Buffer %</span>
              {[10, 15, 20].map(pct => (
                <button
                  key={pct}
                  onClick={() => persist({ ...data, contingencyPct: pct / 100 })}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    Math.abs(contingencyPct - pct / 100) < 0.001
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 3: CONTRACTOR PAYABLES & 1099 PREP ─────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggle('contractors')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            {open.contractors ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-800">Contractor Payables & 1099 Prep</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {Object.entries(vendorTotals).filter(([, t]) => t >= 600).length > 0 && (
              <span className="bg-red-50 text-red-600 px-2 py-1 rounded font-medium">
                {Object.entries(vendorTotals).filter(([, t]) => t >= 600).length} 1099 required
              </span>
            )}
            <span className="text-gray-400">{Object.keys(vendorTotals).length} vendors</span>
          </div>
        </button>

        {open.contractors && (
          <div>
            {Object.keys(vendorTotals).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Vendor</th>
                      <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Total Paid</th>
                      <th className="text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">W-9 Received</th>
                      <th className="text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">1099 Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(vendorTotals).map(([vendor, total]) => {
                      const w9 = w9Records.find(r => r.vendor === vendor);
                      const needs1099 = total >= 600;
                      const vendorActuals = actualEntries.filter(e => e.vendor === vendor);

                      return (
                        <React.Fragment key={vendor}>
                          <tr className={needs1099 && !w9?.w9Received ? 'bg-red-50/20' : ''}>
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-800">{vendor}</p>
                              <p className="text-xs text-gray-400">{vendorActuals.length} invoice{vendorActuals.length !== 1 ? 's' : ''}</p>
                            </td>
                            <td className={`px-4 py-3 text-right font-mono ${needs1099 ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}>
                              {fmt(total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleW9(vendor)}
                                className={`inline-flex items-center gap-1.5 text-xs transition ${
                                  w9?.w9Received ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                              >
                                {w9?.w9Received
                                  ? <CheckCircle className="w-4 h-4" />
                                  : <Circle className="w-4 h-4" />
                                }
                                <span>{w9?.w9Received ? 'Received' : 'Pending'}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {needs1099 ? (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  w9?.w9Received ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                }`}>
                                  {w9?.w9Received ? 'Ready to File' : 'W-9 Needed'}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {fmt(600 - total)} to threshold
                                </span>
                              )}
                            </td>
                          </tr>
                          {/* Invoice sub-rows */}
                          <tr>
                            <td colSpan={4} className="px-5 pb-2 pt-0">
                              <div className="ml-4 space-y-1">
                                {vendorActuals.map(e => (
                                  <div key={e.id} className="flex text-xs text-gray-500 gap-3">
                                    <span className="text-gray-300">└</span>
                                    <span className="text-gray-600 flex-1">{e.description}</span>
                                    <span className="font-mono">{fmt(e.amount)}</span>
                                    <span className="text-gray-300">{e.createdAt.slice(0, 10)}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                Log actual costs with a vendor name (in the Budget table above) to track payables here.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 4: LENDER DRAW SCHEDULE ───────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggle('draws')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            {open.draws ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <Banknote className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-gray-800">Lender Draw Schedule</span>
          </div>
          <span className="text-xs text-gray-400">{fmt(totalDrawn)} drawn of {fmt(totalLoanAmount)}</span>
        </button>

        {open.draws && (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Total Loan</p>
                <p className="text-xl font-light text-gray-900">{fmt(totalLoanAmount)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Drawn to Date</p>
                <p className="text-xl font-light text-green-700">{fmt(totalDrawn)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Pending Draw</p>
                <p className="text-xl font-light text-amber-700">{fmt(totalPendingDraw)}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Loan utilization</span>
                <span>{drawPct.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${drawPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Total Construction Loan</span>
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={totalLoanAmount || ''}
                onChange={e => persist({ ...data, totalLoanAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-40 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-gray-400 outline-none"
              />
            </div>

            {drawEntries.length > 0 && (
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Description</th>
                      <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Requested</th>
                      <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Drawn</th>
                      <th className="text-right px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Pending</th>
                      <th className="text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Status</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {drawEntries.map(d => (
                      <tr key={d.id} className="group">
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{d.description}</p>
                          <p className="text-xs text-gray-400">{d.requestedAt.slice(0, 10)}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(d.totalAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-700">{fmt(d.drawnAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-700">{fmt(d.pendingAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={d.status}
                            onChange={e => updateDrawStatus(d.id, e.target.value as DrawEntry['status'])}
                            className={`text-xs border-0 rounded px-2 py-1 font-medium cursor-pointer ${DRAW_BADGE[d.status]}`}
                          >
                            <option value="Pending Inspector">Pending Inspector</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => persist({ ...data, drawEntries: drawEntries.filter(x => x.id !== d.id) })}
                            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!showDrawForm ? (
              <button
                onClick={() => setShowDrawForm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
              >
                <Plus className="w-3 h-3" /> Add Draw Request
              </button>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <input
                  type="text"
                  value={drawDesc}
                  onChange={e => setDrawDesc(e.target.value)}
                  placeholder="Draw description (e.g., Foundation work completed)"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                />
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: 'Total Requested', val: drawTotal, set: setDrawTotal },
                    { label: 'Drawn', val: drawDrawn, set: setDrawDrawn },
                    { label: 'Pending Inspector', val: drawPending, set: setDrawPending },
                  ] as const).map(({ label, val, set }) => (
                    <div key={label}>
                      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={val}
                          onChange={e => set(e.target.value)}
                          placeholder="0"
                          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addDrawEntry}
                    disabled={!drawDesc || !drawTotal}
                    className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-40"
                  >
                    Add Draw
                  </button>
                  <button
                    onClick={() => setShowDrawForm(false)}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 5: PERMIT STATUS ───────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggle('permits')}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            {open.permits ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <FileCheck className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-gray-800">Permit Status</span>
            <span className="text-xs text-gray-400 ml-1">{permitEntries.length} permits</span>
          </div>
          {permitEntries.filter(p => p.status === 'Denied').length > 0 && (
            <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-medium">
              {permitEntries.filter(p => p.status === 'Denied').length} denied
            </span>
          )}
        </button>

        {open.permits && (
          <div>
            {permitEntries.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Permit Type</th>
                      <th className="text-left px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Municipality</th>
                      <th className="text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Filed</th>
                      <th className="text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Approved</th>
                      <th className="text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Final Sign-Off</th>
                      <th className="text-center px-4 py-2.5 text-xs uppercase tracking-widest text-gray-400 font-normal">Status</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {permitEntries.map(p => (
                      <tr key={p.id} className="group">
                        <td className="px-5 py-3 font-medium text-gray-800">{p.type}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{p.municipality || '—'}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-gray-600">
                          {p.appliedAt ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-gray-600">
                          {p.approvedAt ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-gray-600">
                          {p.finalSignOffAt ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PERMIT_BADGE[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition">
                            {p.status !== 'Final Sign-Off' && p.status !== 'Denied' && (
                              <button
                                onClick={() => advancePermit(p.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 transition whitespace-nowrap"
                              >
                                Advance →
                              </button>
                            )}
                            <button
                              onClick={() => persist({ ...data, permitEntries: permitEntries.filter(x => x.id !== p.id) })}
                              className="text-gray-300 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {permitEntries.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">
                No permits tracked yet. Add permits to monitor the municipal approval pipeline.
              </p>
            )}

            <div className="px-5 py-4 border-t border-gray-100">
              {!showPermitForm ? (
                <button
                  onClick={() => setShowPermitForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
                >
                  <Plus className="w-3 h-3" /> Add Permit
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={permitType}
                      onChange={e => setPermitType(e.target.value)}
                      placeholder="Permit type (e.g., Structural, Electrical)"
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                    />
                    <input
                      type="text"
                      value={permitMuni}
                      onChange={e => setPermitMuni(e.target.value)}
                      placeholder="Municipality / Building Dept."
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addPermit}
                      disabled={!permitType}
                      className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-40"
                    >
                      Add Permit
                    </button>
                    <button
                      onClick={() => setShowPermitForm(false)}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
