'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { advanceProjectPhaseGate } from '@/actions/gate';
import { Check, X, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AcquisitionPhaseGateProps {
  project: any;
  totalRaisedCents: number;
  onSuccess: () => void;
  onStageSelect?: (stageKey: string) => void;
}

// Check scorecard hash locally to match page calculations
function getScorecardInputsHash(project: any): string {
  if (!project) return '';
  const f = (project.financials || {}) as any;
  const values = [
    f.purchasePrice ?? 0,
    f.listedPrice ?? 0,
    f.projectedRehabCost ?? 0,
    f.estimatedARV ?? 0,
    f.arv ?? 0,
    f.targetCapRate ?? 0,
    f.targetCoc ?? f.targetCoCReturn ?? 0,
    f.minDscr ?? f.targetMinDSCR ?? 0,
    f.maxPurchasePrice ?? f.targetMaxPurchasePrice ?? 0,
    f.gross_rent_per_unit ?? f.monthlyGrossRent ?? f.grossRent ?? 0,
    f.vacancy_pct ?? f.vacancyRatePercent ?? f.vacancyRate ?? 0,
    f.other_income ?? f.otherIncome ?? 0,
    f.tax ?? f.taxes ?? 0,
    f.insurance ?? 0,
    f.utilities ?? 0,
    f.management ?? 0,
    f.management_pct ?? 0,
    f.maintenance ?? 0,
    f.maintenance_pct ?? f.monthlyMaintenanceReserve ?? 0,
    f.otherExpenses ?? 0,
    f.downPaymentPercent ?? 0,
    f.loanInterestRate ?? f.interestRate ?? 0,
    f.loanTermYears ?? 0,
    project.dispositionType || '',
    project.subStrategy || '',
  ];
  return values.join('|');
}

// Confetti colors
const CONFETTI_COLORS = ['#ffb703', '#fb8500', '#219ebc', '#8ecae6', '#023047', '#ffffff'];

interface ConfettiPiece {
  x: number;
  color: string;
  size: number;
  rotation: number;
  duration: number;
  delay: number;
}

export function AcquisitionPhaseGate({
  project,
  totalRaisedCents,
  onSuccess,
  onStageSelect,
}: AcquisitionPhaseGateProps) {
  const f = (project?.financials || {}) as any;
  const { user } = useAuth();
  const [overrideReason, setOverrideReason] = useState(f.overrideReason || '');
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  // Generate confetti items
  const triggerConfetti = () => {
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 12,
      rotation: Math.random() * 360,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
    }));
    setConfettiPieces(pieces);
    setCelebrate(true);
  };

  // Evaluation criteria checking
  const checkStatus = useMemo(() => {
    if (!project) return { isPassed: false, criteria: [] };

    const f = (project.financials || {}) as any;

    // 1. Accepted offer at known terms
    const hasAcceptedOffer = f.offerStatus === 'Accepted' && (f.purchasePrice > 0 || f.finalAgreedPrice > 0 || f.renegotiatedPrice > 0);

    // 2. DD contingencies satisfied/waived with go decision recorded
    const hasNoPendingContingencies = !project.contingencies || project.contingencies.length === 0 || 
      project.contingencies.every((c: any) => c.isSatisfied || c.isWaived);
    const hasGoDecision = f.decision !== 'terminate';
    const hasDdComplete = hasNoPendingContingencies && hasGoDecision;

    // 3. Capital plan set
    const isSolo = ['all-cash solo', 'solo-financed'].includes(f.capitalPlan) || f.fundingType === 'Solo';
    const targetCents = f.equityTerms?.funding_target || f.equityTarget || 0;
    const isCapitalPlanSet = isSolo || totalRaisedCents >= targetCents;

    const criteriaList = [
      { key: 'offer', label: 'Accepted Offer at Known Terms', status: hasAcceptedOffer, ref: '#offer' },
      { key: 'dd_decision', label: 'DD Contingencies Satisfied/Waived with Go Decision Recorded', status: hasDdComplete, ref: '#due_diligence' },
      { key: 'capital', label: 'Capital Plan Set (Solo Confirmed or LOI/Soft-commits Logged)', status: isCapitalPlanSet, ref: '#raise_interest' },
    ];

    const isPassed = criteriaList.every(c => c.status);

    return {
      isPassed,
      criteria: criteriaList,
    };
  }, [project, totalRaisedCents]);

  const handleAdvance = async () => {
    if (!user) {
      toast.error('You must be logged in.');
      return;
    }

    if (!checkStatus.isPassed && !overrideReason.trim()) {
      toast.error('Please enter an override reason to bypass criteria.');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await advanceProjectPhaseGate(idToken, project.id, overrideReason);
      if (res.success) {
        triggerConfetti();
        toast.success(`Deal Advanced! Composite Risk Score: ${res.riskScore}`);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to advance project phase.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasFailingCriteria = checkStatus.criteria.some(c => !c.status);

  return (
    <div id="phase_gate" className="glass-card rounded-2xl border border-pw-border p-6 space-y-6 relative overflow-hidden">
      {/* Confetti animations overlay */}
      {celebrate && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiPieces.map((piece, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${piece.x}%`,
                top: `-20px`,
                backgroundColor: piece.color,
                width: `${piece.size}px`,
                height: `${piece.size / 2}px`,
                transform: `rotate(${piece.rotation}deg)`,
                animation: `confetti-fall ${piece.duration}s ${piece.delay}s linear forwards`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="text-center p-8 bg-[var(--color-background)] rounded-2xl border border-pw-border shadow-2xl max-w-sm space-y-4">
              <div className="w-16 h-16 bg-[var(--pw-success-container)] text-[var(--pw-success)] rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-on-surface)]">Milestone Unlocked!</h3>
              <p className="text-sm text-[var(--color-muted)]">
                Acquisition complete. Project has successfully transitioned to Phase 2: Fund!
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-[var(--color-on-surface)] flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[var(--color-primary)]" />
          Acquisition Phase Gate
        </h3>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Each requirement is checked dynamically against live transaction data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checkStatus.criteria.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-3 rounded-xl border border-pw-border bg-white/5 transition-all hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  item.status ? 'bg-[var(--pw-success-container)] text-[var(--pw-success)]' : 'bg-red-500/20 text-red-500'
                }`}
              >
                {item.status ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs font-semibold text-[var(--color-on-surface)]">{item.label}</span>
            </div>
            <a
              href={item.ref}
              onClick={(e) => {
                e.preventDefault();
                const stageKey = item.ref.replace('#', '');
                if (onStageSelect) {
                  onStageSelect(stageKey);
                }
                setTimeout(() => {
                  const tabBtn = document.getElementById(`stage-tab-${stageKey}`);
                  if (tabBtn) {
                    tabBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                  const panel = document.getElementById(`stage-panel-${stageKey}`);
                  if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    panel.classList.add('luminous-glow-brief');
                    setTimeout(() => panel.classList.remove('luminous-glow-brief'), 2000);
                  }
                }, 100);
              }}
              className="text-xs text-[var(--color-primary)] hover:underline font-bold"
            >
              Verify
            </a>
          </div>
        ))}
      </div>

      {hasFailingCriteria && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400">
            <ShieldAlert className="w-4 h-4" />
            CRITERIA BLOCKED: Advancing requires manual override justification.
          </div>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Type your justification for manual override here..."
            className="w-full h-20 text-xs p-3 rounded-lg bg-black/30 border border-pw-border text-[var(--color-on-surface)] focus:outline-none focus:border-red-500/50"
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-pw-border">
        <div className="text-xs text-[var(--color-muted)]">
          {checkStatus.isPassed ? (
            <span className="text-[var(--pw-success)] font-bold">✓ All criteria satisfied</span>
          ) : (
            <span className="text-red-400 font-bold">✗ {checkStatus.criteria.filter(c => !c.status).length} criteria pending</span>
          )}
        </div>

        <button
          onClick={handleAdvance}
          disabled={submitting || (!checkStatus.isPassed && !overrideReason.trim())}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            checkStatus.isPassed
              ? 'bg-[var(--pw-success)] hover:bg-[var(--pw-success)]/90 text-[#0d0a0b]'
              : 'bg-red-500 hover:bg-red-500/80 text-white'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {checkStatus.isPassed || !overrideReason.trim() ? 'Lock Deal & Proceed to Fund' : 'Override & Proceed to Fund'}
        </button>
      </div>

      {/* Tailwind Confetti Animations keyframes in page */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
}
