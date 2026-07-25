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
import {
  ProjectNameStep,
  StrategyStep,
  StatusStep,
  PropertyTypeStep,
  UnitsStep,
  ConditionStep,
  OwnershipStep,
  EntityNameStep,
  PurchasePriceStep,
  RehabBudgetStep,
} from "./steps/ProgressiveSteps";
import { ReviewStep }    from "./steps/ReviewStep";
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

// ─── REIL phase progress strip ────────────────────────────────────────────────
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

export function AcquisitionWizard({ initialProjectId, onClose }: { initialProjectId?: string; onClose?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();

  const [inviteOpen,   setInviteOpen]   = useState(false);
  const [railOpen,     setRailOpen]     = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const store = useAcquisitionWizard();
  const {
    projectId, currentStep, completion, savedAt, isSaving,
    address, projectName, strategy, status, propertyType, units, condition, ownership, purchasePrice, rehabBudget,
    setProjectId, goToStep, setSaving, markSaved, reset, setAddress, setProjectName,
  } = store;

  // ── Rehydrate from initialProjectId (draft resume) ──
  useEffect(() => {
    if (initialProjectId && initialProjectId !== projectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId, projectId, setProjectId]);

  // ── Pre-resolved address loader from sessionStorage ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pending = sessionStorage.getItem("pw_pending_project_address");
      if (pending) {
        try {
          const resolvedAddr = JSON.parse(pending);
          if (resolvedAddr && resolvedAddr.placeId) {
            setAddress(resolvedAddr);
            setProjectName(resolvedAddr.displayName || resolvedAddr.addressLine);
            sessionStorage.removeItem("pw_pending_project_address");
            if (currentStep === "address") {
              goToStep("projectName");
            }
          }
        } catch (e) {
          console.error("Failed to parse pending address:", e);
        }
      }
    }
  }, [setAddress, setProjectName, goToStep, currentStep]);

  // ── Auto-skipping of AddressStep if pre-populated ──
  useEffect(() => {
    if (address.placeId && currentStep === "address") {
      goToStep("projectName");
    }
  }, [address.placeId, currentStep, goToStep]);

  // ── Debounced auto-save ──────────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!user || !address.placeId) return;
    setSaving(true);

    try {
      const token = await user.getIdToken();

      let computedPhase = 1;
      const computedStatus = status.acquisitionStatus || "PROSPECT";
      let computedRetrospective = false;

      if (computedStatus === "PROSPECT") {
        computedPhase = 1;
      } else if (computedStatus === "UNDER_CONTRACT") {
        computedPhase = 1;
      } else if (computedStatus === "OWNED") {
        computedPhase = 2;
      } else if (computedStatus === "CLOSED") {
        computedPhase = 4;
        computedRetrospective = true;
      }

      const computedSubStrategy = 
        strategy === "RENT" ? "LONG_TERM" :
        strategy === "SALE" ? "FLIP" :
        strategy === "LEASE" ? "NNN" : null;

      const computedOwnership = 
        ownership.ownershipStructure === "INDIVIDUAL" ? "SOLE_OWNER" :
        ownership.ownershipStructure === "CO_OWNERSHIP" ? "JOINT_VENTURE" :
        ownership.ownershipStructure === "ENTITY" ? "LLC" : null;

      const payload = {
        addressLine:        address.addressLine || address.formattedAddress || "",
        city:               address.city || "",
        state:              address.state || "",
        zip:                address.zip || "",
        lat:                address.lat ?? null,
        lng:                address.lng ?? null,
        placeId:            address.placeId ?? null,
        displayName:        projectName || address.displayName || null,
        acquisitionStatus:  computedStatus,
        ownershipStructure: computedOwnership,
        entityType:         ownership.entityType ?? null,
        entityName:         ownership.entityName ?? null,
        coOwners:           ownership.coOwners   ?? [],
        currentPhase:       computedPhase,
        dispositionType:    strategy || null,
        subStrategy:        computedSubStrategy,
        retrospective:      computedRetrospective,
        propertyType:       propertyType || null,
        units:              units || null,
        condition:          condition || null,
        financials: {
          purchasePrice: purchasePrice ? purchasePrice / 100 : 0,
          rehabBudget: rehabBudget ? rehabBudget / 100 : 0,
        }
      };

      let activeProjectId = projectId;

      if (!activeProjectId) {
        const created = await apiPost("/api/reil/projects", payload, token);
        activeProjectId = created.id;
        setProjectId(created.id);
      } else {
        await apiPatch(`/api/reil/projects/${activeProjectId}`, payload, token);
      }

      // Also upsert purchase terms in relational table if purchasePrice is set
      if (activeProjectId && purchasePrice > 0) {
        await apiPost(`/api/reil/projects/${activeProjectId}/terms`, {
          offerMadeCents: purchasePrice,
          offerDate: new Date().toISOString(),
          sellerResponse: "ACCEPTED",
          acceptedPriceCents: purchasePrice,
        }, token);
      }

      markSaved();
    } catch (err) {
      console.error("[AcquisitionWizard] save error:", err);
      setSaving(false);
    }
  }, [
    user, projectId, address, projectName, strategy, status, propertyType, units, condition, ownership, purchasePrice, rehabBudget,
    setProjectId, setSaving, markSaved
  ]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 1_500);
  }, [save]);

  // Trigger auto-save whenever fields change (excluding raw step location)
  useEffect(() => {
    if (projectId || (address.placeId && currentStep !== "address")) {
      scheduleSave();
    }
  }, [
    projectId, address.placeId, currentStep,
    address, projectName, strategy, status, propertyType, units, condition, ownership, purchasePrice, rehabBudget,
    scheduleSave
  ]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // ── Focus management — move focus to step heading on step change ────────────
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  // ── Step navigation ──────────────────────────────────────────────────────────
  const stepKeys = WIZARD_STEPS.map(s => s.key);
  const currentIdx = stepKeys.indexOf(currentStep as any);

  const goNext = useCallback(() => {
    if (currentStep === "ownership" && ownership.ownershipStructure !== "ENTITY") {
      goToStep("purchasePrice");
      return;
    }
    const next = stepKeys[currentIdx + 1];
    if (next) goToStep(next as WizardStepKey);
  }, [currentStep, currentIdx, stepKeys, goToStep, ownership.ownershipStructure]);

  const goBack = useCallback(() => {
    if (currentStep === "purchasePrice" && ownership.ownershipStructure !== "ENTITY") {
      goToStep("ownership");
      return;
    }
    const prev = stepKeys[currentIdx - 1];
    if (prev) goToStep(prev as WizardStepKey);
  }, [currentStep, currentIdx, stepKeys, goToStep, ownership.ownershipStructure]);

  // ── Save & exit ──────────────────────────────────────────────────────────────
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
      router.push(`/dashboard/projects/${projectId}`);
      onClose?.();
    }
  }, [save, projectId, reset, router, onClose]);

  // ── Step renderer ────────────────────────────────────────────────────────────
  function renderStep() {
    switch (currentStep) {
      case "address":       return <AddressStep onNext={goNext} />;
      case "projectName":   return <ProjectNameStep onNext={goNext} onBack={goBack} />;
      case "strategy":      return <StrategyStep onNext={goNext} onBack={goBack} />;
      case "status":        return <StatusStep onNext={goNext} onBack={goBack} />;
      case "propertyType":  return <PropertyTypeStep onNext={goNext} onBack={goBack} />;
      case "units":         return <UnitsStep onNext={goNext} onBack={goBack} />;
      case "condition":     return <ConditionStep onNext={goNext} onBack={goBack} />;
      case "ownership":     return <OwnershipStep onNext={goNext} onBack={goBack} />;
      case "entityName":    return <EntityNameStep onNext={goNext} onBack={goBack} />;
      case "purchasePrice": return <PurchasePriceStep onNext={goNext} onBack={goBack} />;
      case "rehabBudget":   return <RehabBudgetStep onNext={goNext} onBack={goBack} />;
      case "review":        return <ReviewStep onSubmit={handleSubmit} submitting={isSaving} onGoToStep={goToStep as any} onBack={goBack} />;
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
          projectName={projectName || undefined}
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
              projectName={projectName || undefined}
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
            {projectName && (
              <span className="hidden md:flex items-center gap-1.5 min-w-0">
                <span className="text-[13px]" style={{ color: "rgba(253,255,252,0.25)" }}>·</span>
                <span className="text-[13px] font-medium truncate" style={{ color: "rgba(253,255,252,0.55)" }}>
                  {projectName}
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

            {/* Close button — only when mounted as a modal overlay */}
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
          projectName={projectName || undefined}
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
