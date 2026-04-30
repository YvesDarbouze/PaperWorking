'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Lock } from 'lucide-react';
import type { PhaseStatus } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   PhaseProgressTracker
   ───────────────────────────────────────────────────────────────
   A horizontal stepper that sits directly below the workspace
   identity header inside every /dashboard/projects/[id]/phase-*
   route.

   Step States
   ────────────
   • completed  — Deal has advanced past this phase.
                  Shows a filled check circle. Fully clickable.
   • active     — The phase the deal is currently in AND
                  the phase route the user is viewing.
                  High-contrast black ring + label.
   • viewing    — User is viewing a completed phase (they've
                  navigated back). Slightly muted but accessible.
   • locked     — Phase not yet unlocked by deal progress.
                  Shows a lock icon. Navigation disabled.

   Props
   ─────
   • phaseStatus  — from Project.phaseStatus (Firestore)
   • projectId    — needed to build href strings

   Note: "active" = deal's current phase; "viewing" = current URL.
   Both are independently tracked so a user can browse completed
   phases without losing the deal-progress indicator.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Step definitions ───────────────────────────────────────── */
export interface PhaseStep {
  index:      number;         // 0-based internal index
  number:     number;         // 1-based display number
  label:      string;         // Short user-facing label
  sublabel:   string;         // Secondary descriptor line
  path:       string;         // URL segment: phase-1 … phase-4
  phaseKey:   PhaseStatus;    // Matches Project.phaseStatus
}

export const PHASE_STEPS: PhaseStep[] = [
  {
    index: 0, number: 1,
    label: 'Acquisition', sublabel: 'Find & Fund',
    path: 'phase-1',
    phaseKey: 'Phase 1: Find & Fund',
  },
  {
    index: 1, number: 2,
    label: 'Purchase',    sublabel: 'Closing & Docs',
    path: 'phase-2',
    phaseKey: 'Phase 2: Acquisition',
  },
  {
    index: 2, number: 3,
    label: 'Hold',        sublabel: 'Rehab & Manage',
    path: 'phase-3',
    phaseKey: 'Phase 3: Holding & Rehab',
  },
  {
    index: 3, number: 4,
    label: 'Exit',        sublabel: 'Sell or Refi',
    path: 'phase-4',
    phaseKey: 'Phase 4: Closing & Exit',
  },
];

/* ─── Helper: resolve deal progress index ────────────────────── */
function dealPhaseIndex(phaseStatus?: PhaseStatus): number {
  const idx = PHASE_STEPS.findIndex((s) => s.phaseKey === phaseStatus);
  return idx >= 0 ? idx : 0;
}

/* ─── Step state type ────────────────────────────────────────── */
type StepState = 'completed' | 'active' | 'viewing' | 'locked';

function resolveStepState(
  stepIndex:    number,
  dealIndex:    number,
  viewingIndex: number,
): StepState {
  // User is currently viewing this step's page
  if (stepIndex === viewingIndex) {
    // Is it also the deal's current active phase?
    if (stepIndex === dealIndex) return 'active';
    // Is it a completed phase the user browsed back to?
    if (stepIndex < dealIndex)  return 'viewing';
    // User somehow navigated to a locked phase (shouldn't happen)
    return 'locked';
  }
  if (stepIndex < dealIndex)  return 'completed';
  if (stepIndex === dealIndex) return 'active';
  return 'locked';
}

/* ─── Sub-components ─────────────────────────────────────────── */

interface StepNodeProps {
  step:         PhaseStep;
  state:        StepState;
  isViewing:    boolean;    // Is the user currently on this page?
  onClick:      () => void;
  isLast:       boolean;
}

function StepNode({ step, state, isViewing, onClick, isLast }: StepNodeProps) {
  const isLocked = state === 'locked';

  /* ── Node circle styles ── */
  const nodeStyle: React.CSSProperties = (() => {
    if (state === 'completed') return {
      background: '#1A1A1A',
      border:     '2px solid #1A1A1A',
      color:      '#FFFFFF',
    };
    if (state === 'active') return {
      background: isViewing ? '#1A1A1A' : '#595959',
      border:     `2px solid ${isViewing ? '#1A1A1A' : '#595959'}`,
      color:      '#FFFFFF',
    };
    if (state === 'locked') return {
      background: '#FFFFFF',
      border:     '2px solid #CCCCCC',
      color:      '#BFBFBF',
    };
    // viewing (browsing a past completed phase)
    return {
      background: '#595959',
      border:     '2px solid #595959',
      color:      '#FFFFFF',
    };
  })();

  /* ── Label color ── */
  const labelColor: string = (() => {
    if (isViewing)           return '#1A1A1A';
    if (state === 'completed') return '#595959';
    if (state === 'active')    return '#595959';
    return '#BFBFBF'; // locked
  })();

  /* ── Sublabel color ── */
  const sublabelColor: string = isLocked ? '#CCCCCC' : 'var(--text-secondary)';


  /* ── "Viewing" underline indicator ── */
  const showViewingBar = isViewing;

  return (
    <div className="flex items-center gap-0 flex-1 last:flex-none min-w-0">
      {/* ── Step button ── */}
      <button
        onClick={isLocked ? undefined : onClick}
        disabled={isLocked}
        className="flex flex-col items-center gap-2 group relative transition-all duration-200 min-w-0"
        style={{
          cursor: isLocked ? 'not-allowed' : 'pointer',
          opacity: isLocked ? 0.55 : 1,
        }}
        aria-label={`${step.label} — ${step.sublabel}${isLocked ? ' (locked)' : ''}`}
        aria-current={isViewing ? 'step' : undefined}
        aria-disabled={isLocked}
      >
        {/* Node circle */}
        <div
          className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
          style={{
            ...nodeStyle,
            boxShadow: isViewing
              ? '0 0 0 4px rgba(26,26,26,0.12)'
              : state === 'active' && !isViewing
              ? '0 0 0 4px rgba(89,89,89,0.10)'
              : 'none',
          }}
        >
          {state === 'completed' ? (
            <Check className="w-4 h-4" strokeWidth={2.5} />
          ) : isLocked ? (
            <Lock className="w-3.5 h-3.5" strokeWidth={2} />
          ) : (
            <span className="text-[11px] font-bold tabular-nums" style={{ color: nodeStyle.color }}>
              {step.number}
            </span>
          )}

          {/* Viewing pulse ring (active + viewing) */}
          {isViewing && state === 'active' && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background: '#1A1A1A' }}
            />
          )}
        </div>

        {/* Label block */}
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-colors duration-200"
            style={{ color: labelColor, fontWeight: isViewing ? 800 : 700 }}
          >
            {step.label}
          </span>
          <span
            className="hidden sm:block text-[9px] font-medium whitespace-nowrap"
            style={{ color: sublabelColor }}
          >
            {step.sublabel}
          </span>
        </div>

        {/* Active underline indicator */}
        {showViewingBar && (
          <div
            className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300"
            style={{ width: '80%', background: '#1A1A1A' }}
          />
        )}
      </button>

      {/* ── Connector line (not after last step) ── */}
      {!isLast && (
        <div
          className="flex-1 flex items-start pt-4 px-3 min-w-[24px]"
          aria-hidden="true"
        >
          <div
            className="w-full h-[2px] rounded-full relative overflow-hidden"
            style={{ background: '#E8E8E8' }}
          >
            {/* Filled portion — reflects completed state */}
            {state === 'completed' && (
              <div
                className="absolute inset-y-0 left-0 right-0 rounded-full transition-all duration-500"
                style={{ background: '#1A1A1A' }}
              />
            )}
            {state === 'active' && (
              <div
                className="absolute inset-y-0 left-0 w-1/2 rounded-full"
                style={{ background: '#595959', opacity: 0.4 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────── */
export function PhaseProgressTrackerSkeleton() {
  return (
    <div
      className="w-full px-8 py-5 flex items-center justify-between"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-ui)',
      }}
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full animate-shimmer" />
            <div className="h-3 w-16 animate-shimmer rounded" />
          </div>
          {i < 3 && <div className="flex-1 h-0.5 animate-shimmer rounded mx-3" />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────── */
interface PhaseProgressTrackerProps {
  phaseStatus?: PhaseStatus;
  projectId:    string;
}

export function PhaseProgressTracker({
  phaseStatus,
  projectId,
}: PhaseProgressTrackerProps) {
  const router   = useRouter();
  const pathname = usePathname();

  /* Resolve indices */
  const dealIndex    = dealPhaseIndex(phaseStatus);
  const viewingStep  = PHASE_STEPS.find((s) => pathname?.includes(s.path));
  const viewingIndex = viewingStep?.index ?? dealIndex;

  const navigateTo = (step: PhaseStep) => {
    router.push(`/dashboard/projects/${projectId}/${step.path}`);
  };

  return (
    <div
      role="navigation"
      aria-label="Project phase progress"
      className="w-full"
      style={{
        background:   'var(--bg-surface)',
        borderBottom: '1px solid var(--border-ui)',
        boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Stepper row ── */}
      <div className="flex items-start px-8 py-5 pb-6 gap-0">
        {PHASE_STEPS.map((step, idx) => {
          const state      = resolveStepState(step.index, dealIndex, viewingIndex);
          const isViewing  = step.index === viewingIndex;
          const isLast     = idx === PHASE_STEPS.length - 1;

          return (
            <StepNode
              key={step.path}
              step={step}
              state={state}
              isViewing={isViewing}
              onClick={() => navigateTo(step)}
              isLast={isLast}
            />
          );
        })}
      </div>

      {/* ── Mobile: compact linear progress bar ── */}
      <div
        className="flex sm:hidden items-center gap-3 px-5 pb-4"
        aria-hidden="true"
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>
          Step {viewingIndex + 1} of 4
        </span>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: '#E8E8E8' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${((dealIndex + 1) / 4) * 100}%`,
              background: '#1A1A1A',
            }}
          />
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#1A1A1A' }}
        >
          {PHASE_STEPS[viewingIndex]?.label}
        </span>
      </div>
    </div>
  );
}
