'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { DerivedMetrics, getEffectivePurchasePrice } from '@/lib/metrics/reiMetrics';
import { Shield, RefreshCw, AlertTriangle, HelpCircle, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface EquityEnginePanelProps {
  project: Project;
  derivedMetrics: DerivedMetrics | null;
  onSaveFinancials: (updates: any) => Promise<void>;
  readOnly?: boolean;
}

export function EquityEnginePanel({
  project,
  derivedMetrics,
  onSaveFinancials,
  readOnly = false,
}: EquityEnginePanelProps) {
  const financials = project.financials || {};
  const currentPlan = financials.capitalPlan || 'all-cash solo';
  const terms = financials.equityTerms;

  const totalCap = derivedMetrics?.totalCapitalization || 0; // in dollars
  const totalCapCents = Math.round(totalCap * 100);
  const isStale = derivedMetrics?.isTermsStale || false;

  const effectivePurchasePrice = getEffectivePurchasePrice(financials);
  const closingEstimate = financials.fixedAcquisitionCosts || 0;
  const rehabBudget = financials.projectedRehabCost || 0;

  // Local input states
  const [fundingTargetInput, setFundingTargetInput] = useState<string>('');
  const [equityOfferedInput, setEquityOfferedInput] = useState<string>('');
  const [minTicketInput, setMinTicketInput] = useState<string>('');
  const [previewTicketInput, setPreviewTicketInput] = useState<string>('25000');
  const [isSaving, setIsSaving] = useState(false);

  // Real-time preview calculations based on live inputs
  const typedFundingTargetCents = Math.round((parseFloat(fundingTargetInput) || 0) * 100);
  const typedEquityOffered = parseFloat(equityOfferedInput);

  const currentFundingTarget = typedFundingTargetCents || terms?.funding_target || 1;
  const autoPct = totalCapCents > 0
    ? (currentFundingTarget / totalCapCents) * 100
    : 0;

  const offeredPct = !isNaN(typedEquityOffered) ? typedEquityOffered : (terms?.equity_offered_pct ?? autoPct);
  const delta = autoPct - offeredPct;

  // Sync inputs with terms
  useEffect(() => {
    if (terms) {
      setFundingTargetInput(String(terms.funding_target / 100));
      setEquityOfferedInput(String(terms.equity_offered_pct));
      setMinTicketInput(String(terms.min_ticket / 100));
    } else {
      // Default initial states based on total capitalization (50% raise target as default)
      setFundingTargetInput(String(Math.round(totalCapCents / 2 / 100)));
      setEquityOfferedInput(String(50));
      setMinTicketInput('25000');
    }
  }, [terms, totalCapCents]);

  const handlePlanChange = async (plan: typeof currentPlan) => {
    console.log('[EquityEnginePanel] handlePlanChange executing. plan =', plan, 'readOnly =', readOnly);
    if (readOnly) {
      console.log('[EquityEnginePanel] handlePlanChange blocked by readOnly = true');
      return;
    }
    try {
      setIsSaving(true);
      const updates: any = { capitalPlan: plan };
      if (plan !== 'raise interest') {
        updates.equityTerms = null; // Clear equity terms if not raising
      } else {
        // Initialize default terms for raise interest
        const targetCents = Math.round(totalCapCents / 2);
        updates.equityTerms = {
          funding_target: targetCents,
          equity_offered_pct: 50,
          min_ticket: 2500000, // $25,000
          price_basis: totalCapCents,
          version: 1,
        };
      }
      console.log('[EquityEnginePanel] handlePlanChange calling onSaveFinancials with updates:', JSON.stringify(updates));
      await onSaveFinancials(updates);
      toast.success(`Capital plan updated to: ${plan.toUpperCase()}`);
    } catch (err) {
      console.error('[EquityEnginePanel] handlePlanChange error:', err);
      toast.error('Failed to update capital plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTerms = async () => {
    if (readOnly) return;
    try {
      setIsSaving(true);
      const targetCents = Math.round(parseFloat(fundingTargetInput) * 100);
      const offeredVal = parseFloat(equityOfferedInput);
      const ticketCents = Math.round(parseFloat(minTicketInput) * 100);

      if (isNaN(targetCents) || targetCents <= 0) {
        toast.error('Please enter a valid funding target');
        return;
      }
      if (isNaN(offeredVal) || offeredVal < 0 || offeredVal > 100) {
        toast.error('Equity offered must be between 0% and 100%');
        return;
      }
      if (isNaN(ticketCents) || ticketCents <= 0) {
        toast.error('Please enter a valid minimum ticket size');
        return;
      }

      const nextVersion = terms ? terms.version + 1 : 1;
      await onSaveFinancials({
        equityTerms: {
          funding_target: targetCents,
          equity_offered_pct: offeredVal,
          min_ticket: ticketCents,
          price_basis: totalCapCents,
          version: nextVersion,
        },
      });
      toast.success(`Equity terms saved! Incrementing to Version ${nextVersion}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save equity terms');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToBaseline = () => {
    setEquityOfferedInput(String(autoPct));
  };

  // Preview ticket calculations
  const previewTicketVal = parseFloat(previewTicketInput) || 0;
  const previewEquityPct = currentFundingTarget > 0
    ? (previewTicketVal * 100 / currentFundingTarget) * offeredPct
    : 0;

  const fmtUsd = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Plan selection */}
      <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Capital Funding Plan</h4>
          {isSaving && <RefreshCw className="w-3.5 h-3.5 text-[#454955] animate-spin" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { id: 'all-cash solo', label: 'All-Cash Solo', desc: 'No debt, full equity funded solo' },
            { id: 'solo-financed', label: 'Solo-Financed', desc: 'Mortgage + personal equity gap' },
            { id: 'partnership', label: 'Partnership', desc: 'Private JV partner / split structure' },
            { id: 'raise interest', label: 'Raise Interest', desc: 'Crowdfund from audience' },
          ].map((plan) => (
            <button
              key={plan.id}
              id={`btn-plan-${plan.id.replace(/\s+/g, '-')}`}
              onClick={() => handlePlanChange(plan.id as any)}
              disabled={readOnly || isSaving}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${
                currentPlan === plan.id
                  ? 'border-[#454955] bg-[#454955]/10 text-white font-bold'
                  : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
              }`}
            >
              <div>
                <span className="text-xs font-bold block">{plan.label}</span>
                <span className="text-[9px] font-normal leading-normal opacity-70 mt-1 block">{plan.desc}</span>
              </div>
              {currentPlan === plan.id && (
                <span className="text-[9px] text-[#454955] uppercase tracking-wider font-extrabold mt-1">✓ Active</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Solo collapsed notice */}
      {currentPlan !== 'raise interest' && (
        <div className="glass-card rounded-2xl p-6 border border-white/5 text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-pw-success-container border border-pw-success-border flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-pw-success" />
          </div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">Stage 6 Collapsed (Solo Strategy)</h4>
          <p className="text-xs text-[#9E9DA0] max-w-md mx-auto leading-relaxed">
            Since this project is being funded via a **{currentPlan}** strategy, the co-investment interest tracking has been bypassed and satisfied.
          </p>
        </div>
      )}

      {/* Raise interest / Equity Engine */}
      {currentPlan === 'raise interest' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equity Terms Config */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Equity Terms Version {(terms?.version || 1)}</h4>
            </div>

            {/* Price basis & Capitalization summary */}
            <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#9E9DA0]">Project Price Basis:</span>
                <span className="font-bold text-white font-mono">{fmtUsd(effectivePurchasePrice)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9E9DA0]">Closing Costs Estimate:</span>
                <span className="font-bold text-white font-mono">{fmtUsd(closingEstimate)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9E9DA0]">Rehab Budget Target:</span>
                <span className="font-bold text-white font-mono">{fmtUsd(rehabBudget)}</span>
              </div>
              <div className="border-t border-white/5 pt-2 flex justify-between text-xs font-bold">
                <span className="text-white">Total Project Capitalization:</span>
                <span className="text-amber-400 font-mono" id="total-capitalization">{fmtUsd(totalCapCents)}</span>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block mb-1">Funding Target ($)</label>
                <div className="relative rounded-lg bg-[#161217] border border-white/10 focus-within:border-[#454955] transition-all">
                  <span className="absolute left-3 top-2 text-xs text-[#9E9DA0] font-bold">$</span>
                  <input
                    type="number"
                    id="input-funding-target"
                    value={fundingTargetInput}
                    disabled={readOnly || isSaving}
                    onChange={(e) => setFundingTargetInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-transparent text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Equity Offered (%)</label>
                  <button
                    onClick={handleResetToBaseline}
                    disabled={readOnly || isSaving}
                    className="text-[9px] text-[#454955] hover:text-white uppercase font-bold tracking-wider transition-all"
                  >
                    Reset to Cost-Basis
                  </button>
                </div>
                <div className="relative rounded-lg bg-[#161217] border border-white/10 focus-within:border-[#454955] transition-all">
                  <input
                    type="number"
                    step="0.01"
                    id="input-equity-offered"
                    value={equityOfferedInput}
                    disabled={readOnly || isSaving}
                    onChange={(e) => setEquityOfferedInput(e.target.value)}
                    className="w-full px-3 py-1.5 bg-transparent text-xs text-white focus:outline-none font-mono"
                  />
                  <span className="absolute right-3 top-2 text-xs text-[#9E9DA0] font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block mb-1">Minimum Ticket Size ($)</label>
                <div className="relative rounded-lg bg-[#161217] border border-white/10 focus-within:border-[#454955] transition-all">
                  <span className="absolute left-3 top-2 text-xs text-[#9E9DA0] font-bold">$</span>
                  <input
                    type="number"
                    id="input-min-ticket"
                    value={minTicketInput}
                    disabled={readOnly || isSaving}
                    onChange={(e) => setMinTicketInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-transparent text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveTerms}
                disabled={readOnly || isSaving}
                id="btn-save-equity-terms"
                className="w-full py-2 bg-[#454955] hover:bg-[#454955]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Save & Publish Terms'}
              </button>
            </div>
          </div>

          {/* Equity Math & Stale Alerts */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Equity Engine Calculations</h4>

              {/* Stale Warning Banner */}
              {isStale && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-400 font-medium" id="terms-stale-warning">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-500">Terms are Stale</h5>
                    <p className="text-[11px] text-amber-400/80 leading-normal">
                      Upstream project capitalization has changed since these terms were versioned. Re-save terms to re-calculate and sync.
                    </p>
                    <button
                      onClick={handleSaveTerms}
                      id="btn-update-stale-terms"
                      className="px-3 py-1 bg-amber-500 text-black font-bold text-[10px] uppercase tracking-wider rounded hover:bg-amber-400 transition-all flex items-center gap-1"
                    >
                      <RefreshCw size={10} className="animate-spin" /> Update & Re-Version
                    </button>
                  </div>
                </div>
              )}

              {/* Baseline calculations math */}
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">Cost-Basis Baseline</span>
                  <p className="text-xs text-white mt-1 leading-normal font-medium" id="baseline-math-text">
                    {fmtUsd(currentFundingTarget)} of a {fmtUsd(totalCapCents)} project = <span className="font-bold text-amber-400 font-mono">{autoPct.toFixed(1)}%</span> equity
                  </p>
                </div>

                <div className="border-t border-white/5 pt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">Lead Investor Strategy</span>
                  <p className="text-xs text-white mt-1 leading-normal" id="offering-delta-text">
                    You're offering <span className="font-bold text-white font-mono">{offeredPct.toFixed(1)}%</span> for {fmtUsd(currentFundingTarget)} —{' '}
                    {delta > 0 ? (
                      <span className="text-pw-success font-bold font-mono">{delta.toFixed(1)}-point premium to cost basis</span>
                    ) : delta < 0 ? (
                      <span className="text-rose-400 font-bold font-mono">{Math.abs(delta).toFixed(1)}-point discount to cost basis</span>
                    ) : (
                      <span className="text-[#9E9DA0] font-mono">exact cost basis terms</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Per-investor preview calculator */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0] block">Per-Investor Preview Calculator</span>
              <div className="flex items-center gap-2">
                <div className="relative rounded-lg bg-[#161217] border border-white/10 focus-within:border-[#454955] transition-all flex-1">
                  <span className="absolute left-2.5 top-1.5 text-xs text-[#9E9DA0] font-bold">$</span>
                  <input
                    type="number"
                    id="input-preview-ticket"
                    value={previewTicketInput}
                    onChange={(e) => setPreviewTicketInput(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 bg-transparent text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <ArrowRight size={12} className="text-[#9E9DA0]" />
                <div className="p-1 px-3 bg-[#161217] border border-white/10 rounded-lg text-xs font-bold text-amber-400 font-mono" id="preview-equity-result">
                  {previewEquityPct.toFixed(3)}% Equity
                </div>
              </div>
              <span className="text-[9px] text-[#9E9DA0]/60 block leading-tight">
                * Computes the custom equity percentage awarded based on current active terms ({offeredPct.toFixed(1)}% offered for {fmtUsd(currentFundingTarget)}).
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
