"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  useAcquisitionWizard,
  WIZARD_STEPS,
  type WizardStepKey,
} from "@/store/acquisitionWizardStore";
import { StepRail } from "./StepRail";
import { InviteModal } from "./InviteModal";
import { AddressStep }   from "./steps/AddressStep";
import { StatusStep }    from "./steps/StatusStep";
import { PropertyStep }  from "./steps/PropertyStep";
import { OwnershipStep } from "./steps/OwnershipStep";
import { TermsStep }     from "./steps/TermsStep";
import { ReviewStep }    from "./steps/ReviewStep";
import { IntakeStep }    from "./steps/IntakeStep";
import { ButtonGroup }   from "@/components/ui/ButtonGroup";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPost(path: string, body: object, token: string) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function apiPatch(path: string, body: object, token: string) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AcquisitionWizardProps {
  initialProjectId?: string;
  /** When provided the wizard behaves as a modal overlay: save & exit calls onClose
   *  instead of router.push, and the consumer is responsible for mounting/unmounting. */
  onClose?: () => void;
}

// ─── REIL phase progress strip ────────────────────────────────────────────────
// Shown in the wizard top bar so the user always knows where Acquisition sits
// relative to the full investment lifecycle.

const REIL_PHASES = [
  { key: "acquisition", label: "Acquisition" },
  { key: "fund",        label: "Fund"        },
  { key: "hold",        label: "Hold"        },
  { key: "exit",        label: "Exit"        },
] as const;

function REILPhaseStrip() {
  return (
    <div className="hidden md:flex items-center gap-0">
      {REIL_PHASES.map((phase, i) => {
        const isActive = phase.key === "acquisition";
        const isLast   = i === REIL_PHASES.length - 1;
        return (
          <div key={phase.key} className="flex items-center">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: isActive ? "rgba(69,73,85,0.18)" : "transparent",
                color:      isActive ? "rgba(253,255,252,0.80)" : "rgba(253,255,252,0.22)",
                letterSpacing: "0.03em",
              }}
            >
              {phase.label}
            </span>
            {!isLast && (
              <span
                className="material-symbols-outlined text-[14px] mx-0.5"
                style={{ color: "rgba(253,255,252,0.18)", fontVariationSettings: "'FILL' 0" }}
              >
                chevron_right
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AcquisitionWizard({ initialProjectId, onClose }: AcquisitionWizardProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [inviteOpen,   setInviteOpen]   = useState(false);
  const [railOpen,     setRailOpen]     = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const store = useAcquisitionWizard();
  const {
    projectId, currentStep, completion, savedAt, isSaving,
    intake, address, status, ownership, terms,
    setProjectId, goToStep, setSaving, markSaved, reset,
  } = store;

  // ── Rehydrate from initialProjectId (draft resume) ──
  useEffect(() => {
    if (initialProjectId && initialProjectId !== projectId) {
      setProjectId(initialProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  // ── Debounced auto-save ──────────────────────────────────────────────────────

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);

    try {
      const token = await user.getIdToken();

      let computedPhase = 1;
      let computedStatus = "PROSPECT";
      let computedRetrospective = false;

      if (intake.journey === "targeting") {
        computedPhase = 1;
        computedStatus = "PROSPECT";
      } else if (intake.journey === "under_contract") {
        computedPhase = 1;
        computedStatus = "CLEAR_TO_CLOSE";
      } else if (intake.journey === "owned_closing") {
        computedPhase = 2;
        computedStatus = "OWNED";
      } else if (intake.journey === "renovating_marketing") {
        computedPhase = 3;
        computedStatus = "OWNED";
      } else if (intake.journey === "rented_leased_sold") {
        computedPhase = 4;
        computedStatus = "CLOSED";
        computedRetrospective = true;
      }

      let computedSubStrategy: string | null = null;
      if (intake.dispositionType === "RENT") {
        computedSubStrategy = "LONG_TERM";
      } else if (intake.dispositionType === "SALE") {
        computedSubStrategy = "FLIP";
      } else if (intake.dispositionType === "LEASE") {
        computedSubStrategy = "NNN";
      }

      const payload = {
        addressLine:        address.addressLine,
        city:               address.city,
        state:              address.state,
        zip:                address.zip,
        lat:                address.lat ?? null,
        lng:                address.lng ?? null,
        placeId:            address.placeId ?? null,
        displayName:        address.displayName ?? null,
        acquisitionStatus:  computedStatus,
        ownershipStructure: ownership.ownershipStructure ?? null,
        entityType:         ownership.entityType ?? null,
        entityName:         ownership.entityName ?? null,
        coOwners:           ownership.coOwners   ?? [],
        currentPhase:       computedPhase,
        dispositionType:    intake.dispositionType ?? null,
        subStrategy:        computedSubStrategy,
        entryStage:         intake.journey ?? null,
        retrospective:      computedRetrospective,
        apn:                address.apn ?? null,
        propertyType:       address.propertyType ?? null,
        units:              address.units ?? null,
        sqft:               address.sqft ?? null,
        lotSqft:            address.lotSqft ?? null,
        yearBuilt:          address.yearBuilt ?? null,
        condition:          address.condition ?? null,
      };

      if (!projectId) {
        const created = await apiPost("/api/reil/projects", payload, token);
        setProjectId(created.id);
      } else {
        await apiPatch(`/api/reil/projects/${projectId}`, payload, token);
      }
      markSaved();
    } catch (err) {
      console.error("[AcquisitionWizard] save error:", err);
      setSaving(false);
    }
  }, [user, projectId, intake, address, status, ownership, setProjectId, setSaving, markSaved]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 1_500);
  }, [save]);

  // Trigger auto-save whenever intake/address/status/ownership change
  useEffect(() => { scheduleSave(); }, [intake, address, status, ownership, scheduleSave]);

  // ── Focus management — move focus to step heading on step change ────────────
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const stepKeys = WIZARD_STEPS.map(s => s.key);
  const currentIdx = stepKeys.indexOf(currentStep);

  const goNext = useCallback(() => {
    if (currentStep === "intake") {
      goToStep("address");
      return;
    }

    if (currentStep === "address") {
      if (intake.journey === "under_contract") {
        goToStep("terms");
      } else if (
        intake.journey === "owned_closing" ||
        intake.journey === "renovating_marketing" ||
        intake.journey === "rented_leased_sold"
      ) {
        goToStep("review");
      } else {
        goToStep("status");
      }
      return;
    }

    if (currentStep === "terms") {
      goToStep("review");
      return;
    }

    const next = stepKeys[currentIdx + 1];
    if (next) goToStep(next as WizardStepKey);
  }, [currentStep, currentIdx, stepKeys, goToStep, intake.journey]);

  // ── Save & exit ──────────────────────────────────────────────────────────────
  // When used as a modal overlay (onClose provided), closing returns to the
  // dashboard without navigating. When used as a standalone page, we route back.

  const handleSaveExit = useCallback(async () => {
    await save();
    if (onClose) {
      onClose();
    } else {
      router.push("/dashboard");
    }
  }, [save, onClose, router]);

  // ── Final submit (Review step) ───────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    await save();
    if (projectId) {
      reset();
      // Always navigate to the project workspace on submit
      router.push(`/dashboard/projects/${projectId}`);
      // Close the modal overlay after navigation completes (if in modal mode)
      onClose?.();
    }
  }, [save, projectId, reset, router, onClose]);

  // ── Step renderer ────────────────────────────────────────────────────────────

  function renderStep() {
    switch (currentStep) {
      case "intake":    return <IntakeStep    onNext={goNext} />;
      case "address":   return <AddressStep   onNext={goNext} />;
      case "status":    return <StatusStep    onNext={goNext} />;
      case "property":  return <PropertyStep  onNext={goNext} />;
      case "ownership": return <OwnershipStep onNext={goNext} />;
      case "terms":     return <TermsStep     onNext={goNext} />;
      case "review":    return <ReviewStep    onSubmit={handleSubmit} submitting={isSaving} onGoToStep={goToStep} />;
    }
  }

  const currentStepDef = WIZARD_STEPS.find(s => s.key === currentStep);

  return (
    <div
      className="fixed inset-0 z-[200] flex"
      style={{ background: "rgba(8,14,19,0.97)" }}
    >
      {/* ── Left step rail — hidden on mobile, visible md+ ── */}
      <div className="hidden md:block">
        <StepRail
          currentStep={currentStep}
          completion={completion}
          onStepClick={(s) => { goToStep(s); setRailOpen(false); }}
          savedAt={savedAt}
          isSaving={isSaving}
          projectId={projectId}
          projectName={address.displayName ?? undefined}
        />
      </div>

      {/* ── Mobile: full-screen rail drawer ── */}
      {railOpen && (
        <div className="md:hidden fixed inset-0 z-[250]" onClick={() => setRailOpen(false)}>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />
          <div className="absolute left-0 top-0 bottom-0 z-10" onClick={e => e.stopPropagation()}>
            <StepRail
              currentStep={currentStep}
              completion={completion}
              onStepClick={(s) => { goToStep(s); setRailOpen(false); }}
              savedAt={savedAt}
              isSaving={isSaving}
              projectId={projectId}
              projectName={address.displayName ?? undefined}
            />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <div
          className="flex justify-between items-center px-4 md:px-8 py-3 md:py-4 flex-shrink-0 gap-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Left: hamburger (mobile) + REIL phase strip (desktop) */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Open step navigation"
              onClick={() => setRailOpen(v => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "rgba(253,255,252,0.6)" }}>menu</span>
            </button>

            {/* Mobile: current step label */}
            <span className="md:hidden text-[13px] font-semibold truncate" style={{ color: "rgba(253,255,252,0.8)" }}>
              {currentStepDef?.label}
            </span>

            {/* Desktop: REIL lifecycle phase strip */}
            <REILPhaseStrip />

            {/* Desktop: deal name suffix when address is set */}
            {address.displayName && (
              <span className="hidden md:flex items-center gap-1.5 min-w-0">
                <span className="text-[13px]" style={{ color: "rgba(253,255,252,0.25)" }}>·</span>
                <span className="text-[13px] font-medium truncate" style={{ color: "rgba(253,255,252,0.55)" }}>
                  {address.displayName}
                </span>
              </span>
            )}
          </div>

          {/* Right: invite + save & exit + close (×) */}
          <ButtonGroup variant="related" className="flex-shrink-0">
            {/* Invite teammate */}
            {projectId && (
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-opacity duration-150 hover:opacity-70"
                style={{
                  background: "rgba(69,73,85,0.08)",
                  border:     "1px solid rgba(69,73,85,0.18)",
                  color:      "#454955",
                }}
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span className="hidden sm:inline">Invite</span>
              </button>
            )}

            {/* Save & exit */}
            <button
              onClick={handleSaveExit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-opacity duration-150 hover:opacity-70"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(253,255,252,0.6)",
              }}
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span className="hidden sm:inline">Save &amp; exit</span>
            </button>

            {/* Close button — only shown when mounted as a modal overlay */}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close wizard"
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-opacity duration-150 hover:opacity-70"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(253,255,252,0.5)",
                }}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </ButtonGroup>
        </div>

        {/* Step content — aria-live so screen readers announce step changes */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
          aria-live="polite"
          aria-label={`Wizard step: ${currentStepDef?.label}`}
        >
          {/* Invisible focus target for keyboard users */}
          <h2
            ref={stepHeadingRef}
            className="sr-only"
            tabIndex={-1}
            aria-label={`Step: ${currentStepDef?.label}`}
          >
            {currentStepDef?.label}
          </h2>
          <div className="min-h-full flex items-start justify-center py-8 md:py-14 px-4 md:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.19, 1, 0.22, 1] }}
                className="w-full"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Global invite modal — triggered from top bar */}
      {projectId && (
        <InviteModal
          projectId={projectId}
          projectName={address.displayName ?? undefined}
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
