'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import type { Project } from '@/types/schema';
import { CheckCircle2, XCircle, ShieldAlert, Award, TrendingUp, DollarSign, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

interface HurdleTestCardProps {
  project: Project;
  onSave: (updates: any) => Promise<void>;
}

export function HurdleTestCard({ project, onSave }: HurdleTestCardProps) {
  const { user, profile } = useAuth();

  // Normalize project financials
  const normalizedProject = useMemo(() => {
    const f = (project.financials || {}) as any;
    const copy = { ...project } as any;
    copy.financials = {
      ...f,
      purchasePrice: f.purchasePrice ? f.purchasePrice / 100 : 0,
      loanAmount: f.loanAmount ? f.loanAmount / 100 : 0,
      projectedRehabCost: f.projectedRehabCost ? f.projectedRehabCost / 100 : 0,
      estimatedARV: f.estimatedARV ? f.estimatedARV / 100 : 0,
      closingCosts: f.closingCosts ? f.closingCosts / 100 : (f.fixedAcquisitionCosts ? f.fixedAcquisitionCosts / 100 : 0),
      totalCashInvested: f.totalCashInvested ? f.totalCashInvested / 100 : 0,
      monthlyGrossRent: f.monthlyGrossRent ?? f.monthlyRent ?? 0,
      vacancyRatePercent: f.vacancyRatePercent ?? 7,
      holdingCostTaxes: f.holdingCostTaxes ?? 0,
      holdingCostInsurance: f.holdingCostInsurance ?? 0,
      holdingCostUtilities: f.holdingCostUtilities ?? 0,
      propertyManagementFeePercent: f.propertyManagementFeePercent ?? 0,
      monthlyMaintenanceReserve: f.monthlyMaintenanceReserve ?? 0,
      monthlyHOA: f.monthlyHOA ?? 0,
      loanInterestRate: f.loanInterestRate ?? 6.5,
      loanTermYears: f.loanTermYears ?? 30,
    };
    return copy;
  }, [project]);

  // Derive projected metrics
  const metrics = useMemo(() => {
    return deriveAllMetrics(
      normalizedProject.financials || {},
      undefined,
      normalizedProject.dispositionType,
      normalizedProject.currentPhase,
      normalizedProject.createdAt
    );
  }, [normalizedProject]);

  // Load project-specific thresholds or pre-fill from user-profile/localStorage/defaults
  const [thresholds, setThresholds] = useState({
    targetCapRate: 5.5,
    targetCoc: 8.0,
    minDscr: 1.25,
    maxPurchasePrice: 500000,
  });

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!project) return;

    // 1. Try project-level thresholds
    const pTargetCap = (project.financials as any)?.targetCapRate;
    const pTargetCoc = (project.financials as any)?.targetCoc;
    const pMinDscr = (project.financials as any)?.minDscr;
    const pMaxPrice = (project.financials as any)?.maxPurchasePrice;

    if (
      pTargetCap !== undefined ||
      pTargetCoc !== undefined ||
      pMinDscr !== undefined ||
      pMaxPrice !== undefined
    ) {
      setThresholds({
        targetCapRate: pTargetCap ?? 5.5,
        targetCoc: pTargetCoc ?? 8.0,
        minDscr: pMinDscr ?? 1.25,
        maxPurchasePrice: pMaxPrice ?? 500000,
      });
      setIsInitializing(false);
      return;
    }

    // 2. Fall back to user-level profile thresholds or localStorage
    const profileCap = profile?.buyBoxTargetCapRate;
    const profileCoc = profile?.buyBoxTargetCoc;
    const profileDscr = profile?.buyBoxMinDscr;
    const profileMaxPrice = profile?.buyBoxMaxPurchasePrice;

    let lsThresholds: any = null;
    try {
      const stored = localStorage.getItem('pw_user_buy_box_thresholds');
      if (stored) lsThresholds = JSON.parse(stored);
    } catch {
      // ignore
    }

    const resolved = {
      targetCapRate: profileCap ?? lsThresholds?.targetCapRate ?? 5.5,
      targetCoc: profileCoc ?? lsThresholds?.targetCoc ?? 8.0,
      minDscr: profileDscr ?? lsThresholds?.minDscr ?? 1.25,
      maxPurchasePrice: profileMaxPrice ?? lsThresholds?.maxPurchasePrice ?? 500000,
    };

    setThresholds(resolved);

    // Save user profile defaults onto this new project to pre-fill it persistently (AC2)
    const saveDefaults = async () => {
      try {
        await onSave({
          'financials.targetCapRate': resolved.targetCapRate,
          'financials.targetCoc': resolved.targetCoc,
          'financials.minDscr': resolved.minDscr,
          'financials.maxPurchasePrice': resolved.maxPurchasePrice,
        });
      } catch (err) {
        console.error('Failed to pre-fill project thresholds:', err);
      }
    };
    saveDefaults();
    setIsInitializing(false);
  }, [project.id, profile]);

  // Handle threshold modifications
  const handleThresholdUpdate = async (field: keyof typeof thresholds, val: number) => {
    const next = { ...thresholds, [field]: val };
    setThresholds(next);

    try {
      // Save project-level thresholds
      const financialsKey = `financials.${field}`;
      await onSave({ [financialsKey]: val });

      // Save user profile thresholds (AC2 / persistence per user)
      if (user) {
        const userField = `buyBox${field.charAt(0).toUpperCase()}${field.slice(1)}`;
        await updateDoc(doc(db, 'users', user.uid), {
          [userField]: val,
        });
      }

      // Save localStorage as fallback/recording check
      localStorage.setItem('pw_user_buy_box_thresholds', JSON.stringify(next));
    } catch (err) {
      console.error('Failed to save buy box threshold updates:', err);
      toast.error('Failed to save threshold changes');
    }
  };

  // Perform calculations
  const actualCapRate = (metrics as any).capRate ?? 0;
  const actualCoc = (metrics as any).cashOnCashReturn ?? 0;
  const actualDscr = (metrics as any).dscr ?? 0;
  const actualPurchasePrice = normalizedProject.financials?.purchasePrice ?? 0;

  // Maximum Allowable Offer (MAO) only shown for SALE disposition
  const isSale = project.dispositionType === 'SALE';
  const mao = (metrics as any).mao ?? 0;
  const arv = normalizedProject.financials?.estimatedARV ?? 0;
  const rehab = normalizedProject.financials?.projectedRehabCost ?? 0;

  // Hurdle checks
  const checks = {
    capRate: actualCapRate >= thresholds.targetCapRate,
    coc: actualCoc >= thresholds.targetCoc,
    dscr: actualDscr >= thresholds.minDscr,
    price: actualPurchasePrice <= thresholds.maxPurchasePrice,
    mao: !isSale || actualPurchasePrice <= mao,
  };

  // Overall verdict
  const hurdlePassed = checks.capRate && checks.coc && checks.dscr && checks.price && checks.mao;

  // Render Currency Format helper
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isInitializing) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#161217] p-6 text-center text-xs text-[#9E9DA0]">
        Initializing Hurdle Test Parameters...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#161217] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            <Award className="h-4 w-4 text-[#EA580C]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Buy-Box &amp; Hurdle Test</h4>
            <p className="text-[9px] text-[#9E9DA0]">"Does this deal meet your investment parameters?"</p>
          </div>
        </div>

        {/* Verdict Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] uppercase tracking-wider text-[#9E9DA0] font-bold">Hurdle Verdict:</span>
          <span
            id="hurdle-overall-verdict"
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
              hurdlePassed
                ? 'bg-[var(--pw-success-container)] text-[var(--pw-success)] border border-[var(--pw-success)]/30'
                : 'bg-[#F06543]/20 text-[#F06543] border border-[#F06543]/30'
            }`}
          >
            {hurdlePassed ? 'APPROVED / PASS' : 'REJECTED / FAIL'}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Threshold Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Target Cap Rate */}
          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg">
            <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold mb-1.5">
              Target Cap Rate (%)
            </span>
            <div className="relative">
              <Percent className="absolute left-2.5 top-2 h-3 w-3 text-[#9E9DA0]" />
              <input
                id="threshold-cap-rate"
                type="number"
                step="0.01"
                value={thresholds.targetCapRate}
                onChange={(e) => handleThresholdUpdate('targetCapRate', parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-2 py-1 rounded text-xs bg-[#161217] border border-white/10 text-white font-mono text-right"
              />
            </div>
          </div>

          {/* Target CoC */}
          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg">
            <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold mb-1.5">
              Target CoC Return (%)
            </span>
            <div className="relative">
              <Percent className="absolute left-2.5 top-2 h-3 w-3 text-[#9E9DA0]" />
              <input
                id="threshold-coc"
                type="number"
                step="0.01"
                value={thresholds.targetCoc}
                onChange={(e) => handleThresholdUpdate('targetCoc', parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-2 py-1 rounded text-xs bg-[#161217] border border-white/10 text-white font-mono text-right"
              />
            </div>
          </div>

          {/* Min DSCR */}
          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg">
            <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold mb-1.5">
              Minimum DSCR
            </span>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-[#9E9DA0] font-bold">x</span>
              <input
                id="threshold-min-dscr"
                type="number"
                step="0.01"
                value={thresholds.minDscr}
                onChange={(e) => handleThresholdUpdate('minDscr', parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-2 py-1 rounded text-xs bg-[#161217] border border-white/10 text-white font-mono text-right"
              />
            </div>
          </div>

          {/* Max Purchase Price */}
          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg">
            <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold mb-1.5">
              Max Purchase Price ($)
            </span>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-2 h-3 w-3 text-[#9E9DA0]" />
              <input
                id="threshold-max-price"
                type="number"
                value={thresholds.maxPurchasePrice}
                onChange={(e) => handleThresholdUpdate('maxPurchasePrice', parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-2 py-1 rounded text-xs bg-[#161217] border border-white/10 text-white font-mono text-right"
              />
            </div>
          </div>
        </div>

        {/* MAO Calculations (SALE strategy only) */}
        {isSale && (
          <div id="mao-details-panel" className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white font-bold">
                Maximum Allowable Offer (MAO)
              </span>
              <span id="mao-calculated-value" className="text-xs font-mono font-bold text-[#EA580C]">
                MAO: {fmtCurrency(mao)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-[10px] text-[#9E9DA0]">
              <div>
                <span className="block text-[#9E9DA0]/50">Estimated ARV:</span>
                <span className="font-mono text-white">{fmtCurrency(arv)}</span>
              </div>
              <div>
                <span className="block text-[#9E9DA0]/50">Rehab Budget:</span>
                <span className="font-mono text-white">{fmtCurrency(rehab)}</span>
              </div>
              <div>
                <span className="block text-[#9E9DA0]/50">MAO Formula:</span>
                <span className="font-mono text-white">ARV * 70% - Rehab</span>
              </div>
            </div>
          </div>
        )}

        {/* Per-Metric Pass/Fail Evaluator */}
        <div className="space-y-2.5 pt-2">
          <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">
            Evaluation Results
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cap Rate */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01]">
              <div className="space-y-0.5">
                <span className="block text-[10px] text-white/70 font-bold uppercase tracking-wider">Cap Rate</span>
                <span className="block text-[9px] text-[#9E9DA0] font-mono">
                  Projected: {actualCapRate.toFixed(2)}% vs Target: {thresholds.targetCapRate.toFixed(2)}%
                </span>
              </div>
              <div id="hurdle-check-caprate" className="flex items-center">
                {checks.capRate ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--pw-success)]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#F06543]" />
                )}
              </div>
            </div>

            {/* Cash-on-Cash */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01]">
              <div className="space-y-0.5">
                <span className="block text-[10px] text-white/70 font-bold uppercase tracking-wider">Cash-on-Cash Return</span>
                <span className="block text-[9px] text-[#9E9DA0] font-mono">
                  Projected: {actualCoc.toFixed(2)}% vs Target: {thresholds.targetCoc.toFixed(2)}%
                </span>
              </div>
              <div id="hurdle-check-coc" className="flex items-center">
                {checks.coc ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--pw-success)]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#F06543]" />
                )}
              </div>
            </div>

            {/* DSCR */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01]">
              <div className="space-y-0.5">
                <span className="block text-[10px] text-white/70 font-bold uppercase tracking-wider">Debt Service Coverage (DSCR)</span>
                <span className="block text-[9px] text-[#9E9DA0] font-mono">
                  Projected: {actualDscr.toFixed(2)}x vs Min: {thresholds.minDscr.toFixed(2)}x
                </span>
              </div>
              <div id="hurdle-check-dscr" className="flex items-center">
                {checks.dscr ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--pw-success)]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#F06543]" />
                )}
              </div>
            </div>

            {/* Purchase Price */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01]">
              <div className="space-y-0.5">
                <span className="block text-[10px] text-white/70 font-bold uppercase tracking-wider">Purchase Price Check</span>
                <span className="block text-[9px] text-[#9E9DA0] font-mono">
                  Price: {fmtCurrency(actualPurchasePrice)} vs Max: {fmtCurrency(thresholds.maxPurchasePrice)}
                </span>
              </div>
              <div id="hurdle-check-price" className="flex items-center">
                {checks.price ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--pw-success)]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#F06543]" />
                )}
              </div>
            </div>

            {/* MAO (if SALE disposition) */}
            {isSale && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01] sm:col-span-2">
                <div className="space-y-0.5">
                  <span className="block text-[10px] text-white/70 font-bold uppercase tracking-wider">MAO Check (Sale Strategy)</span>
                  <span className="block text-[9px] text-[#9E9DA0] font-mono">
                    Price: {fmtCurrency(actualPurchasePrice)} vs MAO limit: {fmtCurrency(mao)}
                  </span>
                </div>
                <div id="hurdle-check-mao" className="flex items-center">
                  {checks.mao ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--pw-success)]" />
                  ) : (
                    <XCircle className="h-5 w-5 text-[#F06543]" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Warning Indicator */}
        {!hurdlePassed && (
          <div id="hurdle-warning-banner" className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F06543]/10 border border-[#F06543]/20 text-xs text-[#9E9DA0]">
            <ShieldAlert className="h-4 w-4 text-[#F06543] shrink-0 mt-0.5" />
            <div>
              <span className="block font-bold text-white mb-0.5">One or more hurdles are failing</span>
              <span>This project does not meet the specified Buy-Box criteria. You can only advance the deal by typing an emergency override justification reason.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
