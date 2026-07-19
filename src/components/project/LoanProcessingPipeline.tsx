'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { LoanStatus, LoanRecord } from '@/types/schema';
import { 
  Check, 
  Loader2, 
  AlertCircle, 
  FileText, 
  Upload, 
  ExternalLink,
  DollarSign,
  TrendingDown,
  Building,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

const STATUSES: { id: LoanStatus; label: string; desc: string }[] = [
  { id: 'Application-Submitted', label: 'Application Submitted', desc: 'Loan application package sent to the lender.' },
  { id: 'Processing', label: 'Processing', desc: 'Lender processor reviews file and gathers credit logs.' },
  { id: 'Appraisal-Ordered', label: 'Appraisal Ordered', desc: 'Appraisal scheduled to confirm value of target asset.' },
  { id: 'Appraisal-Received', label: 'Appraisal Received', desc: 'Appraisal document received and asset LTV calculated.' },
  { id: 'Conditions-Issued', label: 'Conditions Issued', desc: 'Underwriter issues list of prior-to-doc checklist requirements.' },
  { id: 'Conditions-Cleared', label: 'Conditions Cleared', desc: 'All conditional underwriting requests resolved and approved.' },
  { id: 'Clear-To-Close', label: 'Clear to Close', desc: 'Final underwriting sign-off. Loan is ready to fund.' }
];

export function LoanProcessingPipeline({ projectId }: Props) {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Appraisal capture modal state
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [appraisedValue, setAppraisedValue] = useState('');
  const [appraisalFile, setAppraisalFile] = useState<{ id: string; name: string; url: string } | null>(null);
  const [uploadingAppraisal, setUploadingAppraisal] = useState(false);
  
  const appraisalInputRef = useRef<HTMLInputElement>(null);

  // 1. Listen to loans
  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_loans_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          const docs = val ? JSON.parse(val) : [];
          setLoans(docs);
          if (docs.length > 0 && !activeLoanId) {
            setActiveLoanId(docs[0].id);
          }
          setLoading(false);
        } catch (e) {}
      };
      load();
      window.addEventListener('storage', (e) => {
        if (e.key === key) load();
      });
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'projects', projectId, 'loans'),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LoanRecord[];
        setLoans(docs);
        if (docs.length > 0 && !activeLoanId) {
          setActiveLoanId(docs[0].id);
        }
        setLoading(false);
      },
      (err) => {
        console.error('onSnapshot loans error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId, activeLoanId]);

  const activeLoan = loans.find((l) => l.id === activeLoanId);

  const handleStatusChange = async (targetStatus: LoanStatus) => {
    if (!activeLoanId || !activeLoan) return;

    if (targetStatus === 'Appraisal-Received') {
      // Pre-fill existing appraisal data if present
      setAppraisedValue(activeLoan.appraisedValueCents ? (activeLoan.appraisedValueCents / 100).toString() : '');
      if (activeLoan.fileId && activeLoan.fileName && activeLoan.fileUrl) {
        setAppraisalFile({
          id: activeLoan.fileId,
          name: activeLoan.fileName,
          url: activeLoan.fileUrl
        });
      } else {
        setAppraisalFile(null);
      }
      setShowAppraisalModal(true);
      return;
    }

    await submitStatusChange(targetStatus);
  };

  const submitStatusChange = async (targetStatus: LoanStatus, extraData: any = {}) => {
    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/loans/${activeLoanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          ...extraData
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update milestone.');
      }

      toast.success(`Milestone updated: ${targetStatus.replace(/-/g, ' ')}`);
      setShowAppraisalModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Error updating milestone.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppraisalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF documents are allowed.');
      return;
    }

    setUploadingAppraisal(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      // 1. Ensure Debt folder exists
      const folderRes = await fetch(`/api/projects/${projectId}/lender-package/debt-folder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!folderRes.ok) throw new Error('Failed to ensure Debt folder.');
      const { folderId } = await folderRes.json();

      // 2. Upload document
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);
      formData.append('category', 'Appraisal');
      formData.append('documentType', 'appraisal');

      const uploadRes = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Upload failed.');
      }

      const { docId, downloadUrl } = await uploadRes.json();
      setAppraisalFile({
        id: docId,
        name: file.name,
        url: downloadUrl
      });
      toast.success('Appraisal document uploaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Error uploading appraisal.');
    } finally {
      setUploadingAppraisal(false);
    }
  };

  const handleSaveAppraisalMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(appraisedValue.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid appraised asset value.');
      return;
    }

    const payload: any = {
      appraisedValueCents: Math.round(val * 100)
    };

    if (appraisalFile) {
      payload.appraisalFileId = appraisalFile.id;
      payload.appraisalFileName = appraisalFile.name;
      payload.appraisalFileUrl = appraisalFile.url;
    }

    await submitStatusChange('Appraisal-Received', payload);
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[150px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A9EAA] mb-2" />
        <span className="text-xs text-pw-muted font-light uppercase tracking-wider">Loading Milestones...</span>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-xs text-pw-muted font-light border border-dashed border-pw-border">
        Configure a financing route to initialize underwriting milestones.
      </div>
    );
  }

  const activeIndex = activeLoan ? STATUSES.findIndex((s) => s.id === activeLoan.status) : -1;

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Selector for multi-loans */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-pw-border pb-4 gap-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <Building className="w-5 h-5 text-[#7A9EAA]" />
            Underwriting Milestones
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            Track and log the underwriting pipeline steps for each configured project debt instrument.
          </p>
        </div>

        {loans.length > 1 && (
          <div className="flex gap-2 bg-gray-50 border border-pw-border p-1 rounded-lg">
            {loans.map((l) => (
              <button 
                key={l.id}
                onClick={() => setActiveLoanId(l.id)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded ${
                  activeLoanId === l.id 
                    ? 'bg-[#7A9EAA] text-pw-white shadow-sm' 
                    : 'text-pw-muted hover:text-pw-black hover:bg-gray-100'
                }`}
              >
                {l.lenderName || l.instrument}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main milestones list */}
      <div className="relative pl-8 space-y-6">
        {/* Connecting Line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gray-200" />

        {STATUSES.map((status, index) => {
          const isCompleted = index <= activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div 
              key={status.id}
              onClick={() => handleStatusChange(status.id)}
              className="relative flex gap-4 cursor-pointer group"
            >
              {/* Check Circle Indicator */}
              <div 
                className={`absolute -left-8 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  isCompleted 
                    ? 'bg-[#7A9EAA] border-[#7A9EAA] text-pw-white' 
                    : 'bg-pw-white border-gray-300 text-gray-300 hover:border-[#7A9EAA]'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4.5 h-4.5 stroke-[3px]" />
                ) : (
                  <span className="text-[11px] font-bold">{index + 1}</span>
                )}
              </div>

              {/* Status details */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex justify-between items-start">
                  <h4 className={`text-xs uppercase tracking-widest font-black transition-colors ${
                    isCurrent 
                      ? 'text-pw-black' 
                      : isCompleted 
                        ? 'text-pw-muted' 
                        : 'text-gray-400 group-hover:text-pw-black'
                  }`}>
                    {status.label}
                  </h4>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[8px] bg-blue-50 text-blue-700 border border-blue-200 uppercase font-black tracking-widest">
                      Active Step
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-pw-muted font-light mt-0.5 leading-relaxed">
                  {status.desc}
                </p>

                {/* Appraisal Details inside Step block */}
                {status.id === 'Appraisal-Received' && activeLoan?.appraisedValueCents && (
                  <div className="mt-3 p-3 bg-gray-50 border border-pw-border rounded-lg max-w-md flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-pw-black">
                      <span className="font-light">Appraised Asset Value</span>
                      <strong className="font-bold">${(activeLoan.appraisedValueCents / 100).toLocaleString()}</strong>
                    </div>
                    {activeLoan.ltvPercent && (
                      <div className="flex justify-between text-xs text-pw-black">
                        <span className="font-light">Calculated LTV Ratio</span>
                        <strong className="font-bold text-[#7A9EAA]">{activeLoan.ltvPercent.toFixed(2)}%</strong>
                      </div>
                    )}
                    {activeLoan.fileUrl && (
                      <div className="flex items-center gap-1.5 text-[10px] text-pw-muted font-light pt-1 border-t border-gray-200">
                        <FileText className="w-3.5 h-3.5 text-[#7A9EAA]" />
                        <a 
                          href={activeLoan.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline flex items-center gap-0.5"
                        >
                          {activeLoan.appraisalFileName}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Appraisal detail overlay modal */}
      {showAppraisalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-pw-white border border-pw-border shadow-xl max-w-md w-full rounded-xl overflow-hidden animate-in zoom-in duration-200">
            <div className="flex justify-between items-center bg-[#7A9EAA] px-4 py-3 text-pw-white">
              <h4 className="text-xs uppercase font-black tracking-widest">Capture Appraisal Metrics</h4>
              <button 
                onClick={() => setShowAppraisalModal(false)}
                className="hover:bg-white/10 p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAppraisalMilestone} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded text-[11px] text-amber-900 leading-relaxed">
                <span className="font-semibold block mb-0.5">Asset Re-valuation Trigger</span>
                Saving the appraisal details recalculates the Loan-to-Value (LTV) ratio automatically.
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Appraised Value ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-pw-muted" />
                  <input 
                    type="text"
                    required
                    placeholder="250,000"
                    value={appraisedValue}
                    onChange={(e) => setAppraisedValue(e.target.value)}
                    className="w-full bg-pw-bg border border-pw-border focus:border-[#7A9EAA] focus:ring-0 rounded pl-8 pr-2.5 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Appraisal Document (PDF)</label>
                {appraisalFile ? (
                  <div className="flex items-center justify-between p-2.5 border border-emerald-100 bg-emerald-50/20 rounded">
                    <span className="text-[11px] font-medium text-emerald-800 truncate max-w-[200px]">{appraisalFile.name}</span>
                    <button 
                      type="button"
                      onClick={() => setAppraisalFile(null)}
                      className="text-emerald-700 hover:text-red-600 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="file"
                      accept="application/pdf"
                      ref={appraisalInputRef}
                      onChange={handleAppraisalUpload}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      disabled={uploadingAppraisal}
                      onClick={() => appraisalInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-pw-border hover:bg-gray-50 flex flex-col items-center justify-center py-4 text-center cursor-pointer rounded"
                    >
                      {uploadingAppraisal ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#7A9EAA] mb-1" />
                      ) : (
                        <Upload className="w-5 h-5 text-pw-muted mb-1" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pw-black">
                        {uploadingAppraisal ? 'Uploading...' : 'Upload Appraisal PDF'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-pw-border mt-4">
                <button 
                  type="button"
                  onClick={() => setShowAppraisalModal(false)}
                  className="px-3.5 py-1.5 border border-pw-border text-[10px] font-bold uppercase tracking-wider text-pw-black hover:bg-gray-50 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-[#7A9EAA] hover:bg-[#688a95] text-[10px] font-bold uppercase tracking-wider text-pw-white flex items-center gap-1.5 rounded transition-all shadow-sm"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save appraisal metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick helper to avoid X undefined compile error
function X(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
