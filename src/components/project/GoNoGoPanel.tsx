import React, { useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { CheckCircle, RefreshCw, XCircle, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

interface GoNoGoPanelProps {
  project: Project;
  derivedMetrics: any;
  onSaveFinancials: (updates: any) => Promise<void>;
  onUpdateProjectStatus: (status: any) => Promise<void>;
  readOnly?: boolean;
}

export function GoNoGoPanel({
  project,
  derivedMetrics,
  onSaveFinancials,
  onUpdateProjectStatus,
  readOnly = false
}: GoNoGoPanelProps) {
  const f = project.financials || {};
  const currentDecision = f.dd_decision || (f.decision === 'terminate' ? 'walk' : f.decision) || 'proceed';
  const renegotiatedPriceDollars = f.renegotiatedPrice ? f.renegotiatedPrice / 100 : '';
  const [priceInput, setPriceInput] = useState<string>(String(renegotiatedPriceDollars));
  const [reasonInput, setReasonInput] = useState<string>(f.dd_decision_reason || '');

  useEffect(() => {
    setReasonInput(f.dd_decision_reason || '');
  }, [f.dd_decision_reason]);

  const handleDecisionChange = async (dd_decision: 'proceed' | 'renegotiate' | 'walk') => {
    if (readOnly) return;
    try {
      let statusUpdate = project.status;
      let dealStatusUpdate = 'Active';
      let decisionUpdate: 'proceed' | 'renegotiate' | 'terminate' = 'proceed';

      if (dd_decision === 'walk') {
        statusUpdate = 'exit';
        dealStatusUpdate = 'Terminated';
        decisionUpdate = 'terminate';
      } else if (dd_decision === 'proceed') {
        dealStatusUpdate = 'Proceeding';
        decisionUpdate = 'proceed';
      } else if (dd_decision === 'renegotiate') {
        decisionUpdate = 'renegotiate';
      }

      await onSaveFinancials({
        dd_decision,
        decision: decisionUpdate,
        dealStatus: dealStatusUpdate
      });
      await onUpdateProjectStatus(statusUpdate);
      toast.success(`Go/No-Go decision updated to: ${dd_decision.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save decision');
    }
  };

  const handlePriceBlur = async () => {
    if (readOnly) return;
    const cleanVal = priceInput.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanVal);
    if (!isNaN(num) && num > 0) {
      const cents = Math.round(num * 100);
      await onSaveFinancials({ renegotiatedPrice: cents });
      toast.success('Renegotiated price saved successfully');
    } else {
      await onSaveFinancials({ renegotiatedPrice: null });
      setPriceInput('');
      toast('Renegotiated price cleared');
    }
  };

  const handleReasonBlur = async () => {
    if (readOnly) return;
    await onSaveFinancials({ dd_decision_reason: reasonInput });
    toast.success('Decision reason saved successfully');
  };

  const displayPrice = f.renegotiatedPrice != null
    ? (f.renegotiatedPrice / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : ((f.finalAgreedPrice || f.purchasePrice || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 text-left">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
          <Activity size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-left">AQ-23 Go/No-Go Decision Framework</h3>
          <p className="text-[10px] text-[#9E9DA0] text-left">Re-evaluate deal performance post-Due Diligence and lock in final path.</p>
        </div>
      </div>

      {/* Mini Scorecard comparison */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-pw-night-bg rounded-xl border border-white/5">
        <div>
          <span className="text-[9px] font-bold text-[#9E9DA0] block uppercase tracking-wider text-left">Purchase Price</span>
          <span className="text-sm font-semibold text-white text-left block">{displayPrice}</span>
          {f.renegotiatedPrice != null && (
            <span className="text-[8px] text-amber-500 block font-mono font-bold mt-0.5 text-left">RENEGOTIATED</span>
          )}
        </div>
        <div>
          <span className="text-[9px] font-bold text-[#9E9DA0] block uppercase tracking-wider text-left">Est. Net Cash Flow</span>
          <span className="text-sm font-semibold text-white text-left block">
            {derivedMetrics?.netCashFlow != null
              ? (derivedMetrics.netCashFlow).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
              : '$0'}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-[#9E9DA0] block uppercase tracking-wider text-left">Cap Rate</span>
          <span className="text-sm font-semibold text-white text-left block">
            {derivedMetrics?.capRate != null ? `${derivedMetrics.capRate.toFixed(2)}%` : '0.00%'}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-[#9E9DA0] block uppercase tracking-wider text-left">Cash-on-Cash</span>
          <span className="text-sm font-semibold text-white text-left block">
            {derivedMetrics?.cashOnCashReturn != null ? `${derivedMetrics.cashOnCashReturn.toFixed(2)}%` : '0.00%'}
          </span>
        </div>
      </div>

      {/* Decision CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Proceed option */}
        <button
          id="btn-decision-proceed"
          onClick={() => handleDecisionChange('proceed')}
          disabled={readOnly}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center select-none ${
            currentDecision === 'proceed'
              ? 'border-green-500/30 bg-green-500/5 text-white font-semibold'
              : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
          }`}
        >
          <CheckCircle className={`w-6 h-6 mb-2 ${currentDecision === 'proceed' ? 'text-green-500' : 'text-[#9E9DA0]'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">Proceed</span>
          <span className="text-[9px] text-[#9E9DA0] mt-1 text-center">Accept DD and close deal</span>
        </button>

        {/* Renegotiate option */}
        <button
          id="btn-decision-renegotiate"
          onClick={() => handleDecisionChange('renegotiate')}
          disabled={readOnly}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center select-none ${
            currentDecision === 'renegotiate'
              ? 'border-amber-500/30 bg-amber-500/5 text-white font-semibold'
              : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
          }`}
        >
          <RefreshCw className={`w-6 h-6 mb-2 ${currentDecision === 'renegotiate' ? 'text-amber-500' : 'text-[#9E9DA0]'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">Renegotiate</span>
          <span className="text-[9px] text-[#9E9DA0] mt-1 text-center">Adjust final contract price</span>
        </button>

        {/* Walk option */}
        <button
          id="btn-decision-terminate"
          onClick={() => handleDecisionChange('walk')}
          disabled={readOnly}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center select-none ${
            currentDecision === 'walk'
              ? 'border-red-500/30 bg-red-500/5 text-white font-semibold'
              : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10'
          }`}
        >
          <XCircle className={`w-6 h-6 mb-2 ${currentDecision === 'walk' ? 'text-red-500' : 'text-[#9E9DA0]'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">Walk</span>
          <span className="text-[9px] text-[#9E9DA0] mt-1 text-center">Archive deal, keep data intact</span>
        </button>
      </div>

      {/* Renegotiation input fields */}
      {currentDecision === 'renegotiate' && (
        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
          <label className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block text-left">Renegotiated Price ($)</label>
          <div className="relative rounded-lg bg-[#161217] border border-white/10 focus-within:border-[#454955] transition-all">
            <span className="absolute left-3 top-2.5 text-xs text-[#9E9DA0] font-bold">$</span>
            <input
              type="text"
              id="input-renegotiated-price"
              value={priceInput}
              disabled={readOnly}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={handlePriceBlur}
              placeholder="e.g. 265,000"
              className="w-full pl-7 pr-3 py-2 bg-transparent text-xs text-white focus:outline-none placeholder:text-[#9E9DA0]/40 font-mono"
            />
          </div>
          <p className="text-[9px] text-amber-500 font-semibold text-left">
            * Entering a renegotiated price instantly overrides the original contract price and recalculates NOI, Cap Rate, and Cash-on-Cash live.
          </p>
        </div>
      )}

      {/* Decision Reason Textarea */}
      <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
        <label className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block text-left">Decision Reason</label>
        <textarea
          id="input-dd-decision-reason"
          value={reasonInput}
          disabled={readOnly}
          onChange={(e) => setReasonInput(e.target.value)}
          onBlur={handleReasonBlur}
          placeholder="Enter reason or additional context for the proceed / renegotiate / walk decision..."
          className="w-full min-h-[60px] p-3 rounded-lg bg-[#161217] border border-white/10 focus:border-[#454955] text-xs text-white focus:outline-none placeholder:text-[#9E9DA0]/40 transition-all resize-none"
        />
      </div>

      {/* Termination / Walk Notice */}
      {currentDecision === 'walk' && (
        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20 text-xs text-red-400 font-medium text-left">
          ⚠️ Deal status set to **Terminated / Walked**. The project has been archived. All recorded diligence documents, inspections, titles, and calculations are frozen and preserved for historical reporting.
        </div>
      )}
    </div>
  );
}
