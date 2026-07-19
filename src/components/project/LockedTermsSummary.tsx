'use client';

import React, { useState } from 'react';
import { Project, LoanRecord } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';
import { calculateAmortization } from '@/lib/utils/reiCalculators';
import { 
  Lock, 
  Unlock, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle,
  FileText,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LockedTermsSummaryProps {
  projectId: string;
  project: Project;
  activeLoan?: LoanRecord;
  dscr: number;
}

export function LockedTermsSummary({
  projectId,
  project,
  activeLoan,
  dscr
}: LockedTermsSummaryProps) {
  const [loading, setLoading] = useState(false);

  if (!activeLoan) {
    return (
      <div className="bg-[#121014]/90 backdrop-blur-[24px] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center py-10 gap-3">
        <Lock size={32} className="text-[#7A9EAA]/60" />
        <div>
          <h4 className="text-[15px] font-bold text-white uppercase tracking-wider">Locked Terms Summary</h4>
          <p className="text-[12px] text-[#9E9DA0] max-w-[340px] mt-1">
            Choose an estimate terms candidate in Card F3.3 above to initialize the active loan terms.
          </p>
        </div>
      </div>
    );
  }

  // Derive annual debt service from the active loan record terms
  const amortResult = calculateAmortization(
    activeLoan.amount,
    activeLoan.rate,
    activeLoan.termYears * 12
  );
  const derivedAnnualDS = amortResult.annualDebtService;
  const isLocked = !!project.termsLocked;

  const handleLockTerms = async () => {
    setLoading(true);
    try {
      const currentFinancials = project.financials || {};
      const updatedFinancials = {
        ...currentFinancials,
        loanAmount: activeLoan.amount,
        loanInterestRate: activeLoan.rate,
        loanTermYears: activeLoan.termYears,
        loanOriginationPoints: activeLoan.points,
        annualDebtService: Math.round(derivedAnnualDS * 100) / 100
      };

      await projectsService.updateProject(projectId, {
        financials: updatedFinancials,
        termsLocked: true
      });

      toast.success('Loan terms confirmed and locked into projections!');
    } catch (err: any) {
      console.error('Failed to lock terms:', err);
      toast.error('Failed to save locked terms');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockTerms = async () => {
    setLoading(true);
    try {
      await projectsService.updateProject(projectId, {
        termsLocked: false
      });
      toast.success('Loan terms unlocked');
    } catch (err: any) {
      console.error('Failed to unlock terms:', err);
      toast.error('Failed to unlock terms');
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const fmtPercent = (val: number) => {
    return `${val.toFixed(2)}%`;
  };

  // Warning thresholds
  const showDscrWarning = dscr < 1.25 && dscr > 0;

  return (
    <div className={`bg-[#121014]/90 backdrop-blur-[24px] border p-6 rounded-2xl shadow-xl space-y-6 transition-all ${
      isLocked ? 'border-[#7A9EAA]/30' : 'border-white/5'
    }`}>
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-wide flex items-center gap-2">
            {isLocked ? <Lock size={18} className="text-[#7A9EAA]" /> : <Unlock size={18} className="text-[#9E9DA0]" />}
            Card F3.5 — Locked Financing Terms
          </h3>
          <p className="text-[12px] text-[#9E9DA0]">Locked details representing active deal parameters. Never manually enterable.</p>
        </div>
        <div>
          {isLocked ? (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-[#7A9EAA]/15 text-[#7A9EAA] border border-[#7A9EAA]/30 shadow-[0_0_10px_rgba(122,158,170,0.15)]">
              Projections Live & Locked
            </span>
          ) : (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/25">
              Lock Pending
            </span>
          )}
        </div>
      </div>

      {/* Warning banner for DSCR */}
      {showDscrWarning && (
        <div className="p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-xl flex gap-3 items-start">
          <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h5 className="text-[12px] font-bold uppercase tracking-wider text-yellow-500">Lender Guideline Alert: Low DSCR</h5>
            <p className="text-[11px] text-[#9E9DA0] leading-relaxed mt-1">
              The project's DSCR of <span className="text-white font-semibold">{dscr.toFixed(2)}x</span> falls below the standard lender underwriting guideline minimum requirement (~1.20–1.25x). To secure final funding, you may need to reduce the requested loan amount or negotiate a lower interest rate.
            </p>
          </div>
        </div>
      )}

      {/* Core locked variables summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[#9E9DA0]">
            <DollarSign size={13} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Loan Amount</span>
          </div>
          <p className="text-[16px] font-extrabold text-white">{fmtCurrency(activeLoan.amount)}</p>
        </div>

        <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[#9E9DA0]">
            <Percent size={13} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Interest Rate</span>
          </div>
          <p className="text-[16px] font-extrabold text-white">{fmtPercent(activeLoan.rate)}</p>
        </div>

        <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[#9E9DA0]">
            <Clock size={13} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Loan Term</span>
          </div>
          <p className="text-[16px] font-extrabold text-white">{activeLoan.termYears} years</p>
        </div>

        <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[#9E9DA0]">
            <Percent size={13} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Points Charged</span>
          </div>
          <p className="text-[16px] font-extrabold text-white">{activeLoan.points}%</p>
        </div>
      </div>

      {/* Derived slots values */}
      <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
        <div className="space-y-1.5 pb-3 sm:pb-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">Derived Annual Debt Service</span>
          <div className="flex items-baseline justify-between pr-4">
            <span className="text-[20px] font-extrabold text-white">{fmtCurrency(derivedAnnualDS)}</span>
            <span className="text-[11px] text-[#9E9DA0]">{fmtCurrency(derivedAnnualDS / 12)} / month</span>
          </div>
          <p className="text-[10px] text-[#8C8B8E]">Amortized principal & interest from shared utility.</p>
        </div>

        <div className="space-y-1.5 pt-3 sm:pt-0 pl-0 sm:pl-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">Calculated DSCR</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-[20px] font-extrabold ${dscr >= 1.25 ? 'text-[#7A9EAA]' : 'text-yellow-500'}`}>
                {dscr > 0 ? `${dscr.toFixed(2)}x` : '—'}
              </span>
              <span className="text-[11px] text-[#9E9DA0]">lender guideline: 1.25x</span>
            </div>
          </div>
          <p className="text-[10px] text-[#8C8B8E]">Calculated based on current underwriting NOI.</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
        {isLocked ? (
          <button
            onClick={handleUnlockTerms}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[#9E9DA0] hover:text-white transition-all focus:outline-none"
          >
            <Unlock size={14} />
            Unlock Projections
          </button>
        ) : (
          <button
            onClick={handleLockTerms}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[#7A9EAA] hover:bg-[#6b8e9a] text-[#0d0a0b] transition-all shadow-[0_0_20px_rgba(122,158,170,0.2)] focus:outline-none"
          >
            <CheckCircle size={14} />
            Confirm & Lock Terms
          </button>
        )}
      </div>
    </div>
  );
}
