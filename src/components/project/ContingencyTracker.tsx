import React, { useEffect, useState } from 'react';
import { Contingency, ContingencyType } from '@/types/schema';
import { Clock, AlertTriangle, CheckCircle, FileText, Bell, Plus, Trash2, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile } from '@/lib/storage/uploadService';
import { IS_DEMO_MODE } from '@/lib/config/demo';

interface ContingencyTrackerProps {
  contingencies: Contingency[];
  onChange: (contingencies: Contingency[]) => void;
  readOnly?: boolean;
  projectId?: string;
}

const DEFAULT_TYPES = ['Inspection', 'Financing', 'Appraisal'];

export function ContingencyTracker({ contingencies = [], onChange, readOnly = false, projectId }: ContingencyTrackerProps) {
  const [activeReminders, setActiveReminders] = useState<{ [key: string]: string }>({});
  const [uploadingIds, setUploadingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Sync reminders log on mount or when contingencies change
    const newReminders: { [key: string]: string } = {};
    contingencies.forEach(c => {
      const days = calculateDaysRemaining(c.deadlineDate);
      if (days !== null && c.reminderSettings && !c.isSatisfied && !c.isWaived) {
        const isT7 = c.reminderSettings.includes('T-7') && days === 7;
        const isT3 = c.reminderSettings.includes('T-3') && days === 3;
        const isT1 = c.reminderSettings.includes('T-1') && days === 1;

        if (isT7) {
          newReminders[c.id] = 'T-7: 7 days until deadline';
          console.log(`[Contingency Reminder] [T-7] Contingency "${c.type}" (id: ${c.id}) is exactly 7 days away.`);
        } else if (isT3) {
          newReminders[c.id] = 'T-3: 3 days until deadline';
          console.log(`[Contingency Reminder] [T-3] Contingency "${c.type}" (id: ${c.id}) is exactly 3 days away.`);
        } else if (isT1) {
          newReminders[c.id] = 'T-1: 1 day until deadline!';
          console.log(`[Contingency Reminder] [T-1] Contingency "${c.type}" (id: ${c.id}) is due tomorrow!`);
        }
      }
    });
    setActiveReminders(newReminders);
  }, [contingencies]);

  const calculateDaysRemaining = (deadlineDate: any) => {
    if (!deadlineDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = deadlineDate instanceof Date
      ? deadlineDate
      : deadlineDate.toDate
        ? deadlineDate.toDate()
        : new Date(deadlineDate);

    if (isNaN(deadline.getTime())) return null;
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProximityColor = (days: number | null) => {
    if (days === null) return 'bg-[#9E9DA0] text-[#9E9DA0]';
    if (days <= 1) return 'bg-[#E53E3E] text-[#E53E3E]'; // Red
    if (days <= 3) return 'bg-[#DD6B20] text-[#DD6B20]'; // Orange
    if (days <= 7) return 'bg-[#D69E2E] text-[#D69E2E]'; // Yellow
    return 'bg-[#319795] text-[#319795]'; // Teal/Green
  };

  const updateContingency = (id: string, updates: Partial<Contingency>) => {
    onChange(contingencies.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addCustomContingency = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 10);
    const newC: Contingency = {
      id: crypto.randomUUID(),
      type: 'Custom',
      deadlineDate: defaultDate,
      isWaived: false,
      isSatisfied: false,
      party: 'Buyer',
      reminderSettings: ['T-7', 'T-3', 'T-1'],
    };
    onChange([...contingencies, newC]);
    toast.success('Added new custom contingency');
  };

  const deleteContingency = (id: string) => {
    onChange(contingencies.filter(c => c.id !== id));
    toast('Removed contingency');
  };

  const handleUploadDoc = async (id: string) => {
    if (readOnly) return;
    
    if (IS_DEMO_MODE) {
      setUploadingIds(prev => ({ ...prev, [id]: true }));
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateContingency(id, {
        satisfiedDocUrl: `/mock/documents/contingency_${id}.pdf`,
        satisfiedDocName: 'contingency_proof_signed.pdf',
      });
      toast.success('Mock proof document uploaded! (Demo)');
      setUploadingIds(prev => ({ ...prev, [id]: false }));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingIds(prev => ({ ...prev, [id]: true }));
      const toastId = toast.loading(`Uploading ${file.name}...`);
      try {
        const res = await uploadFile({
          file,
          path: 'contingency_proofs',
          projectId: projectId || 'general',
        });
        updateContingency(id, {
          satisfiedDocUrl: res.downloadUrl,
          satisfiedDocName: file.name,
        });
        toast.success('Document uploaded successfully!', { id: toastId });
      } catch (err: any) {
        console.error('Upload failed:', err);
        toast.error(`Upload failed: ${err.message || 'Unknown error'}`, { id: toastId });
      } finally {
        setUploadingIds(prev => ({ ...prev, [id]: false }));
      }
    };
    input.click();
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-left">Contingency Tracker &amp; Deadlines</h3>
            <p className="text-[10px] text-[#9E9DA0] text-left">Monitor critical milestones, reminder schedules, and satisfaction proof.</p>
          </div>
        </div>
        {!readOnly && (
          <button
            onClick={addCustomContingency}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#454955]/30 text-[#454955] hover:bg-[#454955]/10 active:scale-95 transition-all"
          >
            <Plus size={14} /> Add Contingency
          </button>
        )}
      </div>

      {contingencies.length === 0 ? (
        <div className="p-8 text-center bg-white/5 border border-white/5 rounded-xl text-xs text-[#9E9DA0]">
          No contingencies loaded. Add one to start tracking.
        </div>
      ) : (
        <div className="space-y-4 text-left">
          {contingencies.map(c => {
            const days = calculateDaysRemaining(c.deadlineDate);
            const colorClass = getProximityColor(days);
            const formattedDate = c.deadlineDate
              ? new Date(c.deadlineDate).toISOString().split('T')[0]
              : '';

            const status = c.isSatisfied ? 'Satisfied' : c.isWaived ? 'Waived' : 'Pending';

            // Proof validation check
            const proofMissing = c.isSatisfied && !c.satisfiedDocUrl && !c.explicitConfirmation;

            return (
              <div
                key={c.id}
                className={`p-5 rounded-xl border transition-all space-y-4 ${
                  proofMissing
                    ? 'border-[#E53E3E]/40 bg-[#E53E3E]/5'
                    : 'border-white/5 bg-white/5 hover:border-white/10'
                }`}
              >
                {/* Active Notification Banner */}
                {activeReminders[c.id] && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 rounded-lg animate-pulse">
                    <Bell size={12} className="shrink-0" />
                    <span>Active Reminder: {activeReminders[c.id]}</span>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${colorClass}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        {readOnly ? (
                          <span className="text-xs font-bold text-white">{c.type}</span>
                        ) : (
                          <input
                            type="text"
                            value={c.type}
                            onChange={(e) => updateContingency(c.id, { type: e.target.value })}
                            className="bg-transparent text-xs font-bold text-white border-b border-white/10 focus:border-[#454955] focus:outline-none py-0.5"
                          />
                        )}
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-[#9E9DA0]">
                          {days !== null
                            ? days > 0
                              ? `${days}d left`
                              : days === 0
                                ? 'due today'
                                : `${Math.abs(days)}d past due`
                            : 'Date TBD'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9E9DA0] mt-1 flex items-center gap-1.5">
                        <User size={10} />
                        <span>Responsible Party: </span>
                        {readOnly ? (
                          <span className="text-white font-semibold">{c.party || 'Buyer'}</span>
                        ) : (
                          <select
                            value={c.party || 'Buyer'}
                            onChange={(e) => updateContingency(c.id, { party: e.target.value })}
                            className="bg-transparent text-[10px] text-white font-semibold border-none focus:outline-none focus:ring-0 p-0 cursor-pointer"
                          >
                            <option value="Buyer">Buyer</option>
                            <option value="Seller">Seller</option>
                            <option value="Escrow">Escrow</option>
                            <option value="Lender">Lender</option>
                            <option value="Other">Other</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Deadline Date */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]">Deadline</label>
                      <div className="relative flex items-center">
                        <Calendar size={12} className="absolute left-2 text-[#454955]" />
                        <input
                          type="date"
                          value={formattedDate}
                          disabled={readOnly}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [year, month, day] = e.target.value.split('-').map(Number);
                              updateContingency(c.id, { deadlineDate: new Date(year, month - 1, day) });
                            }
                          }}
                          className="pl-7 pr-2 py-1 bg-[#161217] border border-white/10 rounded-lg text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-[#454955] w-32"
                        />
                      </div>
                    </div>

                    {/* Status Select */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]">Status</label>
                      <select
                        id={`select-contingency-status-${c.id}`}
                        value={status}
                        disabled={readOnly}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateContingency(c.id, {
                            isSatisfied: val === 'Satisfied',
                            isWaived: val === 'Waived',
                          });
                        }}
                        className="px-2 py-1 bg-[#161217] border border-white/10 rounded-lg text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-[#454955] cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Satisfied">Satisfied</option>
                        <option value="Waived">Waived</option>
                      </select>
                    </div>

                    {/* Reminders Config */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]">Reminders</label>
                      <div className="flex items-center gap-2 py-1.5">
                        {['T-7', 'T-3', 'T-1'].map(t => {
                          const settings = c.reminderSettings || [];
                          const checked = settings.includes(t);
                          return (
                            <label key={t} className="flex items-center gap-1 text-[10px] text-[#9E9DA0] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={readOnly}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...settings, t]
                                    : settings.filter(item => item !== t);
                                  updateContingency(c.id, { reminderSettings: updated });
                                }}
                                className="rounded border-white/10 bg-white/5 text-primary focus:ring-primary w-3 h-3"
                              />
                              {t}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delete button (only for custom ones) */}
                    {!readOnly && !DEFAULT_TYPES.includes(c.type) && (
                      <button
                        onClick={() => deleteContingency(c.id)}
                        className="p-1.5 hover:bg-white/15 rounded-lg text-[#E53E3E] transition-all self-end"
                        title="Remove contingency"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Proof Section (when Satisfied) */}
                {c.isSatisfied && (
                  <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/5 p-3 rounded-lg">
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#9E9DA0] block font-bold uppercase">Satisfaction Verification</span>
                      {c.satisfiedDocUrl ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <FileText size={12} />
                          <span className="font-mono text-[10px]">
                            {c.satisfiedDocName}
                            {IS_DEMO_MODE && <span className="ml-2 text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans">Demo</span>}
                          </span>
                        </div>
                      ) : c.explicitConfirmation ? (
                        <div className="flex items-center gap-2 text-[#454955]">
                          <CheckCircle size={12} />
                          <span>Explicitly Confirmed (No Document)</span>
                        </div>
                      ) : (
                        <span className="text-[#E53E3E] font-medium text-[10px] block">⚠️ Document proof or explicit confirm required.</span>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleUploadDoc(c.id)}
                          disabled={uploadingIds[c.id]}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white font-medium text-[10px] rounded-lg transition-all disabled:opacity-50"
                        >
                          {uploadingIds[c.id] ? 'Uploading...' : c.satisfiedDocUrl ? `Replace Doc ${IS_DEMO_MODE ? '(Demo)' : ''}` : `Upload Proof Doc ${IS_DEMO_MODE ? '(Demo)' : ''}`}
                        </button>
                        <label className="flex items-center gap-1.5 text-[10px] text-[#9E9DA0] cursor-pointer">
                          <input
                            id={`checkbox-explicit-confirm-${c.id}`}
                            type="checkbox"
                            checked={!!c.explicitConfirmation}
                            onChange={(e) => updateContingency(c.id, { explicitConfirmation: e.target.checked })}
                            className="rounded border-white/10 bg-white/5 text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          Explicitly Confirm
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
