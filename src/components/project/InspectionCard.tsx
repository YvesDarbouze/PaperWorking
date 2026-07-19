'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, CheckCircle, Clock, Plus, Trash2, ShieldAlert, AlertTriangle, AlertCircle, Info, Image } from 'lucide-react';
import type { Project, InspectionFinding } from '@/types/schema';
import toast from 'react-hot-toast';

interface InspectionCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function InspectionCard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: InspectionCardProps) {
  const financials = project.financials || {};

  // Local Form states
  const [inspector, setInspector] = useState(financials.inspectionInspector || '');
  const [date, setDate] = useState(financials.inspectionDate || '');
  const [findings, setFindings] = useState<InspectionFinding[]>(financials.inspectionFindings || []);
  const [referrals, setReferrals] = useState<string[]>(financials.inspectionReferrals || []);
  const [newReferral, setNewReferral] = useState('');
  const [decision, setDecision] = useState<'proceed' | 'renegotiate' | 'walk' | ''>(financials.inspectionDecision || '');
  const [note, setNote] = useState(financials.inspectionNote || '');
  const [inspectionStatus, setInspectionStatus] = useState(financials.inspection_status || 'pending');
  const [inspectionFindings, setInspectionFindings] = useState(financials.inspection_findings || '');
  const [inspectorFlagged, setInspectorFlagged] = useState(financials.inspector_flagged_specialty_tests || false);

  // File Upload states
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setInspector(financials.inspectionInspector || '');
    setDate(financials.inspectionDate || '');
    setFindings(financials.inspectionFindings || []);
    setReferrals(financials.inspectionReferrals || []);
    setDecision(financials.inspectionDecision || '');
    setNote(financials.inspectionNote || '');
    setInspectionStatus(financials.inspection_status || 'pending');
    setInspectionFindings(financials.inspection_findings || '');
    setInspectorFlagged(financials.inspector_flagged_specialty_tests || false);
  }, [project]);

  // Compute Major-Item Cost Sum (Critical or Major severities)
  const majorCostSum = findings
    .filter(f => f.severity === 'Critical' || f.severity === 'Major')
    .reduce((sum, f) => sum + (Number(f.repairCost) || 0), 0);

  const handleSaveField = async (fieldName: string, value: any) => {
    try {
      await onSaveFinancials({ [fieldName]: value });
    } catch (err) {
      console.error(`Failed to save ${fieldName}:`, err);
      toast.error('Failed to save changes');
    }
  };

  const addFinding = () => {
    if (readOnly) return;
    const newFinding: InspectionFinding = {
      id: crypto.randomUUID(),
      system: 'Roof',
      severity: 'Minor',
      repairCost: 0,
      notes: '',
    };
    const updated = [...findings, newFinding];
    setFindings(updated);
    handleSaveField('inspectionFindings', updated);
  };

  const updateFinding = (id: string, field: keyof InspectionFinding, value: any) => {
    if (readOnly) return;
    const updated = findings.map(f => {
      if (f.id === id) {
        return { ...f, [field]: value };
      }
      return f;
    });
    setFindings(updated);
    handleSaveField('inspectionFindings', updated);
  };

  const removeFinding = (id: string) => {
    if (readOnly) return;
    const updated = findings.filter(f => f.id !== id);
    setFindings(updated);
    handleSaveField('inspectionFindings', updated);
  };

  const handleAddReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !newReferral.trim()) return;
    const updated = [...referrals, newReferral.trim()];
    setReferrals(updated);
    setNewReferral('');
    handleSaveField('inspectionReferrals', updated);
  };

  const handleRemoveReferral = (index: number) => {
    if (readOnly) return;
    const updated = referrals.filter((_, i) => i !== index);
    setReferrals(updated);
    handleSaveField('inspectionReferrals', updated);
  };

  const triggerReportUpload = () => {
    if (readOnly) return;
    setUploadingReport(true);
    setTimeout(async () => {
      setUploadingReport(false);
      await onSaveFinancials({
        inspectionReportUrl: '/mock/documents/Inspection_Report.pdf',
        inspectionReportName: 'Inspection_Report.pdf',
      });
      toast.success('Inspection report uploaded successfully');
    }, 800);
  };

  const triggerPhotosUpload = () => {
    if (readOnly) return;
    setUploadingPhotos(true);
    setTimeout(async () => {
      setUploadingPhotos(false);
      await onSaveFinancials({
        inspectionPhotosUrl: '/mock/documents/Inspection_Photos.zip',
        inspectionPhotosName: 'Inspection_Photos.zip',
      });
      toast.success('Inspection photos uploaded successfully');
    }, 800);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Property Inspection Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">Due Diligence Phase</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inspector Name */}
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Inspector (Vendor)</label>
          <input
            type="text"
            id="inspection-inspector"
            value={inspector}
            onChange={(e) => setInspector(e.target.value)}
            onBlur={() => handleSaveField('inspectionInspector', inspector)}
            disabled={readOnly}
            placeholder="Enter inspector/company name"
            className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
          />
        </div>

        {/* Inspection Date */}
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Inspection Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#454955]" />
            <input
              type="date"
              id="inspection-date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                handleSaveField('inspectionDate', e.target.value);
              }}
              disabled={readOnly}
              className="pl-10 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
            />
          </div>
        </div>

        {/* Inspection Status */}
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Inspection Status</label>
          <select
            id="inspection-status-select"
            value={inspectionStatus}
            onChange={(e) => {
              const val = e.target.value as 'pending' | 'scheduled' | 'completed' | 'cancelled';
              setInspectionStatus(val);
              handleSaveField('inspection_status', val);
            }}
            disabled={readOnly}
            className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
          >
            <option value="pending" className="bg-[#0d0a0b] text-white">Pending</option>
            <option value="scheduled" className="bg-[#0d0a0b] text-white">Scheduled</option>
            <option value="completed" className="bg-[#0d0a0b] text-white">Completed</option>
            <option value="cancelled" className="bg-[#0d0a0b] text-white">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Inspection Findings Summary */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Inspection Findings (Summary)</label>
          <textarea
            id="inspection-findings-summary"
            value={inspectionFindings}
            onChange={(e) => setInspectionFindings(e.target.value)}
            onBlur={() => handleSaveField('inspection_findings', inspectionFindings)}
            disabled={readOnly}
            placeholder="Enter a summary of findings (e.g. Roof needs repair, HVAC is in good condition)."
            className="w-full h-20 p-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#454955] resize-none disabled:opacity-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="inspector-flagged-specialty-tests"
            checked={inspectorFlagged}
            onChange={(e) => {
              const val = e.target.checked;
              setInspectorFlagged(val);
              handleSaveField('inspector_flagged_specialty_tests', val);
            }}
            disabled={readOnly}
            className="rounded border-white/10 bg-white/5 text-[#454955] focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="inspector-flagged-specialty-tests" className="text-xs text-[#9E9DA0] select-none cursor-pointer">
            Inspector recommended specialty tests (Radon, Lead, or Termite)
          </label>
        </div>
      </div>

      {/* Findings by System */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Inspection Findings By System</h4>
          {!readOnly && (
            <button
              onClick={addFinding}
              className="text-[10px] font-bold uppercase tracking-wider text-[#454955] hover:text-[#454955]/80 flex items-center gap-1"
              id="add-finding-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add Finding
            </button>
          )}
        </div>

        {findings.length === 0 ? (
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-[#9E9DA0]/60">
            No inspection findings logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((f) => (
              <div key={f.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* System */}
                  <div className="md:col-span-3">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9E9DA0] mb-1 font-bold">System</label>
                    <select
                      value={f.system}
                      onChange={(e) => updateFinding(f.id, 'system', e.target.value)}
                      disabled={readOnly}
                      data-testid="finding-system"
                      className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
                    >
                      {['Roof', 'HVAC', 'Electrical', 'Plumbing', 'Structural', 'Foundation', 'Interior', 'Exterior', 'Other'].map(sys => (
                        <option key={sys} value={sys} className="bg-pw-night-bg text-white">{sys}</option>
                      ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div className="md:col-span-3">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9E9DA0] mb-1 font-bold">Severity</label>
                    <select
                      value={f.severity}
                      onChange={(e) => updateFinding(f.id, 'severity', e.target.value)}
                      disabled={readOnly}
                      data-testid="finding-severity"
                      className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
                    >
                      <option value="Critical" className="bg-pw-night-bg text-[#F06543]">Critical</option>
                      <option value="Major" className="bg-pw-night-bg text-amber-500">Major</option>
                      <option value="Minor" className="bg-pw-night-bg text-blue-400">Minor</option>
                    </select>
                  </div>

                  {/* Repair Cost */}
                  <div className="md:col-span-3">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9E9DA0] mb-1 font-bold">Repair Cost ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#454955]" />
                      <input
                        type="number"
                        value={f.repairCost || ''}
                        onChange={(e) => updateFinding(f.id, 'repairCost', Number(e.target.value))}
                        disabled={readOnly}
                        placeholder="0"
                        data-testid="finding-cost"
                        className="pl-8 pr-2 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
                      />
                    </div>
                  </div>

                  {/* Notes / Description */}
                  <div className="md:col-span-2">
                    <label className="block text-[9px] uppercase tracking-wider text-[#9E9DA0] mb-1 font-bold">Notes</label>
                    <input
                      type="text"
                      value={f.notes || ''}
                      onChange={(e) => updateFinding(f.id, 'notes', e.target.value)}
                      disabled={readOnly}
                      placeholder="e.g. cracked shingles"
                      data-testid="finding-notes"
                      className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 flex justify-end">
                    {!readOnly && (
                      <button
                        onClick={() => removeFinding(f.id)}
                        className="p-1.5 text-[#F06543] hover:bg-[#F06543]/10 rounded-lg transition-all mt-4 md:mt-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Major-Item Cost Sum Display */}
      <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Major-Item Cost Sum</span>
        </div>
        <span className="text-sm font-extrabold text-white" id="major-items-cost-sum">
          ${majorCostSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Specialist Referrals */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Specialist Referrals Needed</label>
        
        {!readOnly && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newReferral}
              onChange={(e) => setNewReferral(e.target.value)}
              placeholder="e.g. Structural Engineer, Electrician"
              className="px-4 py-2 flex-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#454955]"
            />
            <button
              type="button"
              id="add-referral-btn"
              onClick={(e) => {
                if (readOnly || !newReferral.trim()) return;
                const updated = [...referrals, newReferral.trim()];
                setReferrals(updated);
                setNewReferral('');
                handleSaveField('inspectionReferrals', updated);
              }}
              className="px-4 py-2 text-xs font-bold bg-[#262328] hover:bg-[#262328]/80 text-[#454955] rounded-lg transition-all"
            >
              Add
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {referrals.map((ref, idx) => (
            <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white font-medium">
              {ref}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveReferral(idx)}
                  className="text-[#F06543] hover:text-[#F06543]/80 font-bold"
                >
                  &times;
                </button>
              )}
            </span>
          ))}
          {referrals.length === 0 && (
            <span className="text-xs text-[#9E9DA0]/50 italic">No specialist referrals added.</span>
          )}
        </div>
      </div>

      {/* Report & Photos Document Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-white/5 py-4">
        {/* Report upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Inspection Report Document</label>
          {financials.inspectionReportUrl ? (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#454955]" />
                <span className="text-xs text-white font-bold">{financials.inspectionReportName || 'Inspection_Report.pdf'}</span>
              </div>
              {!readOnly && (
                <button
                  onClick={async () => {
                    await onSaveFinancials({ inspectionReportUrl: null, inspectionReportName: null });
                    toast.success('Inspection report removed');
                  }}
                  className="text-xs text-[#F06543] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={triggerReportUpload}
              disabled={readOnly || uploadingReport}
              className="w-full p-4 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-2 text-xs text-[#9E9DA0] hover:text-white transition-all bg-white/5"
            >
              {uploadingReport ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Upload Inspection Report PDF
                </>
              )}
            </button>
          )}
        </div>

        {/* Photos Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Inspection Photos ZIP</label>
          {financials.inspectionPhotosUrl ? (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-[#454955]" />
                <span className="text-xs text-white font-bold">{financials.inspectionPhotosName || 'Inspection_Photos.zip'}</span>
              </div>
              {!readOnly && (
                <button
                  onClick={async () => {
                    await onSaveFinancials({ inspectionPhotosUrl: null, inspectionPhotosName: null });
                    toast.success('Inspection photos removed');
                  }}
                  className="text-xs text-[#F06543] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={triggerPhotosUpload}
              disabled={readOnly || uploadingPhotos}
              className="w-full p-4 border border-dashed border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-2 text-xs text-[#9E9DA0] hover:text-white transition-all bg-white/5"
            >
              {uploadingPhotos ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Upload Photos Package ZIP
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Proceed / Renegotiate / Walk Note */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Inspection Decision</label>
          <div className="flex gap-2">
            {[
              { val: 'proceed', label: 'Proceed', activeClass: 'bg-green-500/20 border-green-500/40 text-green-400' },
              { val: 'renegotiate', label: 'Renegotiate', activeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-400' },
              { val: 'walk', label: 'Walk / Cancel', activeClass: 'bg-red-500/20 border-red-500/40 text-red-400' },
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  setDecision(opt.val as any);
                  handleSaveField('inspectionDecision', opt.val);
                }}
                disabled={readOnly}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase border transition-all ${
                  decision === opt.val
                    ? opt.activeClass
                    : 'bg-white/5 border-white/10 text-[#9E9DA0] hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Proceed / Renegotiate / Walk Note</label>
          <textarea
            id="inspection-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => handleSaveField('inspectionNote', note)}
            disabled={readOnly}
            placeholder="Enter rationale for the inspection decision, counter-offer details, or structural concerns."
            className="w-full h-24 p-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#454955] resize-none disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
