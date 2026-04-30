'use client';

import React, { useState, useCallback, Children } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   ConversationalFormWrapper — Step-by-Step Data-Intake UX

   Wraps an arbitrary number of child elements (one per step)
   and enforces a linear, conversational progression flow.

   Each child = one step. The wrapper manages:
     • currentStepIndex (internal state)
     • Progress indicator bar + step counter
     • Back / Next navigation buttons
     • Validation gating via isStepValid prop

   Palette tokens:
     --bg-surface, --bg-canvas, --border-ui,
     --text-primary, --text-secondary
   ═══════════════════════════════════════════════════════════════ */

/* ── Step descriptor (for labels in the progress rail) ── */
export interface StepDescriptor {
  /** Unique key */
  id: string;
  /** Display label shown in the progress indicator */
  label: string;
}

/* ── Props ── */
export interface ConversationalFormWrapperProps {
  /** Step metadata — length determines total step count */
  steps: StepDescriptor[];
  /** Whether the current step's form data is valid */
  isStepValid: boolean;
  /** Called when the user completes the final step ("Submit") */
  onComplete: () => void;
  /** Optional: called when the user exits the flow entirely */
  onExit?: () => void;
  /** Optional: called whenever the active step changes (for external validation tracking) */
  onStepChange?: (stepIndex: number) => void;
  /** Override label for the final step's button (default: "Submit") */
  submitLabel?: string;
  /** If true, the submit button shows a loading spinner */
  isSubmitting?: boolean;
  /** Each child element represents one step's content */
  children: React.ReactNode;
}

export default function ConversationalFormWrapper({
  steps,
  isStepValid,
  onComplete,
  onExit,
  onStepChange,
  submitLabel = 'Submit',
  isSubmitting = false,
  children,
}: ConversationalFormWrapperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const totalSteps = steps.length;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  /* Flatten children into an array so we can index into them */
  const stepViews = Children.toArray(children);

  const goBack = useCallback(() => {
    if (!isFirst) {
      const next = currentStepIndex - 1;
      setCurrentStepIndex(next);
      onStepChange?.(next);
    }
  }, [isFirst, currentStepIndex, onStepChange]);

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      onStepChange?.(next);
    }
  }, [isLast, onComplete, currentStepIndex, onStepChange]);

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
      }}
    >
      {/* ── Header: Title + Progress ── */}
      <div
        className="px-6 pt-6 pb-5"
        style={{ borderBottom: '1px solid var(--border-ui)' }}
      >
        {/* Step label */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {steps[currentStepIndex]?.label ?? `Step ${currentStepIndex + 1}`}
          </h2>
          <span
            className="text-[10px] font-medium tabular-nums"
            style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
          >
            {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-canvas)' }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: '#1A1A1A' }}
          />
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {steps.map((step, idx) => {
            const isComplete = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            return (
              <div
                key={step.id}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300"
                  style={{
                    background: isComplete
                      ? '#1A1A1A'
                      : isActive
                      ? '#1A1A1A'
                      : 'var(--bg-canvas)',
                    color: isComplete || isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  }}
                  aria-label={`Step ${idx + 1}: ${step.label}${isComplete ? ' (complete)' : isActive ? ' (current)' : ''}`}
                >
                  {isComplete ? (
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Connector dash */}
                {idx < steps.length - 1 && (
                  <div
                    className="w-4 h-px"
                    style={{
                      background: isComplete ? '#1A1A1A' : 'var(--border-ui)',
                      opacity: isComplete ? 1 : 0.4,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step content area ── */}
      <div className="px-6 py-8 min-h-[240px]">
        {stepViews[currentStepIndex] ?? null}
      </div>

      {/* ── Footer: Back / Next controls ── */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border-ui)' }}
      >
        {/* Back */}
        {isFirst ? (
          onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors duration-200"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Exit
            </button>
          ) : (
            <div />
          )
        ) : (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors duration-200 hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back
          </button>
        )}

        {/* Next / Submit */}
        <button
          type="button"
          onClick={goNext}
          disabled={!isStepValid || isSubmitting}
          className="flex items-center gap-3 px-7 py-3 rounded-lg text-xs font-bold uppercase tracking-[0.18em] transition-all duration-300 group"
          style={{
            background: isStepValid && !isSubmitting ? '#1A1A1A' : 'var(--bg-canvas)',
            color: isStepValid && !isSubmitting ? '#FFFFFF' : 'var(--text-secondary)',
            cursor: isStepValid && !isSubmitting ? 'pointer' : 'not-allowed',
            opacity: isStepValid && !isSubmitting ? 1 : 0.5,
            border: `1px solid ${isStepValid && !isSubmitting ? '#1A1A1A' : 'var(--border-ui)'}`,
          }}
        >
          {isSubmitting ? (
            <>
              <span
                className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              Processing…
            </>
          ) : (
            <>
              {isLast ? submitLabel : 'Next'}
              <ChevronRight
                className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
