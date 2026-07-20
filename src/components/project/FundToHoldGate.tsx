'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { evaluateFundToHoldGate, advanceFundToHoldGate } from '@/actions/gate';
import { Check, X, ShieldAlert, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface FundToHoldGateProps {
  projectId: string;
  onSuccess: () => void;
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

export function FundToHoldGate({ projectId, onSuccess }: FundToHoldGateProps) {
  const { user } = useAuth();
  const [gateLines, setGateLines] = useState<any[]>([]);
  const [isPassed, setIsPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  const fetchGateStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await evaluateFundToHoldGate(idToken, projectId);
      setGateLines(res.gateLines || []);
      setIsPassed(res.isGatePassed);
    } catch (err: any) {
      console.error('[FundToHoldGate] fetch error:', err);
      toast.error('Failed to load gate criteria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateStatus();
  }, [projectId, user]);

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

  const handleAdvance = async () => {
    if (!user) {
      toast.error('You must be logged in.');
      return;
    }

    if (!isPassed && !overrideReason.trim()) {
      toast.error('Please enter an override reason to bypass criteria.');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await advanceFundToHoldGate(idToken, projectId, overrideReason.trim() || undefined);
      if (res.success) {
        triggerConfetti();
        toast.success(`Phase transition completed! Cost Basis: $${res.initialCapitalizedBasis.toLocaleString()}`);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to advance phase gate.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-pw-black/60">
        <Loader2 className="w-8 h-8 animate-spin text-pw-primary" />
        <p className="text-xs">Evaluating Fund-to-Hold phase gate criteria...</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-pw-glass-bg border border-pw-border/80 rounded-2xl p-6 shadow-sm space-y-6 text-pw-black">
      {/* Confetti Overlay */}
      {celebrate && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiPieces.map((p, idx) => (
            <div
              key={idx}
              className="absolute top-0 animate-fall"
              style={{
                left: `${p.x}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                transform: `rotate(${p.rotation}deg)`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-[#0d0a0b]/10 backdrop-blur-sm flex flex-col items-center justify-center text-center animate-fade-in">
            <Sparkles className="w-16 h-16 text-[#ffb703] animate-bounce" />
            <h2 className="text-2xl font-black mt-4 text-[#ffb703] uppercase tracking-wider">Purchase Completed!</h2>
            <p className="text-sm text-white/90 mt-1 max-w-xs font-semibold">Transitioning deal state to Hold phase...</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Fund → Hold Phase Gate
          </h2>
          <p className="text-xs text-pw-muted mt-1 leading-relaxed">
            The exit gate from Phase 2. Criteria are evaluated dynamically from your live closing checklist, ledger, and CD uploads.
          </p>
        </div>
        <button
          onClick={fetchGateStatus}
          className="p-2 hover:bg-pw-glass-bg/60 rounded-lg text-pw-muted hover:text-pw-black transition-colors"
          title="Refresh criteria status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Checklist Lines */}
      <div className="space-y-3 bg-[#121014]/5 p-4 rounded-xl border border-pw-border/50">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-pw-muted mb-2">Gate Criteria Status</h3>
        {gateLines.map((line) => (
          <div key={line.key} className="flex items-start justify-between gap-4 text-xs py-1.5 border-b border-pw-border/30 last:border-b-0">
            <div className="flex items-center gap-2">
              {line.blocked ? (
                <div className="bg-red-500/10 text-red-500 p-0.5 rounded-full">
                  <X className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="bg-green-500/10 text-green-500 p-0.5 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="font-semibold">{line.label}</span>
            </div>
            <span className={`text-[11px] text-right font-medium max-w-[280px] ${line.blocked ? 'text-red-500' : 'text-pw-muted'}`}>
              {line.reason}
            </span>
          </div>
        ))}
      </div>

      {/* Gate Override Trigger */}
      {!isPassed && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-red-500">
            <ShieldAlert className="w-4 h-4" />
            <span>Gate Blocked by Named Criteria</span>
          </div>
          <p className="text-[11px] text-pw-muted leading-relaxed">
            Please complete the missing items or provide a typed override reason below to proceed with closing handoff.
          </p>
          <input
            type="text"
            placeholder="Reason for overriding checklist criteria..."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full bg-[#121014]/5 border border-pw-border focus:border-red-500/50 rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="text-[11px] text-pw-muted">
          {isPassed ? (
            <span className="text-green-600 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> All criteria satisfied live
            </span>
          ) : (
            <span>Requires override to bypass criteria</span>
          )}
        </div>
        <button
          onClick={handleAdvance}
          disabled={submitting || (!isPassed && !overrideReason.trim())}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all ${
            submitting || (!isPassed && !overrideReason.trim())
              ? 'bg-pw-glass-bg/60 text-pw-muted cursor-not-allowed border border-pw-border/50'
              : 'bg-pw-success hover:bg-pw-success/90 text-[#0d0a0b] transform hover:scale-[1.02]'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Advancing...</span>
            </>
          ) : (
            <span>Advance to Hold Phase</span>
          )}
        </button>
      </div>

      {/* CSS for fall and fade-in animations */}
      <style jsx global>{`
        @keyframes fall {
          0% { top: -20px; transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { top: 100%; transform: translateY(20px) rotate(360deg); opacity: 0; }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
