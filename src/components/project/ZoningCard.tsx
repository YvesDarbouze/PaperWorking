'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, Trash2, Info, Landmark, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { Project } from '@/types/schema';
import toast from 'react-hot-toast';

interface ZoningCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function ZoningCard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: ZoningCardProps) {
  const financials = project.financials || {};

  // Local Form states
  const [classification, setClassification] = useState(financials.zoningClassification || '');
  const [intendedUsePermitted, setIntendedUsePermitted] = useState<boolean>(
    financials.zoningIntendedUsePermitted !== false // Default to true if not explicitly false
  );
  const [coStatus, setCoStatus] = useState(financials.zoningCoStatus || 'Issued');
  const [permitHistory, setPermitHistory] = useState(financials.zoningPermitHistory || '');
  const [violations, setViolations] = useState(financials.zoningViolations || '');

  // File Upload states
  const [uploadingLetter, setUploadingLetter] = useState(false);
  const [uploadingCo, setUploadingCo] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setClassification(financials.zoningClassification || '');
    setIntendedUsePermitted(financials.zoningIntendedUsePermitted !== false);
    setCoStatus(financials.zoningCoStatus || 'Issued');
    setPermitHistory(financials.zoningPermitHistory || '');
    setViolations(financials.zoningViolations || '');
  }, [project]);

  const handleSaveField = async (fieldName: string, value: any) => {
    try {
      await onSaveFinancials({ [fieldName]: value });
    } catch (err) {
      console.error(`Failed to save ${fieldName}:`, err);
      toast.error('Failed to save changes');
    }
  };

  const handleUploadLetter = async () => {
    if (readOnly) return;
    setUploadingLetter(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await onSaveFinancials({
        zoningVerificationLetterUrl: '/mock/documents/Zoning_Verification_Letter.pdf',
        zoningVerificationLetterName: 'Zoning_Verification_Letter.pdf',
      });
      toast.success('Zoning Verification Letter uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload letter');
    } finally {
      setUploadingLetter(false);
    }
  };

  const handleRemoveLetter = async () => {
    if (readOnly) return;
    try {
      await onSaveFinancials({
        zoningVerificationLetterUrl: null,
        zoningVerificationLetterName: null,
      });
      toast.success('Letter removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove letter');
    }
  };

  const handleUploadCo = async () => {
    if (readOnly) return;
    setUploadingCo(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await onSaveFinancials({
        zoningCoDocumentUrl: '/mock/documents/Certificate_of_Occupancy.pdf',
        zoningCoDocumentName: 'Certificate_of_Occupancy.pdf',
      });
      toast.success('Certificate of Occupancy uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload CO');
    } finally {
      setUploadingCo(false);
    }
  };

  const handleRemoveCo = async () => {
    if (readOnly) return;
    try {
      await onSaveFinancials({
        zoningCoDocumentUrl: null,
        zoningCoDocumentName: null,
      });
      toast.success('CO removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove CO');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 animate-pulse" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Zoning &amp; CO Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">Municipal &amp; Land Use Review</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Classification */}
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Zoning Classification</label>
          <input
            type="text"
            id="zoning-classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            onBlur={() => handleSaveField('zoningClassification', classification)}
            disabled={readOnly}
            placeholder="e.g. R-1 (Single-Family Residential)"
            className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50 font-mono"
          />
        </div>

        {/* Intended Use Permitted */}
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Intended Use Permitted?</label>
          <div className="flex gap-3">
            <button
              type="button"
              id="zoning-use-yes"
              disabled={readOnly}
              onClick={async () => {
                setIntendedUsePermitted(true);
                await handleSaveField('zoningIntendedUsePermitted', true);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                intendedUsePermitted === true
                  ? 'bg-green-500/10 border-green-500/30 text-green-400 font-extrabold'
                  : 'bg-white/5 border-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              id="zoning-use-no"
              disabled={readOnly}
              onClick={async () => {
                setIntendedUsePermitted(false);
                await handleSaveField('zoningIntendedUsePermitted', false);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                intendedUsePermitted === false
                  ? 'bg-red-500/15 border-red-500/30 text-red-400 font-extrabold'
                  : 'bg-white/5 border-white/5 text-[#9E9DA0] hover:bg-white/10'
              }`}
            >
              No
            </button>
          </div>
        </div>
      </div>

      {/* Warning banner if intended use is not permitted */}
      {!intendedUsePermitted && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 font-medium animate-in shake duration-300" id="zoning-permitted-warning">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-red-500">Zoning / Intended Use Not Permitted</h5>
            <p className="text-[11px] text-red-400/80 mt-1">
              Warning: Intended use ({project.dispositionType}) is not permitted under the zoning classification. This must be resolved or will flag as an open item.
            </p>
          </div>
        </div>
      )}

      {/* CO Status & Verification Document uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-4">
        {/* Verification Letter Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Zoning Verification Letter</label>
          {financials.zoningVerificationLetterUrl ? (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#454955]" />
                <span className="text-xs text-white font-bold">{financials.zoningVerificationLetterName || 'Zoning_Letter.pdf'}</span>
              </div>
              {!readOnly && (
                <button
                  onClick={handleRemoveLetter}
                  className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              id="zoning-letter-upload-btn"
              onClick={handleUploadLetter}
              disabled={uploadingLetter || readOnly}
              className="w-full py-3 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 transition-all text-[#9E9DA0] hover:text-white disabled:opacity-50"
            >
              {uploadingLetter ? (
                <div className="w-4 h-4 border-2 rounded-full border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Upload Verification Letter</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Certificate of Occupancy (CO) */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">CO Status</label>
            <select
              id="zoning-co-status"
              value={coStatus}
              onChange={(e) => {
                setCoStatus(e.target.value);
                handleSaveField('zoningCoStatus', e.target.value);
              }}
              disabled={readOnly}
              className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
            >
              <option value="Issued">Issued</option>
              <option value="Temporary">Temporary</option>
              <option value="Pending">Pending</option>
              <option value="Not Required">Not Required</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">CO Document</label>
            {financials.zoningCoDocumentUrl ? (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#454955]" />
                  <span className="text-xs text-white font-bold">{financials.zoningCoDocumentName || 'Certificate_of_Occupancy.pdf'}</span>
                </div>
                {!readOnly && (
                  <button
                    onClick={handleRemoveCo}
                    className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                id="zoning-co-upload-btn"
                onClick={handleUploadCo}
                disabled={uploadingCo || readOnly}
                className="w-full py-3 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 transition-all text-[#9E9DA0] hover:text-white disabled:opacity-50"
              >
                {uploadingCo ? (
                  <div className="w-4 h-4 border-2 rounded-full border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Upload CO Document</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Permit History & Violations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Permit History</label>
          <textarea
            id="zoning-permit-history"
            value={permitHistory}
            onChange={(e) => setPermitHistory(e.target.value)}
            onBlur={() => handleSaveField('zoningPermitHistory', permitHistory)}
            disabled={readOnly}
            placeholder="Detail historical permit records, open/closed permits..."
            className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50 h-20 resize-none font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Zoning/Building Violations</label>
          <textarea
            id="zoning-violations"
            value={violations}
            onChange={(e) => setViolations(e.target.value)}
            onBlur={() => handleSaveField('zoningViolations', violations)}
            disabled={readOnly}
            placeholder="List any outstanding municipal/building code violations..."
            className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50 h-20 resize-none font-mono"
          />
        </div>
      </div>
    </div>
  );
}
