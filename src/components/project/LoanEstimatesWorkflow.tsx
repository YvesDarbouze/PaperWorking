'use client';

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { calculateAmortization } from '@/lib/utils/reiCalculators';
import type { LoanEstimateCandidate, LoanRecord } from '@/types/schema';
import { 
  FileText,
  Upload,
  CheckCircle,
  Eye,
  Trash2,
  Check,
  Loader2,
  ArrowRight,
  TrendingDown,
  Info,
  DollarSign,
  Percent,
  Calendar,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

export function LoanEstimatesWorkflow({ projectId }: Props) {
  const [estimates, setEstimates] = useState<LoanEstimateCandidate[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Capture State (for Split-View Capture)
  const [captureDoc, setCaptureDoc] = useState<{
    fileId: string;
    fileName: string;
    fileUrl: string;
  } | null>(null);

  // Capture Form Inputs
  const [lenderName, setLenderName] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [termMonths, setTermMonths] = useState('360');
  const [points, setPoints] = useState('0');
  const [estimatedCosts, setEstimatedCosts] = useState('0');
  const [selectedLoanId, setSelectedLoanId] = useState('');

  // 1. Listen to active loans
  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_loans_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          setLoans(val ? JSON.parse(val) : []);
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
        if (docs.length > 0) {
          setSelectedLoanId(docs[0].id);
        }
      }
    );
    return unsub;
  }, [projectId]);

  // 2. Listen to estimate candidates
  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_loan_estimates_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          setEstimates(val ? JSON.parse(val) : []);
          setLoading(false);
        } catch (e) {}
      };
      load();
      window.addEventListener('storage', (e) => {
        if (e.key === key) load();
      });
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'loanEstimates'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LoanEstimateCandidate[];
        setEstimates(docs);
        setLoading(false);
      },
      (err) => {
        console.error('onSnapshot estimates error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF documents are allowed.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading Loan Estimate PDF...');

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

      if (!folderRes.ok) {
        throw new Error('Failed to provision Debt folder in the Data Room.');
      }
      const { folderId } = await folderRes.json();

      // 2. Upload the file to documents endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);
      formData.append('category', 'Other');
      formData.append('documentType', 'closing_disclosure');

      const uploadRes = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Document upload failed.');
      }

      const { docId, downloadUrl } = await uploadRes.json();

      // Set to Capture State to trigger Split View
      setCaptureDoc({
        fileId: docId,
        fileName: file.name,
        fileUrl: downloadUrl,
      });

      toast.success('Document uploaded. Proceeding to split-view parameter capture.', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Error uploading document.', { id: toastId });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName.trim()) {
      toast.error('Lender name is required.');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid loan amount.');
      return;
    }
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      toast.error('Please enter a valid interest rate.');
      return;
    }

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const payload = {
        lenderName: lenderName.trim(),
        amountCents: Math.round(parsedAmount * 100),
        interestRate: parsedRate,
        termMonths: parseInt(termMonths, 10),
        points: parseFloat(points) || 0,
        estimatedCostsCents: Math.round((parseFloat(estimatedCosts) || 0) * 100),
        fileId: captureDoc?.fileId || null,
        fileName: captureDoc?.fileName || null,
        fileUrl: captureDoc?.fileUrl || null,
        loanRecordId: selectedLoanId || null,
      };

      const res = await fetch(`/api/projects/${projectId}/loan-estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save estimate candidate.');
      }

      // Reset form states
      setLenderName('');
      setAmount('');
      setRate('');
      setTermMonths('360');
      setPoints('0');
      setEstimatedCosts('0');
      setCaptureDoc(null);

      toast.success('Loan estimate candidate successfully saved.');
    } catch (err: any) {
      toast.error(err.message || 'Error saving estimate candidate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChooseLoan = async (estimateId: string, lender: string) => {
    setSubmitting(true);
    const toastId = toast.loading(`Committing choice of ${lender} loan estimate...`);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/loan-estimates/${estimateId}/choose`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to select estimate.');
      }

      toast.success(`${lender} chosen as active loan route.`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Error choosing loan estimate.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!window.confirm('Delete this estimate candidate?')) return;

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/loan-estimates/${estimateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete estimate.');
      }

      toast.success('Estimate candidate removed.');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting candidate.');
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[150px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A9EAA] mb-2" />
        <span className="text-xs text-pw-muted font-light uppercase tracking-wider">Loading Loan Estimates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── SPLIT-VIEW CAPTURE ── */}
      {captureDoc && (
        <div className="glass-card p-6 border border-[#7A9EAA]/40 bg-[#7A9EAA]/5 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center border-b border-pw-border pb-3 mb-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-[#7A9EAA] flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Split-View Capture: {captureDoc.fileName}
            </h4>
            <button 
              onClick={() => setCaptureDoc(null)}
              className="p-1 hover:bg-gray-100 rounded transition-all"
            >
              <X className="w-4 h-4 text-pw-muted" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[450px]">
            {/* Left Column: PDF Viewer */}
            <div className="border border-pw-border rounded overflow-hidden bg-pw-bg flex items-center justify-center h-full">
              <iframe 
                src={captureDoc.fileUrl} 
                className="w-full h-full" 
                title="Loan Estimate PDF"
              />
            </div>

            {/* Right Column: Capture Form */}
            <form onSubmit={handleSaveEstimate} className="flex flex-col justify-between h-full overflow-y-auto pr-1">
              <div className="space-y-3.5">
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded text-[11px] text-blue-900 leading-relaxed">
                  <span className="font-semibold block mb-0.5">Source-Tagged Upload</span>
                  Values captured below will be permanently tagged to this document. Use the PDF on the left to extract the details.
                </div>

                {loans.length > 1 && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Target Active Loan</label>
                    <select 
                      value={selectedLoanId}
                      onChange={(e) => setSelectedLoanId(e.target.value)}
                      className="w-full bg-pw-white border border-pw-border focus:border-[#7A9EAA] rounded p-2 text-xs outline-none"
                    >
                      {loans.map((l) => (
                        <option key={l.id} value={l.id}>{l.lenderName || l.instrument}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Lender Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Chase Commercial"
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    className="w-full bg-pw-white border border-pw-border focus:border-[#7A9EAA] rounded p-2 text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Loan Amount ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-pw-muted" />
                      <input 
                        type="text"
                        required
                        placeholder="250,000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-pw-white border border-pw-border focus:border-[#7A9EAA] rounded pl-8 pr-2.5 py-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Interest Rate (%)</label>
                    <div className="relative">
                      <Percent className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-pw-muted" />
                      <input 
                        type="number"
                        step="0.001"
                        required
                        placeholder="6.5"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="w-full bg-pw-white border border-pw-border focus:border-[#7A9EAA] rounded pl-2.5 pr-8 py-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Term (Months)</label>
                    <input 
                      type="number"
                      required
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                      className="w-full bg-pw-white border border-pw-border focus:border-[#7A9EAA] rounded p-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Orig. Points (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      className="w-full bg-pw-white border border-pw-border focus:border-[#7A9EAA] rounded p-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-pw-muted block mb-1">Est. Costs ($)</label>
                    <input 
                      type="number"
                      value={estimatedCosts}
                      onChange={(e) => setEstimatedCosts(e.target.value)}
                      className="w-full bg-pw-white border border-pw-border focus:border-[#7A9EAA] rounded p-2 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-pw-border mt-4">
                <button 
                  type="button"
                  onClick={() => setCaptureDoc(null)}
                  className="px-4 py-2 border border-pw-border text-xs font-semibold uppercase tracking-wider text-pw-black hover:bg-gray-50 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#7A9EAA] hover:bg-[#688a95] text-xs font-semibold uppercase tracking-wider text-pw-white flex items-center gap-1.5 rounded transition-all shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Estimate Candidate
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DASHBOARD & COMPARISON ── */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-pw-border pb-4 gap-4">
          <div>
            <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#7A9EAA]" />
              Loan Estimate Comparisons
            </h3>
            <p className="text-xs text-pw-muted font-light mt-1">
              Upload multiple estimates, evaluate their mathematical terms side-by-side, and commit the chosen structure.
            </p>
          </div>

          <div className="relative shrink-0">
            <input 
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="estimates-file-upload"
              disabled={uploading || !!captureDoc}
            />
            <label 
              htmlFor="estimates-file-upload"
              className={`pw-interactive px-4 py-2 bg-[#7A9EAA] hover:bg-[#688a95] text-xs font-semibold uppercase tracking-wider text-pw-white flex items-center gap-1.5 rounded cursor-pointer transition-all ${
                uploading || captureDoc ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'shadow-sm'
              }`}
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Upload Loan Estimate
            </label>
          </div>
        </div>

        {/* Side-by-side Comparison Matrix */}
        {estimates.length === 0 ? (
          <div className="p-8 rounded border border-dashed border-pw-border text-center text-xs text-pw-muted font-light">
            No estimate candidates uploaded yet. Select "Upload Loan Estimate" to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {estimates.map((est) => {
              // Calculate implied debt service from amortization utility
              const loanAmt = est.amountCents / 100;
              const amortResult = calculateAmortization(loanAmt, est.interestRate, est.termMonths);

              return (
                <div 
                  key={est.id}
                  className={`p-4 border rounded-xl transition-all relative flex flex-col justify-between ${
                    est.isChosen 
                      ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 shadow-sm' 
                      : 'border-pw-border bg-pw-white hover:bg-pw-bg/5'
                  }`}
                >
                  {/* Top Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xs uppercase font-black tracking-widest text-pw-black">{est.lenderName}</h4>
                      {est.fileName && (
                        <a 
                          href={est.fileUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-pw-muted hover:underline flex items-center gap-1 mt-0.5 min-w-0"
                        >
                          <FileText className="w-3 h-3 text-[#7A9EAA] shrink-0" />
                          <span className="truncate max-w-[150px]">{est.fileName}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {est.isChosen && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase tracking-wider">
                          Active Choice
                        </span>
                      )}
                      <button 
                        onClick={() => handleDeleteEstimate(est.id)}
                        disabled={submitting}
                        className="text-pw-muted hover:text-red-600 transition-colors p-1"
                        title="Delete estimate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Core Metrics comparison */}
                  <div className="space-y-2 border-t border-b border-pw-border py-3 my-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-pw-muted">Loan Amount</span>
                      <strong className="text-pw-black font-semibold">${loanAmt.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pw-muted">Interest Rate</span>
                      <strong className="text-pw-black font-semibold">{est.interestRate.toFixed(3)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pw-muted">Term</span>
                      <strong className="text-pw-black font-semibold">{est.termMonths} Mo ({Math.round(est.termMonths / 12)} Yr)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pw-muted">Origination Points</span>
                      <strong className="text-pw-black font-semibold">{est.points.toFixed(1)}% (${((loanAmt * est.points) / 100).toLocaleString()})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pw-muted">Estimated Costs</span>
                      <strong className="text-pw-black font-semibold">${(est.estimatedCostsCents / 100).toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Implied math outputs */}
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between text-pw-black">
                      <span className="font-light">Monthly Payment (P&I)</span>
                      <strong className="font-bold">${Math.round(amortResult.monthlyPayment).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-pw-black">
                      <span className="font-light">Annual Debt Service</span>
                      <strong className="font-bold text-[#7A9EAA]">${Math.round(amortResult.annualDebtService).toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Choose action */}
                  <div className="mt-4 pt-3 border-t border-pw-border flex justify-end">
                    {est.isChosen ? (
                      <div className="px-3 py-1.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Selected Loan
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleChooseLoan(est.id, est.lenderName)}
                        disabled={submitting}
                        className="pw-interactive px-3 py-1.5 bg-[#7A9EAA] hover:bg-[#688a95] text-pw-white text-[10px] font-bold uppercase tracking-wider rounded transition-all shadow-sm"
                      >
                        Choose This Loan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
