'use client';

import React, { useState } from 'react';
import { Project, LoanEstimateCandidate, LoanRecord, DealDocumentCategory, ESignStatus } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import FileDropzone from '@/components/shared/FileDropzone';
import { calculateAmortization } from '@/lib/utils/reiCalculators';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Calculator,
  Percent,
  DollarSign,
  TrendingDown
} from 'lucide-react';

interface LoanEstimatesComparisonProps {
  projectId: string;
  project: Project;
  estimates: LoanEstimateCandidate[];
}

export function LoanEstimatesComparison({
  projectId,
  project,
  estimates = []
}: LoanEstimatesComparisonProps) {
  const { user } = useAuth();
  const [activeUpload, setActiveUpload] = useState<any | null>(null);

  // Form capture state
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>('');
  const [termYears, setTermYears] = useState<number | ''>(30);
  const [points, setPoints] = useState<number | ''>(0);
  const [estimatedCosts, setEstimatedCosts] = useState<number | ''>('');

  const numAmount = Number(amount) || 0;
  const numRate = Number(rate) || 0;
  const numTermYears = Number(termYears) || 0;
  const numPoints = Number(points) || 0;
  const numEstimatedCosts = Number(estimatedCosts) || 0;

  // Implied debt service calculation
  const monthlyPI = calculateAmortization(numAmount, numRate, numTermYears * 12).monthlyPayment;

  const handleUploadComplete = (res: any) => {
    setActiveUpload(res);
    // Autofill filename as lender name guess if possible
    if (res.fileName) {
      const guess = res.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setLender(guess);
    }
    toast.success('Loan Estimate document uploaded successfully');
  };

  const handleAddCandidate = async () => {
    if (!lender.trim()) {
      toast.error('Please enter the lender name');
      return;
    }
    if (numAmount <= 0) {
      toast.error('Please enter a valid loan amount');
      return;
    }
    if (numRate <= 0) {
      toast.error('Please enter a valid interest rate');
      return;
    }
    if (numTermYears <= 0) {
      toast.error('Please enter a valid term in years');
      return;
    }

    const newCandidate: LoanEstimateCandidate = {
      id: `estimate-${Date.now()}`,
      lender: lender.trim(),
      amount: numAmount,
      rate: numRate,
      termYears: numTermYears,
      points: numPoints,
      estimatedCosts: numEstimatedCosts,
      fileUrl: activeUpload?.downloadUrl,
      storagePath: activeUpload?.storagePath,
      fileName: activeUpload?.fileName,
      uploadedAt: new Date().toISOString(),
      isChosen: false
    };

    const updatedEstimates = [...estimates, newCandidate];

    try {
      // Save updated candidates list
      await projectsService.updateProject(projectId, {
        loanEstimates: updatedEstimates
      });

      // Index the file in the documents subcollection
      if (user && activeUpload) {
        const docData = {
          projectId,
          category: 'Debt' as DealDocumentCategory,
          fileName: activeUpload.fileName,
          fileUrl: activeUpload.downloadUrl,
          storagePath: activeUpload.storagePath,
          fileSize: activeUpload.fileSize || 0,
          mimeType: activeUpload.mimeType || 'application/pdf',
          uploadedByUid: user.uid,
          uploadedByName: user.displayName || user.email || 'Sponsor',
          eSignStatus: 'Not Required' as ESignStatus,
          notes: `Source document for Lender Estimate Candidate: ${lender.trim()}`
        };

        await addDoc(collection(db, 'projects', projectId, 'documents'), {
          ...docData,
          uploadedAt: serverTimestamp()
        });
      }

      toast.success('Loan estimate added as candidate');
      resetForm();
    } catch (err) {
      console.error('Failed to add loan estimate candidate:', err);
      toast.error('Failed to save estimate');
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    const updated = estimates.filter(e => e.id !== id);
    try {
      await projectsService.updateProject(projectId, {
        loanEstimates: updated
      });
      toast.success('Estimate candidate removed');
    } catch (err) {
      console.error('Failed to delete candidate:', err);
      toast.error('Failed to delete candidate');
    }
  };

  const handleChooseLoan = async (candidate: LoanEstimateCandidate) => {
    // 1. Mark chosen flag
    const updatedEstimates = estimates.map(e => ({
      ...e,
      isChosen: e.id === candidate.id
    }));

    // 2. Archive any existing non-archived loan record in project.loans
    const existingLoans: LoanRecord[] = project.loans || [];
    const archivedLoans = existingLoans.map(l => ({
      ...l,
      archived: true,
      updatedAt: new Date()
    }));

    // 3. Append the new chosen LoanRecord
    const newLoanRecord: LoanRecord = {
      id: `loan-active-${Date.now()}`,
      projectId,
      lender: candidate.lender,
      amount: candidate.amount,
      rate: candidate.rate,
      termYears: candidate.termYears,
      points: candidate.points,
      status: 'application_submitted',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newLoans = [...archivedLoans, newLoanRecord];

    // 4. Align project financials properties
    const currentFinancials = project.financials || {};
    const updatedFinancials = {
      ...currentFinancials,
      loanAmount: candidate.amount,
      loanInterestRate: candidate.rate,
      loanTermYears: candidate.termYears,
      loanOriginationPoints: candidate.points
    };

    try {
      await projectsService.updateProject(projectId, {
        loanEstimates: updatedEstimates,
        loans: newLoans,
        financials: updatedFinancials
      });
      toast.success(`Committed active loan record with ${candidate.lender}!`);
    } catch (err) {
      console.error('Failed to commit chosen loan:', err);
      toast.error('Failed to commit chosen loan selection');
    }
  };

  const resetForm = () => {
    setActiveUpload(null);
    setLender('');
    setAmount('');
    setRate('');
    setTermYears(30);
    setPoints(0);
    setEstimatedCosts('');
  };

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const fmtPercent = (val: number) => {
    return `${val.toFixed(2)}%`;
  };

  return (
    <div className="bg-[#121014]/90 backdrop-blur-[24px] border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-wide">Card F3.3 — Loan Estimates & Comparison</h3>
          <p className="text-[12px] text-[#9E9DA0]">Compare lender term sheets on the same math and lock the optimal active loan.</p>
        </div>
        {!activeUpload && (
          <div className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-[#7A9EAA]/15 text-[#7A9EAA] border border-[#7A9EAA]/30">
            Implied Debt Service comparison
          </div>
        )}
      </div>

      {/* Split-View Capture Mode */}
      {activeUpload ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
          {/* Left Column: Uploaded Document */}
          <div className="space-y-4 pr-0 md:pr-4 border-r border-white/5">
            <h4 className="text-[14px] font-semibold text-[#9E9DA0] uppercase tracking-wider">Source Document</h4>
            <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-xl border border-white/10 text-center gap-3">
              <FileText size={48} className="text-[#7A9EAA]" />
              <div>
                <p className="text-[14px] font-semibold text-white truncate max-w-[250px]">{activeUpload.fileName}</p>
                <p className="text-[11px] text-[#9E9DA0]">Category: Loan Estimate Document</p>
              </div>
              <a
                href={activeUpload.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#7A9EAA] hover:text-[#91B5C2] transition-colors"
              >
                View Document
                <ExternalLink size={12} />
              </a>
            </div>
            <div className="bg-[#7A9EAA]/5 border border-[#7A9EAA]/10 p-3 rounded-lg flex items-start gap-2.5">
              <TrendingDown size={18} className="text-[#7A9EAA] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#9E9DA0] leading-relaxed">
                Compare terms side-by-side below. Choosing a loan commits parameters to the active deal projections.
              </p>
            </div>
          </div>

          {/* Right Column: Details Capture Form */}
          <div className="space-y-4">
            <h4 className="text-[14px] font-semibold text-[#9E9DA0] uppercase tracking-wider">Capture Estimate Terms</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block mb-1">Lender Name</label>
                <input
                  type="text"
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#7A9EAA]/50"
                  placeholder="e.g. Neo Lending, Chase Bank"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block mb-1">Loan Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#7A9EAA]/50"
                  placeholder="350000"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#7A9EAA]/50"
                  placeholder="6.50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block mb-1">Term (Years)</label>
                <input
                  type="number"
                  value={termYears}
                  onChange={(e) => setTermYears(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#7A9EAA]/50"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block mb-1">Origination Points (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={points}
                  onChange={(e) => setPoints(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#7A9EAA]/50"
                  placeholder="1.0"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block mb-1">Est. Closing Costs ($)</label>
                <input
                  type="number"
                  value={estimatedCosts}
                  onChange={(e) => setEstimatedCosts(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#7A9EAA]/50"
                  placeholder="e.g. 4500"
                />
              </div>
            </div>

            {/* Implied Amortization readout */}
            {numAmount > 0 && numRate > 0 && numTermYears > 0 && (
              <div className="p-3.5 bg-[#7A9EAA]/10 border border-[#7A9EAA]/25 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[#7A9EAA]">
                  <Calculator size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Dynamic Debt Service</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[20px] font-extrabold text-white">{fmtCurrency(monthlyPI)}</span>
                  <span className="text-[11px] text-[#9E9DA0]">Principal & Interest</span>
                </div>
                <p className="text-[10px] text-[#8C8B8E]">
                  Implied Annual Debt Service: <span className="text-white font-medium">{fmtCurrency(monthlyPI * 12)}</span>
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl text-[12px] font-bold uppercase tracking-wider text-[#9E9DA0] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCandidate}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[#7A9EAA] hover:bg-[#6b8e9a] text-[#0d0a0b] transition-all"
              >
                Add Candidate
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Trigger card */
        <div className="p-6 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
          <FileText size={32} className="text-[#9E9DA0]" />
          <div>
            <p className="text-[14px] font-semibold text-white">Upload Loan Estimate Sheet</p>
            <p className="text-[11px] text-[#9E9DA0] max-w-[320px]">
              Drag and drop or select the PDF estimate document. We will transition to split-view terms capture.
            </p>
          </div>
          <div className="w-full max-w-md pt-2">
            <FileDropzone
              projectId={projectId}
              path="lender_docs"
              accept={['application/pdf', 'image/jpeg', 'image/png', 'image/webp']}
              onUploadComplete={handleUploadComplete}
              onUploadError={(err) => toast.error(err)}
            />
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      {estimates.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-[14px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Candidate Estimates Comparison</span>
              <span className="text-[11px] lowercase font-normal text-[#9E9DA0]">(history kept)</span>
            </h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-[#9E9DA0] text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-3">Lender</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Term</th>
                  <th className="p-3 text-right">Points</th>
                  <th className="p-3 text-right">Closing Costs</th>
                  <th className="p-3 text-right text-white">Monthly P&I</th>
                  <th className="p-3 text-center">Source</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {estimates.map((candidate) => {
                  const impliedPI = calculateAmortization(candidate.amount, candidate.rate, candidate.termYears * 12).monthlyPayment;

                  return (
                    <tr
                      key={candidate.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        candidate.isChosen
                          ? 'bg-[#7A9EAA]/5 border-y border-[#7A9EAA]/20'
                          : ''
                      }`}
                    >
                      <td className="p-3 font-semibold text-white flex items-center gap-2">
                        {candidate.isChosen && (
                          <CheckCircle size={14} className="text-[#7A9EAA]" />
                        )}
                        {candidate.lender}
                      </td>
                      <td className="p-3 text-right font-medium text-white">{fmtCurrency(candidate.amount)}</td>
                      <td className="p-3 text-right text-[#9E9DA0]">{fmtPercent(candidate.rate)}</td>
                      <td className="p-3 text-right text-[#9E9DA0]">{candidate.termYears} yrs</td>
                      <td className="p-3 text-right text-[#9E9DA0]">{candidate.points}%</td>
                      <td className="p-3 text-right text-[#9E9DA0]">{fmtCurrency(candidate.estimatedCosts)}</td>
                      <td className="p-3 text-right font-bold text-white bg-white/[0.01]">
                        {fmtCurrency(impliedPI)}
                      </td>
                      <td className="p-3 text-center">
                        {candidate.fileUrl ? (
                          <a
                            href={candidate.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-[#7A9EAA] hover:text-[#91B5C2] p-1"
                            title={candidate.fileName || 'View source estimate doc'}
                          >
                            <FileText size={15} />
                          </a>
                        ) : (
                          <span className="text-[#454955]">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {candidate.isChosen ? (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A9EAA] px-2 py-0.5 bg-[#7A9EAA]/15 border border-[#7A9EAA]/30 rounded-full">
                              Active Loan
                            </span>
                          ) : (
                            <button
                              onClick={() => handleChooseLoan(candidate)}
                              className="text-[11px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[#7A9EAA] px-2.5 py-1 rounded transition-all"
                            >
                              Choose This Loan
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            className="text-red-400/60 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                            title="Delete Estimate candidate"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
