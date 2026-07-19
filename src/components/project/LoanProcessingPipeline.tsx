'use client';

import React, { useState } from 'react';
import { LoanRecord, LoanRecordStatus, DealDocumentCategory, ESignStatus } from '@/types/schema';
import FileDropzone from '@/components/shared/FileDropzone';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { 
  Check, 
  FileText, 
  ExternalLink, 
  AlertCircle, 
  DollarSign, 
  UploadCloud,
  Calculator,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LoanProcessingPipelineProps {
  projectId?: string;
  activeLoan?: LoanRecord;
  onStatusTransition?: (
    newStatus: LoanRecordStatus,
    appraisedValue?: number,
    docUrl?: string,
    docName?: string
  ) => Promise<void>;
  currentStatus?: any;
  onStatusChange?: (status: any) => void;
}

interface StepInfo {
  status: LoanRecordStatus;
  label: string;
  description: string;
}

const STEPS: StepInfo[] = [
  {
    status: 'application_submitted',
    label: 'Application Submitted',
    description: 'Loan files package submitted to the lender underwriting desk.'
  },
  {
    status: 'processing',
    label: 'Processing',
    description: 'Lender reviewing package documents and completing intake checks.'
  },
  {
    status: 'appraisal_ordered',
    label: 'Appraisal Ordered',
    description: 'Independent property appraisal requested by the lender.'
  },
  {
    status: 'appraisal_received',
    label: 'Appraisal Received',
    description: 'Valuation report completed. Captures appraised value and source document.'
  },
  {
    status: 'conditions_issued',
    label: 'Conditions Issued',
    description: 'Underwriter issued list of closing and processing conditions.'
  },
  {
    status: 'conditions_cleared',
    label: 'Conditions Cleared',
    description: 'All underwriting conditions successfully verified and approved.'
  },
  {
    status: 'clear_to_close',
    label: 'Clear To Close',
    description: 'Final loan approval cleared. Loan docs pushed to title company.'
  }
];

export function LoanProcessingPipeline({
  projectId,
  activeLoan,
  onStatusTransition,
  currentStatus: legacyStatus,
  onStatusChange
}: LoanProcessingPipelineProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAppraisalCapture, setShowAppraisalCapture] = useState(false);

  // Legacy view fallback for phase-1
  if (legacyStatus !== undefined) {
    const legacyStatuses = [
      'Application-Submitted',
      'Appraisal-Ordered',
      'Underwriting-Review',
      'Clear-To-Close',
    ];
    const currentIndex = legacyStatus ? legacyStatuses.indexOf(legacyStatus) : -1;

    return (
      <div 
        className="p-6 rounded-lg space-y-6"
        style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem' }}
      >
        <div className="flex flex-col gap-2 mb-2">
          <h3 className="text-lg font-semibold text-white">Loan Approval Pipeline</h3>
          <p className="text-sm text-[#9E9DA0]">Track the financing progress for the acquisition.</p>
        </div>

        <div className="relative">
          <div 
            className="absolute top-4 bottom-4 w-0.5 z-0 bg-white/10" 
            style={{ left: '15px' }}
          />

          <div className="relative z-10 flex flex-col gap-8">
            {legacyStatuses.map((status, index) => {
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;

              let bgColor = 'rgba(255, 255, 255, 0.05)';
              let borderColor = 'rgba(255, 255, 255, 0.1)';
              let textColor = 'text-[#9E9DA0]';

              if (isCompleted) {
                bgColor = '#7A9EAA';
                borderColor = '#7A9EAA';
                textColor = 'text-white';
              }

              return (
                <div 
                  key={status} 
                  className="flex items-center gap-4 cursor-pointer group relative"
                  onClick={() => onStatusChange?.(status)}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors border-2 shrink-0 text-xs font-bold"
                    style={{ 
                      backgroundColor: isCompleted ? bgColor : undefined,
                      borderColor: borderColor,
                    }}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-[#0d0a0b]" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className={`text-sm font-medium transition-colors ${isCompleted ? 'text-white' : 'text-[#9E9DA0]'} ${isCurrent ? 'font-bold text-[#7A9EAA]' : ''}`}
                    >
                      {status.replace(/-/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Appraisal form capture states
  const [appraisedValue, setAppraisedValue] = useState<number | ''>('');
  const [uploadResult, setUploadResult] = useState<any | null>(null);

  if (!activeLoan) {
    return (
      <div className="bg-[#121014]/90 backdrop-blur-[24px] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center py-10 gap-3">
        <AlertCircle size={32} className="text-[#7A9EAA]" />
        <div>
          <h4 className="text-[15px] font-bold text-white uppercase tracking-wider">No Active Loan Committed</h4>
          <p className="text-[12px] text-[#9E9DA0] max-w-[340px] mt-1">
            Choose an estimate terms candidate in the Loan Estimates section above to select the lender and unlock the underwriting pipeline.
          </p>
        </div>
      </div>
    );
  }

  const currentStatus = activeLoan.status;
  const currentIndex = STEPS.findIndex(s => s.status === currentStatus);

  const numAppraised = Number(appraisedValue) || 0;
  const computedLTV = numAppraised > 0 ? (activeLoan.amount / numAppraised) * 100 : 0;

  const handleStepClick = (status: LoanRecordStatus) => {
    if (loading) return;
    if (status === 'appraisal_received') {
      setShowAppraisalCapture(true);
    } else {
      executeTransition(status);
    }
  };

  const executeTransition = async (
    status: LoanRecordStatus,
    val?: number,
    docUrl?: string,
    docName?: string
  ) => {
    setLoading(true);
    try {
      if (onStatusTransition) {
        await onStatusTransition(status, val, docUrl, docName);
      }
      setShowAppraisalCapture(false);
      setAppraisedValue('');
      setUploadResult(null);
    } catch (err) {
      // Error handled by parent / toast
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (res: any) => {
    setUploadResult(res);
    toast.success('Appraisal Report document uploaded successfully');
  };

  const handleSaveAppraisal = async () => {
    if (numAppraised <= 0) {
      toast.error('Please enter a valid appraised value');
      return;
    }

    try {
      // 1. Index document in Data Room
      if (user && uploadResult && projectId) {
        const docData = {
          projectId,
          category: 'Appraisal Report' as DealDocumentCategory,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.downloadUrl,
          storagePath: uploadResult.storagePath,
          fileSize: uploadResult.fileSize || 0,
          mimeType: uploadResult.mimeType || 'application/pdf',
          uploadedByUid: user.uid,
          uploadedByName: user.displayName || user.email || 'Sponsor',
          eSignStatus: 'Not Required' as ESignStatus,
          notes: `Official Appraisal Report for loan with ${activeLoan.lender}. Value: $${numAppraised.toLocaleString()}`
        };

        await addDoc(collection(db, 'projects', projectId, 'documents'), {
          ...docData,
          uploadedAt: serverTimestamp()
        });
      }

      // 2. Fire transition
      await executeTransition(
        'appraisal_received',
        numAppraised,
        uploadResult?.downloadUrl,
        uploadResult?.fileName
      );
      toast.success('Appraisal valuation and document committed successfully');
    } catch (err) {
      toast.error('Failed to save appraisal report');
    }
  };

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-[#121014]/90 backdrop-blur-[24px] border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-wide">Card F3.4 — Loan Approval Underwriting Milestones</h3>
          <p className="text-[12px] text-[#9E9DA0]">Active Loan Lender: <span className="text-white font-semibold">{activeLoan.lender}</span> · Committed Amount: <span className="text-white font-semibold">{fmtCurrency(activeLoan.amount)}</span></p>
        </div>
      </div>

      {showAppraisalCapture && (
        <div className="p-5 border border-white/10 rounded-xl bg-white/[0.02] space-y-4">
          <div className="flex items-center gap-1.5 text-[#7A9EAA]">
            <Sparkles size={16} />
            <h4 className="text-[13px] font-bold uppercase tracking-wider">Capture Appraisal Report Details</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block mb-1">Appraised Valuation ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#9E9DA0] text-[13px]">$</span>
                  <input
                    type="number"
                    value={appraisedValue}
                    onChange={(e) => setAppraisedValue(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#7A9EAA]/50"
                    placeholder="500000"
                  />
                </div>
              </div>

              {numAppraised > 0 && (
                <div className="p-3 bg-[#7A9EAA]/10 border border-[#7A9EAA]/25 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator size={16} className="text-[#7A9EAA]" />
                    <span className="text-[11px] font-semibold text-white">Calculated Loan-to-Value (LTV):</span>
                  </div>
                  <span className="text-[14px] font-extrabold text-white">{computedLTV.toFixed(2)}%</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-[#9E9DA0] block">Upload Valuation PDF</label>
              {uploadResult ? (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#7A9EAA]" />
                    <span className="text-[11px] text-white truncate max-w-[160px]">{uploadResult.fileName}</span>
                  </div>
                  <button 
                    onClick={() => setUploadResult(null)}
                    className="text-[10px] font-bold uppercase text-red-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <FileDropzone
                  projectId={projectId || ''}
                  path="appraisal_docs"
                  accept={['application/pdf', 'image/jpeg', 'image/png']}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={(err) => toast.error(err)}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowAppraisalCapture(false);
                setAppraisedValue('');
                setUploadResult(null);
              }}
              className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase text-[#9E9DA0] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAppraisal}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#7A9EAA] hover:bg-[#6b8e9a] text-[#0d0a0b]"
            >
              Save & Transition
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Underwriting milestones vertical trace */}
      <div className="relative pl-6">
        {/* Connecting timeline stem */}
        <div className="absolute top-3 bottom-3 left-2 w-[1px] bg-white/10" />

        <div className="space-y-6">
          {STEPS.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            
            // Custom styles for steps
            let markerBg = 'bg-[#121014] border-white/20';
            let labelColor = 'text-[#9E9DA0]';
            
            if (isCompleted) {
              markerBg = 'bg-[#7A9EAA] border-[#7A9EAA] text-[#0d0a0b]';
              labelColor = 'text-white';
            } else if (isCurrent) {
              markerBg = 'bg-white/10 border-[#7A9EAA] text-[#7A9EAA] shadow-[0_0_15px_rgba(122,158,170,0.3)] animate-pulse';
              labelColor = 'text-[#7A9EAA]';
            }

            return (
              <div key={step.status} className="flex gap-4 relative">
                {/* Node icon stem marker */}
                <button
                  onClick={() => handleStepClick(step.status)}
                  disabled={loading}
                  className={`absolute -left-[23px] w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all focus:outline-none z-10 hover:scale-110 ${markerBg}`}
                  title={`Transition status to ${step.label}`}
                >
                  {isCompleted ? <Check size={10} className="stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/40" />}
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[14px] font-bold tracking-wide transition-colors ${labelColor}`}>
                      {step.label}
                    </span>
                    {step.status === 'appraisal_received' && activeLoan.appraisedValue && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#7A9EAA]/15 text-[#7A9EAA] border border-[#7A9EAA]/30">
                        Appraised: {fmtCurrency(activeLoan.appraisedValue)}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#9E9DA0] leading-relaxed max-w-xl">
                    {step.description}
                  </p>

                  {/* Display Appraisal Attachments */}
                  {step.status === 'appraisal_received' && activeLoan.appraisalDocumentUrl && (
                    <div className="pt-1">
                      <a
                        href={activeLoan.appraisalDocumentUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#7A9EAA] hover:underline"
                      >
                        <FileText size={12} />
                        View Appraisal Report Document
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
