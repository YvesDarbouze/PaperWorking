'use client';

import { useState } from 'react';
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import type { LenderRate } from '@/lib/providers/lenderRates';

/* ═══════════════════════════════════════════════════════════════
   LenderRatesAdmin — inline admin panel for updating lender rates.

   Only shown to users with orgRole 'Lead Investor' or 'Admin'.
   Calls PUT /api/admin/lender-rates with the updated rates array.
   After a successful save, Firestore onSnapshot in the parent
   component reflects the change automatically.
   ═══════════════════════════════════════════════════════════════ */

interface LenderRatesAdminProps {
  rates: LenderRate[];
  phaseColor?: string;
}

interface DraftRate {
  id: string;
  name: string;
  interestRate: string;
  points: string;
  lenderFeesDollars: string;
}

function toDraft(r: LenderRate): DraftRate {
  return {
    id:                r.id,
    name:              r.name,
    interestRate:      r.interestRate.toString(),
    points:            r.points.toString(),
    lenderFeesDollars: (r.lenderFeesCents / 100).toString(),
  };
}

export function LenderRatesAdmin({ rates, phaseColor = '#7A9EAA' }: LenderRatesAdminProps) {
  const [open, setOpen]     = useState(false);
  const [drafts, setDrafts] = useState<DraftRate[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function openEditor() {
    setDrafts(rates.map(toDraft));
    setSuccess(false);
    setError(null);
    setOpen(true);
  }

  function updateDraft(idx: number, field: keyof DraftRate, value: string) {
    setDrafts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = drafts.map((d) => {
        const interestRate    = parseFloat(d.interestRate);
        const points          = parseFloat(d.points);
        const lenderFeesCents = Math.round(parseFloat(d.lenderFeesDollars) * 100);
        if (isNaN(interestRate) || interestRate <= 0) throw new Error(`${d.name}: interest rate must be > 0`);
        if (isNaN(points) || points < 0) throw new Error(`${d.name}: points must be ≥ 0`);
        if (isNaN(lenderFeesCents) || lenderFeesCents < 0) throw new Error(`${d.name}: lender fees must be ≥ 0`);
        return { id: d.id, name: d.name.trim(), interestRate, points, lenderFeesCents };
      });

      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/admin/lender-rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rates: payload }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      setSuccess(true);
      setTimeout(() => setOpen(false), 1400);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save rates');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={openEditor}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border transition-colors cursor-pointer hover:opacity-80"
        style={{ borderColor: phaseColor + '40', color: phaseColor }}
        title="Update lender rates (admin only)"
      >
        <Settings className="w-3 h-3" />
        Edit Rates
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-primary)' }}>
                Update Lender Rates
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-xs opacity-50 hover:opacity-100 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-md text-xs" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-md text-xs" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Rates updated successfully.
              </div>
            )}

            {drafts.map((d, idx) => (
              <div key={d.id} className="space-y-3 rounded-lg p-4" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-ui)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: phaseColor }}>
                  {d.id} — {d.name}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>Rate %</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={d.interestRate}
                      onChange={(e) => updateDraft(idx, 'interestRate', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-md text-xs border outline-none focus:ring-1"
                      style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>Points</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={d.points}
                      onChange={(e) => updateDraft(idx, 'points', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-md text-xs border outline-none focus:ring-1"
                      style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>Fees $</label>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={d.lenderFeesDollars}
                      onChange={(e) => updateDraft(idx, 'lenderFeesDollars', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-md text-xs border outline-none focus:ring-1"
                      style={{ borderColor: 'var(--border-ui)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              Each rate is stamped with today's date as its <em>asOf</em> timestamp, clearing any stale indicator.
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] border transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || success}
                className="px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ background: phaseColor, color: '#fff' }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save Rates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
