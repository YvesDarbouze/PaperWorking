'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { HelpCircle, RefreshCw, Archive, CheckCircle2, ChevronRight, AlertOctagon } from 'lucide-react';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import type { Project } from '@/types/schema';
import posthog from 'posthog-js';

interface FirstPassScreenProps {
  project: Project;
  phaseColor?: string;
  onSave: (updates: any) => Promise<void>;
  onRestore?: () => Promise<void>;
}

export function FirstPassScreen({
  project,
  phaseColor = '#595959',
  onSave,
  onRestore,
}: FirstPassScreenProps) {
  const [rent, setRent] = useState(
    project.firstPassRentCents
      ? (project.firstPassRentCents / 100).toString()
      : project.propertyFacts?.estRentCents
      ? (project.propertyFacts.estRentCents / 100).toString()
      : ''
  );
  const [verdict, setVerdict] = useState<string>(project.firstPassVerdict || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    if (project.firstPassRentCents) {
      setRent((project.firstPassRentCents / 100).toString());
    } else if (project.propertyFacts?.estRentCents) {
      setRent((project.propertyFacts.estRentCents / 100).toString());
    }
    setVerdict(project.firstPassVerdict || '');
  }, [project]);

  const askingPrice = useMemo(() => {
    if (project.askingPriceCents) return project.askingPriceCents / 100;
    if (project.financials?.listedPrice) return Number(project.financials.listedPrice) / 100;
    return 0;
  }, [project]);

  // Live calculations
  const rentVal = parseFloat(rent) || 0;

  // Inline Calculations
  const liveMetrics = useMemo(() => {
    const tempFinancials = {
      purchasePrice: askingPrice,
      monthlyGrossRent: rentVal,
    };
    return deriveAllMetrics(tempFinancials as any, undefined, 'RENT', 1);
  }, [askingPrice, rentVal]);

  const inlineOnePercent = askingPrice > 0 ? (rentVal / askingPrice) * 100 : 0;
  const inlineGRM = rentVal > 0 ? askingPrice / (rentVal * 12) : 0;
  const fnGRM = liveMetrics.grossRentMultiplier ?? 0;
  const fnOnePercent = inlineOnePercent;

  const handleUpdate = async (newRent: string, newVerdict: string) => {
    setIsSaving(true);
    try {
      const parsedRent = parseFloat(newRent) || 0;
      const rentCents = Math.round(parsedRent * 100);

      const updates: any = {
        firstPassRentCents: rentCents || null,
        firstPassVerdict: newVerdict || null,
      };

      // Sync rent to propertyFacts.estRentCents if possible
      if (rentCents) {
        updates['propertyFacts.estRentCents'] = rentCents;
      }

      // If verdict is PASS, archive the project
      if (newVerdict === 'PASS') {
        updates.status = 'exit';
        updates.currentPhase = 4;
      } else if (newVerdict === 'PURSUE' && project.status === 'exit') {
        updates.status = 'acquisition';
        updates.currentPhase = 1;
      } else if (newVerdict === 'MAYBE' && project.status === 'exit') {
        updates.status = 'acquisition';
        updates.currentPhase = 1;
      }

      await onSave(updates);

      // Emit PostHog event on success (DoD requirement)
      try {
        posthog.capture('first_pass_verdict_submitted', {
          projectId: project.id,
          rent: rentCents / 100,
          verdict: newVerdict,
          askingPrice: askingPrice,
          grm: fnGRM,
          onePercent: fnOnePercent,
        });
      } catch (e) {
        console.warn('[Telemetry] Failed to emit first pass telemetry:', e);
      }
    } catch (err) {
      console.error('Failed to save first pass screen:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (onRestore) {
      await onRestore();
    } else {
      // Fallback: update status to Active
      await handleUpdate(rent, 'PURSUE');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isArchived = project.status === 'exit';

  return (
    <div className="rounded-xl border border-white/5 bg-[#161217] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-white" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">First-Pass Screen</h4>
            <p className="text-[10px] text-[#9E9DA0] mt-0.5">Quick gut check — does this deal even clear the bar?</p>
          </div>
        </div>
        {isSaving && (
          <span className="text-[9px] uppercase tracking-widest text-[#9E9DA0] animate-pulse flex items-center gap-1.5 font-bold">
            <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
          </span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Sub-Layout: Input and Live Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ask Estimated Rent */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-2">
                Asking Price (Reference)
              </label>
              <div className="text-xl font-black text-white font-mono">
                {askingPrice > 0 ? formatCurrency(askingPrice) : '—'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1.5">
                Estimated Monthly Rent ($)
              </label>
              <input
                type="number"
                value={rent}
                onChange={(e) => {
                  setRent(e.target.value);
                  handleUpdate(e.target.value, verdict);
                }}
                className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                placeholder="e.g. 2500"
              />
            </div>
          </div>

          {/* Rough Screen Live Outputs */}
          <div className="rounded-lg bg-white/[0.01] border border-white/5 p-4 space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] border-b border-white/5 pb-2">
              Rough screen
            </div>

            {/* 1% Test Side-by-Side */}
            <div className="space-y-1">
              <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">1% Rule Test</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0]/60">Live Inline Calc</span>
                  <span className="text-xs font-bold font-mono text-white">
                    {inlineOnePercent.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0]/60">Function Call</span>
                  <span className="text-xs font-bold font-mono text-[#7A9EAA]">
                    {fnOnePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="text-[9px] text-[#9E9DA0] mt-1">
                {fnOnePercent >= 1.0 ? (
                  <span className="text-green-400 font-semibold">✓ Meets 1% Rule threshold</span>
                ) : (
                  <span className="text-yellow-500/80">○ Under 1% Rule threshold</span>
                )}
              </div>
            </div>

            {/* GRM Side-by-Side */}
            <div className="space-y-1 pt-2 border-t border-white/5">
              <span className="block text-[9px] uppercase tracking-widest text-[#9E9DA0]">Gross Rent Multiplier (GRM)</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0]/60">Live Inline Calc</span>
                  <span className="text-xs font-bold font-mono text-white">
                    {inlineGRM > 0 ? `${inlineGRM.toFixed(2)}x` : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0]/60">Function Call</span>
                  <span className="text-xs font-bold font-mono text-[#7A9EAA]">
                    {fnGRM > 0 ? `${fnGRM.toFixed(2)}x` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict and Actions */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
              Verdict Decision
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setVerdict('PURSUE');
                  handleUpdate(rent, 'PURSUE');
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  verdict === 'PURSUE'
                    ? 'bg-green-600 text-white shadow-sm shadow-green-900/30'
                    : 'bg-white/5 hover:bg-white/10 text-[#9E9DA0]'
                }`}
              >
                Pursue
              </button>
              <button
                onClick={() => {
                  setVerdict('MAYBE');
                  handleUpdate(rent, 'MAYBE');
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  verdict === 'MAYBE'
                    ? 'bg-yellow-600 text-white shadow-sm shadow-yellow-900/30'
                    : 'bg-white/5 hover:bg-white/10 text-[#9E9DA0]'
                }`}
              >
                Maybe
              </button>
              <button
                onClick={() => {
                  setVerdict('PASS');
                  handleUpdate(rent, 'PASS');
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  verdict === 'PASS'
                    ? 'bg-red-700 text-white shadow-sm shadow-red-950/30'
                    : 'bg-white/5 hover:bg-white/10 text-[#9E9DA0]'
                }`}
              >
                Pass
              </button>
            </div>
          </div>

          {/* Archived / Recoverable State */}
          {isArchived && (
            <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-3">
                <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-red-400">Deal Archived</span>
                  <p className="text-red-200 mt-1 text-[11px] leading-relaxed">
                    This project was archived because the First-Pass Screen verdict was set to PASS.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRestore}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] font-bold uppercase tracking-widest shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Restore Deal
              </button>
            </div>
          )}

          {/* Stage 2 unlocked message */}
          {verdict === 'PURSUE' && !isArchived && (
            <div className="rounded-lg bg-green-950/20 border border-green-900/30 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-green-400">Stage 2 Unlocked</span>
                <p className="text-green-200 mt-1 text-[11px] leading-relaxed">
                  The PASS/PURSUE verdict is set to PURSUE. Exit conditions met for Stage 2: Analyze &amp; Underwrite.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
