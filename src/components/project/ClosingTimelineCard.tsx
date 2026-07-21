'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Project, LoanRecord, ClosingMilestone } from '@/types/schema';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Info, 
  AlertCircle,
  RefreshCw,
  Edit,
  Save,
  Loader2
} from 'lucide-react';
import { updateClosingTimelineAction } from '@/actions/closingTimeline';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
  project: Project;
}

import { getBusinessDaysDiff } from '@/lib/utils/businessDays';
export { getBusinessDaysDiff };

export function ClosingTimelineCard({ projectId, project }: Props) {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCause, setSelectedCause] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Listen to loans
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(
      collection(db, 'projects', projectId, 'loans'),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LoanRecord[];
        setLoans(docs);
        setLoadingLoans(false);
      },
      (err) => {
        console.error('[ClosingTimelineCard] onSnapshot loans error:', err);
        setLoadingLoans(false);
      }
    );
    return unsub;
  }, [projectId]);

  // 2. Identify the active template based on project financing type and loans
  const activeTemplate = useMemo(() => {
    if (project?.financials?.financingType === 'All Cash') {
      return 'cash_hard_money';
    }
    const primaryLoan = loans[0];
    if (!primaryLoan) {
      return 'cash_hard_money';
    }
    if (primaryLoan.instrument === 'Conventional') {
      return 'financed_conventional';
    }
    if (primaryLoan.instrument === 'SBA 504') {
      return 'sba';
    }
    // Hard Money or Bridge
    return 'cash_hard_money';
  }, [project?.financials?.financingType, loans]);

  // Helper to add days to YYYY-MM-DD string
  const calculateTargetDate = useCallback((baseDateStr: string | undefined, offsetDays: number): string => {
    const base = baseDateStr ? new Date(baseDateStr + 'T12:00:00') : new Date();
    const target = new Date(base.getTime());
    target.setDate(target.getDate() + offsetDays);
    return target.toISOString().split('T')[0];
  }, []);

  // 3. Define default milestones builder
  const buildDefaultMilestones = useCallback((templateType: 'financed_conventional' | 'cash_hard_money' | 'sba', baseDateStr?: string): ClosingMilestone[] => {
    if (templateType === 'financed_conventional') {
      return [
        { id: 'm-conv-1', key: 'financing', label: 'Financing Approval', targetOffsetDays: 15, targetDate: calculateTargetDate(baseDateStr, 15), completed: false },
        { id: 'm-conv-2', key: 'title', label: 'Title Clearance', targetOffsetDays: 20, targetDate: calculateTargetDate(baseDateStr, 20), completed: false },
        { id: 'm-conv-3', key: 'appraisal', label: 'Appraisal Completion', targetOffsetDays: 25, targetDate: calculateTargetDate(baseDateStr, 25), completed: false },
        { id: 'm-conv-4', key: 'conditions_cleared', label: 'Financing Conditions Cleared', targetOffsetDays: 30, targetDate: calculateTargetDate(baseDateStr, 30), completed: false },
        { id: 'm-conv-5', key: 'cd_delivered', label: 'Closing Disclosure Delivered', targetOffsetDays: 35, targetDate: calculateTargetDate(baseDateStr, 35), completed: false },
        { id: 'm-conv-6', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 45, targetDate: calculateTargetDate(baseDateStr, 45), completed: false }
      ];
    } else if (templateType === 'sba') {
      return [
        { id: 'm-sba-1', key: 'financing', label: 'Financing Approval', targetOffsetDays: 15, targetDate: calculateTargetDate(baseDateStr, 15), completed: false },
        { id: 'm-sba-2', key: 'appraisal', label: 'Appraisal Completion', targetOffsetDays: 25, targetDate: calculateTargetDate(baseDateStr, 25), completed: false },
        { id: 'm-sba-3', key: 'cdc_sba_approval', label: 'CDC & SBA Approval', targetOffsetDays: 35, targetDate: calculateTargetDate(baseDateStr, 35), completed: false },
        { id: 'm-sba-4', key: 'conditions_cleared', label: 'Financing Conditions Cleared', targetOffsetDays: 40, targetDate: calculateTargetDate(baseDateStr, 40), completed: false },
        { id: 'm-sba-5', key: 'cd_delivered', label: 'Closing Disclosure Delivered', targetOffsetDays: 45, targetDate: calculateTargetDate(baseDateStr, 45), completed: false },
        { id: 'm-sba-6', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 55, targetDate: calculateTargetDate(baseDateStr, 55), completed: false }
      ];
    } else {
      // cash & hard money
      return [
        { id: 'm-cash-1', key: 'title', label: 'Title Clearance', targetOffsetDays: 5, targetDate: calculateTargetDate(baseDateStr, 5), completed: false },
        { id: 'm-cash-2', key: 'financing_funding_approval', label: 'Funding Approval', targetOffsetDays: 8, targetDate: calculateTargetDate(baseDateStr, 8), completed: false },
        { id: 'm-cash-3', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 12, targetDate: calculateTargetDate(baseDateStr, 12), completed: false }
      ];
    }
  }, [calculateTargetDate]);

  // 4. Derive actual dates from project state
  const deriveActualDates = useCallback((currentMilestones: ClosingMilestone[]): ClosingMilestone[] => {
    const titleCleared = project.closingRoom?.chainOfTitleStatus === 'verified' || project.closingRoom?.titleWorkflow?.status === 'cleared';
    const loanStatus = project.loanStatus || '';
    const appraisalReceived = loanStatus === 'Appraisal-Received';
    const financingApproved = loanStatus === 'Pre-Approved' || loanStatus === 'Conditions-Issued' || loanStatus === 'Conditions-Cleared' || loanStatus === 'Clear-To-Close';
    const conditionsCleared = loanStatus === 'Conditions-Cleared' || loanStatus === 'Clear-To-Close';
    const fundingApproved = loanStatus === 'Clear-To-Close';
    const cdDelivered = !!project.closingRoom?.closingDisclosureUrl || project.closingChecklist?.find(i => i.type === 'Closing Disclosure')?.completed === true;
    const closed = project.isClearToClose === true || project.currentPhase && project.currentPhase >= 3;

    let changed = false;
    const updated = currentMilestones.map(m => {
      let actualDate = m.actualDate;
      let completed = m.completed;

      const todayStr = new Date().toISOString().split('T')[0];

      if (m.key === 'title' && titleCleared && !m.completed) {
        actualDate = todayStr;
        completed = true;
        changed = true;
      }
      if (m.key === 'appraisal' && appraisalReceived && !m.completed) {
        actualDate = todayStr;
        completed = true;
        changed = true;
      }
      if (m.key === 'financing' && financingApproved && !m.completed) {
        actualDate = todayStr;
        completed = true;
        changed = true;
      }
      if (m.key === 'conditions_cleared' && conditionsCleared && !m.completed) {
        actualDate = todayStr;
        completed = true;
        changed = true;
      }
      if (m.key === 'financing_funding_approval' && fundingApproved && !m.completed) {
        actualDate = todayStr;
        completed = true;
        changed = true;
      }
      if (m.key === 'cd_delivered' && cdDelivered && !m.completed) {
        actualDate = todayStr;
        completed = true;
        changed = true;
      }
      if (m.key === 'closing' && closed && !m.completed) {
        actualDate = todayStr;
        completed = true;
        changed = true;
      }

      return {
        ...m,
        actualDate,
        completed
      };
    });

    return changed ? updated : currentMilestones;
  }, [project]);

  // 5. Initialize/sync closing timeline
  useEffect(() => {
    if (loadingLoans) return;

    const currentTimeline = project.closingTimeline || [];
    const currentTemplate = project.closingTimelineTemplate;
    const contractDate = project.financials?.psaEffectiveDate;

    // Check if we need to initialize or template has changed
    const needsInit = currentTimeline.length === 0 || currentTemplate !== activeTemplate;

    if (needsInit) {
      const defaults = buildDefaultMilestones(activeTemplate, contractDate);
      const withActuals = deriveActualDates(defaults);
      
      const persistInit = async () => {
        setSaving(true);
        try {
          const auth = getAuth();
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            await updateClosingTimelineAction(token, projectId, withActuals, activeTemplate);
          }
        } catch (e) {
          console.error('[ClosingTimelineCard] Init error:', e);
        } finally {
          setSaving(false);
        }
      };
      persistInit();
    } else {
      // Sync actual dates if state updated
      const synced = deriveActualDates(currentTimeline);
      
      // Determine if there are actual differences
      const hasDiff = JSON.stringify(synced) !== JSON.stringify(currentTimeline);
      if (hasDiff) {
        const persistSync = async () => {
          setSaving(true);
          try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (token) {
              await updateClosingTimelineAction(token, projectId, synced, activeTemplate);
            }
          } catch (e) {
            console.error('[ClosingTimelineCard] Sync error:', e);
          } finally {
            setSaving(false);
          }
        };
        persistSync();
      }
    }
  }, [projectId, project.closingTimeline, project.closingTimelineTemplate, project.financials?.psaEffectiveDate, activeTemplate, loadingLoans, buildDefaultMilestones, deriveActualDates]);

  // 6. Handle single milestone update
  const handleMilestoneUpdate = async (milestoneId: string, updates: Partial<ClosingMilestone>) => {
    const currentTimeline = project.closingTimeline || [];
    const updated = currentTimeline.map(m => {
      if (m.id !== milestoneId) return m;
      const nextCompleted = updates.completed !== undefined ? updates.completed : m.completed;
      let nextActualDate = updates.actualDate !== undefined ? updates.actualDate : m.actualDate;
      if (nextCompleted && !nextActualDate) {
        nextActualDate = new Date().toISOString().split('T')[0];
      } else if (!nextCompleted) {
        nextActualDate = null;
      }
      return {
        ...m,
        ...updates,
        completed: nextCompleted,
        actualDate: nextActualDate
      };
    });

    setSaving(true);
    const toastId = toast.loading('Updating timeline milestone...');
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required.');

      await updateClosingTimelineAction(token, projectId, updated, project.closingTimelineTemplate);
      toast.success('Milestone updated successfully.', { id: toastId });
    } catch (e: any) {
      toast.error(e.message || 'Failed to update milestone.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // 7. Reset timeline back to default template
  const handleResetTimeline = async () => {
    if (!window.confirm('Are you sure you want to reset the closing timeline to template defaults? Custom dates and notes will be lost.')) {
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Resetting timeline milestones...');
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required.');

      const defaults = buildDefaultMilestones(activeTemplate, project.financials?.psaEffectiveDate);
      const withActuals = deriveActualDates(defaults);

      await updateClosingTimelineAction(token, projectId, withActuals, activeTemplate);
      toast.success('Timeline reset to defaults.', { id: toastId });
    } catch (e: any) {
      toast.error(e.message || 'Failed to reset timeline.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const milestones = project.closingTimeline || [];
  const contractDate = project.financials?.psaEffectiveDate;

  // Compute overdue milestones
  const overdueMilestones = useMemo(() => {
    return milestones.filter(m => !m.completed && m.targetDate < todayStr);
  }, [milestones, todayStr]);

  // Check 3-day CD rule constraints for financed routes
  const tridWarning = useMemo(() => {
    if (activeTemplate !== 'financed_conventional' && activeTemplate !== 'sba') {
      return null;
    }

    const cdMilestone = milestones.find(m => m.key === 'cd_delivered');
    const closingMilestone = milestones.find(m => m.key === 'closing');

    if (!cdMilestone || !closingMilestone) {
      return null;
    }

    const cdDate = cdMilestone.actualDate || cdMilestone.targetDate;
    const closingDate = closingMilestone.actualDate || closingMilestone.targetDate;

    if (!cdDate || !closingDate) {
      return null;
    }

    const bizDays = getBusinessDaysDiff(cdDate, closingDate);

    // Condition 1: Violation (less than 3 business days spacing)
    if (bizDays < 3) {
      return {
        type: 'violation' as const,
        bizDays,
        cdDate,
        closingDate,
        message: `Lenders must provide the Closing Disclosure at least three business days before closing. Currently, there are only ${bizDays} business day(s) of separation between Closing Disclosure delivery (${cdDate}) and Closing Settlement (${closingDate}).`
      };
    }

    // Condition 2: Approaching (closing is within 7 calendar days, but CD is not completed)
    const today = new Date(todayStr + 'T12:00:00');
    const closing = new Date(closingDate + 'T12:00:00');
    const calendarDiff = Math.ceil((closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (calendarDiff < 7 && !cdMilestone.completed) {
      return {
        type: 'approaching' as const,
        calendarDiff,
        closingDate,
        message: `Closing Settlement is scheduled in ${calendarDiff} day(s) (on ${closingDate}), but the Closing Disclosure (CD) has not been recorded. Lenders must provide the Closing Disclosure at least three business days before closing.`
      };
    }

    return null;
  }, [activeTemplate, milestones, todayStr]);

  return (
    <div className="glass-card border border-white/5 p-6 rounded-2xl space-y-6 relative overflow-hidden">
      {/* Glow overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#7A9EAA]/5 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#7A9EAA]" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight uppercase">Closing Timeline</h3>
            <p className="text-xs text-[#9E9DA0] mt-0.5">
              Instantiated from the active loan modality template.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#7A9EAA]/15 border border-[#7A9EAA]/35 text-[#7A9EAA]">
            {activeTemplate.replace(/_/g, ' ')}
          </span>
          <button
            onClick={handleResetTimeline}
            disabled={saving}
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-white/20 text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Contract Date Info */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#7A9EAA] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="text-white font-medium">Executed Contract Date: {contractDate ? contractDate : <span className="text-amber-400 font-bold">Not Set (Defaulting to Project Creation Date)</span>}</p>
          <p className="text-[#9E9DA0] leading-relaxed">
            Timeline milestone targets are calculated as day offsets from the contract execution date. Changing target dates manually will override calculations.
          </p>
        </div>
      </div>

      {/* Overdue Milestones Alert */}
      {overdueMilestones.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 font-bold uppercase tracking-wider text-[10px]">Slippage Detected</p>
              <p className="text-red-300/90 mt-0.5 leading-normal">
                The following milestone(s) are past their target dates and remain incomplete:
              </p>
              <ul className="list-disc pl-4 mt-1.5 space-y-1 text-red-200/80">
                {overdueMilestones.map(m => (
                  <li key={m.id}>
                    <span className="font-semibold">{m.label}</span> (Target: {m.targetDate})
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Customary causes guidance chips */}
          <div className="pt-2 border-t border-red-500/10 space-y-2">
            <p className="text-[9px] text-[#9E9DA0] uppercase font-bold tracking-wider">
              Review Customary Delay Causes & Mitigation Guidance:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'underwriting_backlog', label: 'Underwriting Backlog' },
                { key: 'title_defects', label: 'Title Defects' },
                { key: 'repair_negotiations', label: 'Repair Negotiations' }
              ].map((cause) => (
                <button
                  key={cause.key}
                  onClick={() => setSelectedCause(selectedCause === cause.key ? null : cause.key)}
                  className={`px-2.5 py-1 rounded border text-[10px] font-semibold transition-all ${
                    selectedCause === cause.key
                      ? 'bg-red-500/20 border-red-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cause.label}
                </button>
              ))}
            </div>
            
            {selectedCause && (
              <div className="mt-2.5 p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] text-[#9E9DA0] leading-relaxed space-y-2">
                {selectedCause === 'underwriting_backlog' && (
                  <>
                    <p className="text-white font-semibold">Underwriting Backlog Guidance:</p>
                    <p>Underwriters are experiencing high volume. Action: Contact the lender for a firm commitment letter date and request a rate lock extension if necessary.</p>
                  </>
                )}
                {selectedCause === 'title_defects' && (
                  <>
                    <p className="text-white font-semibold">Title Defects Guidance:</p>
                    <p>The title search revealed issues (e.g., unreleased liens, easement disputes). Action: Ensure the closing attorney or title agent has requested payoff letters or is executing title indemnity agreements.</p>
                  </>
                )}
                {selectedCause === 'repair_negotiations' && (
                  <>
                    <p className="text-white font-semibold">Repair Negotiations Guidance:</p>
                    <p>Lender appraisal required repairs that are not yet complete, or seller repairs are delayed. Action: Draft an amendment for a repair escrow or extend the closing date to allow inspection sign-off.</p>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const firstOverdue = overdueMilestones[0];
                      if (firstOverdue) {
                        let causeText = '';
                        if (selectedCause === 'underwriting_backlog') causeText = '[Mitigation: Underwriting Backlog - follow up on rate lock]';
                        if (selectedCause === 'title_defects') causeText = '[Mitigation: Title Defects - confirm title clearing status]';
                        if (selectedCause === 'repair_negotiations') causeText = '[Mitigation: Repair Negotiations - coordinate escrow/extension]';
                        
                        const newNotes = firstOverdue.notes ? `${firstOverdue.notes} ${causeText}` : causeText;
                        handleMilestoneUpdate(firstOverdue.id, { notes: newNotes });
                        setSelectedCause(null);
                      }
                    }}
                    className="text-[9px] uppercase font-bold tracking-widest text-[#7A9EAA] hover:underline"
                  >
                    Apply Mitigation Note to {overdueMilestones[0].label}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRID Warning Alert */}
      {tridWarning && (
        <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
          tridWarning.type === 'violation'
            ? 'bg-red-500/10 border-red-500/20 text-red-200'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
        }`}>
          <div className="flex items-start gap-2.5">
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
              tridWarning.type === 'violation' ? 'text-red-400' : 'text-amber-400'
            }`} />
            <div>
              <p className={`font-bold uppercase tracking-wider text-[10px] ${
                tridWarning.type === 'violation' ? 'text-red-200' : 'text-amber-200'
              }`}>
                {tridWarning.type === 'violation' ? 'TRID Compliance Warning' : 'TRID Warning — Action Required'}
              </p>
              <p className={`mt-0.5 leading-normal ${
                tridWarning.type === 'violation' ? 'text-red-300/90' : 'text-amber-300/90'
              }`}>
                {tridWarning.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
        {milestones.length === 0 ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#9E9DA0]">
            <Loader2 className="w-4 h-4 animate-spin text-[#7A9EAA]" />
            Initializing milestones...
          </div>
        ) : (
          milestones.map((m) => {
            const isCompleted = m.completed;
            return (
              <div key={m.id} className="flex gap-4 items-start relative group">
                {/* Node indicator */}
                <button
                  onClick={() => handleMilestoneUpdate(m.id, { completed: !isCompleted })}
                  disabled={saving}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all relative z-10 shrink-0 ${
                    isCompleted
                      ? 'bg-[#10B981] border-[#10B981] text-white hover:bg-[#059669]'
                      : 'bg-[#161318] border-white/10 text-[#9E9DA0] hover:border-[#7A9EAA] hover:text-[#7A9EAA]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                {/* Details layout */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 items-center border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.02] p-4 rounded-xl transition-all">
                  <div className="md:col-span-4 space-y-1">
                    <h4 className="text-sm font-semibold text-white">{m.label}</h4>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#9E9DA0]/70">
                      Offset: +{m.targetOffsetDays} days
                    </span>
                  </div>

                  {/* Target Date (editable) */}
                  <div className="md:col-span-3 space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] text-[#9E9DA0] uppercase tracking-wider font-semibold">Target Date</label>
                      {!m.completed && m.targetDate < todayStr && (
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider animate-pulse">Overdue</span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={m.targetDate}
                      disabled={saving}
                      onChange={(e) => handleMilestoneUpdate(m.id, { targetDate: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#7A9EAA]/50 outline-none w-full"
                    />
                  </div>

                  {/* Actual Date (editable) */}
                  <div className="md:col-span-3 space-y-1 text-left">
                    <label className="block text-[10px] text-[#9E9DA0] uppercase tracking-wider font-semibold">Actual Date</label>
                    <input
                      type="date"
                      value={m.actualDate || ''}
                      disabled={saving}
                      onChange={(e) => handleMilestoneUpdate(m.id, { actualDate: e.target.value || null, completed: !!e.target.value })}
                      className="bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#7A9EAA]/50 outline-none w-full"
                    />
                  </div>

                  {/* Status Badge & Notes */}
                  <div className="md:col-span-2 flex flex-col items-start gap-1 justify-center">
                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                      isCompleted ? 'bg-green-500/15 text-green-400 border border-green-500/35' : 'bg-amber-500/15 text-amber-400 border border-amber-500/35'
                    }`}>
                      {isCompleted ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  {/* Notes input row spanning full width inside details */}
                  <div className="md:col-span-12 pt-2 border-t border-white/5">
                    <input
                      type="text"
                      defaultValue={m.notes || ''}
                      placeholder="Add milestone notes..."
                      disabled={saving}
                      onBlur={(e) => handleMilestoneUpdate(m.id, { notes: e.target.value })}
                      className="w-full text-xs bg-transparent text-[#9E9DA0] placeholder-white/20 border-b border-transparent focus:border-white/10 focus:outline-none py-0.5"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Auto sync feedback warning */}
      <div className="flex gap-2 p-3 bg-[#7A9EAA]/5 rounded-xl border border-[#7A9EAA]/15 text-[11px] text-[#9E9DA0] leading-normal">
        <AlertCircle className="w-4 h-4 text-[#7A9EAA] shrink-0 mt-0.5" />
        <p>
          Milestone actual dates are linked directly to system triggers (e.g. title clearing, appraisal receipts, loan approvals, or CD uploads). Actions resolved on the page will automatically log actual completion dates here.
        </p>
      </div>
    </div>
  );
}
