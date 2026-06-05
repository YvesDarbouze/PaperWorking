"use client";

import { WIZARD_STEPS, type WizardStepKey, type StepCompletion } from "@/store/acquisitionWizardStore";
import { MembersPanel } from "./MembersPanel";

interface StepRailProps {
  currentStep:  WizardStepKey;
  completion:   Record<WizardStepKey, StepCompletion>;
  onStepClick:  (step: WizardStepKey) => void;
  savedAt:      string | null;
  isSaving:     boolean;
  projectId:    string | null;
  projectName?: string;
}

const COMPLETION_STYLES: Record<StepCompletion, { dot: string; label: string }> = {
  empty:   { dot: "rgba(255,255,255,0.15)",  label: "rgba(218,228,236,0.35)"  },
  partial: { dot: "#ffd1aa",                 label: "rgba(218,228,236,0.7)"   },
  done:    { dot: "#57f1db",                 label: "rgba(218,228,236,0.95)"  },
};

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5)  return "saved just now";
  if (s < 60) return `saved ${s}s ago`;
  return `saved ${Math.floor(s / 60)}m ago`;
}

export function StepRail({ currentStep, completion, onStepClick, savedAt, isSaving, projectId, projectName }: StepRailProps) {
  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col py-8 px-5"
      style={{
        background: "linear-gradient(180deg, rgba(14,22,28,0.95) 0%, rgba(11,18,24,0.98) 100%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo / back hint */}
      <div className="mb-10 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-[20px]"
          style={{ color: "#57f1db" }}
        >
          domain_add
        </span>
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(218,228,236,0.4)", letterSpacing: "0.1em" }}
        >
          New Deal
        </span>
      </div>

      {/* Steps */}
      <nav className="flex-1 flex flex-col gap-1">
        {WIZARD_STEPS.map((step, idx) => {
          const state   = completion[step.key];
          const active  = step.key === currentStep;
          const styles  = COMPLETION_STYLES[state];

          return (
            <button
              key={step.key}
              onClick={() => onStepClick(step.key)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 group"
              style={{
                background: active
                  ? "rgba(87,241,219,0.08)"
                  : "transparent",
                border: active
                  ? "1px solid rgba(87,241,219,0.18)"
                  : "1px solid transparent",
              }}
            >
              {/* Step number / check */}
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{
                  background: state === "done"
                    ? "#57f1db18"
                    : active
                    ? "rgba(87,241,219,0.12)"
                    : "rgba(255,255,255,0.05)",
                  color: state === "done"
                    ? "#57f1db"
                    : active
                    ? "#57f1db"
                    : styles.dot,
                }}
              >
                {state === "done" ? (
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                ) : (
                  idx + 1
                )}
              </span>

              {/* Label */}
              <span
                className="text-[13px] font-medium"
                style={{
                  color: active ? "rgba(218,228,236,0.95)" : styles.label,
                  letterSpacing: "0.01em",
                }}
              >
                {step.label}
              </span>

              {/* Partial dot */}
              {state === "partial" && !active && (
                <span
                  className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0"
                  style={{ backgroundColor: "#ffd1aa" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Members panel — only when project exists */}
      {projectId && (
        <div className="mt-4">
          <MembersPanel projectId={projectId} projectName={projectName} />
        </div>
      )}

      {/* Save indicator */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[11px] text-center" style={{ color: "rgba(218,228,236,0.3)" }}>
          {isSaving
            ? "Saving…"
            : savedAt
            ? relTime(savedAt)
            : "Not yet saved"}
        </p>
      </div>
    </aside>
  );
}
