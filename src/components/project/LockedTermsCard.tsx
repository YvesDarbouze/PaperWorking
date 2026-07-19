'use client';

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { 
  Lock, 
  Unlock,
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Calculator,
  Info,
  Loader2,
  Percent,
  Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

export function LockedTermsCard({ projectId }: Props) {
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
        console.error('onSnapshot project error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  const handleLockTerms = async () => {
    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token required.');

      const res = await fetch(`/api/projects/${projectId}/loans/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to lock terms.');
      }

      toast.success('Loan terms committed and locked to actual project slots.');
    } catch (err: any) {
      toast.error(err.message || 'Error locking terms.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[150px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A9EAA] mb-2" />
        <span className="text-xs text-pw-muted font-light uppercase tracking-wider">Loading Deal Terms...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="glass-card p-6 text-center text-xs text-pw-muted font-light border border-dashed border-pw-border">
        Project details not found.
      </div>
    );
  }

  const financials = project.financials || {};
  const isLocked = !!project.termsLocked;

  // Deriving live metrics in real-time
  const metrics = deriveAllMetrics(financials, undefined, project.dispositionType, 2);
  const dscrVal = metrics.dscr || 0;
  const cashFlowVal = metrics.annualCashFlow || 0;
  const cocVal = metrics.cashOnCashReturn || 0;

  // Underwriting warning logic
  const isDscrUnmet = dscrVal > 0 && dscrVal < 1.20;

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-pw-border pb-4 gap-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#7A9EAA]" />
            Locked Terms & Underwriting
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            Commit approved estimates to the project's actual financial spine. Live metrics recalculate automatically.
          </p>
        </div>

        {isLocked ? (
          <span className="px-2.5 py-1 rounded bg-[#E4ECF0] text-[#4F6C77] text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-[#7A9EAA]/25">
            <CheckCircle className="w-3.5 h-3.5 stroke-[2.5px]" />
            Terms Locked
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-amber-200">
            <Unlock className="w-3.5 h-3.5 stroke-[2.5px]" />
            Projections Pending Lock
          </span>
        )}
      </div>

      {/* Warning when DSCR is unmet */}
      {isDscrUnmet && (
        <div className="p-4 bg-red-50/50 border border-red-200/50 rounded-xl flex gap-3.5 items-start animate-in fade-in duration-300">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs uppercase font-black tracking-wider text-red-900">
              Lender DSCR Minimum Unmet
            </h4>
            <p className="text-[11px] text-red-800/85 font-light leading-relaxed">
              Warning: The derived DSCR is <strong className="font-bold">{dscrVal.toFixed(2)}x</strong>, which fails the minimum lender threshold of <strong className="font-bold">1.20x</strong>. This deal will require additional equity injection or a rate renegotiation to satisfy standard underwriting requirements.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left side Locked Terms table, Right side Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Table of locked terms */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase font-black tracking-widest text-pw-muted">
            Actual Financial Slots (Read-Only)
          </h4>
          <div className="bg-gray-50 border border-pw-border rounded-xl p-4 space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-pw-muted font-light">Loan Amount (Actual)</span>
              <strong className="text-pw-black font-bold">
                {financials.loanAmount ? `$${financials.loanAmount.toLocaleString()}` : '—'}
              </strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pw-muted font-light">Interest Rate (Actual)</span>
              <strong className="text-pw-black font-bold">
                {financials.loanInterestRate ? `${financials.loanInterestRate}%` : '—'}
              </strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pw-muted font-light">Loan Term (Actual)</span>
              <strong className="text-pw-black font-bold">
                {financials.loanTermYears ? `${financials.loanTermYears} Years` : '—'}
              </strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pw-muted font-light">Origination Points (Actual)</span>
              <strong className="text-pw-black font-bold">
                {financials.loanOriginationPoints ? `${financials.loanOriginationPoints}%` : '—'}
              </strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-3 border-t border-gray-200">
              <span className="text-pw-black font-semibold">Annual Debt Service (Derived)</span>
              <strong className="text-pw-black font-black">
                {financials.annualDebtService ? `$${financials.annualDebtService.toLocaleString()}` : '—'}
              </strong>
            </div>
          </div>
        </div>

        {/* Live Deal Metrics output */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase font-black tracking-widest text-pw-muted">
            Live Deal Metrics
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {/* DSCR metric strip */}
            <div className={`p-4 border rounded-xl flex justify-between items-center transition-all ${
              isDscrUnmet 
                ? 'bg-red-50/20 border-red-200/50' 
                : dscrVal >= 1.20 
                  ? 'bg-emerald-50/20 border-emerald-200/50' 
                  : 'bg-gray-50 border-pw-border'
            }`}>
              <div className="flex items-center gap-3">
                <Calculator className={`w-5 h-5 ${isDscrUnmet ? 'text-red-500' : 'text-[#7A9EAA]'}`} />
                <div>
                  <span className="text-[10px] uppercase font-bold text-pw-muted block">Debt Service Coverage Ratio</span>
                  <span className="text-[11px] text-pw-muted font-light">Target minimum: 1.20x</span>
                </div>
              </div>
              <strong className={`text-sm font-black uppercase tracking-wider ${
                isDscrUnmet ? 'text-red-600' : dscrVal >= 1.20 ? 'text-emerald-700' : 'text-pw-black'
              }`}>
                {dscrVal > 0 ? `${dscrVal.toFixed(2)}x` : '—'}
              </strong>
            </div>

            {/* Cash Flow metric strip */}
            <div className="p-4 bg-gray-50 border border-pw-border rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-[#7A9EAA]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-pw-muted block">Net Cash Flow (Hold)</span>
                  <span className="text-[11px] text-pw-muted font-light">Annual net cash return</span>
                </div>
              </div>
              <strong className={`text-sm font-black uppercase tracking-wider ${
                cashFlowVal < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {cashFlowVal !== 0 ? `$${cashFlowVal.toLocaleString()} / yr` : '—'}
              </strong>
            </div>

            {/* Cash on Cash metric strip */}
            <div className="p-4 bg-gray-50 border border-pw-border rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Percent className="w-5 h-5 text-[#7A9EAA]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-pw-muted block">Cash-on-Cash Return</span>
                  <span className="text-[11px] text-pw-muted font-light">Unlevered equity return rate</span>
                </div>
              </div>
              <strong className={`text-sm font-black uppercase tracking-wider ${
                cocVal < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {cocVal !== 0 ? `${cocVal.toFixed(2)}%` : '—'}
              </strong>
            </div>
          </div>
        </div>

      </div>

      {/* CTA Button */}
      {!isLocked && (
        <div className="flex justify-end pt-4 border-t border-pw-border">
          <button 
            onClick={handleLockTerms}
            disabled={submitting}
            className="px-5 py-2.5 bg-[#7A9EAA] hover:bg-[#688a95] disabled:bg-gray-300 text-pw-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Lock Terms to Deal
          </button>
        </div>
      )}
    </div>
  );
}
