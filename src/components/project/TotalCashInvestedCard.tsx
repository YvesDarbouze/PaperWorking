'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { deriveAllMetrics, computeTotalCashInvested } from '@/lib/metrics/reiMetrics';
import { 
  Coins, 
  ArrowRight, 
  Calculator, 
  ExternalLink, 
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  projectId: string;
  activeCardId?: string | null;
  setActiveCardId?: (id: string | null) => void;
}

export function TotalCashInvestedCard({ projectId, activeCardId, setActiveCardId }: Props) {
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    // Check for E2E testing mock
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      const key = `pw_e2e_project_${projectId}`;
      const load = () => {
        try {
          const val = localStorage.getItem(key);
          setProject(val ? JSON.parse(val) : null);
          setLoading(false);
        } catch (e) {}
      };
      load();
      window.addEventListener('storage', (e) => {
        if (e.key === key) load();
      });
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'projects', projectId),
      (snap) => {
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() });
        }
        setLoading(false);
      },
      (err) => {
        console.error('onSnapshot project error in TotalCashInvestedCard:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="material-symbols-outlined text-[32px] animate-spin text-[#7A9EAA] mb-2">
          progress_activity
        </span>
        <span className="text-xs text-[#9E9DA0] font-light uppercase tracking-wider">
          Assembling cash metrics...
        </span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center text-xs text-[#9E9DA0] font-light py-8 border border-dashed border-white/10 rounded-xl">
        Project details not found.
      </div>
    );
  }

  const financials = project.financials || {};
  const metrics = deriveAllMetrics(financials, undefined, project.dispositionType, 2);

  const purchasePrice = financials.purchasePrice ?? 0;
  const isAllCash = financials.financingType === 'All Cash';
  const loanAmount = financials.loanAmount ?? 0;
  const downPayment = isAllCash ? purchasePrice : Math.max(0, purchasePrice - loanAmount);

  // Closing Costs: Actual if financials.closingCosts is set, fallback to targetClosingCosts or fixedAcquisitionCosts (Projected)
  const actualClosingCosts = financials.closingCosts;
  const projectedClosingCosts = financials.targetClosingCosts ?? financials.fixedAcquisitionCosts ?? 0;
  const closingCosts = actualClosingCosts ?? projectedClosingCosts;
  const hasActualClosingCosts = actualClosingCosts !== undefined && actualClosingCosts !== null;

  // Upfront Rehab: Acquisition projected upfront rehab cash
  const upfrontRehab = financials.upfrontRehab ?? 0;

  // Compute Total Cash Invested via the metrics engine
  const totalCashInvested = computeTotalCashInvested(financials);
  const cocReturn = metrics.cashOnCashReturn ?? 0;

  const fmt = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]/70 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[#7A9EAA]" />
              Total Cash Invested (Denominator)
            </span>
            <p className="text-3xl font-black text-white mt-2 tabular-nums">
              {fmt(totalCashInvested)}
            </p>
          </div>
          <p className="text-[10px] text-[#9E9DA0]/50 font-light mt-3 leading-relaxed">
            Assembled dynamically from components. Manual editing of this total is disabled.
          </p>
        </div>

        <div className="glass-card p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]/70 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#7A9EAA]" />
              Cash-on-Cash Return
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <p className={`text-3xl font-black tabular-nums ${cocReturn < 0 ? 'text-[#FF6B6B]' : 'text-[#4BD37B]'}`}>
                {cocReturn.toFixed(2)}%
              </p>
              {project.id === 'project_fx1_seed' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#9E9DA0] border border-white/5">
                  Target CoC: -7.41%
                </span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#9E9DA0]/50 font-light mt-3 leading-relaxed">
            Calculated as: Annual Cash Flow ({fmt(metrics.annualCashFlow ?? 0)}) ÷ Total Cash Invested ({fmt(totalCashInvested)})
          </p>
        </div>
      </div>

      {/* Assembly Formula Flow */}
      <div className="glass-card p-6 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          Denominator Assembly components
        </h3>

        <div className="grid grid-cols-1 gap-3.5">
          {/* 1. Down Payment (Fund) */}
          <div className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">Down Payment</h4>
                <span className="px-2 py-0.5 rounded-full bg-[#E4ECF0]/10 text-[#7A9EAA] text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-[#7A9EAA]/25">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7A9EAA]" />
                  Actual (Fund Phase)
                </span>
              </div>
              <p className="text-xs text-[#9E9DA0] font-light">
                Equity cash contribution required by selected loan or purchase mode.
              </p>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6">
              <span className="text-base font-bold font-mono text-white tabular-nums">{fmt(downPayment)}</span>
              {setActiveCardId && (
                <button
                  onClick={() => setActiveCardId('F3.6')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-[#7A9EAA] border border-white/5 flex items-center gap-1.5 transition-all"
                >
                  Go to Locked Terms
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Closing Costs (Acquisition / Fund) */}
          <div className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">Closing Costs</h4>
                {hasActualClosingCosts ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#E4ECF0]/10 text-[#7A9EAA] text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-[#7A9EAA]/25">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7A9EAA]" />
                    Actual (Fund Phase)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-500/25">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Projected (Acquisition Phase)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9E9DA0] font-light">
                {hasActualClosingCosts 
                  ? 'Calculated from actual Closing Disclosure (CD) line items.'
                  : 'Awaiting actual Closing Disclosure. Currently falling back to acquisition projection.'}
              </p>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6">
              <span className="text-base font-bold font-mono text-white tabular-nums">{fmt(closingCosts)}</span>
              {setActiveCardId && (
                <button
                  onClick={() => setActiveCardId('F5.3')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-[#7A9EAA] border border-white/5 flex items-center gap-1.5 transition-all"
                >
                  Go to CC Ledger
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Upfront Rehab (Acquisition) */}
          <div className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">Upfront Rehab Cash</h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-500/25">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Projected (Acquisition Phase)
                </span>
              </div>
              <p className="text-xs text-[#9E9DA0] font-light">
                Rehab costs to be paid out-of-pocket (not funded by debt) during acquisition.
              </p>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6">
              <span className="text-base font-bold font-mono text-white tabular-nums">{fmt(upfrontRehab)}</span>
              <Link
                href={`/dashboard/projects/${projectId}/phase-1?focus=rehab`}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-[#7A9EAA] border border-white/5 flex items-center gap-1.5 transition-all"
              >
                Go to Rehab Budget
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Calculation Summary Footer */}
          <div className="p-4 rounded-xl bg-[#7A9EAA]/5 border border-[#7A9EAA]/15 flex items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#7A9EAA]">
              <AlertCircle className="w-4 h-4" />
              <span>Assembly Formula:</span>
            </div>
            <div className="text-xs font-mono text-white tracking-wide">
              {fmt(downPayment)} + {fmt(closingCosts)} + {fmt(upfrontRehab)} = <span className="font-bold text-[#7A9EAA]">{fmt(totalCashInvested)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
