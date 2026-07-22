'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlusCircle, Trash2, Landmark, ChevronDown, ChevronUp,
  DollarSign, Percent, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '@/lib/firebase/config';
import { useProjectStore } from '@/store/projectStore';
import type { CapitalSource, FundingCategory, FundingSourceStatus } from '@/types/schema';

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
   ═══════════════════════════════════════════════════════ */

const CATEGORIES: FundingCategory[] = [
  'Hard Money Loans',
  'Private Money',
  'Conventional Financing',
];

const STATUSES: FundingSourceStatus[] = [
  'Exploring', 'Pre-Approved', 'Applied', 'Approved', 'Funded', 'Declined',
];

const STATUS_COLORS: Record<FundingSourceStatus, string> = {
  Exploring:    'bg-gray-100 text-gray-600',
  'Pre-Approved': 'bg-blue-50 text-blue-700',
  Applied:      'bg-yellow-50 text-yellow-700',
  Approved:     'bg-pw-success-container text-pw-success border border-pw-success-border',
  Funded:       'bg-pw-success-container text-pw-success border border-pw-success-border',
  Declined:     'bg-red-50 text-red-600',
};

function fmt(n: number): string {
  if (!n) return '$0';
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
    <div className="rounded-xl border border-border-accent bg-bg-surface overflow-hidden">
      {/* Collapsed row */}
      <div className="flex items-center gap-3 p-3">
        <Landmark className="w-4 h-4 text-text-secondary flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <input
            value={source.lenderName ?? ''}
            onChange={(e) => onUpdate(source.id, { lenderName: e.target.value })}
            placeholder="Lender / Source name"
            disabled={disabled}
            className="w-full bg-transparent text-sm font-medium text-text-primary
              placeholder:text-text-secondary focus:outline-none"
            aria-label="Lender name"
          />
          <p className="text-[11px] text-text-secondary mt-0.5">
            {source.category}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status badge */}
          {!disabled ? (
            <select
              value={source.status ?? 'Exploring'}
              onChange={(e) =>
                onUpdate(source.id, { status: e.target.value as FundingSourceStatus })
              }
              className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 border-0 cursor-pointer focus:outline-none ${statusColor}`}
              aria-label="Funding status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <span className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 ${statusColor}`}>
              {source.status ?? 'Exploring'}
            </span>
          )}

          <span className="text-sm font-semibold text-text-primary tabular-nums">
            {fmt(source.amount)}
          </span>

          {!disabled && (
            <>
              <button
                onClick={() => setExpanded((p) => !p)}
                className="p-1 rounded text-text-secondary hover:text-text-primary transition"
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
                className="p-1 rounded text-text-secondary hover:text-red-500 transition"
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
        <div className="border-t border-border-accent px-3 pb-3 pt-3 grid grid-cols-2 gap-3">
          {/* Category */}
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
              Category
            </label>
            <select
              value={source.category}
              onChange={(e) => onUpdate(source.id, { category: e.target.value as FundingCategory })}
              className="w-full text-xs rounded-md border border-border-accent bg-bg-primary text-text-primary px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Amount
            </label>
            <input
              type="number"
              value={source.amount || ''}
              onChange={(e) => onUpdate(source.id, { amount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full text-xs rounded-md border border-border-accent bg-bg-primary text-text-primary px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Percent className="w-3 h-3" /> Rate %
            </label>
            <input
              type="number"
              step="0.1"
              value={source.interestRate || ''}
              onChange={(e) => onUpdate(source.id, { interestRate: parseFloat(e.target.value) || 0 })}
              placeholder="0.0"
              className="w-full text-xs rounded-md border border-border-accent bg-bg-primary text-text-primary px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Term */}
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> Term (months)
            </label>
            <input
              type="number"
              value={source.termMonths || ''}
              onChange={(e) => onUpdate(source.id, { termMonths: parseInt(e.target.value) || 0 })}
              placeholder="12"
              className="w-full text-xs rounded-md border border-border-accent bg-bg-primary text-text-primary px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
              Notes
            </label>
            <textarea
              value={source.notes ?? ''}
              onChange={(e) => onUpdate(source.id, { notes: e.target.value })}
              placeholder="Optional notes…"
              rows={2}
              className="w-full text-xs rounded-md border border-border-accent bg-bg-primary text-text-primary px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      // Debounce: wait 600ms after last keystroke before saving
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

          // Keep Zustand in sync (mirrors Firestore)
          updateProjectFinancials(projectId, { capitalStack: updatedSources });
        } catch (err: any) {
          console.error('[FundingSourceTracker] persist failed:', err);
          toast.error(err.message || 'Failed to save funding source.');
          // Roll back
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
      category: 'Hard Money Loans',
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

  // ── Totals (agree with ProjectCalculator which reads same field) ──
  const totalCommitted = sources
    .filter((s) => s.status === 'Approved' || s.status === 'Funded')
    .reduce((acc, s) => acc + (s.amount || 0), 0);
  const totalPipeline = sources.reduce((acc, s) => acc + (s.amount || 0), 0);

  const isLocked = !projectId;

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Landmark className="w-5 h-5 text-text-primary" />
          <h3 className="text-lg font-medium tracking-tight text-text-primary">
            Funding Sources
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-text-secondary animate-pulse">Saving…</span>
          )}
          {!isLocked && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              aria-label="Add funding source"
            >
              <PlusCircle className="w-4 h-4" />
              Add Source
            </button>
          )}
        </div>
      </div>

      {/* No project context */}
      {isLocked && (
        <p className="text-sm text-text-secondary text-center py-4">
          Open a project to manage its funding sources.
        </p>
      )}

      {!isLocked && (
        <>
          {/* Empty state */}
          {sources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Landmark className="w-10 h-10 text-text-secondary/30 mb-3" />
              <p className="text-sm font-medium text-text-secondary">
                No funding sources yet
              </p>
              <p className="text-xs text-text-secondary/70 mt-1 mb-4">
                Add your actual lenders, private money contacts, or loan commitments.
              </p>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg
                  bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              >
                <PlusCircle className="w-4 h-4" />
                Add First Source
              </button>
            </div>
          )}

          {/* Source list */}
          {sources.length > 0 && (
            <div className="space-y-2">
              {sources.map((source) => (
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

          {/* Totals footer */}
          {sources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border-accent grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                  Approved / Funded
                </p>
                <p className="text-lg font-bold text-pw-success tabular-nums">
                  {fmt(totalCommitted)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                  Total Pipeline
                </p>
                <p className="text-lg font-bold text-text-primary tabular-nums">
                  {fmt(totalPipeline)}
                </p>
              </div>
            </div>
          )}

          <p className="mt-4 text-[11px] text-text-secondary">
            Changes save automatically and are visible to all project members.
          </p>
        </>
      )}
    </div>
  );
}
