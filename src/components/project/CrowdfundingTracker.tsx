'use client';

import React, { useState } from 'react';
import { Users, TrendingUp, Plus, X, DollarSign } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CrowdfundingTracker
   ───────────────────────────────────────────────────────────────
   Tracks private capital raise commitments for a deal.
   Displays a progress bar, per-investor slots, and a running
   total vs. target (typically the Rehab or Equity Gap amount).
   ═══════════════════════════════════════════════════════════════ */

export interface Investor {
  id: string;
  name: string;
  /** Committed amount in cents */
  amountCents: number;
  status: 'pledged' | 'transferred' | 'cleared';
}

interface CrowdfundingTrackerProps {
  /** Capital raise target in cents (e.g. rehabBudget or equity gap) */
  targetCents?: number;
  /** Initial investor list */
  initialInvestors?: Investor[];
  phaseColor?: string;
  onChange?: (investors: Investor[]) => void;
}

const STATUS_LABELS: Record<Investor['status'], string> = {
  pledged:     'Pledged',
  transferred: 'Transferred',
  cleared:     'Cleared',
};

const STATUS_COLORS: Record<Investor['status'], { bg: string; text: string; border: string }> = {
  pledged:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  transferred: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  cleared:     { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
};

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

export function CrowdfundingTracker({
  targetCents = 0,
  initialInvestors = [],
  phaseColor = '#595959',
  onChange,
}: CrowdfundingTrackerProps) {
  const [investors, setInvestors] = useState<Investor[]>(initialInvestors);
  const [adding, setAdding]       = useState(false);

  /* ── Draft form state ── */
  const [draftName,   setDraftName]   = useState('');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftStatus, setDraftStatus] = useState<Investor['status']>('pledged');

  /* ── Derived totals ── */
  const clearedCents     = investors.filter(i => i.status === 'cleared').reduce((s, i) => s + i.amountCents, 0);
  const transferredCents = investors.filter(i => i.status === 'transferred').reduce((s, i) => s + i.amountCents, 0);
  const pledgedCents     = investors.filter(i => i.status === 'pledged').reduce((s, i) => s + i.amountCents, 0);
  const raisedCents      = clearedCents + transferredCents + pledgedCents;
  const progressPct      = targetCents > 0 ? Math.min((raisedCents / targetCents) * 100, 100) : 0;

  function pushInvestors(next: Investor[]) {
    setInvestors(next);
    onChange?.(next);
  }

  function handleAdd() {
    const amt = Math.round(parseFloat(draftAmount.replace(/[^0-9.]/g, '')) * 100);
    if (!draftName.trim() || isNaN(amt) || amt <= 0) return;
    const next: Investor = {
      id:          crypto.randomUUID(),
      name:        draftName.trim(),
      amountCents: amt,
      status:      draftStatus,
    };
    pushInvestors([...investors, next]);
    setDraftName('');
    setDraftAmount('');
    setDraftStatus('pledged');
    setAdding(false);
  }

  function handleRemove(id: string) {
    pushInvestors(investors.filter(i => i.id !== id));
  }

  function cycleStatus(id: string) {
    const ORDER: Investor['status'][] = ['pledged', 'transferred', 'cleared'];
    pushInvestors(investors.map(i => {
      if (i.id !== id) return i;
      const idx = ORDER.indexOf(i.status);
      return { ...i, status: ORDER[(idx + 1) % ORDER.length] };
    }));
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
          {investors.length} investor{investors.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-6 space-y-5">

        {/* ── Progress bar & Breakdown ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Capital Committed
            </span>
            <div className="flex items-center gap-3">
              <span
                className="text-lg font-bold tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {fmt(raisedCents)}
              </span>
            </div>
          </div>

          {/* Track */}
          <div
            className="h-3 rounded-full overflow-hidden shadow-inner"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)' }}
          >
            {/* Cleared segment */}
            <div
              className="h-full transition-all duration-500"
              style={{
                width:      `${targetCents > 0 ? Math.min((clearedCents / targetCents) * 100, 100) : 0}%`,
                background: '#16A34A',
                float:      'left',
              }}
            />
            {/* Transferred segment */}
            <div
              className="h-full transition-all duration-500"
              style={{
                width:      `${targetCents > 0 ? Math.min((transferredCents / targetCents) * 100, 100 - (clearedCents / targetCents) * 100) : 0}%`,
                background: '#3B82F6',
                float:      'left',
              }}
            />
            {/* Pledged segment */}
            <div
              className="h-full transition-all duration-500"
              style={{
                width:      `${targetCents > 0 ? Math.min((pledgedCents / targetCents) * 100, Math.max(0, 100 - ((clearedCents + transferredCents) / targetCents) * 100)) : 0}%`,
                background: '#F59E0B',
                float:      'left',
              }}
            />
          </div>

          {/* Numerical Breakdown & Funding Gap */}
          <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid var(--border-ui)' }}>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                Target Acquisition
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {fmt(targetCents)}
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
              <span className="text-sm font-semibold tabular-nums" style={{ color: Math.max(0, targetCents - raisedCents) > 0 ? '#C2410C' : '#15803D' }}>
                {fmt(Math.max(0, targetCents - raisedCents))}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            {[
              { color: '#16A34A', label: 'Cleared' },
              { color: '#3B82F6', label: 'Transferred' },
              { color: '#F59E0B', label: 'Pledged' },
            ].map(l => (
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

        {/* ── Investor Data Table ── */}
        {investors.length > 0 && (
          <div className="overflow-x-auto rounded-md" style={{ border: '1px solid var(--border-ui)' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-ui)' }}>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Investor Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Committed Amount</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-right" style={{ color: 'var(--text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {investors.map((investor, idx) => {
                  const sc = STATUS_COLORS[investor.status];
                  return (
                    <tr key={investor.id} style={{ borderBottom: idx === investors.length - 1 ? 'none' : '1px solid var(--border-ui)' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                            style={{ background: phaseColor + '18', color: phaseColor }}
                          >
                            {investor.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{investor.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {fmt(investor.amountCents)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => cycleStatus(investor.id)}
                          className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] border transition-all duration-150 hover:opacity-80"
                          style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                          title="Click to advance status"
                        >
                          {STATUS_LABELS[investor.status]}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemove(investor.id)}
                          className="w-6 h-6 inline-flex items-center justify-center rounded-md transition-colors hover:bg-red-50"
                          aria-label="Remove investor"
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
        {investors.length === 0 && !adding && (
          <div
            className="flex flex-col items-center gap-2 py-6 rounded-lg"
            style={{ background: 'var(--bg-canvas)', border: '1px dashed var(--border-ui)' }}
          >
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
              No investors added yet
            </p>
          </div>
        )}

        {/* ── Add investor button ── */}
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] border transition-all hover:bg-gray-50"
          style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Investor
        </button>

        {/* ── Add investor Modal ── */}
        {adding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div 
              className="w-full max-w-md rounded-lg shadow-2xl p-6 space-y-6"
              style={{ background: '#FFFFFF', border: '1px solid var(--border-ui)' }}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-primary)' }}>
                  Add Investor
                </h3>
                <button onClick={() => setAdding(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Investor Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2.5 rounded-md text-xs border outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Committed Amount</label>
                    <input
                      type="text"
                      value={draftAmount}
                      onChange={e => setDraftAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder="e.g. 25000"
                      className="w-full px-3 py-2.5 rounded-md text-xs border outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>Status</label>
                    <select
                      value={draftStatus}
                      onChange={e => setDraftStatus(e.target.value as Investor['status'])}
                      className="w-full px-3 py-2.5 rounded-md text-xs border outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
                    >
                      <option value="pledged">Pledged</option>
                      <option value="transferred">Transferred</option>
                      <option value="cleared">Cleared</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setAdding(false); setDraftName(''); setDraftAmount(''); setDraftStatus('pledged'); }}
                  className="px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] border transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] transition-opacity hover:opacity-90 shadow-sm"
                  style={{ background: phaseColor, color: '#FFFFFF' }}
                >
                  Save Investor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrowdfundingTracker;
