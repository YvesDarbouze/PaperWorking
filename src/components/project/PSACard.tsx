'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, DollarSign, FileText, CheckCircle, Clock, Plus, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import type { Project, Contingency } from '@/types/schema';
import toast from 'react-hot-toast';
import { auth as firebaseAuth } from '@/lib/firebase/config';

interface PSACardProps {
  project: Project;
  contingencies: Contingency[];
  onSaveFinancials: (updates: any) => Promise<void>;
  onSaveContingencies: (contingencies: Contingency[]) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

const DEFAULT_DELIVERABLES = [
  "Seller Property Disclosure Statement",
  "HOA Documents, Covenants & Bylaws",
  "Preliminary Title Commitment",
  "Prior Survey & Boundary Maps",
  "Lead-Based Paint Disclosure"
];

export function PSACard({
  project,
  contingencies,
  onSaveFinancials,
  onSaveContingencies,
  phaseColor = '#595959',
  readOnly = false,
}: PSACardProps) {
  const financials = project.financials || {};

  // Form states
  const [effectiveDate, setEffectiveDate] = useState(financials.psaEffectiveDate || '');
  const [ddEndDate, setDdEndDate] = useState(financials.psaDdEndDate || '');
  const [closingDate, setClosingDate] = useState(financials.psaClosingDate || '');
  const [assignability, setAssignability] = useState(financials.psaAssignability || 'Assignable');
  const [deliverables, setDeliverables] = useState<{ text: string; checked: boolean }[]>(
    financials.psaSellerDeliverablesChecklist || 
    DEFAULT_DELIVERABLES.map(d => ({ text: d, checked: false }))
  );

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication token not found. Please log in.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('phase', 'phase-1');
      formData.append('category', 'Purchase Agreement');
      formData.append('documentType', 'purchase_agreement');

      const res = await fetch(`/api/projects/${project.id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      await onSaveFinancials({
        psaDocumentUrl: data.downloadUrl,
        psaDocumentName: file.name,
      });

      toast.success('PSA contract document uploaded successfully!');
    } catch (err: any) {
      console.error('[PSA Upload] error:', err);
      toast.error(err.message || 'Failed to upload PSA document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const contractPrice = (financials.finalAgreedPrice ?? financials.offer_price ?? financials.purchasePrice ?? 0) / 100;

  // Sync state with project model updates
  useEffect(() => {
    setEffectiveDate(financials.psaEffectiveDate || '');
    setDdEndDate(financials.psaDdEndDate || '');
    setClosingDate(financials.psaClosingDate || '');
    setAssignability(financials.psaAssignability || 'Assignable');
    setDeliverables(
      financials.psaSellerDeliverablesChecklist || 
      DEFAULT_DELIVERABLES.map(d => ({ text: d, checked: false }))
    );
  }, [project]);

  // Prefill contingencies from LOI if empty
  useEffect(() => {
    if (contingencies.length === 0 && financials.loiContingencies && financials.loiContingencies.length > 0) {
      const ddDays = financials.loiDueDiligenceDays || 14;
      const baseDate = effectiveDate ? new Date(effectiveDate) : new Date();
      
      const newContingencies: Contingency[] = financials.loiContingencies.map((c: string) => {
        const deadline = new Date(baseDate);
        deadline.setDate(deadline.getDate() + ddDays);
        return {
          id: crypto.randomUUID(),
          type: c as any,
          deadlineDate: deadline,
          isWaived: false,
          isSatisfied: false,
        };
      });
      onSaveContingencies(newContingencies);
    }
  }, [effectiveDate, contingencies]);

  // Calculate default DD and Closing dates from Effective Date + LOI terms if not already set
  const handleEffectiveDateChange = (val: string) => {
    setEffectiveDate(val);
    const updatedUpdates: any = { psaEffectiveDate: val };
    
    if (val) {
      const baseDate = new Date(val);
      
      // Prefill DD end date
      if (!ddEndDate && financials.loiDueDiligenceDays) {
        const ddDate = new Date(baseDate);
        ddDate.setDate(ddDate.getDate() + financials.loiDueDiligenceDays);
        const ddStr = ddDate.toISOString().split('T')[0];
        setDdEndDate(ddStr);
        updatedUpdates.psaDdEndDate = ddStr;
      }
      
      // Prefill Closing date
      if (!closingDate && financials.loiClosingDays) {
        const closeDate = new Date(baseDate);
        closeDate.setDate(closeDate.getDate() + financials.loiClosingDays);
        const closeStr = closeDate.toISOString().split('T')[0];
        setClosingDate(closeStr);
        updatedUpdates.psaClosingDate = closeStr;
      }

      // Update contingency deadlines
      if (contingencies.length > 0) {
        const updated = contingencies.map(c => {
          const ddDays = financials.loiDueDiligenceDays || 14;
          const deadline = new Date(baseDate);
          deadline.setDate(deadline.getDate() + ddDays);
          return { ...c, deadlineDate: deadline };
        });
        onSaveContingencies(updated);
      }
    }
    onSaveFinancials(updatedUpdates);
  };

  const handleSaveField = (fieldName: string, value: any) => {
    onSaveFinancials({ [fieldName]: value });
  };

  const toggleDeliverable = (index: number) => {
    if (readOnly) return;
    const updated = [...deliverables];
    updated[index].checked = !updated[index].checked;
    setDeliverables(updated);
    handleSaveField('psaSellerDeliverablesChecklist', updated);
  };

  const updateContingencyDeadline = (id: string, dateVal: string) => {
    if (readOnly) return;
    const dateObj = dateVal ? new Date(dateVal) : new Date();
    const updated = contingencies.map(c => 
      c.id === id ? { ...c, deadlineDate: dateObj } : c
    );
    onSaveContingencies(updated);
  };

  const toggleContingencyState = (id: string, field: 'isSatisfied' | 'isWaived') => {
    if (readOnly) return;
    const updated = contingencies.map(c => {
      if (c.id === id) {
        const val = !c[field];
        return {
          ...c,
          isSatisfied: field === 'isSatisfied' ? val : false,
          isWaived: field === 'isWaived' ? val : false,
        };
      }
      return c;
    });
    onSaveContingencies(updated);
  };

  const addCustomContingency = () => {
    if (readOnly) return;
    const defaultDate = effectiveDate ? new Date(effectiveDate) : new Date();
    defaultDate.setDate(defaultDate.getDate() + 14);
    
    let typeToUse: 'Appraisal' | 'Inspection' | 'Financing' = 'Appraisal';
    if (contingencies.some(c => c.type === 'Appraisal')) {
      if (!contingencies.some(c => c.type === 'Inspection')) {
        typeToUse = 'Inspection';
      } else if (!contingencies.some(c => c.type === 'Financing')) {
        typeToUse = 'Financing';
      }
    }

    const newContingency: Contingency = {
      id: crypto.randomUUID(),
      type: typeToUse,
      deadlineDate: defaultDate,
      isWaived: false,
      isSatisfied: false,
    };
    onSaveContingencies([...contingencies, newContingency]);
  };

  const removeContingency = (id: string) => {
    if (readOnly) return;
    onSaveContingencies(contingencies.filter(c => c.id !== id));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-white/5 bg-white/5 space-y-6">
      {/* Header Banner */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: phaseColor }}>
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-white" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Purchase &amp; Sale Agreement (PSA)
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Top summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#9E9DA0]/60 block mb-1">Contract Purchase Price</span>
            <span className="text-xl font-bold text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(contractPrice)}
            </span>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#9E9DA0]/60 block mb-1">Assignability Status</span>
            <select
              value={assignability}
              onChange={(e) => {
                setAssignability(e.target.value);
                handleSaveField('psaAssignability', e.target.value);
              }}
              disabled={readOnly}
              className="bg-transparent border-0 text-white font-bold p-0 focus:ring-0 text-sm cursor-pointer"
            >
              <option value="Assignable" className="bg-pw-night-bg">Assignable</option>
              <option value="Not Assignable" className="bg-pw-night-bg">Not Assignable</option>
              <option value="Assignable with Consent" className="bg-pw-night-bg">Assignable with Consent</option>
            </select>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-white/5 pb-6">
          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Effective Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#454955]" />
              <input
                type="date"
                id="psa-effective-date"
                value={effectiveDate}
                onChange={(e) => handleEffectiveDateChange(e.target.value)}
                disabled={readOnly}
                className="pl-10 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">DD End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#454955]" />
              <input
                type="date"
                id="psa-dd-end-date"
                value={ddEndDate}
                onChange={(e) => {
                  setDdEndDate(e.target.value);
                  handleSaveField('psaDdEndDate', e.target.value);
                }}
                disabled={readOnly}
                className="pl-10 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Closing Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#454955]" />
              <input
                type="date"
                id="psa-closing-date"
                value={closingDate}
                onChange={(e) => {
                  setClosingDate(e.target.value);
                  handleSaveField('psaClosingDate', e.target.value);
                }}
                disabled={readOnly}
                className="pl-10 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Contingencies Checklist */}
        <div className="border-b border-white/5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">PSA Contingencies &amp; Deadlines</h4>
            {!readOnly && (
              <button
                onClick={addCustomContingency}
                className="text-[10px] font-bold uppercase tracking-wider text-[#454955] hover:text-[#454955]/80 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Contingency
              </button>
            )}
          </div>

          {contingencies.length === 0 ? (
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-[#9E9DA0]/60">
              No contingencies active. Add one or set the Effective Date to prefill from LOI.
            </div>
          ) : (
            <div className="space-y-3">
              {contingencies.map((c) => {
                let displayDateStr = '';
                if (c.deadlineDate) {
                  const dObj = c.deadlineDate instanceof Date ? c.deadlineDate : new Date(c.deadlineDate);
                  if (!isNaN(dObj.getTime())) {
                    displayDateStr = dObj.toISOString().split('T')[0];
                  }
                }
                const name = c.type;

                return (
                  <div key={c.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5">
                        {c.isSatisfied ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : c.isWaived ? (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{name} Contingency</span>
                        <span className="text-[10px] text-[#9E9DA0]">
                          {c.isSatisfied ? 'Satisfied' : c.isWaived ? 'Waived' : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Deadline input */}
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#454955]" />
                        <input
                          type="date"
                          value={displayDateStr}
                          onChange={(e) => updateContingencyDeadline(c.id, e.target.value)}
                          disabled={readOnly}
                          className="pl-8 pr-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955] w-32"
                        />
                      </div>

                      {/* State buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleContingencyState(c.id, 'isSatisfied')}
                          disabled={readOnly}
                          className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-all border ${
                            c.isSatisfied
                              ? 'bg-green-500/20 border-green-500/40 text-green-400'
                              : 'bg-white/5 border-white/10 text-[#9E9DA0] hover:bg-white/10'
                          }`}
                        >
                          Satisfied
                        </button>
                        <button
                          onClick={() => toggleContingencyState(c.id, 'isWaived')}
                          disabled={readOnly}
                          className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-all border ${
                            c.isWaived
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                              : 'bg-white/5 border-white/10 text-[#9E9DA0] hover:bg-white/10'
                          }`}
                        >
                          Waive
                        </button>
                        {!readOnly && (
                          <button
                            onClick={() => removeContingency(c.id)}
                            className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Seller-Deliverables Checklist */}
        <div className="border-b border-white/5 pb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0] mb-3">Seller-Deliverables Checklist</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deliverables.map((item, idx) => (
              <div
                key={idx}
                onClick={() => toggleDeliverable(idx)}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer select-none ${
                  item.checked
                    ? 'border-white/10 bg-[#454955]/10 text-white font-medium'
                    : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  item.checked ? 'bg-[#454955] border-[#454955]' : 'border-white/20'
                }`}>
                  {item.checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Executed PSA Document Upload */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Executed Purchase &amp; Sale Agreement (PSA) Document</h4>
            <p className="text-[10px] text-[#9E9DA0]/60 mt-1">An executed, signed PSA contract document upload is required for stage completion.</p>
          </div>

          {financials.psaDocumentUrl ? (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#454955]" />
                <div>
                  <p className="text-xs font-bold text-white" id="psa-contract-filename">{financials.psaDocumentName || 'Executed_PSA_Signed.pdf'}</p>
                  <a href={financials.psaDocumentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#454955] hover:underline block mt-0.5">Download Contract</a>
                </div>
              </div>
              <button
                onClick={() => {
                  if (readOnly) return;
                  onSaveFinancials({ psaDocumentUrl: '', psaDocumentName: '' });
                  toast.success('PSA contract document removed.');
                }}
                id="remove-psa-contract-btn"
                disabled={readOnly}
                className="text-xs text-[#F06543] hover:underline animate-fade-in"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-dashed border-white/10 rounded-xl">
              <FileText className="w-8 h-8 text-[#9E9DA0]/40 mb-2" />
              <p className="text-xs text-[#9E9DA0] mb-4">No contract uploaded yet</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="application/pdf"
                className="hidden"
              />
              <button
                onClick={() => {
                  if (readOnly || uploading) return;
                  fileInputRef.current?.click();
                }}
                id="upload-psa-contract-btn"
                disabled={readOnly || uploading}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all flex items-center gap-1.5"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Select &amp; Upload PSA PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
