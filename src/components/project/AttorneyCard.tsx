'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, Trash2, Info, Landmark } from 'lucide-react';
import type { Project } from '@/types/schema';
import toast from 'react-hot-toast';

interface AttorneyCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function AttorneyCard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: AttorneyCardProps) {
  const financials = project.financials || {};

  // Local Form states
  const [vendor, setVendor] = useState(financials.attorneyVendor || '');
  const [orderedDate, setOrderedDate] = useState(financials.attorneyOrderedDate || '');
  const [completedDate, setCompletedDate] = useState(financials.attorneyCompletedDate || '');
  const [findings, setFindings] = useState(financials.attorneyFindings || '');
  const [waived, setWaived] = useState(!!financials.attorneyWaived);
  const [waiverReason, setWaiverReason] = useState(financials.attorneyWaiverReason || '');

  // File Upload states
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setVendor(financials.attorneyVendor || '');
    setOrderedDate(financials.attorneyOrderedDate || '');
    setCompletedDate(financials.attorneyCompletedDate || '');
    setFindings(financials.attorneyFindings || '');
    setWaived(!!financials.attorneyWaived);
    setWaiverReason(financials.attorneyWaiverReason || '');
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
    setUploadingDoc(true);
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await onSaveFinancials({
        attorneyDocumentUrl: '/mock/documents/Attorney_Opinion_Letter.pdf',
        attorneyDocumentName: 'Attorney_Opinion_Letter.pdf',
      });
      toast.success('Attorney opinion letter uploaded!');
    } catch (err) {
      console.error('Failed to upload Attorney opinion:', err);
      toast.error('Failed to upload Attorney opinion');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDoc = async () => {
    if (readOnly) return;
    try {
      await onSaveFinancials({
        attorneyDocumentUrl: null,
        attorneyDocumentName: null,
      });
      toast.success('Attorney opinion letter removed');
    } catch (err) {
      console.error('Failed to remove Attorney opinion:', err);
      toast.error('Failed to remove Attorney opinion');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 animate-pulse" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Attorney Review Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">Legal Document &amp; Close Audit</span>
      </div>

      {/* Waived Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Waive Attorney Review Requirement</span>
          <span className="text-[10px] text-[#9E9DA0]/80">Waive legal counsel review for this transaction</span>
        </div>
        <button
          type="button"
          id="attorney-waive-toggle"
          disabled={readOnly}
          onClick={() => {
            const updated = !waived;
            setWaived(updated);
            handleSaveField('attorneyWaived', updated);
            if (!updated) {
              setWaiverReason('');
              handleSaveField('attorneyWaiverReason', '');
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
            id="attorney-waiver-reason"
            value={waiverReason}
            onChange={(e) => setWaiverReason(e.target.value)}
            onBlur={() => handleSaveField('attorneyWaiverReason', waiverReason)}
            disabled={readOnly}
            placeholder="Type reason for waiving attorney review (e.g. title company handles all closing legalities)"
            className="px-4 py-2 w-full bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-400/50 disabled:opacity-50"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attorney / Firm */}
            <div>
              <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Closing Attorney / Firm (Vendor)</label>
              <input
                type="text"
                id="attorney-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                onBlur={() => handleSaveField('attorneyVendor', vendor)}
                disabled={readOnly}
                placeholder="Enter attorney or law firm name"
                className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Date Ordered</label>
                <input
                  type="date"
                  id="attorney-ordered-date"
                  value={orderedDate}
                  onChange={(e) => {
                    setOrderedDate(e.target.value);
                    handleSaveField('attorneyOrderedDate', e.target.value);
                  }}
                  disabled={readOnly}
                  className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Date Completed</label>
                <input
                  type="date"
                  id="attorney-completed-date"
                  value={completedDate}
                  onChange={(e) => {
                    setCompletedDate(e.target.value);
                    handleSaveField('attorneyCompletedDate', e.target.value);
                  }}
                  disabled={readOnly}
                  className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Structured Findings */}
          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Review Notes &amp; Findings</label>
            <textarea
              id="attorney-findings"
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              onBlur={() => handleSaveField('attorneyFindings', findings)}
              disabled={readOnly}
              placeholder="Detail contract review findings, title/deed exceptions review, or closing package status..."
              className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50 h-20 resize-none"
            />
          </div>

          {/* Document Upload */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Attorney Opinion Letter / Approved Package</label>
            {financials.attorneyDocumentUrl ? (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#454955]" />
                  <span className="text-xs text-white font-bold">{financials.attorneyDocumentName || 'Attorney_Opinion_Letter.pdf'}</span>
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
                id="attorney-upload-btn"
                onClick={handleUploadDoc}
                disabled={uploadingDoc || readOnly}
                className="w-full py-4 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all text-[#9E9DA0] hover:text-white disabled:opacity-50"
              >
                {uploadingDoc ? (
                  <>
                    <div className="w-5 h-5 border-2 rounded-full border-white/20 border-t-white animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Uploading Letter...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Upload Attorney Opinion Letter PDF</span>
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
