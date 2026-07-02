'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, TrendingUp, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase/config';

/* ═══════════════════════════════════════════════════════════════
   CrowdfundingTracker
   ───────────────────────────────────────────────────────────────
   Real-time capital raise tracker wired to:
     - Firestore  projects/{projectId}/commitments  (live read)
     - API  /api/projects/[id]/commitments          (writes)
     - API  /api/projects/[id]/commitments/[cId]    (PATCH/DELETE)

   All writes are token-authenticated server-side.
   Progress bar, investor list, and totals update in real time
   as commitments change (cross-tab / multi-user safe).
   ═══════════════════════════════════════════════════════════════ */

export interface Commitment {
  id: string;
  name: string;
  email?: string | null;
  amountCents: number;
  status: 'pledged' | 'transferred' | 'cleared';
  notes?: string | null;
  createdAt?: string | null;
}

interface CrowdfundingTrackerProps {
  projectId: string;
  /** Capital raise target in cents (e.g. rehabBudget or equity gap) */
  targetCents?: number;
  phaseColor?: string;
  /** Called whenever the total committed cents changes */
  onTotalChange?: (totalCents: number) => void;
}

const STATUS_LABELS: Record<Commitment['status'], string> = {
  pledged:     'Pledged',
  transferred: 'Transferred',
  cleared:     'Cleared',
};
const STATUS_ORDER: Commitment['status'][] = ['pledged', 'transferred', 'cleared'];

const STATUS_COLORS: Record<Commitment['status'], { bg: string; text: string; border: string }> = {
  pledged:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  transferred: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  cleared:     { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
};

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

async function getToken(): Promise<string | null> {
  const auth = getAuth();
  return auth.currentUser?.getIdToken() ?? null;
}

export function CrowdfundingTracker({
  projectId,
  targetCents = 0,
  phaseColor = '#595959',
  onTotalChange,
}: CrowdfundingTrackerProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [synced, setSynced]           = useState(false);
  const [adding, setAdding]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  /* ── Draft form state ── */
  const [draftName,   setDraftName]   = useState('');
  const [draftEmail,  setDraftEmail]  = useState('');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftStatus, setDraftStatus] = useState<Commitment['status']>('pledged');

  /* ── Real-time Firestore subscription ── */
  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, 'projects', projectId, 'commitments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: Commitment[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          email: d.data().email ?? null,
          amountCents: d.data().amountCents,
          status: d.data().status,
          notes: d.data().notes ?? null,
          createdAt: d.data().createdAt?.toDate?.().toISOString() ?? null,
        }));
        setCommitments(docs);
        setSynced(true);
      },
      (err) => {
        console.error('[CrowdfundingTracker] onSnapshot error:', err);
        setSynced(true);
      }
    );
    return unsub;
  }, [projectId]);

  /* ── Notify parent of total changes ── */
  const clearedCents     = commitments.filter(c => c.status === 'cleared').reduce((s, c) => s + c.amountCents, 0);
  const transferredCents = commitments.filter(c => c.status === 'transferred').reduce((s, c) => s + c.amountCents, 0);
  const pledgedCents     = commitments.filter(c => c.status === 'pledged').reduce((s, c) => s + c.amountCents, 0);
  const raisedCents      = clearedCents + transferredCents + pledgedCents;
  const progressPct      = targetCents > 0 ? Math.min((raisedCents / targetCents) * 100, 100) : 0;

  useEffect(() => {
    onTotalChange?.(raisedCents);
  }, [raisedCents, onTotalChange]);

  /* ── Write helpers ── */
  const handleAdd = useCallback(async () => {
    const amt = Math.round(parseFloat(draftAmount.replace(/[^0-9.]/g, '')) * 100);
    if (!draftName.trim() || isNaN(amt) || amt <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/projects/${projectId}/commitments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name:        draftName.trim(),
          email:       draftEmail.trim() || undefined,
          amountCents: amt,
          status:      draftStatus,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setDraftName('');
      setDraftEmail('');
      setDraftAmount('');
      setDraftStatus('pledged');
      setAdding(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to add commitment');
    } finally {
      setSaving(false);
    }
  }, [projectId, draftName, draftEmail, draftAmount, draftStatus]);

  const handleCycleStatus = useCallback(async (c: Commitment) => {
    const idx = STATUS_ORDER.indexOf(c.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    try {
      const token = await getToken();
      const res = await fetch(`/api/projects/${projectId}/commitments/${c.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to update status');
    }
  }, [projectId]);

  const handleRemove = useCallback(async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/projects/${projectId}/commitments/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to remove commitment');
    }
  }, [projectId]);

  /* ── Skeleton while Firestore hasn't fired yet ── */
  if (!synced) {
    return (
      <div
        className="rounded-lg overflow-hidden animate-pulse"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
      >
        <div className="h-12 rounded-t-lg" style={{ background: phaseColor + '80' }} />
        <div className="p-6 space-y-4">
          <div className="h-3 w-full rounded" style={{ background: 'var(--bg-canvas)' }} />
          <div className="h-3 w-3/4 rounded" style={{ background: 'var(--bg-canvas)' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      {/* ── Section header ── */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ background: phaseColor }}
      >
        <Users className="w-4 h-4 shrink-0" style={{ color: '#FFFFFF' }} />
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.18em] flex-1"
          style={{ color: '#FFFFFF' }}
        >
          Capital Raise Tracker
        </h2>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}
        >
          {commitments.length} investor{commitments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-6 space-y-5">

        {/* ── Error banner ── */}
        {error && (
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-md text-xs"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto shrink-0 opacity-60 hover:opacity-100"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Progress bar & Breakdown ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Capital Committed
            </span>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: 'var(--text-primary)' }}
            >
              {fmt(raisedCents)}
            </span>
          </div>

          {/* Track */}
          <div
            className="h-3 rounded-full overflow-hidden shadow-inner"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)' }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${targetCents > 0 ? Math.min((clearedCents / targetCents) * 100, 100) : 0}%`,
                background: '#16A34A',
                float: 'left',
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${targetCents > 0 ? Math.min((transferredCents / targetCents) * 100, Math.max(0, 100 - (clearedCents / targetCents) * 100)) : 0}%`,
                background: '#3B82F6',
                float: 'left',
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${targetCents > 0 ? Math.min((pledgedCents / targetCents) * 100, Math.max(0, 100 - ((clearedCents + transferredCents) / targetCents) * 100)) : 0}%`,
                background: '#F59E0B',
                float: 'left',
              }}
            />
          </div>

          {/* Numerical Breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid var(--border-ui)' }}>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                Target
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {targetCents > 0 ? fmt(targetCents) : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-l pl-4" style={{ borderColor: 'var(--border-ui)' }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                Committed
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {fmt(raisedCents)}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-l pl-4" style={{ borderColor: 'var(--border-ui)' }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                Funding Gap
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: targetCents > 0 && raisedCents < targetCents ? '#C2410C' : '#15803D' }}
              >
                {targetCents > 0 ? fmt(Math.max(0, targetCents - raisedCents)) : '—'}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            {[
              { color: '#16A34A', label: 'Cleared' },
              { color: '#3B82F6', label: 'Transferred' },
              { color: '#F59E0B', label: 'Pledged' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                  {l.label}
                </span>
              </div>
            ))}
            {targetCents > 0 && (
              <span
                className="ml-auto text-[10px] font-bold tabular-nums"
                style={{ color: phaseColor }}
              >
                {Math.round(progressPct)}%
              </span>
            )}
          </div>
        </div>

        {/* ── Investor Table ── */}
        {commitments.length > 0 && (
          <div className="overflow-x-auto rounded-md" style={{ border: '1px solid var(--border-ui)' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-ui)' }}>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Investor</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Amount</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-right" style={{ color: 'var(--text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {commitments.map((c, idx) => {
                  const sc = STATUS_COLORS[c.status];
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: idx === commitments.length - 1 ? 'none' : '1px solid var(--border-ui)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                            style={{ background: phaseColor + '18', color: phaseColor }}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {c.name}
                            </p>
                            {c.email && (
                              <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                {c.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {fmt(c.amountCents)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCycleStatus(c)}
                          className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] border transition-all duration-150 hover:opacity-80 cursor-pointer"
                          style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                          title="Click to advance status"
                        >
                          {STATUS_LABELS[c.status]}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemove(c.id)}
                          className="w-6 h-6 inline-flex items-center justify-center rounded-md transition-colors hover:bg-red-50 cursor-pointer"
                          aria-label="Remove commitment"
                        >
                          <X className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Empty state ── */}
        {commitments.length === 0 && !adding && (
          <div
            className="flex flex-col items-center gap-3 py-8 rounded-lg"
            style={{ background: 'var(--bg-canvas)', border: '1px dashed var(--border-ui)' }}
          >
            <TrendingUp className="w-7 h-7" style={{ color: 'var(--text-secondary)', opacity: 0.35 }} />
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
                No investors added yet
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                Add your first commitment to start tracking this raise.
              </p>
            </div>
          </div>
        )}

        {/* ── Add commitment button ── */}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] border transition-all hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Investor
          </button>
        )}

        {/* ── Add commitment form (inline, no modal) ── */}
        {adding && (
          <div
            className="rounded-lg p-5 space-y-4"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-primary)' }}>
                New Commitment
              </h3>
              <button
                onClick={() => {
                  setAdding(false);
                  setDraftName('');
                  setDraftEmail('');
                  setDraftAmount('');
                  setDraftStatus('pledged');
                  setError(null);
                }}
                className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                  Investor Name *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="e.g. Jane Smith"
                  className="w-full px-3 py-2.5 rounded-md text-xs border outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  placeholder="investor@example.com"
                  className="w-full px-3 py-2.5 rounded-md text-xs border outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                  Amount *
                </label>
                <input
                  type="text"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2.5 rounded-md text-xs border outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </label>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as Commitment['status'])}
                  className="w-full px-3 py-2.5 rounded-md text-xs border outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                >
                  <option value="pledged">Pledged</option>
                  <option value="transferred">Transferred</option>
                  <option value="cleared">Cleared</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setAdding(false);
                  setDraftName('');
                  setDraftEmail('');
                  setDraftAmount('');
                  setDraftStatus('pledged');
                }}
                className="px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] border transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !draftName.trim() || !draftAmount.trim()}
                className="px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                style={{ background: phaseColor, color: '#FFFFFF' }}
              >
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrowdfundingTracker;
