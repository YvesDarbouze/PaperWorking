'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Edit3, Shield, UserPlus, Info, Check, X, Lock, Unlock, Eye, Sparkles, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useUserStore } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import type { EquityParty, PhasePermission } from '@/types/schema';
import SyndicationCapTable from './SyndicationCapTable';

interface Props {
  projectId: string;
  refresh: () => void;
}

export function EquityPartiesCard({ projectId, refresh }: Props) {
  const { user: authUser } = useAuth();
  const currentProject = useProjectStore(s => s.projects.find(p => p.id === projectId));
  const orgTeamMembers = useUserStore(s => s.teamMembers || []);

  const [parties, setParties] = useState<EquityParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'captable'>('roster');

  // Form modals / state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Partial<EquityParty> | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'GP' | 'LP' | 'co_buyer'>('LP');
  const [formEntityType, setFormEntityType] = useState<'Individual' | 'LLC' | 'Other'>('Individual');
  const [formOwnershipPct, setFormOwnershipPct] = useState<number>(0);
  const [formGpCoInvest, setFormGpCoInvest] = useState<string>('0');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>('');

  // Per-phase permissions
  const [phasePerms, setPhasePerms] = useState<Record<string, PhasePermission>>({
    'phase-1': { canView: true, canEdit: false },
    'phase-2': { canView: true, canEdit: false },
    'phase-3': { canView: false, canEdit: false },
    'phase-4': { canView: false, canEdit: false },
  });

  const isSyndicated = currentProject?.fundingPlan?.modality?.includes('syndication_equity') ||
                       (currentProject?.financials?.financingType as any) === 'Syndicated';

  const fetchParties = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/equity-parties`);
      const data = await res.json();
      if (data.success) {
        setParties(data.equityParties || []);
      } else {
        toast.error(data.error || 'Failed to fetch parties');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error fetching parties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [projectId]);

  // Handle Team member selection and auto-populate
  useEffect(() => {
    if (selectedTeamMemberId) {
      const match = orgTeamMembers.find(m => m.id === selectedTeamMemberId);
      if (match) {
        setFormName(match.displayName || '');
        setFormEmail(match.email || '');
      }
    }
  }, [selectedTeamMemberId]);

  // Check if entered email matches any team member to automatically link
  useEffect(() => {
    if (formEmail && !selectedTeamMemberId) {
      const match = orgTeamMembers.find(m => m.email.toLowerCase() === formEmail.toLowerCase());
      if (match) {
        setSelectedTeamMemberId(match.id);
      }
    }
  }, [formEmail]);

  const openAddModal = () => {
    setEditingParty(null);
    setFormName('');
    setFormEmail('');
    setFormRole(isSyndicated ? 'LP' : 'co_buyer');
    setFormEntityType('Individual');
    setFormOwnershipPct(0);
    setFormGpCoInvest('0');
    setSelectedTeamMemberId('');
    setPhasePerms({
      'phase-1': { canView: true, canEdit: false },
      'phase-2': { canView: true, canEdit: false },
      'phase-3': { canView: false, canEdit: false },
      'phase-4': { canView: false, canEdit: false },
    });
    setShowFormModal(true);
  };

  const openEditModal = (p: EquityParty) => {
    setEditingParty(p);
    setFormName(p.name);
    setFormEmail(p.email || '');
    setFormRole(p.role);
    setFormEntityType(p.entityType);
    setFormOwnershipPct(p.ownershipPct);
    setSelectedTeamMemberId(p.memberId || '');
    setPhasePerms(p.phasePermissions || {
      'phase-1': { canView: true, canEdit: false },
      'phase-2': { canView: true, canEdit: false },
      'phase-3': { canView: false, canEdit: false },
      'phase-4': { canView: false, canEdit: false },
    });

    if (p.role === 'GP') {
      const gpSource = currentProject?.financials?.capitalStack?.find(
        s => s.category === 'GP Co-investment'
      );
      setFormGpCoInvest(String(gpSource?.amount || 0));
    }

    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await authUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const isLinked = !!selectedTeamMemberId || orgTeamMembers.some(m => m.email.toLowerCase() === formEmail.toLowerCase());
      const payload: Partial<EquityParty> = {
        id: editingParty?.id,
        role: formRole,
        name: formName,
        email: formEmail || null,
        entityType: formEntityType,
        memberId: selectedTeamMemberId || null,
        ownershipPct: formOwnershipPct,
        phasePermissions: isLinked ? phasePerms : undefined,
      };

      const res = await fetch(`/api/projects/${projectId}/equity-parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          party: payload,
          gpCoInvestAmount: formRole === 'GP' ? parseFloat(formGpCoInvest) || 0 : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Roster saved successfully');
        setShowFormModal(false);
        fetchParties();
        refresh();
      } else {
        toast.error(data.error || 'Failed to save roster');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error saving roster');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (partyId: string) => {
    if (!confirm('Are you sure you want to remove this party from the roster?')) return;

    try {
      const idToken = await authUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const res = await fetch(`/api/projects/${projectId}/equity-parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          partyId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Party removed');
        fetchParties();
        refresh();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error deleting party');
    }
  };

  const togglePhasePerm = (phase: string, key: 'canView' | 'canEdit') => {
    setPhasePerms(prev => {
      const updated = { ...prev };
      const current = updated[phase] || { canView: false, canEdit: false };
      
      if (key === 'canView') {
        const nextView = !current.canView;
        updated[phase] = {
          canView: nextView,
          canEdit: nextView ? current.canEdit : false // Edit requires view access
        };
      } else {
        const nextEdit = !current.canEdit;
        updated[phase] = {
          canView: nextEdit ? true : current.canView, // Edit implies view access
          canEdit: nextEdit
        };
      }
      return updated;
    });
  };

  const getLinkedMemberName = (party: EquityParty) => {
    if (!party.memberId && !party.email) return null;
    const match = orgTeamMembers.find(
      m => m.id === party.memberId || m.email.toLowerCase() === party.email?.toLowerCase()
    );
    return match ? match.displayName : null;
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-white/50">
        <Info className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading Roster...</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden text-left">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#7A9EAA]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Equity Party Roster
            </h3>
            <p className="text-[10px] text-[#9E9DA0]">
              Define equity stakeholders, ownership splits, and platform dashboard access.
            </p>
          </div>
        </div>

        {activeTab === 'roster' && (
          <button
            onClick={openAddModal}
            className="pw-interactive px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-[#7A9EAA] hover:bg-[#688a95] rounded-xl flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Stakeholder
          </button>
        )}
      </div>

      {isSyndicated && (
        <div className="flex border-b border-white/5 bg-white/[0.01] px-6 py-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${
              activeTab === 'roster'
                ? 'text-[#7A9EAA] border-b-2 border-[#7A9EAA]'
                : 'text-[#9E9DA0] hover:text-white'
            }`}
          >
            Roster Manager
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('captable')}
            className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${
              activeTab === 'captable'
                ? 'text-[#7A9EAA] border-b-2 border-[#7A9EAA]'
                : 'text-[#9E9DA0] hover:text-white'
            }`}
          >
            Cap Table
          </button>
        </div>
      )}

      {activeTab === 'captable' && isSyndicated ? (
        <div className="p-6">
          {currentProject && (
            <SyndicationCapTable
              projectId={projectId}
              project={currentProject}
              parties={parties}
            />
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {parties.length === 0 ? (
            <div className="p-8 text-center text-[#9E9DA0]">
              <Info className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No equity parties defined.</p>
              <p className="text-[10px] mt-1 font-light">Add co-buyers or partnership LP/GP details to establish the roster.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-white">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-[#9E9DA0] uppercase font-bold tracking-wider text-[9px]">
                  <th className="px-6 py-3">Stakeholder</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Entity Type</th>
                  <th className="px-6 py-3">Ownership</th>
                  <th className="px-6 py-3">Access / Linkage</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {parties.map((p) => {
                  const linkedName = getLinkedMemberName(p);
                  const isLinked = !!linkedName;

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] text-[#9E9DA0]">{p.email || 'No email provided'}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wider ${
                          p.role === 'GP'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : p.role === 'LP'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {p.role === 'GP' ? 'General Partner' : p.role === 'LP' ? 'Limited Partner' : 'Co-Buyer'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[#9E9DA0]">
                        {p.entityType}
                      </td>
                      <td className="px-6 py-3 font-mono font-bold text-white">
                        {(p.ownershipPct ?? 0).toFixed(2)}%
                      </td>
                      <td className="px-6 py-3">
                        {isLinked ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#047857] uppercase tracking-wider">
                              <Sparkles className="w-3 h-3 text-[#047857] shrink-0" />
                              Platform User ({linkedName})
                            </span>
                            <span className="text-[9px] text-[#9E9DA0]">
                              Access: {Object.entries(p.phasePermissions || {})
                                .filter(([_, perms]) => perms.canView)
                                .map(([ph]) => ph.replace('phase-', 'Phase '))
                                .join(', ') || 'None'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider">
                            Off-Platform (No Access)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="pw-interactive p-1.5 rounded-lg border border-white/5 text-[#9E9DA0] hover:text-white hover:bg-white/[0.05]"
                            title="Edit stakeholder"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="pw-interactive p-1.5 rounded-lg border border-white/5 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            title="Remove stakeholder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl border border-white/10 bg-[#0E1012] w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7A9EAA]" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingParty ? 'Edit Stakeholder' : 'Add Stakeholder'}
                </h4>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-[#9E9DA0] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Optional selector to link to an existing Investment Team member */}
              {!editingParty && orgTeamMembers.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">
                    Link to Investment Team Member
                  </label>
                  <select
                    value={selectedTeamMemberId}
                    onChange={(e) => setSelectedTeamMemberId(e.target.value)}
                    className="w-full bg-[#121416] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A9EAA]"
                  >
                    <option value="">-- Choose to auto-populate & link --</option>
                    {orgTeamMembers
                      .filter(m => m.status !== 'removed')
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.email})
                        </option>
                      ))}
                  </select>
                  <p className="text-[9px] text-[#9E9DA0] mt-1">
                    Linking enables per-phase access control dashboard gating.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Stakeholder Name"
                    className="w-full bg-[#121416] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7A9EAA]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-[#121416] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7A9EAA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full bg-[#121416] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A9EAA]"
                  >
                    {isSyndicated ? (
                      <>
                        <option value="LP">Limited Partner (LP)</option>
                        <option value="GP">General Partner (GP)</option>
                      </>
                    ) : (
                      <option value="co_buyer">Co-Buyer</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">
                    Entity Type
                  </label>
                  <select
                    value={formEntityType}
                    onChange={(e) => setFormEntityType(e.target.value as any)}
                    className="w-full bg-[#121416] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A9EAA]"
                  >
                    <option value="Individual">Individual</option>
                    <option value="LLC">LLC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">
                    Ownership Share
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formOwnershipPct}
                      onChange={(e) => setFormOwnershipPct(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121416] border border-white/5 rounded-xl pl-3 pr-6 py-2 text-xs text-white focus:outline-none focus:border-[#7A9EAA]"
                    />
                    <span className="absolute right-3 top-2 text-[#9E9DA0] text-xs">%</span>
                  </div>
                </div>
              </div>

              {formRole === 'GP' && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                    <Info className="w-4 h-4" />
                    <span>General Partner Settings</span>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">
                      GP Co-investment Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-[#9E9DA0] text-xs">$</span>
                      <input
                        type="number"
                        value={formGpCoInvest}
                        onChange={(e) => setFormGpCoInvest(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#121416] border border-white/5 rounded-xl pl-6 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A9EAA]"
                      />
                    </div>
                    <p className="text-[9px] text-[#9E9DA0] mt-1">
                      This co-investment automatically maps to a distinct capital source in the deal funding stack.
                    </p>
                  </div>
                </div>
              )}

              {/* Phase permissions (Visible only for platform linked users) */}
              {(!!selectedTeamMemberId || orgTeamMembers.some(m => m.email.toLowerCase() === formEmail.toLowerCase())) && (
                <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-4">
                  <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">
                    Per-Phase Access Permissions
                  </label>
                  
                  <div className="space-y-2 text-xs">
                    {Object.keys(phasePerms).map((ph) => {
                      const label = ph === 'phase-1' ? 'Phase 1: Acquisition' : ph === 'phase-2' ? 'Phase 2: Fund' : ph === 'phase-3' ? 'Phase 3: Hold' : 'Phase 4: Exit';
                      const { canView, canEdit } = phasePerms[ph];
                      
                      return (
                        <div key={ph} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                          <span className="font-semibold text-white">{label}</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => togglePhasePerm(ph, 'canView')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                                canView
                                  ? 'bg-[#7A9EAA]/15 text-[#7A9EAA] border border-[#7A9EAA]/25'
                                  : 'bg-[#121416] text-[#9E9DA0] border border-white/5 hover:bg-white/5'
                              }`}
                            >
                              {canView ? <Eye className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePhasePerm(ph, 'canEdit')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                                canEdit
                                  ? 'bg-[#047857]/15 text-[#047857] border border-[#047857]/25'
                                  : 'bg-[#121416] text-[#9E9DA0] border border-white/5 hover:bg-white/5'
                              }`}
                            >
                              {canEdit ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-[#7A9EAA] hover:bg-[#688a95] disabled:opacity-50 rounded-xl flex items-center gap-1.5"
                >
                  {submitting ? 'Saving...' : 'Save Stakeholder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
