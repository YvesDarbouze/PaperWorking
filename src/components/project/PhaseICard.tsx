'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, Trash2, Info, ShieldAlert } from 'lucide-react';
import type { Project } from '@/types/schema';
import toast from 'react-hot-toast';
import { uploadFile } from '@/lib/storage/uploadService';
import { IS_DEMO_MODE } from '@/lib/config/demo';

interface PhaseICardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function PhaseICard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: PhaseICardProps) {
  const financials = project.financials || {};

  // Local Form states
  const [vendor, setVendor] = useState(financials.phaseIVendor || '');
  const [orderedDate, setOrderedDate] = useState(financials.phaseIOrderedDate || '');
  const [completedDate, setCompletedDate] = useState(financials.phaseICompletedDate || '');
  const [findings, setFindings] = useState(financials.phaseIFindings || '');
  const [waived, setWaived] = useState(!!financials.phaseIWaived);
  const [waiverReason, setWaiverReason] = useState(financials.phaseIWaiverReason || '');

  // File Upload states
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setVendor(financials.phaseIVendor || '');
    setOrderedDate(financials.phaseIOrderedDate || '');
    setCompletedDate(financials.phaseICompletedDate || '');
    setFindings(financials.phaseIFindings || '');
    setWaived(!!financials.phaseIWaived);
    setWaiverReason(financials.phaseIWaiverReason || '');
  }, [project]);

  const handleSaveField = async (fieldName: string, value: any) => {
    try {
      await onSaveFinancials({ [fieldName]: value });
    } catch (err) {
      console.error(`Failed to save ${fieldName}:`, err);
      toast.error('Failed to save changes');
    }
  };

  const handleUploadDoc = async () => {
    if (readOnly) return;
    
    if (IS_DEMO_MODE) {
      setUploadingDoc(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        await onSaveFinancials({
          phaseIDocumentUrl: '/mock/documents/Phase_I_ESA_Report.pdf',
          phaseIDocumentName: 'Phase_I_ESA_Report.pdf',
        });
        toast.success('Phase I ESA uploaded successfully! (Demo)');
      } catch (err) {
        console.error('Failed to upload Phase I ESA:', err);
        toast.error('Failed to upload Phase I ESA');
      } finally {
        setUploadingDoc(false);
      }
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingDoc(true);
      const toastId = toast.loading(`Uploading ${file.name}...`);
      try {
        const res = await uploadFile({
          file,
          path: 'phase_i_esa',
          projectId: project.id,
        });
        await onSaveFinancials({
          phaseIDocumentUrl: res.downloadUrl,
          phaseIDocumentName: file.name,
        });
        toast.success('Phase I ESA uploaded successfully!', { id: toastId });
      } catch (err: any) {
        console.error('Upload failed:', err);
        toast.error(`Upload failed: ${err.message || 'Unknown error'}`, { id: toastId });
      } finally {
        setUploadingDoc(false);
      }
    };
    input.click();
  };

  const handleRemoveDoc = async () => {
    if (readOnly) return;
    try {
      await onSaveFinancials({
        phaseIDocumentUrl: null,
        phaseIDocumentName: null,
      });
      toast.success('Phase I ESA removed');
    } catch (err) {
      console.error('Failed to remove Phase I ESA:', err);
      toast.error('Failed to remove Phase I ESA');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 animate-pulse" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Phase I Environmental Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">Environmental Site Assessment</span>
      </div>

      {/* Waived Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Waive Phase I ESA Requirement</span>
          <span className="text-[10px] text-[#9E9DA0]/80">Waive environmental review for this transaction</span>
        </div>
        <button
          type="button"
          id="phaseI-waive-toggle"
          disabled={readOnly}
          onClick={() => {
            const updated = !waived;
            setWaived(updated);
            handleSaveField('phaseIWaived', updated);
            if (!updated) {
              setWaiverReason('');
              handleSaveField('phaseIWaiverReason', '');
            }
          }}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
            waived
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-extrabold'
              : 'bg-white/5 border-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
          }`}
        >
          {waived ? 'Waived' : 'Active'}
        </button>
      </div>

      {/* Waiver Reason Field */}
      {waived ? (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <label className="block text-xs font-bold text-red-400 uppercase tracking-wider">
            Waiver Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="phaseI-waiver-reason"
            value={waiverReason}
            onChange={(e) => setWaiverReason(e.target.value)}
            onBlur={() => handleSaveField('phaseIWaiverReason', waiverReason)}
            disabled={readOnly}
            placeholder="Type reason for waiving Phase I ESA (e.g. low environmental risk, residential history)"
            className="px-4 py-2 w-full bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-400/50 disabled:opacity-50"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Environmental Consultant */}
            <div>
              <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Environmental Consultant (Vendor)</label>
              <input
                type="text"
                id="phaseI-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                onBlur={() => handleSaveField('phaseIVendor', vendor)}
                disabled={readOnly}
                placeholder="Enter environmental firm name"
                className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Date Ordered</label>
                <input
                  type="date"
                  id="phaseI-ordered-date"
                  value={orderedDate}
                  onChange={(e) => {
                    setOrderedDate(e.target.value);
                    handleSaveField('phaseIOrderedDate', e.target.value);
                  }}
                  disabled={readOnly}
                  className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Date Completed</label>
                <input
                  type="date"
                  id="phaseI-completed-date"
                  value={completedDate}
                  onChange={(e) => {
                    setCompletedDate(e.target.value);
                    handleSaveField('phaseICompletedDate', e.target.value);
                  }}
                  disabled={readOnly}
                  className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Structured Findings */}
          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Structured Findings</label>
            <textarea
              id="phaseI-findings"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              onBlur={() => handleSaveField('phaseIFindings', findings)}
              disabled={readOnly}
              placeholder="Detail RECs (Recognized Environmental Conditions) identified, soil contamination, historical hazards, etc..."
              className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50 h-20 resize-none"
            />
          </div>

          {/* Document Upload */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Phase I ESA Report Document</label>
            {financials.phaseIDocumentUrl ? (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#454955]" />
                  <span className="text-xs text-white font-bold flex items-center gap-1.5">
                    {financials.phaseIDocumentName || 'Phase_I_ESA_Report.pdf'}
                    {IS_DEMO_MODE && <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans">Demo</span>}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    onClick={handleRemoveDoc}
                    className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                id="phaseI-upload-btn"
                onClick={handleUploadDoc}
                disabled={uploadingDoc || readOnly}
                className="w-full py-4 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all text-[#9E9DA0] hover:text-white disabled:opacity-50"
              >
                {uploadingDoc ? (
                  <>
                    <div className="w-5 h-5 border-2 rounded-full border-white/20 border-t-white animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Uploading Report...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Upload Phase I ESA Report PDF {IS_DEMO_MODE && <span className="text-amber-500 ml-1">(Demo)</span>}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
