'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, AlertCircle, FileText, Upload } from 'lucide-react';
import type { ClosingChecklistItem } from '@/types/schema';
import toast from 'react-hot-toast';

interface ClosingChecklistStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

const ITEMS_META = [
  { type: 'Earnest money deposited', notes: 'Verification of initial deposit with escrow' },
  { type: 'Financing contingency satisfied', notes: 'Lender commitment letter fully secured' },
  { type: 'Inspection contingency satisfied', notes: 'Physical parameters approved by investor' },
  { type: 'Appraisal received and accepted', notes: 'Lender appraisal value clearance' },
  { type: 'Title cleared', notes: 'Preliminary search resolved with no encumbrances' },
  { type: 'Insurance bound', notes: 'Hazard binder in place for closing' },
  { type: 'Closing disclosure reviewed and signed', notes: 'HUD-1 settlement statement sign off' },
  { type: 'Wire instructions verified', notes: 'Secured confirmation of title bank details' },
  { type: 'Final walkthrough scheduled', notes: 'Verify property condition prior to keys transfer' },
  { type: 'Closing funds wired', notes: 'Downpayment and fees wire initiated' },
];

export default function ClosingChecklistStep({
  initialData,
  onSave,
}: ClosingChecklistStepProps) {
  const f = initialData?.financials || {};

  // Track checked items
  const [items, setItems] = useState<ClosingChecklistItem[]>(() => {
    const list = initialData?.closingChecklist || [];
    if (list.length >= 10) return list;

    // Default prefill
    return ITEMS_META.map((meta, i) => {
      // Auto prefill some items if we have data
      let completed = false;
      if (meta.type === 'Earnest money deposited' && (f.emdReceiptUrl || f.emdVerified)) {
        completed = true;
      }
      if (meta.type === 'Title cleared' && f.vendorTitleStatus === 'Title cleared') {
        completed = true;
      }
      if (meta.type === 'Insurance bound' && f.vendorInsuranceStatus === 'Bound') {
        completed = true;
      }

      return {
        id: `cc_${i + 1}`,
        type: meta.type as any,
        completed,
        notes: meta.notes,
      };
    });
  });

  const toggleItem = (id: string) => {
    setItems(
      items.map((i) =>
        i.id === id
          ? {
              ...i,
              completed: !i.completed,
              completedAt: !i.completed ? new Date() : undefined,
            }
          : i
      )
    );
  };

  const handleUploadProof = (id: string) => {
    setItems(
      items.map((i) =>
        i.id === id
          ? {
              ...i,
              completed: true,
              documentUrl: '/mock/documents/uploaded_receipt.pdf',
              notes: `${i.notes} (Proof document uploaded)`,
            }
          : i
      )
    );
    toast.success('Document uploaded successfully!');
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  const handleContinue = async () => {
    const payload = {
      closingChecklist: items,
      financials: {
        ...f,
        // Sync clear to close flag if all items checked
        isClearToClose: completedCount === items.length,
        loanStatus: completedCount === items.length ? 'Clear-To-Close' : f.loanStatus,
      },
    };
    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 4: Closing Checklist</h3>
        <p className="text-xs text-slate-400">Mark checklist milestones, upload proofs, and verify wire security gates.</p>
      </div>

      {/* Completeness Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
          <span>Closing Milestones status</span>
          <span>{completedCount} of 10 Checked</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7A9EAA] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items rows */}
      <div className="space-y-2.5 max-h-[350px] overflow-y-auto scrollbar-none pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-xl transition-all"
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="flex items-start gap-3 text-left text-xs text-white max-w-md"
            >
              {item.completed ? (
                <CheckSquare className="w-4 h-4 text-[#7A9EAA] shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{item.type}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.notes}</p>
              </div>
            </button>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleUploadProof(item.id)}
                className="h-7 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white flex items-center gap-1 transition-all"
              >
                <Upload className="w-3 h-3" /> {item.documentUrl ? 'Uploaded ✓' : 'Upload Proof'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-[#7A9EAA] text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
