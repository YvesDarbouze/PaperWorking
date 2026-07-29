"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAcquisitionWizard, type WizardStepKey } from "@/store/acquisitionWizardStore";
import {
  ACQUISITION_STATUS_LABELS,
  OWNERSHIP_STRUCTURE_LABELS,
  type AcquisitionStatus,
} from "@/lib/enums";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCents(c: number | bigint | null | undefined): string {
  if (c === null || c === undefined) return "—";
  const n = typeof c === "bigint" ? Number(c) : c;
  if (n >= 100_000_000) return `$${(n / 100_000_000).toFixed(2)}M`;
  if (n >= 100_000)     return `$${(n / 100_000).toFixed(0)}K`;
  return `$${(n / 100).toLocaleString()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldCheck {
  label:     string;
  stepKey:   WizardStepKey;
  filled:    boolean;
}

// ─── Completion checklist ─────────────────────────────────────────────────────

function useCompletionChecks() {
  const store = useAcquisitionWizard();

  const checks: FieldCheck[] = [
    { label: "Address",           stepKey: "address",       filled: !!store.address.placeId },
    { label: "Project Name",      stepKey: "projectName",   filled: !!store.projectName.trim() },
    { label: "Strategy",          stepKey: "strategy",      filled: !!store.strategy },
    { label: "Pipeline Status",   stepKey: "status",        filled: !!store.status.acquisitionStatus },
    { label: "Property Type",     stepKey: "propertyType",  filled: !!store.propertyType },
    { label: "Units count",       stepKey: "units",         filled: store.units > 0 },
    { label: "Condition",         stepKey: "condition",     filled: !!store.condition },
    { label: "Ownership structure",stepKey:"ownership",     filled: !!store.ownership.ownershipStructure },
    { label: "Purchase Price",    stepKey: "purchasePrice", filled: store.purchasePrice > 0 },
    { label: "Rehab Budget",      stepKey: "rehabBudget",   filled: store.rehabBudget >= 0 },
  ];

  const empty  = checks.filter(c => !c.filled);
  const filled = checks.filter(c =>  c.filled);
  return { checks, empty, filled };
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title, icon, onEdit, children,
}: { title: string; icon: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(22,19,24,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex justify-between items-center px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]" style={{ color: "#454955", fontVariationSettings: "'FILL' 0" }}>
            {icon}
          </span>
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.45)", letterSpacing: "0.07em" }}>
            {title}
          </span>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-[11px] font-semibold flex items-center gap-1 hover:opacity-70"
            style={{ color: "#454955" }}
          >
            <span className="material-symbols-outlined text-[13px]">edit</span>
            Edit
          </button>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-[12px]" style={{ color: "rgba(253,255,252,0.4)" }}>{label}</span>
      <span className="text-[12px] font-medium" style={{ color: value === "—" ? "rgba(253,255,252,0.2)" : "rgba(253,255,252,0.85)" }}>{value}</span>
    </div>
  );
}

// ─── ReviewStep ───────────────────────────────────────────────────────────────

interface ReviewStepProps {
  onSubmit:   () => void;
  submitting: boolean;
  onGoToStep: (step: WizardStepKey) => void;
  onBack:     () => void;
}

export function ReviewStep({ onSubmit, submitting, onGoToStep, onBack }: ReviewStepProps) {
  const store     = useAcquisitionWizard();
  const { address, projectName, strategy, status, propertyType, units, condition, ownership, purchasePrice, rehabBudget } = store;
  const { checks, empty } = useCompletionChecks();

  const canCreate   = !!address.placeId && !!projectName.trim() && !!strategy; // Address, name, strategy are minimum hard requirements

  return (
    <div className="flex flex-col gap-6 max-w-[680px] w-full mx-auto animate-fade-in">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.02em" }}>
          Review Your Deal
        </h2>
        <p className="text-sm" style={{ color: "rgba(253,255,252,0.4)" }}>
          Confirm the details below. Everything can be edited after creation.
        </p>
      </div>

      {/* ── Sections ── */}

      {/* Address & Project Name */}
      <SectionCard title="Identity" icon="location_on" onEdit={() => onGoToStep("address")}>
        <Row label="Full address" value={address.formattedAddress ?? "—"} />
        <Row label="Project name"    value={projectName || "—"} />
        {address.lat != null && <Row label="Coordinates" value={`${address.lat?.toFixed(4)}, ${address.lng?.toFixed(4)}`} />}
      </SectionCard>

      {/* Strategy & Pipeline Status */}
      <SectionCard title="Strategy & Status" icon="explore" onEdit={() => onGoToStep("strategy")}>
        <Row label="Disposition Strategy" value={strategy || "—"} />
        <Row
          label="Pipeline status"
          value={status.acquisitionStatus ? (ACQUISITION_STATUS_LABELS[status.acquisitionStatus as AcquisitionStatus] ?? status.acquisitionStatus) : "—"}
        />
      </SectionCard>

      {/* Property Details */}
      <SectionCard title="Property classification" icon="home" onEdit={() => onGoToStep("propertyType")}>
        <Row label="Property Type" value={propertyType || "—"} />
        <Row label="Units Count"   value={units > 0 ? units.toString() : "—"} />
        <Row label="Condition"     value={condition || "—"} />
      </SectionCard>

      {/* Ownership */}
      <SectionCard title="Ownership" icon="account_tree" onEdit={() => onGoToStep("ownership")}>
        <Row label="Structure" value={ownership.ownershipStructure ? (OWNERSHIP_STRUCTURE_LABELS[ownership.ownershipStructure] ?? ownership.ownershipStructure) : "—"} />
        {ownership.entityType && <Row label="Entity type" value={ownership.entityType} />}
        {ownership.entityName && <Row label="Entity name" value={ownership.entityName} />}
      </SectionCard>

      {/* Underwriting Terms */}
      <SectionCard title="Underwriting Terms" icon="payments" onEdit={() => onGoToStep("purchasePrice")}>
        <Row label="Target Purchase Price" value={purchasePrice > 0 ? fmtCents(purchasePrice) : "—"} />
        <Row label="Estimated Rehab Budget" value={rehabBudget >= 0 ? fmtCents(rehabBudget) : "—"} />
      </SectionCard>

      {/* ── Completion checklist ── */}
      {empty.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,209,170,0.06)", border: "1px solid rgba(255,209,170,0.15)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[16px]" style={{ color: "#ffd1aa" }}>info</span>
            <p className="text-[12px] font-semibold" style={{ color: "#ffd1aa" }}>
              {empty.length} decision{empty.length !== 1 ? "s" : ""} still empty — not required to finalize
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {empty.map(c => (
              <button
                key={c.stepKey}
                onClick={() => onGoToStep(c.stepKey)}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(253,255,252,0.55)" }}
              >
                <span className="material-symbols-outlined text-[12px]">add_circle_outline</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirm ── */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "rgba(69,73,85,0.05)", border: "1px solid rgba(69,73,85,0.15)" }}
      >
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0" style={{ color: "#454955", fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: "rgba(253,255,252,0.9)" }}>
              Ready to activate this Project
            </p>
            <p className="text-[12px]" style={{ color: "rgba(253,255,252,0.4)" }}>
              {canCreate
                ? "You can always edit any section from the project detail page."
                : "Address, Project Name, and Strategy are required to create a project."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onBack}
            className="flex items-center justify-center h-11 px-5 rounded-xl border border-pw-border bg-transparent text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] hover:text-white transition-colors"
          >
            Back
          </button>
          
          <button
            disabled={!canCreate || submitting}
            onClick={onSubmit}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: (!canCreate || submitting) ? "rgba(69,73,85,0.1)" : "#454955",
              color:      (!canCreate || submitting) ? "#454955" : "#0d0a0b",
              opacity:    !canCreate ? 0.45 : 1,
            }}
          >
            {submitting ? "Creating project…" : "Create Project"}
            <span className="material-symbols-outlined text-[18px]">
              {submitting ? "hourglass_empty" : "arrow_forward"}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
