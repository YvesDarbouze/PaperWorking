'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, doc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { uploadFile } from '@/lib/storage/uploadService';
import type { Commitment, CommitmentStatus, CapitalPartyType } from '@/types/schema';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  AlertCircle, 
  FileText, 
  Loader2, 
  X,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

export function ContributionLedger({ projectId }: Props) {
  const [project, setProject] = useState<any>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeCommitment, setActiveCommitment] = useState<Commitment | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPartyType, setFormPartyType] = useState<CapitalPartyType>('Investor');
  const [formStatus, setFormStatus] = useState<CommitmentStatus>('pledged');
  const [formNotes, setFormNotes] = useState('');
  const [formEvidence, setFormEvidence] = useState('');

  // ── 1. Listen to Project details ──
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        setProject(snap.data());
      }
    });
    return unsub;
  }, [projectId]);

  // ── 2. Listen to Commitments subcollection ──
  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_commitments_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            setCommitments(JSON.parse(val));
          } else {
            setCommitments([]);
          }
          setLoading(false);
        } catch (e) {
          console.error(e);
        }
      };
      load();
      window.addEventListener('storage', (e) => {
        if (e.key === key) load();
      });
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'commitments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
        })) as Commitment[];
        setCommitments(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[ContributionLedger] Firestore onSnapshot error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  // Rollups & Calculations
  const raiseTarget = project?.financials?.capitalRaiseTarget || 0;
  const totalCommitted = commitments.reduce((sum, c) => sum + ((c.amountCents ?? 0) / 100), 0);
  const totalConfirmed = commitments.reduce((sum, c) => {
    const isFunded = c.status === 'funds-confirmed' || c.status === 'cleared';
    return sum + (isFunded ? ((c.amountCents ?? 0) / 100) : 0);
  }, 0);

  const committedPercent = raiseTarget > 0 ? Math.min(100, Math.round((totalCommitted / raiseTarget) * 100)) : 0;
  const confirmedPercent = raiseTarget > 0 ? Math.min(100, Math.round((totalConfirmed / raiseTarget) * 100)) : 0;

  // ── Actions ──
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Name is required.');
      return;
    }
    const cents = Math.round(parseFloat(formAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error('Amount must be positive.');
      return;
    }

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/commitments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || null,
          amountCents: cents,
          partyType: formPartyType,
          status: formStatus,
          notes: formNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create contribution record.');
      }

      toast.success('Contribution record added successfully.');
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Error creating contribution record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommitment) return;
    if (!formName.trim()) {
      toast.error('Name is required.');
      return;
    }
    const cents = Math.round(parseFloat(formAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error('Amount must be positive.');
      return;
    }

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/commitments/${activeCommitment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || null,
          amountCents: cents,
          partyType: formPartyType,
          status: formStatus,
          notes: formNotes.trim() || null,
          evidence: formEvidence.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update contribution record.');
      }

      toast.success('Contribution record updated.');
      setShowEditModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Error updating contribution record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cId: string) => {
    if (!window.confirm('Are you sure you want to delete this contribution record?')) return;

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/commitments/${cId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete contribution record.');
      }

      toast.success('Contribution record removed.');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting contribution record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');
      
      toast.loading('Generating Capital Stack Statement PDF...', { id: 'pdf-export' });

      const response = await fetch(`/api/projects/${projectId}/capital-stack/export`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!response.ok) throw new Error('Failed to generate PDF statement.');
      
      const blob = await response.blob();
      
      const address = (project?.address || projectId)
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 60);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `capital-stack-statement-${address}-${dateStr}.pdf`;

      // Trigger local browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Upload generated PDF to project Files
      try {
        const file = new File([blob], filename, { type: 'application/pdf' });
        const uploadRes = await uploadFile({
          file,
          path: 'documents',
          projectId,
        });

        await addDoc(collection(db, 'projects', projectId, 'documents'), {
          category: 'Other',
          fileName: filename,
          fileUrl: uploadRes.downloadUrl,
          storagePath: uploadRes.storagePath,
          fileSize: file.size,
          mimeType: file.type,
          uploadedByUid: user?.uid || 'system',
          uploadedByName: user?.displayName || 'Sponsor',
          uploadedAt: new Date().toISOString(),
          notes: 'Capital Stack Statement (System Generated)',
        });

        toast.success('Capital Stack Statement PDF exported and saved to Project Files.', { id: 'pdf-export' });
      } catch (uploadErr) {
        console.error('[ContributionLedger] Failed to save statement to Project Files Storage:', uploadErr);
        toast.success('Capital Stack Statement PDF exported successfully (offline/project files skip).', { id: 'pdf-export' });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to export statement.', { id: 'pdf-export' });
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormAmount('');
    setFormPartyType('Investor');
    setFormStatus('pledged');
    setFormNotes('');
    setFormEvidence('');
    setActiveCommitment(null);
  };

  const openEdit = (c: Commitment) => {
    setActiveCommitment(c);
    setFormName(c.name);
    setFormEmail(c.email || '');
    setFormAmount(String((c.amountCents ?? 0) / 100));
    setFormPartyType(c.partyType || 'Investor');
    setFormStatus(c.status);
    setFormNotes(c.notes || '');
    const lastTransition = c.transitions && c.transitions.length > 0 ? c.transitions[c.transitions.length - 1] : null;
    setFormEvidence(lastTransition?.evidence || '');
    setShowEditModal(true);
  };

  const getStatusBadgeStyles = (status: CommitmentStatus) => {
    switch (status) {
      case 'pledged':
      case 'soft-committed':
        return 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]';
      case 'transferred':
      case 'docs-out':
        return 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]';
      case 'signed':
        return 'bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]';
      case 'cleared':
      case 'funds-confirmed':
        return 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A9EAA] mb-2" />
        <span className="text-xs text-pw-muted font-light uppercase tracking-wider">Loading Contribution Ledger...</span>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between border-b border-pw-border bg-pw-bg/50">
        <div>
          <h2 className="text-[18px] leading-[24px] font-semibold text-pw-black flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7A9EAA]" />
            Contribution Ledger & Capital Stack
          </h2>
          <p className="text-xs text-pw-muted font-light mt-0.5">
            Equity rollups driving capital stack funded bar and investor ownership allocation.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button 
            onClick={handleExportPDF}
            className="pw-interactive px-3 py-1.5 border border-pw-border text-xs font-semibold uppercase tracking-wider text-pw-black bg-pw-white hover:bg-pw-bg flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Statement PDF
          </button>
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="pw-interactive px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-pw-white bg-[#7A9EAA] hover:bg-[#688a95] flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Visual Funded Progress Bar */}
      <div className="p-6 border-b border-pw-border bg-pw-bg/20">
        <div className="flex justify-between items-center text-xs font-semibold text-pw-black mb-2">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#7A9EAA] rounded-full inline-block" />
              Confirmed: ${totalConfirmed.toLocaleString()} ({confirmedPercent}%)
            </span>
            <span className="flex items-center gap-1 text-pw-muted">
              <span className="w-2.5 h-2.5 bg-[#7A9EAA]/40 rounded-full inline-block border border-dashed border-[#7A9EAA]/60" />
              Committed: ${totalCommitted.toLocaleString()} ({committedPercent}%)
            </span>
          </div>
          <span className="text-pw-muted">Target Raise: ${raiseTarget.toLocaleString()}</span>
        </div>

        {/* Custom Progress bar */}
        <div className="w-full h-3.5 bg-pw-black/10 rounded-full overflow-hidden relative">
          {/* Shaded/Striped Committed Bar */}
          <div 
            className="absolute left-0 top-0 h-full bg-[#7A9EAA]/30 transition-all duration-500 rounded-full"
            style={{ width: `${committedPercent}%` }}
          />
          {/* Solid Confirmed Bar */}
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#7A9EAA] to-[#60828f] transition-all duration-500 rounded-full"
            style={{ width: `${confirmedPercent}%` }}
          />
        </div>
      </div>

      {/* Table view */}
      {commitments.length === 0 ? (
        <div className="p-8 text-center text-pw-muted">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-pw-muted" />
          <p className="text-sm font-medium">No contribution records configured.</p>
          <p className="text-xs mt-1 font-light">Add Sponsor or Investor capital records using the action above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-pw-border bg-pw-bg/30 text-pw-muted uppercase font-bold tracking-wider">
                <th className="px-6 py-3">Party Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Committed</th>
                <th className="px-6 py-3 text-right">Confirmed</th>
                <th className="px-6 py-3 text-right">Equity %</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pw-border text-pw-black">
              {commitments.map((c) => {
                const isFunded = c.status === 'funds-confirmed' || c.status === 'cleared';
                const commVal = (c.amountCents ?? 0) / 100;
                const confVal = isFunded ? commVal : 0;
                const eqPct = raiseTarget > 0 ? (commVal / raiseTarget) * 100 : 0;

                return (
                  <tr key={c.id} className="hover:bg-pw-bg/10 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-[10px] text-pw-muted font-light">{c.email || 'No email configured'}</div>
                    </td>
                    <td className="px-6 py-3 font-medium text-pw-muted">
                      {c.partyType || 'Investor'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-medium tracking-wide ${getStatusBadgeStyles(c.status)}`}>
                        {c.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      ${commVal.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-[#047857]">
                      {isFunded ? `$${confVal.toLocaleString()}` : '$0.00'}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-pw-muted">
                      {eqPct.toFixed(2)}%
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => openEdit(c)}
                          className="p-1 hover:text-[#7A9EAA] hover:bg-pw-bg rounded"
                          title="Edit Record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="p-1 hover:text-red-600 hover:bg-pw-bg rounded"
                          title="Delete Record"
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
        </div>
      )}

      {/* Modal Add */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pw-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-6 bg-pw-white border border-pw-border space-y-4">
            <div className="flex justify-between items-center border-b border-pw-border pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-pw-black">
                Add Contribution Record
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-pw-muted hover:text-pw-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Party Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  required
                  placeholder="e.g. Apex Sponsor Equity"
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Email (Optional)</label>
                <input 
                  type="email" 
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)} 
                  placeholder="e.g. sponsor@apexcapital.io"
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Role / Party Type</label>
                  <select 
                    value={formPartyType} 
                    onChange={(e) => setFormPartyType(e.target.value as CapitalPartyType)}
                    className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                  >
                    <option value="Investor">Investor</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="Co-GP">Co-GP</option>
                    <option value="Preferred Equity">Preferred Equity</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Initial Status</label>
                  <select 
                    value={formStatus} 
                    onChange={(e) => setFormStatus(e.target.value as CommitmentStatus)}
                    className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                  >
                    <option value="pledged">Pledged</option>
                    <option value="soft-committed">Soft Committed</option>
                    <option value="docs-out">Docs Out</option>
                    <option value="signed">Signed</option>
                    <option value="funds-confirmed">Funds Confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Committed Amount ($ USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formAmount} 
                  onChange={(e) => setFormAmount(e.target.value)} 
                  required
                  placeholder="e.g. 50000"
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded font-medium"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Notes (Optional)</label>
                <textarea 
                  value={formNotes} 
                  onChange={(e) => setFormNotes(e.target.value)} 
                  rows={2}
                  placeholder="Additional context/evidence description..."
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pw-border">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-pw-border text-pw-black hover:bg-pw-bg uppercase font-bold tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-3 py-1.5 text-pw-white bg-[#7A9EAA] hover:bg-[#688a95] uppercase font-bold tracking-wider flex items-center gap-1"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditModal && activeCommitment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pw-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-6 bg-pw-white border border-pw-border space-y-4">
            <div className="flex justify-between items-center border-b border-pw-border pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-pw-black">
                Edit Contribution Record
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-pw-muted hover:text-pw-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Party Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  required
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Email</label>
                <input 
                  type="email" 
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)} 
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Role / Party Type</label>
                  <select 
                    value={formPartyType} 
                    onChange={(e) => setFormPartyType(e.target.value as CapitalPartyType)}
                    className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                  >
                    <option value="Investor">Investor</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="Co-GP">Co-GP</option>
                    <option value="Preferred Equity">Preferred Equity</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Status</label>
                  <select 
                    value={formStatus} 
                    onChange={(e) => setFormStatus(e.target.value as CommitmentStatus)}
                    className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                  >
                    <option value="pledged">Pledged</option>
                    <option value="soft-committed">Soft Committed</option>
                    <option value="docs-out">Docs Out</option>
                    <option value="signed">Signed</option>
                    <option value="funds-confirmed">Funds Confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Committed Amount ($ USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formAmount} 
                  onChange={(e) => setFormAmount(e.target.value)} 
                  required
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded font-medium"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Evidence (e.g. Wire Reference)</label>
                <input 
                  type="text" 
                  value={formEvidence} 
                  onChange={(e) => setFormEvidence(e.target.value)} 
                  placeholder="Reference/confirmation number for signed/funded steps..."
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 uppercase tracking-wider text-pw-muted">Notes (Optional)</label>
                <textarea 
                  value={formNotes} 
                  onChange={(e) => setFormNotes(e.target.value)} 
                  rows={2}
                  className="w-full p-2 border border-pw-border bg-pw-white focus:outline-none focus:border-[#7A9EAA] text-pw-black rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pw-border">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 border border-pw-border text-pw-black hover:bg-pw-bg uppercase font-bold tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-3 py-1.5 text-pw-white bg-[#7A9EAA] hover:bg-[#688a95] uppercase font-bold tracking-wider flex items-center gap-1"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
