'use client';

import React from 'react';
import { Check, Lock } from 'lucide-react';
import { getPhaseConfig } from '@/lib/constants/phaseColors';

/* ═══════════════════════════════════════════════════════════════════════════
   WorkflowStepper — the within-phase stage rail.

   Replaces the row of seven individually-boxed buttons on the Acquisition
   workspace. Each stage was its own filled pill, so the rail read as seven
   unrelated tabs rather than one ordered process, and the three states
   (complete / active / locked) were signalled only by three different
   background fills competing for attention.

   This is the same treatment as `PhaseProgressTracker`, one level down:
   numbered nodes joined by a hairline rail, filled when reached, outlined and
   muted when locked, with the label carrying the weight rather than a fill.

   The connector is a hairline — deliberately not a progress bar. A filled
   segment that grows reads as a loading indicator, which is what the phase
   timeline was changed away from in Prompt 7.

   Contract with the existing suite: each control keeps `id="stage-tab-{key}"`,
   which ~12 e2e specs click, and completed nodes keep
   `data-testid="stage-complete"`.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface WorkflowStage {
  key: string;
  /** Full label, e.g. "2. Analyze & Underwrite". A leading "N. " is stripped
   *  for display since the node already carries the number. */
  label: string;
  isComplete: boolean;
  isUnlocked: boolean;
}

export interface WorkflowStepperProps {
  stages: WorkflowStage[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Drives the accent colour from the canonical REIL palette. Default 1. */
  phaseNumber?: number;
  ariaLabel?: string;
}

/** "3. Declare Strategy" → "Declare Strategy". The node shows the number. */
function stripOrdinal(label: string): string {
  return label.replace(/^\s*\d+\.\s*/, '');
}

export function WorkflowStepper({
  stages,
  activeKey,
  onSelect,
  phaseNumber = 1,
  ariaLabel = 'Workflow stages',
}: WorkflowStepperProps) {
  const phase = getPhaseConfig(phaseNumber);

  return (
    <nav
      aria-label={ariaLabel}
      data-testid="workflow-stepper"
      className="flex items-start gap-0 overflow-x-auto pb-1 scrollbar-none"
    >
      {stages.map((stage, i) => {
        const active = activeKey === stage.key;
        const isLast = i === stages.length - 1;
        const reached = active || stage.isComplete;

        /* Filled once reached; outline-only while locked or merely available.
           Only one node is filled at full strength — the active one — so the
           eye lands on where the user is, not on all seven at once. */
        const nodeStyle: React.CSSProperties = active
          ? { background: phase.hex, border: `1.5px solid ${phase.hex}`, color: '#0B0B0B' }
          : stage.isComplete
          ? { background: phase.bgHex, border: `1.5px solid ${phase.hex}`, color: phase.hex }
          : { background: 'transparent', border: '1.5px solid var(--pw-border)', color: 'var(--text-secondary)' };

        return (
          <div key={stage.key} className="flex items-start flex-1 last:flex-none min-w-0">
            <button
              id={`stage-tab-${stage.key}`}
              type="button"
              disabled={!stage.isUnlocked}
              onClick={() => onSelect(stage.key)}
              aria-current={active ? 'step' : undefined}
              aria-disabled={!stage.isUnlocked}
              aria-label={`${stage.label}${stage.isComplete ? ' (complete)' : ''}${
                stage.isUnlocked ? '' : ' (locked)'
              }`}
              className="pw-interactive-custom flex flex-col items-center gap-2 min-w-0 px-2 bg-transparent border-0 shrink-0"
              style={{
                cursor: stage.isUnlocked ? 'pointer' : 'not-allowed',
                opacity: stage.isUnlocked ? 1 : 0.45,
              }}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                style={nodeStyle}
              >
                {stage.isComplete && !active ? (
                  <Check className="w-4 h-4" strokeWidth={2.5} data-testid="stage-complete" />
                ) : !stage.isUnlocked ? (
                  <Lock className="w-3 h-3" strokeWidth={2} />
                ) : (
                  <span className="text-[11px] font-bold tabular-nums">{i + 1}</span>
                )}
              </span>

              <span
                className="text-[10px] uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-200"
                style={{
                  color: reached ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {stripOrdinal(stage.label)}
              </span>
            </button>

            {/* Rail: one hairline, tinted only where the process is behind you. */}
            {!isLast && (
              <span className="flex-1 min-w-[16px] pt-4 px-1" aria-hidden="true">
                <span
                  className="block w-full h-px"
                  style={{
                    background: stage.isComplete ? phase.hex : 'var(--pw-border)',
                    opacity: stage.isComplete ? 0.5 : 1,
                  }}
                />
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default WorkflowStepper;
