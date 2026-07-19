'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAttorneyStates } from '@/hooks/useAttorneyStates';
import { isAttorneyCloseState } from '@/lib/config/attorneyStates';
import { evaluateAttorneyBlockingLine } from '@/lib/gates/fundGateLines';
import type { F4VendorAssignment } from '@/types/schema';
import {
  Scale,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  X,
  MapPin,
  Store,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

function getAssignment(val: string | F4VendorAssignment | null | undefined): F4VendorAssignment | null {
  if (!val) return null;
  if (typeof val === 'string') {
    return { name: val, source: 'off_platform', assignedAt: '', assignedBy: '' };
  }
  return val;
}

/**
 * Card F4.2 — Attorney (jurisdiction-gated)
 *
 * Reveals when the deal's state is in the config-driven attorney-close list.
 * Language: "attorney involvement is customary or required in this state;
 * confirm with your title contact."
 *
 * Blocking line in the F6 gate: attorney must be assigned before advancement.
 */
export function ClosingAttorneyCard({ projectId }: Props) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Config-driven state list
  const { states: attorneyStates, loading: statesLoading } = useAttorneyStates();

  // Form state
  const [formName, setFormName] = useState('');
  const [formFirm, setFormFirm] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSource, setFormSource] = useState<'marketplace' | 'off_platform'>('off_platform');

  // Listen to project
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) setProject(snap.data());
      setLoading(false);
    });
    return unsub;
  }, [projectId]);

  const isRequired = useMemo(
    () => isAttorneyCloseState(project?.state, attorneyStates),
    [project?.state, attorneyStates]
  );

  const assignment = useMemo(
    () => getAssignment(project?.financials?.f4ClosingAttorneyVendor),
    [project?.financials?.f4ClosingAttorneyVendor]
  );

  const blockingLine = useMemo(
    () => evaluateAttorneyBlockingLine(project?.state, project?.financials || {}, attorneyStates),
    [project?.state, project?.financials, attorneyStates]
  );

  const openEdit = useCallback(() => {
    if (assignment) {
      setFormName(assignment.name || '');
      setFormFirm(assignment.firm || '');
      setFormPhone(assignment.phone || '');
      setFormEmail(assignment.email || '');
      setFormSource(assignment.source === 'marketplace' ? 'marketplace' : 'off_platform');
    } else {
      setFormName('');
      setFormFirm('');
      setFormPhone('');
      setFormEmail('');
      setFormSource('off_platform');
    }
    setEditing(true);
  }, [assignment]);

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Attorney name is required.');
      return;
    }

    setSaving(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication required.');

      const res = await fetch(`/api/projects/${projectId}/team-slots`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          slotKey: 'f4ClosingAttorneyVendor',
          assignment: {
            name: formName.trim(),
            firm: formFirm.trim() || null,
            phone: formPhone.trim() || null,
            email: formEmail.trim() || null,
            source: formSource,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save.');
      }

      toast.success('Closing attorney assigned.');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save attorney.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication required.');

      const res = await fetch(`/api/projects/${projectId}/team-slots`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          slotKey: 'f4ClosingAttorneyVendor',
          assignment: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to clear.');
      }

      toast.success('Attorney cleared.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear attorney.');
    } finally {
      setSaving(false);
    }
  };

  // Don't render at all if the state is not in the attorney-close list
  if (loading || statesLoading) return null;
  if (!isRequired) return null;

  const stateLabel = project?.state?.toUpperCase() || '';

  return (
    <div className="glass-card p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-pw-border pb-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#7A9EAA]" />
            Closing Attorney
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            This property is in an attorney-close state — assign your closing attorney.
          </p>
        </div>
        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-50 text-amber-700 border border-amber-200">
          {stateLabel} — Jurisdiction-gated
        </span>
      </div>

      {/* Advisory language */}
      <div className="flex items-start gap-2.5 p-3 rounded bg-blue-50 text-blue-900 border border-blue-200 text-xs">
        <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          Attorney involvement is customary or required in this state; confirm with your title contact.
          <span className="block text-blue-600 mt-1 text-[10px]">
            The state list is config-driven platform data — never a legal determination.
          </span>
        </div>
      </div>

      {/* F6 Gate blocking indicator */}
      {blockingLine.blocked && (
        <div className="flex items-start gap-2.5 p-3 rounded bg-red-50 text-red-900 border border-red-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">F6 Gate — Blocking</span>
            Assign a closing attorney before the fund phase gate can advance.
          </div>
        </div>
      )}

      {/* Assigned state */}
      {assignment && !editing && (
        <div className="p-3 rounded border border-green-200 bg-green-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <strong className="text-pw-black font-semibold block">{assignment.name}</strong>
                {assignment.firm && (
                  <span className="text-pw-muted block">{assignment.firm}</span>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {assignment.phone && <span className="text-pw-muted">{assignment.phone}</span>}
                  {assignment.email && <span className="text-pw-muted">{assignment.email}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {assignment.source === 'marketplace' && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-bold uppercase">
                      <Store className="w-2.5 h-2.5" /> Marketplace
                    </span>
                  )}
                  {assignment.source === 'off_platform' && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-bold uppercase">
                      <MapPin className="w-2.5 h-2.5" /> Off-platform
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={openEdit} className="p-1.5 rounded hover:bg-gray-100 transition-all text-pw-muted" title="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleClear} disabled={saving} className="p-1.5 rounded hover:bg-red-50 transition-all text-pw-muted hover:text-red-500" title="Clear">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state — prompt */}
      {!assignment && !editing && (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Scale className="w-6 h-6" />
          </div>
          <p className="text-xs text-pw-muted">No closing attorney assigned yet.</p>
          <button
            onClick={openEdit}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-[#7A9EAA] text-white rounded hover:bg-[#688a95] transition-all shadow-sm"
          >
            Assign Closing Attorney
          </button>
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div className="border border-pw-border rounded-lg p-4 bg-gray-50/50 space-y-3 animate-in fade-in duration-150">
          {/* Source toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormSource('off_platform')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all flex items-center gap-1 ${
                formSource === 'off_platform'
                  ? 'border-[#7A9EAA] bg-[#7A9EAA]/10 text-[#7A9EAA]'
                  : 'border-pw-border text-pw-muted hover:border-gray-300'
              }`}
            >
              <MapPin className="w-3 h-3" /> Off-Platform
            </button>
            <button
              onClick={() => setFormSource('marketplace')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all flex items-center gap-1 ${
                formSource === 'marketplace'
                  ? 'border-purple-500 bg-purple-50 text-purple-600'
                  : 'border-pw-border text-pw-muted hover:border-gray-300'
              }`}
            >
              <Store className="w-3 h-3" /> Marketplace
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">Attorney Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">Firm</label>
              <input
                type="text"
                value={formFirm}
                onChange={(e) => setFormFirm(e.target.value)}
                placeholder="Law firm name"
                className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">Phone</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(555) 555-1234"
                className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="attorney@firm.com"
                className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-pw-border text-pw-muted rounded hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-all ${
                saving || !formName.trim()
                  ? 'bg-gray-300 text-white cursor-not-allowed'
                  : 'bg-[#7A9EAA] text-white hover:bg-[#688a95] shadow-sm'
              }`}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Assign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
