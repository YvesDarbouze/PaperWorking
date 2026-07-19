'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  PenTool, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  ArrowRight, 
  History, 
  AlertCircle, 
  FileText, 
  Upload,
  Info,
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import ESignAction from '../shared/ESignAction';

interface CommitmentTransition {
  fromStatus: string | null;
  toStatus: 'pledged' | 'transferred' | 'cleared' | 'soft-committed' | 'docs-out' | 'signed' | 'funds-confirmed';
  timestamp: string;
  actor: string;
  evidence?: string | null;
}

interface Commitment {
  id: string;
  name: string;
  email?: string | null;
  amountCents: number;
  status: 'pledged' | 'transferred' | 'cleared' | 'soft-committed' | 'docs-out' | 'signed' | 'funds-confirmed';
  notes?: string | null;
  createdAt?: string | null;
  transitions?: CommitmentTransition[];
}

interface SubscriptionsTrackerProps {
  projectId: string;
}

export function SubscriptionsTracker({ projectId }: SubscriptionsTrackerProps) {
  const [project, setProject] = useState<any>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Modal / Inputs for confirming manual signature or funds
  const [activeManualSignId, setActiveManualSignId] = useState<string | null>(null);
  const [manualSignEvidence, setManualSignEvidence] = useState('');

  const [activeConfirmFundsId, setActiveConfirmFundsId] = useState<string | null>(null);
  const [confirmFundsEvidence, setConfirmFundsEvidence] = useState('');

  // Expand / collapse transition logs for each commitment
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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
        console.error('[SubscriptionsTracker] Firestore onSnapshot error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  // ── 3. Helper to PATCH commitment status ──
  const transitionCommitmentStatus = useCallback(async (
    cId: string, 
    nextStatus: Commitment['status'], 
    evidence?: string
  ) => {
    setSubmittingId(cId);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/commitments/${cId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          status: nextStatus,
          evidence: evidence || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update commitment status.');
      }

      toast.success(`Commitment transitioned to ${getStatusLabel(nextStatus)}`);
      
      // Close inputs/modals
      setActiveManualSignId(null);
      setManualSignEvidence('');
      setActiveConfirmFundsId(null);
      setConfirmFundsEvidence('');
    } catch (err: any) {
      toast.error(err.message || 'Error occurred during transition.');
    } finally {
      setSubmittingId(null);
    }
  }, [projectId]);

  const getStatusLabel = (status: Commitment['status']) => {
    switch (status) {
      case 'pledged':
      case 'soft-committed':
        return 'Soft-Committed';
      case 'transferred':
      case 'docs-out':
        return 'Docs Out';
      case 'signed':
        return 'Signed';
      case 'cleared':
      case 'funds-confirmed':
        return 'Funds Confirmed';
      default:
        return status;
    }
  };

  const getStatusBadgeStyles = (status: Commitment['status']) => {
    switch (status) {
      case 'pledged':
      case 'soft-committed':
        return { bg: 'bg-[#FFF7ED]', text: 'text-[#C2410C]', border: 'border-[#FED7AA]' };
      case 'transferred':
      case 'docs-out':
        return { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', border: 'border-[#BFDBFE]' };
      case 'signed':
        return { bg: 'bg-[#F5F3FF]', text: 'text-[#6D28D9]', border: 'border-[#DDD6FE]' };
      case 'cleared':
      case 'funds-confirmed':
        return { bg: 'bg-[#ECFDF5]', text: 'text-[#047857]', border: 'border-[#A7F3D0]' };
      default:
        return { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]', border: 'border-[#E5E7EB]' };
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center" style={{ color: 'var(--text-secondary)' }}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Subscription Records...
      </div>
    );
  }

  // Derived metrics
  const totalRaisedCents = commitments
    .filter(c => c.status === 'cleared' || c.status === 'funds-confirmed')
    .reduce((sum, c) => sum + c.amountCents, 0);

  const totalTargetCents = project?.financials?.capitalRaiseTarget 
    ? project.financials.capitalRaiseTarget * 100 
    : 0;

  const progressPercent = totalTargetCents > 0 
    ? Math.min(100, Math.round((totalRaisedCents / totalTargetCents) * 100)) 
    : 0;

  const showDisclosure = commitments.some(c => c.status !== 'signed' && c.status !== 'cleared' && c.status !== 'funds-confirmed');

  return (
    <div 
      className="p-6 rounded-xl border shadow-sm transition-all duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8832ec]" />
            <h3 className="text-[18px] leading-[26px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Subscriptions & Capital Raise
            </h3>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Track and advance commitments from soft-committed to signed agreement and confirmed funds.
          </p>
        </div>

        {/* Raise Modality Status */}
        {project?.capitalPlan && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-[#FAFAF9]" style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}>
            <TrendingUp className="w-4 h-4 text-[#8832ec]" />
            <span>Raise Modality: <strong className="capitalize">{project.capitalPlan}</strong></span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {totalTargetCents > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1.5">
            <span>Capital Confirmed: ${(totalRaisedCents / 100).toLocaleString()}</span>
            <span>Target: ${(totalTargetCents / 100).toLocaleString()} ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#8832ec] to-[#aa6cf5] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Non-Binding Legal Disclosure Warning */}
      {showDisclosure && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Non-Binding Disclosure Notice</span>
            All initial commitments and LOIs are non-binding expressions of interest. Capital contributions are subject to the execution of definitive subscription agreements and off-platform confirmation of funds.
          </div>
        </div>
      )}

      {/* Commitments Table */}
      {commitments.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-lg" style={{ borderColor: 'var(--border-ui)', color: 'var(--text-secondary)' }}>
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No active commitments found for this project.</p>
          <p className="text-xs mt-1">Capital raise commitments can be initialized in the Acquisition phase.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {commitments.map((c) => {
            const styles = getStatusBadgeStyles(c.status);
            const isSubmitting = submittingId === c.id;

            return (
              <div 
                key={c.id} 
                className="p-4 rounded-lg border flex flex-col gap-3 transition-colors hover:bg-gray-50/50"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                {/* Top row: Info & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{c.name}</h4>
                    <p className="text-xs text-gray-500">{c.email || 'No email provided'}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      ${(c.amountCents / 100).toLocaleString()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.bg} ${styles.text} ${styles.border}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>
                </div>

                {/* Pipeline Stepper UI */}
                <div className="w-full flex items-center justify-between py-2 text-[10px] sm:text-xs font-medium text-gray-400">
                  <div className={`flex items-center gap-1.5 ${c.status === 'pledged' || c.status === 'soft-committed' ? 'text-gray-900 font-semibold' : 'text-green-600'}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full border ${c.status !== 'pledged' && c.status !== 'soft-committed' ? 'bg-green-50 border-green-500 text-green-600' : 'border-gray-300'}`}>1</span>
                    <span>Soft-Committed</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                  <div className={`flex items-center gap-1.5 ${(c.status === 'transferred' || c.status === 'docs-out') ? 'text-gray-900 font-semibold' : (['signed', 'cleared', 'funds-confirmed'].includes(c.status) ? 'text-green-600' : 'text-gray-400')}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full border ${['signed', 'cleared', 'funds-confirmed'].includes(c.status) ? 'bg-green-50 border-green-500 text-green-600' : 'border-gray-300'}`}>2</span>
                    <span>Docs Out</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                  <div className={`flex items-center gap-1.5 ${c.status === 'signed' ? 'text-gray-900 font-semibold' : (['cleared', 'funds-confirmed'].includes(c.status) ? 'text-green-600' : 'text-gray-400')}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full border ${['cleared', 'funds-confirmed'].includes(c.status) ? 'bg-green-50 border-green-500 text-green-600' : 'border-gray-300'}`}>3</span>
                    <span>Signed</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                  <div className={`flex items-center gap-1.5 ${c.status === 'cleared' || c.status === 'funds-confirmed' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full border ${c.status === 'cleared' || c.status === 'funds-confirmed' ? 'bg-green-50 border-green-500 text-green-600' : 'border-gray-300'}`}>4</span>
                    <span>Funds Confirmed</span>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 font-semibold">
                  {/* Transition triggers */}
                  <div className="flex flex-wrap gap-2">
                    {/* Stage 1 -> Stage 2 */}
                    {(c.status === 'pledged' || c.status === 'soft-committed') && (
                      <button
                        onClick={() => transitionCommitmentStatus(c.id, 'docs-out', 'Agreement sent for signature')}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8832ec] hover:bg-[#7220d3] disabled:opacity-50 transition"
                      >
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Send Subscription Agreement
                      </button>
                    )}

                    {/* Stage 2 -> Stage 3 (E-Sign and Manual upload) */}
                    {(c.status === 'transferred' || c.status === 'docs-out') && (
                      <>
                        <ESignAction
                          documentName="Subscription Agreement"
                          signeeRole="Fractional Investor"
                          projectId={projectId}
                          documentId={`sub_agreement_${c.id}`}
                          signerEmail={c.email || undefined}
                          signerName={c.name}
                          isSigned={false}
                          onSigned={() => {
                            transitionCommitmentStatus(c.id, 'signed', 'E-Signed via DocuSign');
                          }}
                        />

                        <button
                          onClick={() => setActiveManualSignId(c.id)}
                          disabled={isSubmitting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 hover:bg-gray-100 text-gray-700 disabled:opacity-50 transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Manual Signed Copy
                        </button>
                      </>
                    )}

                    {/* Stage 3 -> Stage 4 */}
                    {c.status === 'signed' && (
                      <button
                        onClick={() => setActiveConfirmFundsId(c.id)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Confirm Funds Received
                      </button>
                    )}

                    {/* Stage 4 complete */}
                    {(c.status === 'cleared' || c.status === 'funds-confirmed') && (
                      <div className="flex items-center text-green-700 text-xs font-semibold bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Funding Active in Capital Stack
                      </div>
                    )}
                  </div>

                  {/* Audit Logs expand trigger */}
                  <button
                    onClick={() => setExpandedLogId(expandedLogId === c.id ? null : c.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
                  >
                    <History className="w-3.5 h-3.5" />
                    {expandedLogId === c.id ? 'Hide Logs' : 'View Audit Log'}
                  </button>
                </div>

                {/* Manual Signed Copy Input Form */}
                {activeManualSignId === c.id && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mt-2 space-y-3">
                    <h5 className="text-xs font-bold text-gray-800">Record Manual Agreement Signature</h5>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Signature details/evidence (e.g., countersigned PDF link or file reference):
                      </label>
                      <input
                        type="text"
                        value={manualSignEvidence}
                        onChange={(e) => setManualSignEvidence(e.target.value)}
                        placeholder="e.g. Countersigned subscription doc uploaded to Data Room"
                        className="w-full text-xs p-2 border rounded bg-white font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setActiveManualSignId(null)}
                        className="px-2.5 py-1 text-xs border rounded hover:bg-gray-100 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => transitionCommitmentStatus(c.id, 'signed', manualSignEvidence || 'Manually signed and uploaded')}
                        disabled={isSubmitting}
                        className="px-3 py-1 text-xs text-white bg-gray-800 rounded hover:bg-gray-900 disabled:opacity-50 font-semibold"
                      >
                        Confirm Signed
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm Funds Input Form */}
                {activeConfirmFundsId === c.id && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mt-2 space-y-3">
                    <h5 className="text-xs font-bold text-gray-800">Confirm Capital Deposit (Off-Platform)</h5>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Payment details/evidence (e.g. Wire transfer ID, bank confirmation):
                      </label>
                      <input
                        type="text"
                        value={confirmFundsEvidence}
                        onChange={(e) => setConfirmFundsEvidence(e.target.value)}
                        placeholder="e.g. Wire reference #W783625 from Chase Bank"
                        className="w-full text-xs p-2 border rounded bg-white font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setActiveConfirmFundsId(null)}
                        className="px-2.5 py-1 text-xs border rounded hover:bg-gray-100 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => transitionCommitmentStatus(c.id, 'funds-confirmed', confirmFundsEvidence || 'Funds confirmed off-platform')}
                        disabled={isSubmitting}
                        className="px-3 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
                      >
                        Confirm Deposit
                      </button>
                    </div>
                  </div>
                )}

                {/* Audit Logs view */}
                {expandedLogId === c.id && (
                  <div className="p-3 rounded-lg border border-gray-100 bg-[#FAFAF9] mt-1.5 space-y-2">
                    <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-gray-600" />
                      <span>Audit Trail History</span>
                    </div>
                    {c.transitions && c.transitions.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {c.transitions.map((t, idx) => (
                          <div key={idx} className="text-[11px] border-l-2 border-gray-300 pl-2 py-0.5 font-medium">
                            <span className="font-semibold text-gray-700 capitalize">
                              {getStatusLabel(t.toStatus)}
                            </span>
                            <span className="text-gray-400 mx-1">·</span>
                            <span className="text-gray-500">
                              {new Date(t.timestamp).toLocaleString()}
                            </span>
                            <p className="text-gray-500 mt-0.5">
                              Actor: <strong className="text-gray-700">{t.actor}</strong>
                              {t.evidence && (
                                <span className="block mt-0.5 text-gray-600 italic bg-white p-1 rounded border border-gray-100">
                                  Evidence: {t.evidence}
                                </span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No transition logs recorded yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SubscriptionsTracker;
