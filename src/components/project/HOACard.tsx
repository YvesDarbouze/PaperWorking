'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, Trash2, Info, Landmark, AlertTriangle } from 'lucide-react';
import type { Project } from '@/types/schema';
import toast from 'react-hot-toast';
import { uploadFile } from '@/lib/storage/uploadService';
import { IS_DEMO_MODE } from '@/lib/config/demo';

interface HOACardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function HOACard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: HOACardProps) {
  const financials = project.financials || {};

  // Local Form states
  const [vendor, setVendor] = useState(financials.hoaVendor || '');
  const [orderedDate, setOrderedDate] = useState(financials.hoaOrderedDate || '');
  const [completedDate, setCompletedDate] = useState(financials.hoaCompletedDate || '');
  const [rentalRestrictionsExist, setRentalRestrictionsExist] = useState(!!financials.hoaRentalRestrictionsExist);
  const [rentalRestrictionsDetails, setRentalRestrictionsDetails] = useState(financials.hoaRentalRestrictionsDetails || '');
  const [waived, setWaived] = useState(!!financials.hoaWaived);
  const [waiverReason, setWaiverReason] = useState(financials.hoaWaiverReason || '');

  // File Upload states
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setVendor(financials.hoaVendor || '');
    setOrderedDate(financials.hoaOrderedDate || '');
    setCompletedDate(financials.hoaCompletedDate || '');
    setRentalRestrictionsExist(!!financials.hoaRentalRestrictionsExist);
    setRentalRestrictionsDetails(financials.hoaRentalRestrictionsDetails || '');
    setWaived(!!financials.hoaWaived);
    setWaiverReason(financials.hoaWaiverReason || '');
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
          hoaDocumentUrl: '/mock/documents/HOA_CCandRs_Bylaws.pdf',
          hoaDocumentName: 'HOA_CCandRs_Bylaws.pdf',
        });
        toast.success('HOA CC&Rs uploaded successfully! (Demo)');
      } catch (err) {
        console.error('Failed to upload HOA CC&Rs:', err);
        toast.error('Failed to upload HOA CC&Rs');
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
          path: 'hoa_docs',
          projectId: project.id,
        });
        await onSaveFinancials({
          hoaDocumentUrl: res.downloadUrl,
          hoaDocumentName: file.name,
        });
        toast.success('HOA CC&Rs uploaded successfully!', { id: toastId });
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
        hoaDocumentUrl: null,
        hoaDocumentName: null,
      });
      toast.success('HOA CC&Rs removed');
    } catch (err) {
      console.error('Failed to remove HOA CC&Rs:', err);
      toast.error('Failed to remove HOA CC&Rs');
    }
  };

  // Cross-check: Warn if rental restrictions exist but the strategy is RENT or LEASE
  const hasRentalConflict = rentalRestrictionsExist && (project.dispositionType === 'RENT' || project.dispositionType === 'LEASE');

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 animate-pulse" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">HOA Review Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">CC&amp;R &amp; Bylaws Audit</span>
      </div>

      {/* Waived Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Waive HOA Review Requirement</span>
          <span className="text-[10px] text-[#9E9DA0]/80">Waive HOA document audit for this transaction</span>
        </div>
        <button
          type="button"
          id="hoa-waive-toggle"
          disabled={readOnly}
          onClick={() => {
            const updated = !waived;
            setWaived(updated);
            handleSaveField('hoaWaived', updated);
            if (!updated) {
              setWaiverReason('');
              handleSaveField('hoaWaiverReason', '');
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
            id="hoa-waiver-reason"
            value={waiverReason}
            onChange={(e) => {
              setWaiverReason(e.target.value);
              handleSaveField('hoaWaiverReason', e.target.value);
            }}
            placeholder="Type waiver reason here..."
            disabled={readOnly}
            className="px-4 py-2 w-full bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-400/50 disabled:opacity-50"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Conflict Warning Banner */}
          {hasRentalConflict && (
            <div
              className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-400 font-medium animate-in shake duration-300"
              id="hoa-rental-conflict-warning"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-500">Rental Restrictions Warning</h5>
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Conflict Warning: Rental restrictions exist in CC&amp;R but the disposition type is set to {project.dispositionType}.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HOA Vendor */}
            <div>
              <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">HOA / Association (Vendor)</label>
              <input
                type="text"
                id="hoa-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                onBlur={() => handleSaveField('hoaVendor', vendor)}
                disabled={readOnly}
                placeholder="Enter HOA management name"
                className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Date Ordered</label>
                <input
                  type="date"
                  id="hoa-ordered-date"
                  value={orderedDate}
                  onChange={(e) => {
                    setOrderedDate(e.target.value);
                    handleSaveField('hoaOrderedDate', e.target.value);
                  }}
                  disabled={readOnly}
                  className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Date Completed</label>
                <input
                  type="date"
                  id="hoa-completed-date"
                  value={completedDate}
                  onChange={(e) => {
                    setCompletedDate(e.target.value);
                    handleSaveField('hoaCompletedDate', e.target.value);
                  }}
                  disabled={readOnly}
                  className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Rental Restrictions Toggle */}
          <div
            id="hoa-rental-restrictions-toggle"
            onClick={() => {
              if (readOnly) return;
              const updated = !rentalRestrictionsExist;
              setRentalRestrictionsExist(updated);
              handleSaveField('hoaRentalRestrictionsExist', updated);
            }}
            className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
              rentalRestrictionsExist
                ? 'border-white/10 bg-[#454955]/10 text-white font-medium'
                : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-wider">CC&amp;R Rental Restrictions Exist</span>
              <span className="text-[10px] text-[#9E9DA0]/80">Confirm if bylaws restrict renting or leasing units</span>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              rentalRestrictionsExist ? 'bg-[#454955] border-[#454955]' : 'border-white/20'
            }`} id="hoa-rental-restrictions-checkbox">
              {rentalRestrictionsExist && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
          </div>

          {/* Structured Details */}
          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Rental Restrictions &amp; Bylaw Notes</label>
            <textarea
              id="hoa-restrictions-details"
              value={rentalRestrictionsDetails}
              onChange={(e) => setRentalRestrictionsDetails(e.target.value)}
              onBlur={() => handleSaveField('hoaRentalRestrictionsDetails', rentalRestrictionsDetails)}
              disabled={readOnly}
              placeholder="Detail rental cap percentage, minimum lease length, pet policy, approval timelines, etc..."
              className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50 h-20 resize-none"
            />
          </div>

          {/* Document Upload */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">HOA CC&amp;Rs &amp; Bylaws Documents</label>
            {financials.hoaDocumentUrl ? (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#454955]" />
                  <span className="text-xs text-white font-bold flex items-center gap-1.5">
                    {financials.hoaDocumentName || 'HOA_CCandRs_Bylaws.pdf'}
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
                id="hoa-upload-btn"
                onClick={handleUploadDoc}
                disabled={uploadingDoc || readOnly}
                className="w-full py-4 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all text-[#9E9DA0] hover:text-white disabled:opacity-50"
              >
                {uploadingDoc ? (
                  <>
                    <div className="w-5 h-5 border-2 rounded-full border-white/20 border-t-white animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Uploading CC&amp;Rs...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Upload HOA CC&amp;Rs / Bylaws PDF {IS_DEMO_MODE && <span className="text-amber-500 ml-1">(Demo)</span>}
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
