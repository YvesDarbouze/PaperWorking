'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  ChevronDown,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '@/lib/firebase/config';
import { useProjectStore } from '@/store/projectStore';
import type { TitleCheckItem, ClearanceStatus } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Title Search Clearance — Phase 2 Module

   Tracks per-project title search status, liens, and
   encumbrances. State is persisted to Firestore and
   shared across all project members.

   Key invariants:
   • A new project starts with all 6 checks as "Pending"
     — no pre-completed state, no fabricated detail strings.
   • Each status change is written to Firestore immediately
     with attribution (who changed it, when).
   • Read from closingRoom.titleChecks in the Zustand store
     which mirrors the Firestore project document.
   ═══════════════════════════════════════════════════════ */

// ── Default template — all checks start Pending ──────────────
// These are category names only. No status, no detail, no dates.
const CHECK_TEMPLATES: Pick<TitleCheckItem, 'id' | 'name'>[] = [
  { id: 'ownership',  name: 'Chain of Ownership Verification' },
  { id: 'liens',      name: 'Outstanding Liens & Judgments' },
  { id: 'taxes',      name: 'Property Tax Clearance' },
  { id: 'easements',  name: 'Easements & Encumbrances' },
  { id: 'survey',     name: 'Survey / Boundary Confirmation' },
  { id: 'hoa',        name: 'HOA/Condo Special Assessments' },
];

/** Build an honest empty checklist — every item Pending, no notes, no attribution. */
function buildFreshChecklist(): TitleCheckItem[] {
  return CHECK_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    status: 'Pending' as ClearanceStatus,
  }));
}

/**
 * Merge stored checks with the canonical template.
 * Ensures all 6 template items are always present (new items added
 * to the template appear as Pending for existing projects),
 * and stored attributions/notes are preserved.
 */
function mergeWithTemplate(stored: TitleCheckItem[]): TitleCheckItem[] {
  return CHECK_TEMPLATES.map((template) => {
    const found = stored.find((s) => s.id === template.id);
    return found ?? { id: template.id, name: template.name, status: 'Pending' as ClearanceStatus };
  });
}

// ── Status display config ─────────────────────────────────────
const STATUS_CONFIG: Record<
  ClearanceStatus,
  { icon: React.ReactNode; bg: string; text: string; border: string }
> = {
  Pending: {
    icon: <Clock className="w-3.5 h-3.5" />,
    bg: 'bg-bg-primary',
    text: 'text-text-secondary',
    border: 'border-border-accent',
  },
  'In Review': {
    icon: <Search className="w-3.5 h-3.5" />,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  Cleared: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
  },
  'Issue Found': {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
  },
};

const ALL_STATUSES: ClearanceStatus[] = [
  'Pending',
  'In Review',
  'Cleared',
  'Issue Found',
];

// ── Sub-component: a single editable check row ────────────────
function CheckRow({
  check,
  onUpdate,
  disabled,
}: {
  check: TitleCheckItem;
  onUpdate: (id: string, patch: Partial<TitleCheckItem>) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[check.status];

  const handleStatusChange = (newStatus: ClearanceStatus) => {
    onUpdate(check.id, { status: newStatus });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(check.id, { notes: e.target.value });
  };

  return (
    <div
      className={`rounded-lg border ${config.border} ${config.bg} transition-all`}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3 min-w-0">
          <span className={config.text}>{config.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {check.name}
            </p>
            {check.clearedByName && check.clearedAt && (
              <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3 inline" />
                {check.clearedByName} ·{' '}
                {new Date(check.clearedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {/* Status selector */}
          {!disabled ? (
            <select
              value={check.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as ClearanceStatus)
              }
              className={`text-xs font-bold uppercase tracking-wider rounded-md px-2 py-1
                border ${config.border} ${config.text} ${config.bg}
                cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`}
              aria-label={`Status for ${check.name}`}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`text-xs font-bold uppercase tracking-wider ${config.text}`}
            >
              {check.status}
            </span>
          )}

          {/* Expand/collapse notes */}
          {!disabled && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="p-1 rounded text-text-secondary hover:text-text-primary transition"
              aria-label="Toggle notes"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {expanded && !disabled && (
        <div className="px-3 pb-3 pt-0">
          <textarea
            value={check.notes ?? ''}
            onChange={handleNotesChange}
            placeholder="Add notes (optional)…"
            rows={2}
            className="w-full text-xs rounded-md border border-border-accent bg-bg-surface
              text-text-primary placeholder:text-text-secondary p-2 resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={`Notes for ${check.name}`}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
interface TitleSearchClearanceProps {
  projectId?: string;
}

export default function TitleSearchClearance({
  projectId: projectIdProp,
}: TitleSearchClearanceProps) {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateClosingRoom = useProjectStore((s) => s.updateClosingRoom);

  const projectId = projectIdProp ?? currentProject?.id;
  const organizationId = currentProject?.organizationId;
  const projectName = currentProject?.propertyName;

  // ── Seed from Firestore (via store) or honest empty ──────────
  const storedChecks = currentProject?.closingRoom?.titleChecks;
  const [checks, setChecks] = useState<TitleCheckItem[]>(() =>
    storedChecks && storedChecks.length > 0
      ? mergeWithTemplate(storedChecks)
      : buildFreshChecklist()
  );
  const [saving, setSaving] = useState(false);

  // Re-seed when the project changes (e.g. navigating between projects)
  useEffect(() => {
    const stored = currentProject?.closingRoom?.titleChecks;
    setChecks(
      stored && stored.length > 0
        ? mergeWithTemplate(stored)
        : buildFreshChecklist()
    );
  }, [currentProject?.id]);

  // ── Persist to Firestore via API route ───────────────────────
  const persist = useCallback(
    async (updatedChecks: TitleCheckItem[]) => {
      if (!projectId) return;

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('You must be signed in to update title checks.');
        return;
      }

      setSaving(true);
      try {
        const res = await fetch('/api/closing/title-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            organizationId,
            projectName,
            checks: updatedChecks,
          }),
        });

        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error || 'Save failed');
        }

        // Keep Zustand store in sync (mirrors what's in Firestore)
        updateClosingRoom(projectId, {
          titleChecks: result.data.checks,
          chainOfTitleStatus: result.data.chainOfTitleStatus,
        });
      } catch (err: any) {
        console.error('[TitleSearchClearance] persist failed:', err);
        toast.error(err.message || 'Failed to save title check. Try again.');
        // Roll back local state to what's stored
        const stored = currentProject?.closingRoom?.titleChecks;
        setChecks(
          stored && stored.length > 0
            ? mergeWithTemplate(stored)
            : buildFreshChecklist()
        );
      } finally {
        setSaving(false);
      }
    },
    [projectId, organizationId, projectName, updateClosingRoom, currentProject]
  );

  // ── Handle per-check update ──────────────────────────────────
  const handleUpdate = useCallback(
    (id: string, patch: Partial<TitleCheckItem>) => {
      const actorUid = auth.currentUser?.uid;
      const actorName =
        auth.currentUser?.displayName ||
        auth.currentUser?.email ||
        'Unknown';

      const isTerminalChange =
        patch.status === 'Cleared' || patch.status === 'Issue Found';

      const updated = checks.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          ...patch,
          // Attribute terminal status changes
          ...(isTerminalChange && {
            clearedByUid: actorUid ?? undefined,
            clearedByName: actorName,
            clearedAt: new Date().toISOString(),
          }),
          // Clear attribution when rolling back to non-terminal states
          ...(patch.status === 'Pending' || patch.status === 'In Review'
            ? { clearedByUid: undefined, clearedByName: undefined, clearedAt: undefined }
            : {}),
        };
      });

      setChecks(updated);
      persist(updated);
    },
    [checks, persist]
  );

  // ── Derived stats ────────────────────────────────────────────
  const clearedCount = checks.filter((c) => c.status === 'Cleared').length;
  const issueCount = checks.filter((c) => c.status === 'Issue Found').length;
  const isFullyCleared =
    clearedCount === checks.length && checks.length > 0;

  const isLocked = !projectId;

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-text-primary" />
          <h3 className="text-lg font-medium tracking-tight text-text-primary">
            Title Search Clearance
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-text-secondary animate-pulse">
              Saving…
            </span>
          )}
          {isFullyCleared ? (
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> ALL CLEAR
            </span>
          ) : issueCount > 0 ? (
            <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {issueCount} ISSUE
              {issueCount > 1 ? 'S' : ''}
            </span>
          ) : null}
        </div>
      </div>

      {/* No project context */}
      {isLocked && (
        <p className="text-sm text-text-secondary text-center py-4">
          Open a project to manage its title clearance checklist.
        </p>
      )}

      {!isLocked && (
        <>
          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-text-secondary mb-1.5">
              <span>Clearance Progress</span>
              <span>
                {clearedCount}/{checks.length} cleared
              </span>
            </div>
            <div className="w-full bg-bg-primary rounded-full h-2 flex overflow-hidden">
              <div
                className="bg-emerald-500 h-2 transition-all"
                style={{
                  width: `${(clearedCount / checks.length) * 100}%`,
                }}
              />
              {issueCount > 0 && (
                <div
                  className="bg-red-400 h-2 transition-all"
                  style={{
                    width: `${(issueCount / checks.length) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {checks.map((check) => (
              <CheckRow
                key={check.id}
                check={check}
                onUpdate={handleUpdate}
                disabled={saving}
              />
            ))}
          </div>

          <p className="mt-4 text-[11px] text-text-secondary">
            Changes save automatically and are visible to all project members.
          </p>
        </>
      )}
    </div>
  );
}
