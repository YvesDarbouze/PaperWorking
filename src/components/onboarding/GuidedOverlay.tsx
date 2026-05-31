'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/* ═══════════════════════════════════════════════════════
   GuidedOverlay — Lightweight Step-by-Step Tooltips
   
   Phase B (Activate): Highlights key fields on the
   workspace with a floating tooltip + spotlight effect.
   
   • No react-joyride — pure CSS spotlight + portal
   • Dismissible, reappears until firstMetricLit
   • Steps are data-driven via the `steps` prop
   ═══════════════════════════════════════════════════════ */

export interface OverlayStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Optional icon name */
  icon?: string;
}

const DEFAULT_STEPS: OverlayStep[] = [
  {
    target: '[data-onboarding="project-card"]',
    title: 'Your First Project',
    description: 'This is your deal workspace — all financials, documents, and metrics live here.',
  },
  {
    target: '[data-onboarding="metric-card"]',
    title: 'Live Metrics',
    description: 'As you add deal data, metrics like cap rate, cash-on-cash, and NOI appear automatically.',
  },
  {
    target: '[data-onboarding="phase-nav"]',
    title: 'Deal Phases',
    description: 'Navigate through Acquisition → Purchase → Hold → Exit as your deal progresses.',
  },
  {
    target: '[data-onboarding="add-data"]',
    title: 'Add Your Numbers',
    description: 'Enter purchase price, ARV, or rent — any field will light up your first metric.',
  },
];

interface GuidedOverlayProps {
  steps?: OverlayStep[];
  onDismiss?: () => void;
  onComplete?: () => void;
}

export function GuidedOverlay({
  steps = DEFAULT_STEPS,
  onDismiss,
  onComplete,
}: GuidedOverlayProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [measureTarget]);

  const handleDismiss = useCallback(async () => {
    setIsVisible(false);

    // Store dismissal in Firestore
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          onboardingOverlayDismissed: true,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Non-fatal
      }
    }

    onDismiss?.();
  }, [user, onDismiss]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleDismiss();
      onComplete?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, handleDismiss, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  if (!isVisible || !step) return null;

  // Calculate tooltip position relative to target
  const tooltipStyle = targetRect
    ? computeTooltipPosition(targetRect)
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  // Spotlight cutout dimensions
  const spotlightPadding = 8;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ animation: 'onb-fade-in 0.3s ease-out' }}
    >
      {/* Spotlight mask via CSS clip-path */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          ...(targetRect ? {
            clipPath: `polygon(
              0% 0%, 0% 100%, 
              ${targetRect.left - spotlightPadding}px 100%, 
              ${targetRect.left - spotlightPadding}px ${targetRect.top - spotlightPadding}px, 
              ${targetRect.right + spotlightPadding}px ${targetRect.top - spotlightPadding}px, 
              ${targetRect.right + spotlightPadding}px ${targetRect.bottom + spotlightPadding}px, 
              ${targetRect.left - spotlightPadding}px ${targetRect.bottom + spotlightPadding}px, 
              ${targetRect.left - spotlightPadding}px 100%, 
              100% 100%, 100% 0%
            )`,
          } : {}),
        }}
        onClick={handleDismiss}
      />

      {/* Spotlight border glow */}
      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-xl"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
            boxShadow: '0 0 0 2px rgba(87, 241, 219, 0.4), 0 0 30px rgba(87, 241, 219, 0.15)',
            animation: 'onb-pulse-ring 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className="absolute pointer-events-auto w-[320px] max-w-[calc(100vw-32px)]"
        style={{
          ...tooltipStyle,
          animation: 'onb-slide-up 0.3s ease-out',
        }}
      >
        <div
          className="rounded-xl p-5 border border-white/15"
          style={{
            background: 'linear-gradient(135deg, rgba(18, 28, 35, 0.95) 0%, rgba(11, 20, 26, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.5), 0 0 30px -5px rgba(87, 241, 219, 0.08)',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-[#bacac5]/60 hover:text-white transition-colors p-1"
            aria-label="Dismiss guide"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step counter */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-medium tracking-[0.08em] text-[#57f1db] uppercase">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Content */}
          <h4 className="text-[15px] font-semibold text-white mb-2 pr-6">
            {step.title}
          </h4>
          <p className="text-[13px] leading-[20px] text-[#bacac5] mb-4">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStep ? 20 : 6,
                    backgroundColor: i === currentStep
                      ? '#57f1db'
                      : i < currentStep
                        ? 'rgba(87, 241, 219, 0.4)'
                        : 'rgba(255, 255, 255, 0.15)',
                  }}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="p-1.5 text-[#bacac5] hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(87, 241, 219, 0.15)',
                  color: '#57f1db',
                }}
              >
                {isLastStep ? 'Got it' : 'Next'}
                {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline keyframe animations (no library needed) */}
      <style jsx global>{`
        @keyframes onb-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes onb-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 2px rgba(87, 241, 219, 0.4), 0 0 30px rgba(87, 241, 219, 0.15); }
          50% { box-shadow: 0 0 0 3px rgba(87, 241, 219, 0.6), 0 0 40px rgba(87, 241, 219, 0.25); }
        }
      `}</style>
    </div>
  );
}

/** Position the tooltip below or above the target element */
function computeTooltipPosition(rect: DOMRect): React.CSSProperties {
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const spaceBelow = viewportH - rect.bottom;
  const tooltipHeight = 200; // estimate

  // Prefer below, fall back to above
  if (spaceBelow > tooltipHeight + 24) {
    return {
      top: rect.bottom + 16,
      left: Math.max(16, Math.min(rect.left + rect.width / 2 - 160, (typeof window !== 'undefined' ? window.innerWidth : 800) - 336)),
    };
  } else {
    return {
      top: rect.top - tooltipHeight - 16,
      left: Math.max(16, Math.min(rect.left + rect.width / 2 - 160, (typeof window !== 'undefined' ? window.innerWidth : 800) - 336)),
    };
  }
}
