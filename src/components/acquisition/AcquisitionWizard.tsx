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
  initialProjectId?: string; // populated when reopening a draft
}

export function AcquisitionWizard({ initialProjectId }: AcquisitionWizardProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [inviteOpen,   setInviteOpen]   = useState(false);
  const [railOpen,     setRailOpen]     = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const store = useAcquisitionWizard();
  const {
    projectId, currentStep, completion, savedAt, isSaving,
    address, status, ownership, terms,
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
      const payload = {
        addressLine:        address.addressLine,
        city:               address.city,
        state:              address.state,
        zip:                address.zip,
        lat:                address.lat ?? null,
        lng:                address.lng ?? null,
        placeId:            address.placeId ?? null,
        displayName:        address.displayName ?? null,
        acquisitionStatus:  status.acquisitionStatus,
        ownershipStructure: ownership.ownershipStructure ?? null,
        entityType:         ownership.entityType ?? null,
        entityName:         ownership.entityName ?? null,
        coOwners:           ownership.coOwners   ?? [],
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
  }, [user, projectId, address, status, ownership, setProjectId, setSaving, markSaved]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 1_500);
  }, [save]);

  // Trigger auto-save whenever address/status/ownership change
  useEffect(() => { scheduleSave(); }, [address, status, ownership, scheduleSave]);

  // ── Focus management — move focus to step heading on step change ────────────
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const stepKeys = WIZARD_STEPS.map(s => s.key);
  const currentIdx = stepKeys.indexOf(currentStep);

  const goNext = useCallback(() => {
    const next = stepKeys[currentIdx + 1];
    if (next) goToStep(next as WizardStepKey);
  }, [currentIdx, stepKeys, goToStep]);

  // ── Save & exit ──────────────────────────────────────────────────────────────

  const handleSaveExit = useCallback(async () => {
    await save();
    router.push("/dashboard");
  }, [save, router]);

  // ── Final submit (Review step) ───────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    await save();
    if (projectId) {
      reset();
      router.push(`/dashboard/projects/reil/${projectId}`);
    }
  }, [save, projectId, reset, router]);

  // ── Step renderer ────────────────────────────────────────────────────────────

  function renderStep() {
    switch (currentStep) {
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
          className="flex justify-between items-center px-4 md:px-8 py-3 md:py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger — opens step rail drawer */}
            <button
              aria-label="Open step navigation"
              onClick={() => setRailOpen(v => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: "rgba(218,228,236,0.6)" }}>menu</span>
            </button>

            <span className="text-[13px] font-semibold" style={{ color: "rgba(218,228,236,0.5)" }}>
              {/* Mobile: show current step name; desktop: show deal name */}
              <span className="md:hidden" style={{ color: "rgba(218,228,236,0.8)" }}>
                {currentStepDef?.label}
              </span>
              <span className="hidden md:inline">
                Acquisition
                {address.displayName && (
                  <span style={{ color: "rgba(218,228,236,0.9)" }}>
                    {" "}· {address.displayName}
                  </span>
                )}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Invite teammate — available throughout wizard */}
            {projectId && (
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-opacity duration-150 hover:opacity-70"
                style={{
                  background: "rgba(87,241,219,0.08)",
                  border:     "1px solid rgba(87,241,219,0.18)",
                  color:      "#57f1db",
                }}
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Invite
              </button>
            )}
            <button
              onClick={handleSaveExit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-opacity duration-150 hover:opacity-70"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(218,228,236,0.6)",
              }}
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save &amp; exit
            </button>
          </div>
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
