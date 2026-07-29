'use client';

import React, { useState, useMemo } from 'react';
import { ShieldCheck, Loader2, Landmark, DollarSign, FileText, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FinalReviewStepProps {
  projectId: string;
  initialData: any;
  onComplete: (hudData: { purchasePrice: number; titleFees: number; originationFees: number }) => Promise<void>;
}

export default function FinalReviewStep({
  projectId,
  initialData,
  onComplete,
}: FinalReviewStepProps) {
  const f = initialData?.financials || {};
  const purchasePrice = (f.purchasePrice || 25000000) / 100;
  const rehabBudget = (f.projectedRehabCost || 2500000) / 100;
  const closingCosts = (f.fixedAcquisitionCosts || (purchasePrice * 0.03));
  const holdingReserves = 1200;

  // Final HUD settlement adjustment inputs
  const [hudPurchasePrice, setHudPurchasePrice] = useState<number>(purchasePrice);
  const [titleFees, setTitleFees] = useState<number>(Math.round(closingCosts * 0.4)); // Title portion of closing costs
  const [originationFees, setOriginationFees] = useState<number>(Math.round(closingCosts * 0.6)); // Lender origination fee

  const [acknowledged, setAcknowledged] = useState(false);
  const [closing, setClosing] = useState(false);

  // Derived capital elements
  const capitalStack = f.capitalStack || [];
  let totalDebt = 0;
  let totalEquity = 0;
  capitalStack.forEach((s: any) => {
    const isDebt = ['conventional_loan', 'hard_money', 'bridge', 'sba_504_bank', 'sba_504_cdc'].includes(s.type || '');
    if (isDebt) totalDebt += s.amount || 0;
    else totalEquity += s.amount || 0;
  });

  const cashRequiredAtClosing = (hudPurchasePrice - totalDebt) + titleFees + originationFees + rehabBudget + holdingReserves;

  // Required docs evaluation
  const documentsCheck = useMemo(() => {
    const hasPsa = !!f.psaDocumentUrl;
    const hasEmd = !!f.emdReceiptUrl || !!f.emdVerified;
    const hasLenderCommit = capitalStack.some((s: any) => s.notes === 'uploaded_commitment_letter.pdf') || totalDebt === 0;

    return {
      hasPsa,
      hasEmd,
      hasLenderCommit,
      allPassed: hasPsa && hasEmd && hasLenderCommit,
    };
  }, [f, capitalStack, totalDebt]);

  const handleCloseDeal = async () => {
    if (!acknowledged) {
      toast.error('Please acknowledge that you have reviewed all closing documents.');
      return;
    }
    if (!documentsCheck.allPassed) {
      toast.error('Cannot close deal. Missing required documents (PSA, EMD, or Lender Commitment).');
      return;
    }

    setClosing(true);
    try {
      await onComplete({
        purchasePrice: hudPurchasePrice,
        titleFees,
        originationFees,
      });
      toast.success('Deal successfully closed!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error processing deal closing.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 5: Final Review & Close</h3>
        <p className="text-xs text-slate-400">Reconcile final settlement statements, HUD closing costs, and finalize acquisition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Left Side Summary Display */}
        <div className="md:col-span-2 space-y-4">
          
          {/* HUD Closing adjustments */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <h4 className="col-span-2 sm:col-span-3 text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Final HUD Settlement Adjustments</h4>
            
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Final Purchase Price ($)</label>
              <input
                type="number"
                value={hudPurchasePrice || ''}
                onChange={(e) => setHudPurchasePrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Title & Escrow Fees ($)</label>
              <input
                type="number"
                value={titleFees || ''}
                onChange={(e) => setTitleFees(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Lender Origination ($)</label>
              <input
                type="number"
                value={originationFees || ''}
                onChange={(e) => setOriginationFees(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
              />
            </div>
          </div>

          {/* Core metrics summary cards */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Project Parameters Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-[8px] uppercase tracking-wider text-slate-500">Total Purchase Price</p>
                <p className="text-sm font-bold text-white">${hudPurchasePrice.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-[8px] uppercase tracking-wider text-slate-500">Total Debt Stack</p>
                <p className="text-sm font-bold text-white">${totalDebt.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl col-span-2">
                <p className="text-[8px] uppercase tracking-wider text-slate-500">Total Estimated Cash Required at Close</p>
                <p className="text-base font-extrabold text-emerald-400">${Math.round(cashRequiredAtClosing).toLocaleString()}</p>
                <p className="text-[9px] text-slate-500 mt-1">Includes direct acquisition, reserves, rehab cap, and closing costs.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Documents Checklist */}
        <div className="space-y-4">
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Required Documents audit</h4>
            
            <div className="space-y-2 text-xs">
              {/* PSA */}
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-slate-300">Executed PSA</span>
                {documentsCheck.hasPsa ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* EMD */}
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-slate-300">EMD Deposit Receipt</span>
                {documentsCheck.hasEmd ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>

              {/* Lender commitment */}
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-slate-300">Lender Commitment</span>
                {documentsCheck.hasLenderCommit ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>
          </div>

          {/* Acknowledgement check */}
          <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
            <input
              type="checkbox"
              id="close-ack"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-4 h-4 rounded text-black border-white/20 focus:ring-0 cursor-pointer mt-0.5"
            />
            <label htmlFor="close-ack" className="text-[10px] text-slate-300 uppercase font-semibold leading-relaxed cursor-pointer select-none">
              I have reviewed all HUD-1 settlement costs, title search certifications, and verified wiring instructions.
            </label>
          </div>

          {/* Action Close Deal */}
          <button
            type="button"
            onClick={handleCloseDeal}
            disabled={closing || !acknowledged || !documentsCheck.allPassed}
            className="w-full py-3.5 bg-emerald-500 text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-extrabold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4.5 h-4.5" />}
            Confirm HUD & Close Deal
          </button>
        </div>
      </div>
    </div>
  );
}
