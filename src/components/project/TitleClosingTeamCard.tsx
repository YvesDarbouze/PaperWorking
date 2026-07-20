'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { LoanRecord, F4VendorAssignment } from '@/types/schema';
import { useAttorneyStates } from '@/hooks/useAttorneyStates';
import { isAttorneyCloseState } from '@/lib/config/attorneyStates';
import {
  Users,
  Building2,
  Scale,
  Search,
  Leaf,
  Ruler,
  ShieldCheck,
  Landmark,
  Save,
  Loader2,
  CheckCircle2,
  MapPin,
  ArrowRightLeft,
  Store,
  Pencil,
  X,
  Banknote,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMarketplaceVendors } from '@/hooks/useMarketplaceVendors';

interface Props {
  projectId: string;
}

interface VendorSlot {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  /** Only visible when this predicate returns true */
  visible?: (ctx: SlotContext) => boolean;
  /** If true, this slot was carried forward from an earlier phase */
  carriedFrom?: string;
  /** Contextual badge shown next to the label */
  badge?: (ctx: SlotContext) => string | null;
}

interface SlotContext {
  isSba504: boolean;
  isHardMoneyOrBridge: boolean;
  isAttorneyState: boolean;
  isCommercial: boolean;
  hasLoan: boolean;
  carriedTitleCompany: string | null;
}

const VENDOR_SLOTS: VendorSlot[] = [
  {
    key: 'f4TitleEscrowVendor',
    label: 'Title / Escrow Company',
    icon: <Building2 className="w-4 h-4" />,
    description: 'Handles title search, escrow, and final settlement.',
    carriedFrom: 'Stage 5.5 (Due Diligence)',
    badge: (ctx) => ctx.carriedTitleCompany ? 'Carried from 5.5' : null,
  },
  {
    key: 'f4ClosingAttorneyVendor',
    label: 'Closing Attorney',
    icon: <Scale className="w-4 h-4" />,
    description: 'Attorney involvement is customary or required in this state.',
    visible: (ctx) => ctx.isAttorneyState,
    badge: () => 'Jurisdiction-gated',
  },
  {
    key: 'f4AppraiserVendor',
    label: 'Appraiser',
    icon: <Search className="w-4 h-4" />,
    description: 'Lender-triggered property valuation.',
    visible: (ctx) => ctx.hasLoan,
    badge: () => 'Lender-triggered',
  },
  {
    key: 'f4EnvironmentalVendor',
    label: 'Environmental Consultant',
    icon: <Leaf className="w-4 h-4" />,
    description: 'Phase I ESA and environmental site assessment.',
    visible: (ctx) => ctx.isCommercial,
    badge: () => 'Commercial',
  },
  {
    key: 'f4SurveyorVendor',
    label: 'Surveyor',
    icon: <Ruler className="w-4 h-4" />,
    description: 'Boundary survey, easements, and encroachment review.',
  },
  {
    key: 'f4InsuranceBrokerVendor',
    label: 'Insurance Broker',
    icon: <ShieldCheck className="w-4 h-4" />,
    description: 'Property and hazard insurance binder coordination.',
  },
  {
    key: 'f4CdcVendor',
    label: 'CDC (Certified Development Company)',
    icon: <Landmark className="w-4 h-4" />,
    description: 'SBA 504 debenture underwriter and servicer.',
    visible: (ctx) => ctx.isSba504,
    badge: () => 'SBA 504',
  },
  {
    key: 'f4HardMoneyLenderVendor',
    label: 'Private / Hard-Money Lender',
    icon: <Banknote className="w-4 h-4" />,
    description: 'Asset-based short-term lender for this deal.',
    visible: (ctx) => ctx.isHardMoneyOrBridge,
    badge: () => 'Hard Money / Bridge',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/** Extract name from a slot value which may be a string (legacy) or F4VendorAssignment */
function getAssignmentName(val: string | F4VendorAssignment | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.name || '';
}

function getAssignment(val: string | F4VendorAssignment | null | undefined): F4VendorAssignment | null {
  if (!val) return null;
  if (typeof val === 'string') {
    // Legacy: simple string, treat as off_platform
    return { name: val, source: 'off_platform', assignedAt: '', assignedBy: '' };
  }
  return val;
}

export function TitleClosingTeamCard({ projectId }: Props) {
  const [project, setProject] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);

  // Config-driven attorney state list
  const { states: attorneyStates } = useAttorneyStates();

  // Form state for the slot being edited
  const [formName, setFormName] = useState('');
  const [formFirm, setFormFirm] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSource, setFormSource] = useState<'marketplace' | 'off_platform'>('off_platform');

  const { vendors: marketplaceHits, loading: marketplaceLoading } = useMarketplaceVendors(editingSlot);

  // Listen to project
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) setProject(snap.data());
      setLoading(false);
    });
    return unsub;
  }, [projectId]);

  // Listen to loans
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(
      collection(db, 'projects', projectId, 'loans'),
      (snap) => {
        setLoans(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as LoanRecord[]);
      }
    );
    return unsub;
  }, [projectId]);

  // Compute context
  const ctx: SlotContext = useMemo(() => {
    const financials = project?.financials || {};
    const stateCode = project?.state || '';
    return {
      isSba504: loans.some((l) => l.instrument === 'SBA 504') || !!project?.fundingPlan?.modality?.includes('sba_504'),
      isHardMoneyOrBridge: loans.some((l) => l.instrument === 'Hard Money' || l.instrument === 'Bridge'),
      isAttorneyState: isAttorneyCloseState(stateCode, attorneyStates),
      isCommercial: project?.assetClass === 'Commercial',
      hasLoan: loans.length > 0,
      carriedTitleCompany: financials.titleCompany || project?.titleCompany || null,
    };
  }, [project, loans]);

  const visibleSlots = useMemo(
    () => VENDOR_SLOTS.filter((slot) => !slot.visible || slot.visible(ctx)),
    [ctx]
  );

  // ── Carry-forward: if title/escrow has no value but titleCompany exists, seed it
  useEffect(() => {
    if (!project || !ctx.carriedTitleCompany) return;
    const f = project.financials || {};
    const existingTitle = f.f4TitleEscrowVendor;
    // Only auto-seed if the slot is completely empty
    if (!existingTitle && ctx.carriedTitleCompany) {
      // Don't persist automatically — just show it as pre-filled in the edit form
    }
  }, [project, ctx.carriedTitleCompany]);

  const openEdit = useCallback((slotKey: string) => {
    const f = project?.financials || {};
    const existing = getAssignment(f[slotKey]);

    // Seed from carry-forward for title/escrow
    if (slotKey === 'f4TitleEscrowVendor' && !existing && ctx.carriedTitleCompany) {
      setFormName(ctx.carriedTitleCompany);
      setFormFirm(ctx.carriedTitleCompany);
      setFormSource('off_platform');
    } else if (existing) {
      setFormName(existing.name || '');
      setFormFirm(existing.firm || '');
      setFormPhone(existing.phone || '');
      setFormEmail(existing.email || '');
      setFormSource(existing.source === 'marketplace' ? 'marketplace' : 'off_platform');
    } else {
      setFormName('');
      setFormFirm('');
      setFormPhone('');
      setFormEmail('');
      setFormSource('off_platform');
    }
    setEditingSlot(slotKey);
  }, [project, ctx.carriedTitleCompany]);

  const handleSave = async () => {
    if (!editingSlot) return;
    if (!formName.trim()) {
      toast.error('Vendor name is required.');
      return;
    }

    setSaving(editingSlot);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication required.');

      const assignment = {
        name: formName.trim(),
        firm: formFirm.trim() || null,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        source: editingSlot === 'f4TitleEscrowVendor' && ctx.carriedTitleCompany && formName.trim() === ctx.carriedTitleCompany
          ? 'carried_forward'
          : formSource,
      };

      const res = await fetch(`/api/projects/${projectId}/team-slots`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ slotKey: editingSlot, assignment }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save.');
      }

      toast.success('Vendor assigned.');
      setEditingSlot(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save vendor.');
    } finally {
      setSaving(null);
    }
  };

  const handleClear = async (slotKey: string) => {
    setSaving(slotKey);
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
        body: JSON.stringify({ slotKey, assignment: null }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to clear.');
      }

      toast.success('Vendor cleared.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear vendor.');
    } finally {
      setSaving(null);
    }
  };

  const financials = project?.financials || {};
  const filledCount = visibleSlots.filter(
    (s) => !!getAssignmentName(financials[s.key])
  ).length;

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[150px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A9EAA] mb-2" />
        <span className="text-xs text-pw-muted font-light uppercase tracking-wider">Loading Team Slots...</span>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-pw-border pb-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#7A9EAA]" />
            Title &amp; Closing Team
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            Assign vendors for this deal&apos;s title, closing, and professional services.
            Each slot appears when the expertise is needed.
          </p>
        </div>
        <span className="text-[10px] font-bold text-pw-muted uppercase tracking-wider">
          {filledCount}/{visibleSlots.length} assigned
        </span>
      </div>

      {/* Vendor Slots */}
      <div className="space-y-3">
        {visibleSlots.map((slot) => {
          const rawValue = financials[slot.key];
          const assignment = getAssignment(rawValue);
          const isFilled = !!assignment?.name;
          const isSavingThis = saving === slot.key;
          const isEditing = editingSlot === slot.key;
          const badge = slot.badge?.(ctx);

          // Carry-forward hint
          const isCarryable = slot.key === 'f4TitleEscrowVendor' && !isFilled && ctx.carriedTitleCompany;

          return (
            <div
              key={slot.key}
              className={`border rounded-lg transition-all ${
                isFilled ? 'border-green-200 bg-green-50/30' : 'border-pw-border'
              }`}
            >
              {/* Slot Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isFilled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isFilled ? <CheckCircle2 className="w-4 h-4" /> : slot.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <label className="text-xs font-bold text-pw-black uppercase tracking-wider">
                          {slot.label}
                        </label>
                        {badge && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-pw-muted leading-relaxed">
                        {slot.description}
                      </p>

                      {/* Filled — show assignment */}
                      {isFilled && !isEditing && (
                        <div className="mt-2 p-2.5 rounded bg-white border border-pw-border flex items-center justify-between gap-3">
                          <div className="text-xs space-y-0.5">
                            <strong className="text-pw-black font-semibold block">
                              {assignment!.name}
                            </strong>
                            {assignment!.firm && (
                              <span className="text-pw-muted">{assignment!.firm}</span>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              {assignment!.phone && (
                                <span className="text-pw-muted">{assignment!.phone}</span>
                              )}
                              {assignment!.email && (
                                <span className="text-pw-muted">{assignment!.email}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {assignment!.source === 'marketplace' && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-bold uppercase">
                                  <Store className="w-2.5 h-2.5" />
                                  Marketplace
                                </span>
                              )}
                              {assignment!.source === 'off_platform' && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-bold uppercase">
                                  <MapPin className="w-2.5 h-2.5" />
                                  Off-platform
                                </span>
                              )}
                              {assignment!.source === 'carried_forward' && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-bold uppercase">
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  Carried from 5.5
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(slot.key)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-all text-pw-muted"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleClear(slot.key)}
                              disabled={isSavingThis}
                              className="p-1.5 rounded hover:bg-red-50 transition-all text-pw-muted hover:text-red-500"
                              title="Clear"
                            >
                              {isSavingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Empty — show assign button or carry-forward hint */}
                      {!isFilled && !isEditing && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => openEdit(slot.key)}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#7A9EAA] text-[#7A9EAA] rounded hover:bg-[#7A9EAA]/5 transition-all"
                          >
                            Assign Vendor
                          </button>
                          {isCarryable && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600">
                              <Info className="w-3 h-3" />
                              &ldquo;{ctx.carriedTitleCompany}&rdquo; available from Stage 5.5
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline Edit Form */}
              {isEditing && (
                <div className="border-t border-pw-border p-4 bg-gray-50/50 space-y-3 animate-in fade-in duration-150">
                  {/* Source Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFormSource('off_platform')}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all flex items-center gap-1 ${
                        formSource === 'off_platform'
                          ? 'border-[#7A9EAA] bg-[#7A9EAA]/10 text-[#7A9EAA]'
                          : 'border-pw-border text-pw-muted hover:border-gray-300'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      Off-Platform
                    </button>
                    <button
                      onClick={() => setFormSource('marketplace')}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all flex items-center gap-1 ${
                        formSource === 'marketplace'
                          ? 'border-purple-500 bg-purple-50 text-purple-600'
                          : 'border-pw-border text-pw-muted hover:border-gray-300'
                      }`}
                    >
                      <Store className="w-3 h-3" />
                      Marketplace
                    </button>
                  </div>

                  {formSource === 'marketplace' ? (
                    <div className="space-y-3 pt-2">
                      {marketplaceLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-[#7A9EAA]" />
                        </div>
                      ) : marketplaceHits.length === 0 ? (
                        <p className="text-[11px] text-pw-muted font-light italic">
                          No matching verified marketplace pros available in this category. You can register an off-platform vendor manually using the option above.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {marketplaceHits.map((hit) => (
                            <div 
                              key={hit.uid}
                              className="p-3 bg-white border border-pw-border rounded-lg flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <strong className="text-pw-black font-semibold">{hit.companyName}</strong>
                                <div className="flex items-center gap-3 text-[10px] text-pw-muted">
                                  <span>Turnaround: {hit.avgTurnaroundDays} days</span>
                                  <span>Rating: {hit.overallRating}★ ({hit.totalReviews})</span>
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  setSaving(slot.key);
                                  try {
                                    const auth = getAuth();
                                    const idToken = await auth.currentUser?.getIdToken();
                                    if (!idToken) throw new Error('Authentication required.');
                                    const assignment = {
                                      name: hit.companyName,
                                      firm: hit.companyName,
                                      phone: null,
                                      email: null,
                                      source: 'marketplace',
                                      marketplaceVendorId: hit.uid,
                                    };
                                    const res = await fetch(`/api/projects/${projectId}/team-slots`, {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${idToken}`,
                                      },
                                      body: JSON.stringify({ slotKey: slot.key, assignment }),
                                    });
                                    if (!res.ok) {
                                      const errData = await res.json();
                                      throw new Error(errData.error || 'Failed to save.');
                                    }
                                    toast.success('Marketplace vendor assigned.');
                                    setEditingSlot(null);
                                  } catch (err: any) {
                                    toast.error(err.message || 'Failed to save vendor.');
                                  } finally {
                                    setSaving(null);
                                  }
                                }}
                                disabled={saving === slot.key}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] uppercase font-bold tracking-wider transition-all"
                              >
                                Select &amp; Assign
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setEditingSlot(null)}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-pw-border text-pw-muted rounded hover:bg-gray-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
                            Contact Name *
                          </label>
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
                          <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
                            Firm / Company
                          </label>
                          <input
                            type="text"
                            value={formFirm}
                            onChange={(e) => setFormFirm(e.target.value)}
                            placeholder="Company name"
                            className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            placeholder="(555) 555-1234"
                            className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="vendor@example.com"
                            className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingSlot(null)}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E5E7EB] text-pw-muted rounded hover:bg-gray-50 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving === editingSlot || !formName.trim()}
                          className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-all ${
                            saving === editingSlot || !formName.trim()
                              ? 'bg-gray-300 text-white cursor-not-allowed'
                              : 'bg-[#7A9EAA] text-white hover:bg-[#688a95] shadow-sm'
                          }`}
                        >
                          {saving === editingSlot ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Assign
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context notes */}
      {ctx.isAttorneyState && (
        <div className="flex items-start gap-2.5 p-3 rounded bg-blue-50 text-blue-900 border border-blue-200 text-xs">
          <Scale className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Attorney State</span>
            {project?.state?.toUpperCase()} requires or customarily involves an attorney at closing.
            The Closing Attorney slot is active for this deal.
          </div>
        </div>
      )}

      {ctx.isSba504 && (
        <div className="flex items-start gap-2.5 p-3 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs">
          <Landmark className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">CDC Slot Active</span>
            SBA 504 financing route detected — the Certified Development Company (CDC) vendor slot
            is visible for this deal.
          </div>
        </div>
      )}
    </div>
  );
}
