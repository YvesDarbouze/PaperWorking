'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Rocket, Plus, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/* ═══════════════════════════════════════════════════════
   FirstMetricCelebration — "Your first metric is live!"
   
   Phase B (Activate): CSS confetti animation (no library)
   with a modal celebrating the milestone.
   
   CTAs:
   • Add a second project
   • Invite a vendor / team member
   ═══════════════════════════════════════════════════════ */

interface FirstMetricCelebrationProps {
  onDismiss?: () => void;
  onAddProject?: () => void;
  onInviteVendor?: () => void;
}

export function FirstMetricCelebration({
  onDismiss,
  onAddProject,
  onInviteVendor,
}: FirstMetricCelebrationProps) {
  const { user } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [confettiPieces] = useState(() => generateConfetti(60));

  const handleDismiss = useCallback(async () => {
    setIsClosing(true);

    // Mark onboarding as completed
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Non-fatal
      }
    }

    // Fire event
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'onboarding_celebration_dismissed',
        properties: {},
      }),
    }).catch(() => {});

    setTimeout(() => {
      onDismiss?.();
    }, 300);
  }, [user, onDismiss]);

  const handleAddProject = () => {
    handleDismiss();
    onAddProject?.();
  };

  const handleInvite = () => {
    handleDismiss();
    onInviteVendor?.();
  };

  return (
    <div
      className={`metric-lit fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Confetti Layer */}
      <div className="confetti-canvas absolute inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((piece, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${piece.x}%`,
              top: '-5%',
              width: piece.size,
              height: piece.size * piece.aspectRatio,
              backgroundColor: piece.color,
              borderRadius: piece.isCircle ? '50%' : '2px',
              opacity: 0.9,
              animation: `confetti-fall ${piece.duration}s ${piece.delay}s ease-in forwards`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(18, 28, 35, 0.97) 0%, rgba(11, 20, 26, 0.99) 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.6), 0 0 50px -5px rgba(87, 241, 219, 0.1)',
          animation: isClosing ? '' : 'celebration-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#bacac5]/60 hover:text-white transition-colors p-1 z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[120px] bg-[#57f1db]/20 blur-[80px] rounded-full pointer-events-none" />

        {/* Content */}
        <div className="relative p-8 text-center space-y-6">
          {/* Icon */}
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(87, 241, 219, 0.2) 0%, rgba(87, 241, 219, 0.08) 100%)',
              boxShadow: '0 0 30px rgba(87, 241, 219, 0.2)',
              animation: 'celebration-bounce 1.5s ease-in-out infinite',
            }}
          >
            <Rocket className="w-8 h-8 text-[#57f1db]" style={{ animation: 'celebration-rocket 1.5s ease-in-out infinite' }} />
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h2 className="text-[24px] leading-[32px] font-bold text-white tracking-tight">
              Your first metric is live!
            </h2>
            <p className="text-[14px] leading-[22px] text-[#bacac5] max-w-sm mx-auto">
              PaperWorking is now tracking your deal in real-time. As market data
              changes, your metrics update automatically.
            </p>
          </div>

          {/* Live Metric Preview */}
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-[#57f1db]/20"
            style={{ background: 'rgba(87, 241, 219, 0.06)' }}
          >
            <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-[13px] font-medium text-[#57f1db] uppercase tracking-wider">
              LIVE
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleAddProject}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[14px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #3cddc7 0%, #57f1db 100%)',
                color: '#091015',
                boxShadow: '0 4px 20px rgba(87, 241, 219, 0.3)',
              }}
            >
              <Plus className="w-4 h-4" />
              Add a Second Project
            </button>

            <button
              onClick={handleInvite}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[14px] font-semibold border border-white/10 text-[#dae4ec] hover:bg-white/5 transition-all duration-200"
            >
              <UserPlus className="w-4 h-4" />
              Invite a Vendor
            </button>

            <button
              onClick={handleDismiss}
              className="text-[12px] text-[#bacac5]/60 hover:text-[#bacac5] transition-colors pt-1"
            >
              Continue exploring
            </button>
          </div>
        </div>
      </div>

      {/* Inline keyframe animations */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebration-scale-in {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes celebration-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes celebration-rocket {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

/* ── Confetti Generation ── */

const CONFETTI_COLORS = [
  '#57f1db', // teal
  '#D4A843', // gold
  '#4ADE80', // green
  '#A78BFA', // purple
  '#60A5FA', // blue
  '#F472B6', // pink
  '#FBBF24', // amber
  '#ffffff', // white
];

interface ConfettiPiece {
  x: number;
  color: string;
  size: number;
  aspectRatio: number;
  rotation: number;
  duration: number;
  delay: number;
  isCircle: boolean;
}

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 4 + Math.random() * 8,
    aspectRatio: 0.5 + Math.random() * 2,
    rotation: Math.random() * 360,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 1.5,
    isCircle: Math.random() > 0.6,
  }));
}
