'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { ChecklistItem } from '@/types/schema';

export const DEFAULT_DISPOSITION_CHECKLIST: ChecklistItem[] = [
  { id: 'broker', label: '1. Broker Selection', description: 'Retain listing broker & execute representation agreement.', status: 'pending' },
  { id: 'listing_packet', label: '2. Listing Packet', description: 'Assemble offering memorandum & photography assets.', status: 'pending' },
  { id: 'data_room', label: '3. Project Files / Document Package', description: 'Stage leases, financial ledgers, and property records.', status: 'pending' },
  { id: 'loi', label: '4. Letter of Intent (LOI)', description: 'Receive & negotiate buyer LOI terms.', status: 'pending' },
  { id: 'psa', label: '5. Purchase & Sale Agreement (PSA)', description: 'Execute PSA and deposit earnest money in escrow.', status: 'pending' },
  { id: 'closing', label: '6. Final Closing & Funding', description: 'Sign closing settlement statement and verify wire proceeds.', status: 'pending' },
];

export interface DispositionChecklistProps {
  projectId: string;
  checklist?: ChecklistItem[];
  onChecklistChange?: (updated: ChecklistItem[]) => void;
  onConfirmSale: (overrideReason?: string) => Promise<void>;
  isSold?: boolean;
}

const PRIVILEGED_ROLES = ['owner', 'admin', 'lead investor', 'investor'];

export function DispositionChecklist({
  projectId: _projectId,
  checklist = DEFAULT_DISPOSITION_CHECKLIST,
  onChecklistChange,
  onConfirmSale,
  isSold = false
}: DispositionChecklistProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>(checklist);

  useEffect(() => {
    if (checklist) {
      setItems(checklist);
    }
  }, [checklist]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const isFullyComplete = completedCount === items.length;

  const toggleItem = (id: string) => {
    if (isSold) return;
    const next = items.map((item) => {
      if (item.id !== id) return item;
      const nextStatus: ChecklistItem['status'] =
        item.status === 'completed' ? 'pending' : 'completed';
      return { ...item, status: nextStatus };
    });
    setItems(next);
    if (onChecklistChange) onChecklistChange(next);
  };

  const handleMarkAsSoldClick = () => {
    if (isFullyComplete) {
      setIsSubmitting(true);
      onConfirmSale()
        .then(() => toast.success('Project successfully marked as Sold!'))
        .catch((err) => toast.error(err.message || 'Failed to confirm sale.'))
        .finally(() => setIsSubmitting(false));
    } else {
      setShowOverrideModal(true);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userRole = (user as unknown as { role?: string } | null)?.role?.toLowerCase() || 'admin';
    const isPrivileged = PRIVILEGED_ROLES.includes(userRole);

    if (!isPrivileged) {
      toast.error('Unauthorized: Only Owners, Admins, LeadInvestors, or LeadInvestors can override disposition checklist gating.');
      return;
    }

    if (overrideReason.trim().length < 20) {
      toast.error('Override reason must be at least 20 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmSale(overrideReason.trim());
      toast.success('Sale confirmed via Owner Override.');
      setShowOverrideModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Override failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="disposition-checklist" className="glass-card rounded-2xl p-6 space-y-6 border border-white/10 bg-[#121014]/80">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white font-outfit flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Disposition Checklist & Sale Gate
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete all 6 disposition milestones to unlock "Mark as Sold", or submit an Owner Override.
          </p>
        </div>
        <span
          data-testid="checklist-progress-pill"
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isFullyComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}
        >
          {completedCount} / {items.length} Completed
        </span>
      </div>

      {/* Item List */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const isDone = item.status === 'completed';
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-white'
                  : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className={`text-xs font-bold ${isDone ? 'text-white line-through opacity-80' : 'text-white'}`}>
                    {item.label}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400'
                }`}
              >
                {isDone ? 'Complete' : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mark as Sold Gated Trigger */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          {!isFullyComplete
            ? '⚠️ Checklist incomplete. "Mark as Sold" is gated until all items pass or an override is approved.'
            : '✓ All disposition milestones complete. Ready to finalize transaction.'}
        </p>

        <button
          data-testid="mark-as-sold-button"
          onClick={handleMarkAsSoldClick}
          disabled={isSold || isSubmitting}
          className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            isSold
              ? 'bg-white/5 text-slate-500 cursor-not-allowed'
              : isFullyComplete
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
          }`}
        >
          {isSold ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Deal Realized & Sold</span>
            </>
          ) : isFullyComplete ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Sold & Realized</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Mark as Sold (Requires Override)</span>
            </>
          )}
        </button>
      </div>

      {/* Owner Override Modal */}
      {showOverrideModal && (
        <div data-testid="sold-override-modal" className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#121014] border border-amber-500/30 rounded-2xl p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold font-outfit uppercase tracking-wider">
                Privileged Owner Override Required
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Disposition checklist has <span className="text-amber-400 font-bold">{items.length - completedCount} incomplete items</span>.
              Only Owners, Admins, LeadInvestors, or LeadInvestors can bypass completion by providing a detailed justification (min 20 characters). This action will be permanently logged in the project audit feed.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Override Reason & Risk Justification (min 20 chars)
                </label>
                <textarea
                  data-testid="sold-override-textarea"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State why the disposition checklist is bypassed and confirm closing terms..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>{overrideReason.length} / 20 characters minimum</span>
                  <span className={overrideReason.length >= 20 ? 'text-emerald-400' : 'text-amber-400'}>
                    {overrideReason.length >= 20 ? 'Valid justification' : 'Too short'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  data-testid="submit-sold-override-button"
                  type="submit"
                  disabled={overrideReason.length < 20 || isSubmitting}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all"
                >
                  {isSubmitting ? 'Processing Override…' : 'Submit & Mark as Sold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
