'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, Trash2, Info, ShieldAlert, Bug, Paintbrush, AlertTriangle } from 'lucide-react';
import type { Project } from '@/types/schema';
import toast from 'react-hot-toast';

interface AgeConditionalTestsCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function AgeConditionalTestsCard({
  project,
  onSaveFinancials,
  phaseColor = '#454955',
  readOnly = false,
}: AgeConditionalTestsCardProps) {
  const financials = project.financials || {};

  // Local Form states
  const [radonStatus, setRadonStatus] = useState(financials.radon_test_status || 'pending');
  const [radonResult, setRadonResult] = useState(financials.radon_test_result || '');
  const [leadStatus, setLeadStatus] = useState(financials.lead_test_status || 'pending');
  const [leadResult, setLeadResult] = useState(financials.lead_test_result || '');
  const [termiteStatus, setTermiteStatus] = useState(financials.termite_test_status || 'pending');
  const [termiteResult, setTermiteResult] = useState(financials.termite_test_result || '');

  // File Upload states
  const [uploadingRadon, setUploadingRadon] = useState(false);
  const [uploadingLead, setUploadingLead] = useState(false);
  const [uploadingTermite, setUploadingTermite] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setRadonStatus(financials.radon_test_status || 'pending');
    setRadonResult(financials.radon_test_result || '');
    setLeadStatus(financials.lead_test_status || 'pending');
    setLeadResult(financials.lead_test_result || '');
    setTermiteStatus(financials.termite_test_status || 'pending');
    setTermiteResult(financials.termite_test_result || '');
  }, [project]);

  const handleSaveField = async (fieldName: string, value: any) => {
    try {
      await onSaveFinancials({ [fieldName]: value });
    } catch (err) {
      console.error(`Failed to save ${fieldName}:`, err);
      toast.error('Failed to save changes');
    }
  };

  const handleUploadDoc = async (type: 'radon' | 'lead' | 'termite') => {
    if (readOnly) return;
    if (type === 'radon') setUploadingRadon(true);
    if (type === 'lead') setUploadingLead(true);
    if (type === 'termite') setUploadingTermite(true);

    await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      const docName = type === 'radon' ? 'Radon_Test_Report.pdf' 
                    : type === 'lead' ? 'Lead_Paint_Report.pdf' 
                    : 'Termite_Inspection_Report.pdf';
      const docUrl = `/mock/documents/${docName}`;
      
      await onSaveFinancials({
        [`${type}DocumentUrl`]: docUrl,
        [`${type}DocumentName`]: docName,
      });
      toast.success(`${type.toUpperCase()} report uploaded successfully!`);
    } catch (err) {
      console.error(`Failed to upload ${type} report:`, err);
      toast.error(`Failed to upload ${type} report`);
    } finally {
      if (type === 'radon') setUploadingRadon(false);
      if (type === 'lead') setUploadingLead(false);
      if (type === 'termite') setUploadingTermite(false);
    }
  };

  const handleRemoveDoc = async (type: 'radon' | 'lead' | 'termite') => {
    if (readOnly) return;
    try {
      await onSaveFinancials({
        [`${type}DocumentUrl`]: null,
        [`${type}DocumentName`]: null,
      });
      toast.success(`${type.toUpperCase()} report removed`);
    } catch (err) {
      console.error(`Failed to remove ${type} report:`, err);
      toast.error(`Failed to remove ${type} report`);
    }
  };

  const year = project.yearBuilt || project.propertyFacts?.yearBuilt || 0;
  const isOlderHome = year > 0 && year < 1978;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 animate-pulse" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Age-Conditional Tests</h3>
        </div>
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded">
          {isOlderHome ? `Pre-1978 Home (${year})` : 'Inspector Recommended'}
        </span>
      </div>

      <div className="space-y-6">
        {/* 1. Radon Test Section */}
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Radon Test</span>
                <span className="text-[9px] text-[#9E9DA0]">Odorless radioactive soil gas test</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Status</label>
              <select
                id="radon-status-select"
                value={radonStatus}
                onChange={(e) => {
                  const val = e.target.value as 'pending' | 'ordered' | 'completed' | 'waived';
                  setRadonStatus(val);
                  handleSaveField('radon_test_status', val);
                }}
                disabled={readOnly}
                className="px-4 py-2 w-full bg-[#0d0a0b] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="ordered">Ordered</option>
                <option value="completed">Completed</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            {radonStatus === 'completed' && (
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Findings / Measurement</label>
                <input
                  type="text"
                  id="radon-result-input"
                  value={radonResult}
                  onChange={(e) => setRadonResult(e.target.value)}
                  onBlur={() => handleSaveField('radon_test_result', radonResult)}
                  disabled={readOnly}
                  placeholder="e.g. 2.4 pCi/L (Passed)"
                  className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
            )}
          </div>
          {/* Document Upload */}
          {radonStatus === 'completed' && (
            <div className="pt-2 border-t border-white/5">
              {financials.radonDocumentUrl ? (
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#454955]" />
                    <span className="text-[11px] text-white font-bold">{financials.radonDocumentName || 'Radon_Report.pdf'}</span>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveDoc('radon')}
                      className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  id="radon-upload-btn"
                  onClick={() => handleUploadDoc('radon')}
                  disabled={uploadingRadon || readOnly}
                  className="w-full py-2 border border-dashed border-white/10 hover:border-white/20 rounded-lg flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 transition-all text-[10px] font-bold uppercase text-[#9E9DA0] hover:text-white disabled:opacity-50"
                >
                  {uploadingRadon ? (
                    <div className="w-3 h-3 border border-white/20 border-t-white animate-spin rounded-full" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  Upload Radon Report
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Lead Test Section */}
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Paintbrush className="w-4 h-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Lead Paint Test</span>
                <span className="text-[9px] text-[#9E9DA0]">Check for toxic lead-based paints</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Status</label>
              <select
                id="lead-status-select"
                value={leadStatus}
                onChange={(e) => {
                  const val = e.target.value as 'pending' | 'ordered' | 'completed' | 'waived';
                  setLeadStatus(val);
                  handleSaveField('lead_test_status', val);
                }}
                disabled={readOnly}
                className="px-4 py-2 w-full bg-[#0d0a0b] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="ordered">Ordered</option>
                <option value="completed">Completed</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            {leadStatus === 'completed' && (
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Findings / Measurement</label>
                <input
                  type="text"
                  id="lead-result-input"
                  value={leadResult}
                  onChange={(e) => setLeadResult(e.target.value)}
                  onBlur={() => handleSaveField('lead_test_result', leadResult)}
                  disabled={readOnly}
                  placeholder="e.g. Negative (No lead paint detected)"
                  className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
            )}
          </div>
          {/* Document Upload */}
          {leadStatus === 'completed' && (
            <div className="pt-2 border-t border-white/5">
              {financials.leadDocumentUrl ? (
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#454955]" />
                    <span className="text-[11px] text-white font-bold">{financials.leadDocumentName || 'Lead_Paint_Report.pdf'}</span>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveDoc('lead')}
                      className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  id="lead-upload-btn"
                  onClick={() => handleUploadDoc('lead')}
                  disabled={uploadingLead || readOnly}
                  className="w-full py-2 border border-dashed border-white/10 hover:border-white/20 rounded-lg flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 transition-all text-[10px] font-bold uppercase text-[#9E9DA0] hover:text-white disabled:opacity-50"
                >
                  {uploadingLead ? (
                    <div className="w-3 h-3 border border-white/20 border-t-white animate-spin rounded-full" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  Upload Lead Report
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Termite / WDI Section */}
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                <Bug className="w-4 h-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Termite / WDI Inspection</span>
                <span className="text-[9px] text-[#9E9DA0]">Check structural wood-destroying insects</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Status</label>
              <select
                id="termite-status-select"
                value={termiteStatus}
                onChange={(e) => {
                  const val = e.target.value as 'pending' | 'ordered' | 'completed' | 'waived';
                  setTermiteStatus(val);
                  handleSaveField('termite_test_status', val);
                }}
                disabled={readOnly}
                className="px-4 py-2 w-full bg-[#0d0a0b] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="ordered">Ordered</option>
                <option value="completed">Completed</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            {termiteStatus === 'completed' && (
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Findings / Measurement</label>
                <input
                  type="text"
                  id="termite-result-input"
                  value={termiteResult}
                  onChange={(e) => setTermiteResult(e.target.value)}
                  onBlur={() => handleSaveField('termite_test_result', termiteResult)}
                  disabled={readOnly}
                  placeholder="e.g. Activity detected in garage sill plates"
                  className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
                />
              </div>
            )}
          </div>
          {/* Document Upload */}
          {termiteStatus === 'completed' && (
            <div className="pt-2 border-t border-white/5">
              {financials.termiteDocumentUrl ? (
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#454955]" />
                    <span className="text-[11px] text-white font-bold">{financials.termiteDocumentName || 'Termite_Report.pdf'}</span>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveDoc('termite')}
                      className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  id="termite-upload-btn"
                  onClick={() => handleUploadDoc('termite')}
                  disabled={uploadingTermite || readOnly}
                  className="w-full py-2 border border-dashed border-white/10 hover:border-white/20 rounded-lg flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 transition-all text-[10px] font-bold uppercase text-[#9E9DA0] hover:text-white disabled:opacity-50"
                >
                  {uploadingTermite ? (
                    <div className="w-3 h-3 border border-white/20 border-t-white animate-spin rounded-full" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  Upload Termite Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
