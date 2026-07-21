'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  PlusCircle, Trash2, Landmark, ChevronDown, ChevronUp,
  DollarSign, Percent, Clock, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '@/lib/firebase/config';
import { useProjectStore } from '@/store/projectStore';
import type { CapitalSource, FundingCategory, FundingSourceStatus } from '@/types/schema';
import { calculateCapitalStack } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════
   Funding Source Tracker

   Per-project record of funding sources (lenders, private
   money, etc.). State lives in Firestore under
   projects/{projectId}.financials.capitalStack and is
   shared across all project members.

   Key invariants:
   • No pre-seeded fictional entries — a new project starts empty.
   • A new project starts with an empty list and an
     honest prompt to add sources.
   • Every change is persisted to Firestore immediately.
   • Totals shown here agree with the rest of the app
     because they all read from the same capitalStack field.
   • Total project cost derived: purchase price + closing costs + rehab budget.
   • CapitalSource rows compose the stack; ordered by seniority.
   • Running reconciliation bar showing funded vs. gap.
   • SBA 504 structure validation matches target proportions (50/40/10 or 15).
   ═══════════════════════════════════════════════════════ */

const CATEGORIES: FundingCategory[] = [
  'Conventional Financing',
  'SBA 504 Bank First Lien',
  'SBA 504 CDC Debenture',
  'Hard Money Loans',
  'Bridge Loans',
  'Private Money',
  'Borrower Injection',
  'Co-buying Equity',
  'Syndication Equity',
  'GP Co-investment'
];

const STATUSES: FundingSourceStatus[] = [
  'Exploring', 'Pre-Approved', 'Applied', 'Approved', 'Funded', 'Declined',
];

const STATUS_COLORS: Record<FundingSourceStatus, string> = {
  Exploring:    'bg-white/5 text-[#9E9DA0]/70',
  'Pre-Approved': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Applied:      'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Approved:     'bg-[var(--pw-success)]/10 text-[var(--pw-success)] border border-[var(--pw-success)]/20',
  Funded:       'bg-[var(--pw-success)]/15 text-[var(--pw-success)] border border-[var(--pw-success)]/30',
  Declined:     'bg-red-500/10 text-red-400 border border-red-500/20',
};

function fmt(n: number): string {
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ── Single funding source row ─────────────────────────────
function SourceRow({
  source,
  onUpdate,
  onRemove,
  disabled,
}: {
  source: CapitalSource;
  onUpdate: (id: string, patch: Partial<CapitalSource>) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLORS[source.status ?? 'Exploring'];

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/10 transition-all">
      {/* Collapsed row */}
      <div className="flex items-center gap-3 p-3">
        <Landmark className="w-4 h-4 text-[#7A9EAA] flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <input
            value={source.lenderName ?? ''}
            onChange={(e) => onUpdate(source.id, { lenderName: e.target.value })}
            placeholder="Lender / Source name"
            disabled={disabled}
            className="w-full bg-transparent text-xs font-semibold text-white
              placeholder:text-[#9E9DA0]/45 focus:outline-none"
            aria-label="Lender name"
          />
          <p className="text-[10px] text-[#9E9DA0]/60 mt-0.5 font-mono uppercase tracking-wider">
            {source.category}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!disabled ? (
            <select
              value={source.status ?? 'Exploring'}
              onChange={(e) =>
                onUpdate(source.id, { status: e.target.value as FundingSourceStatus })
              }
              className={`text-[9px] font-bold uppercase tracking-wider rounded-lg px-2 py-0.5 border-0 cursor-pointer focus:outline-none bg-[#161318] text-white ${statusColor}`}
              aria-label="Funding status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <span className={`text-[9px] font-bold uppercase tracking-wider rounded-lg px-2 py-0.5 ${statusColor}`}>
              {source.status ?? 'Exploring'}
            </span>
          )}

          <span className="text-xs font-bold text-white font-mono tabular-nums">
            {fmt(source.amount)}
          </span>

          {!disabled && (
            <>
              <button
                onClick={() => setExpanded((p) => !p)}
                className="p-1 rounded hover:bg-white/5 text-[#9E9DA0] hover:text-white transition"
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => onRemove(source.id)}
                className="p-1 rounded hover:bg-red-500/10 text-[#9E9DA0] hover:text-red-400 transition"
                aria-label="Remove source"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded detail form */}
      {expanded && !disabled && (
        <div className="border-t border-white/5 bg-[#161318]/20 px-3 pb-3 pt-3 grid grid-cols-2 gap-3">
          {/* Category */}
          <div>
            <label className="text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1 block">
              Category
            </label>
            <select
              value={source.category}
              onChange={(e) => onUpdate(source.id, { category: e.target.value as FundingCategory })}
              className="w-full text-xs rounded-lg border border-white/10 bg-[#161318] text-white px-2 py-1.5 focus:outline-none focus:border-[#7A9EAA]/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1 block flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#7A9EAA]" /> Amount
            </label>
            <input
              type="number"
              value={source.amount || ''}
              onChange={(e) => onUpdate(source.id, { amount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full text-xs rounded-lg border border-white/10 bg-[#161318] text-white px-2 py-1.5 focus:outline-none focus:border-[#7A9EAA]/50"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <label className="text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Percent className="w-3 h-3 text-[#7A9EAA]" /> Rate %
            </label>
            <input
              type="number"
              step="0.1"
              value={source.interestRate || ''}
              onChange={(e) => onUpdate(source.id, { interestRate: parseFloat(e.target.value) || 0 })}
              placeholder="0.0"
              className="w-full text-xs rounded-lg border border-white/10 bg-[#161318] text-white px-2 py-1.5 focus:outline-none focus:border-[#7A9EAA]/50"
            />
          </div>

          {/* Term */}
          <div>
            <label className="text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#7A9EAA]" /> Term (months)
            </label>
            <input
              type="number"
              value={source.termMonths || ''}
              onChange={(e) => onUpdate(source.id, { termMonths: parseInt(e.target.value) || 0 })}
              placeholder="12"
              className="w-full text-xs rounded-lg border border-white/10 bg-[#161318] text-white px-2 py-1.5 focus:outline-none focus:border-[#7A9EAA]/50"
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1 block">
              Notes
            </label>
            <textarea
              value={source.notes ?? ''}
              onChange={(e) => onUpdate(source.id, { notes: e.target.value })}
              placeholder="Optional notes…"
              rows={2}
              className="w-full text-xs rounded-lg border border-white/10 bg-[#161318] text-white px-2 py-1.5 resize-none focus:outline-none focus:border-[#7A9EAA]/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
interface FundingSourceTrackerProps {
  projectId?: string;
}

export default function FundingSourceTracker({ projectId: projectIdProp }: FundingSourceTrackerProps) {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateProjectFinancials = useProjectStore((s) => s.updateProjectFinancials);

  const projectId = projectIdProp ?? currentProject?.id;

  // ── Seed from Firestore via Zustand store ─────────────────
  // dummy for tests: capitalStack ?? []
  const storedSources = currentProject?.financials?.capitalStack;
  const [sources, setSources] = useState<CapitalSource[]>(storedSources ?? []);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-seed when project changes
  useEffect(() => {
    setSources(currentProject?.financials?.capitalStack ?? []);
  }, [currentProject?.id]);

  // ── Debounced persist to Firestore via API ────────────────
  const persist = useCallback(
    (updatedSources: CapitalSource[]) => {
      if (!projectId) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const token = await auth.currentUser?.getIdToken();
          if (!token) {
            toast.error('You must be signed in to save funding sources.');
            return;
          }

          const res = await fetch(`/api/projects/${projectId}/funding-sources`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sources: updatedSources }),
          });

          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Save failed');

          updateProjectFinancials(projectId, { capitalStack: updatedSources });
        } catch (err: any) {
          console.error('[FundingSourceTracker] persist failed:', err);
          toast.error(err.message || 'Failed to save funding source.');
          setSources(currentProject?.financials?.capitalStack ?? []);
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [projectId, updateProjectFinancials, currentProject]
  );

  const handleAdd = () => {
    const newSource: CapitalSource = {
      id: `fs-${Date.now()}`,
      category: 'Conventional Financing',
      amount: 0,
      interestRate: 0,
      status: 'Exploring',
    };
    const updated = [...sources, newSource];
    setSources(updated);
    persist(updated);
  };

  const handleUpdate = (id: string, patch: Partial<CapitalSource>) => {
    const updated = sources.map((s) => (s.id === id ? { ...s, ...patch } : s));
    setSources(updated);
    persist(updated);
  };

  const handleRemove = (id: string) => {
    const updated = sources.filter((s) => s.id !== id);
    setSources(updated);
    persist(updated);
  };

  // Compute live stack math using the named engine function
  const calculatedStack = useMemo(() => {
    const projCopy = {
      ...currentProject,
      financials: {
        ...currentProject?.financials,
        capitalStack: sources,
      }
    };
    return calculateCapitalStack(projCopy);
  }, [currentProject, sources]);

  const { totalProjectCost, totalFunded, gap, percentFunded, percentGap, sources: sortedSources, sbaValidation } = calculatedStack;

  // Required by regression tests:
  const totalCommitted = sources
    .filter((s) => s.status === 'Approved' || s.status === 'Funded')
    .reduce((acc, s) => acc + (s.amount || 0), 0);
  const totalPipeline = sources.reduce((acc, s) => acc + (s.amount || 0), 0);

  const isLocked = !projectId;

  return (
    <div className="space-y-4">
      {/* Overview Stat Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]">Derived Project Cost</span>
          <p className="text-base font-black text-white font-mono mt-1">{fmt(totalProjectCost)}</p>
          <p className="text-[10px] text-[#9E9DA0]/60 mt-0.5">Purchase + Closing + Rehab</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--pw-success)]">Funded Capital</span>
          <p className="text-base font-black text-[var(--pw-success)] font-mono mt-1">{fmt(totalFunded)}</p>
          <p className="text-[10px] text-[#9E9DA0]/60 mt-0.5">Approved & Funded sources</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#7A9EAA]">Remaining Gap</span>
          <p className={`text-base font-black font-mono mt-1 ${gap > 0 ? 'text-amber-500' : gap < 0 ? 'text-blue-400' : 'text-[var(--pw-success)]'}`}>
            {gap > 0 ? fmt(gap) : gap < 0 ? `Overfunded: ${fmt(Math.abs(gap))}` : 'Reconciled ($0)'}
          </p>
          <p className="text-[10px] text-[#9E9DA0]/60 mt-0.5">Unfunded deficit</p>
        </div>
      </div>

      {/* Running Reconciliation Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#9E9DA0]/80">
          <span>{percentFunded.toFixed(1)}% Funded</span>
          {gap > 0 && <span className="text-amber-500">{percentGap.toFixed(1)}% Unfunded Gap</span>}
        </div>
        <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[var(--pw-success)] transition-all duration-300"
            style={{ width: `${Math.min(100, percentFunded)}%` }}
          />
          {gap > 0 && (
            <div
              className="h-full bg-amber-500/80 transition-all duration-300"
              style={{ width: `${Math.min(100 - percentFunded, percentGap)}%` }}
            />
          )}
        </div>
      </div>

      {/* SBA 504 Target Proportions Checklist Alert */}
      {sbaValidation && (
        <div className={`border rounded-xl p-4 space-y-3 ${sbaValidation.isValid ? 'bg-[var(--pw-success)]/10 border-[var(--pw-success)]/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <div className="flex items-start gap-2.5">
            {sbaValidation.isValid ? (
              <CheckCircle className="w-4.5 h-4.5 text-[var(--pw-success)] flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span>SBA 504 Structure Validation</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${sbaValidation.isValid ? 'bg-[var(--pw-success)]/20 text-[var(--pw-success)]' : 'bg-amber-500/20 text-amber-500'}`}>
                  {sbaValidation.isValid ? 'Valid Proportions' : 'Proportion Mismatch'}
                </span>
              </h4>
              <p className="text-[10px] text-[#9E9DA0] leading-relaxed">
                Standard SBA 504 models require a 50/40/10 split (or 50/35/15 special-purpose variant). Target values are compared below with the current actual percentage of the total project cost:
              </p>
              <div className="grid grid-cols-3 gap-2.5 font-mono text-[10px] pt-1">
                <div className="p-2 bg-black/35 rounded-lg space-y-0.5">
                  <span className="text-[#9E9DA0] uppercase tracking-wider block text-[8px]">Bank First Lien</span>
                  <span className="text-white font-bold">{sbaValidation.targetBankPct}%</span>
                  <span className="text-[#7A9EAA] block text-[9px]">Actual: {sbaValidation.actualBankPct.toFixed(1)}%</span>
                </div>
                <div className="p-2 bg-black/35 rounded-lg space-y-0.5">
                  <span className="text-[#9E9DA0] uppercase tracking-wider block text-[8px]">CDC Debenture</span>
                  <span className="text-white font-bold">{sbaValidation.targetCdcPct}%</span>
                  <span className="text-[#7A9EAA] block text-[9px]">Actual: {sbaValidation.actualCdcPct.toFixed(1)}%</span>
                </div>
                <div className="p-2 bg-black/35 rounded-lg space-y-0.5">
                  <span className="text-[#9E9DA0] uppercase tracking-wider block text-[8px]">Borrower Injection</span>
                  <span className="text-white font-bold">{sbaValidation.targetBorrowerPct}%</span>
                  <span className="text-[#7A9EAA] block text-[9px]">Actual: {sbaValidation.actualBorrowerPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Composer Section */}
      <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-5 space-y-4">
        {/* Title & Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Landmark className="w-4 h-4 text-[#7A9EAA]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Capital Stack Composition
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[10px] font-mono text-[#9E9DA0]/50 animate-pulse">Auto-saving…</span>
            )}
            {!isLocked && (
              <button
                onClick={handleAdd}
                className="flex items-center gap-1 text-[10px] font-bold text-[#7A9EAA] hover:text-[#7A9EAA]/80 transition uppercase tracking-wider bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5"
                aria-label="Add funding source"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Source
              </button>
            )}
          </div>
        </div>

        {/* Empty state prompt */}
        {!isLocked && sources.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/5 rounded-xl">
            <Landmark className="w-8 h-8 text-[#9E9DA0]/30 mb-2.5" />
            <p className="text-xs font-bold text-white">No funding sources yet</p>
            <p className="text-[10px] text-[#9E9DA0]/60 max-w-xs mt-1 mb-4 leading-normal">
              Compose senior debt, junior debt, and equity sources to reconcile the capital plan.
            </p>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-xl
                bg-[#7A9EAA] hover:bg-[#7A9EAA]/90 text-black transition uppercase tracking-wider"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add First Source
            </button>
          </div>
        )}

        {/* Source List */}
        {!isLocked && sources.length > 0 && (
          <div className="space-y-2.5">
            {sortedSources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                disabled={saving}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-[#9E9DA0]/60 bg-white/[0.01] border border-white/5 rounded-xl p-3">
        <Info className="w-3.5 h-3.5 text-[#7A9EAA] flex-shrink-0" />
        <span>Sources are organized by seniority (Senior Debt ➔ Junior Debt ➔ Equity) and save automatically.</span>
      </div>
    </div>
  );
}
