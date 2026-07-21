"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAcquisitionWizard, WIZARD_STEPS, type WizardStepKey } from "@/store/acquisitionWizardStore";
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

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldCheck {
  label:     string;
  stepKey:   WizardStepKey;
  filled:    boolean;
}

// ─── Completion checklist ─────────────────────────────────────────────────────

function useCompletionChecks() {
  const { address, status, ownership, terms, completion } = useAcquisitionWizard();

  const checks: FieldCheck[] = [
    { label: "Address",           stepKey: "address",   filled: completion.address   === "done"    },
    { label: "Acquisition status",stepKey: "status",    filled: !!status.acquisitionStatus          },
    { label: "Property facts",    stepKey: "property",  filled: completion.property  !== "empty"   },
    { label: "Ownership structure",stepKey:"ownership", filled: !!ownership.ownershipStructure      },
    { label: "Offer terms",       stepKey: "terms",     filled: !!terms.offerMadeCents              },
  ];

  const empty  = checks.filter(c => !c.filled);
  const filled = checks.filter(c =>  c.filled);
  return { checks, empty, filled };
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchProject(projectId: string, token: string) {
  const res = await fetch(`/api/reil/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load project.");
  return res.json();
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function Chip({ label, color = "#454955" }: { label: string; color?: string }) {
  return (
    <span
      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: `${color}16`, color }}
    >
      {label}
    </span>
  );
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
}

export function ReviewStep({ onSubmit, submitting, onGoToStep }: ReviewStepProps) {
  const { user } = useAuth();
  const store     = useAcquisitionWizard();
  const { projectId, address, status, ownership, terms } = store;
  const { checks, empty } = useCompletionChecks();

  // Fetch persisted project data for photo / facts / assignments
  const { data: project } = useQuery({
    queryKey: ["project-review", projectId],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) return null;
      return fetchProject(projectId, token);
    },
    enabled:   !!projectId && !!user,
    staleTime: 30_000,
  });

  const facts       = project?.propertyFacts ?? null;
  const assignments = (project?.fieldAssignments ?? []).filter((a: any) => a.status === "OPEN");
  const canCreate   = !!address.placeId; // address is the only hard requirement

  return (
    <div className="flex flex-col gap-6 max-w-[680px] w-full mx-auto">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.02em" }}>
          Review Your Deal
        </h2>
        <p className="text-sm" style={{ color: "rgba(253,255,252,0.4)" }}>
          Confirm the details below. Everything can be edited after creation.
        </p>
      </div>

      {/* ── Hero: photo + deal name ── */}
      {(facts?.photoUrl || address.formattedAddress) && (
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ height: "160px", background: "rgba(22,19,24,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {facts?.photoUrl && (
            <img src={facts.photoUrl} alt="Property" className="w-full h-full object-cover" />
          )}
          <div
            className="absolute inset-0 flex flex-col justify-end p-5"
            style={{ background: "linear-gradient(to top, rgba(8,14,19,0.85) 0%, transparent 60%)" }}
          >
            <p className="text-[18px] font-bold" style={{ color: "rgba(253,255,252,0.95)" }}>
              {address.displayName ?? address.formattedAddress}
            </p>
            {address.city && (
              <p className="text-[13px]" style={{ color: "rgba(253,255,252,0.55)" }}>
                {address.city}, {address.state} {address.zip}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Completion checklist ── */}
      {empty.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,209,170,0.06)", border: "1px solid rgba(255,209,170,0.15)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[16px]" style={{ color: "#ffd1aa" }}>info</span>
            <p className="text-[12px] font-semibold" style={{ color: "#ffd1aa" }}>
              {empty.length} section{empty.length !== 1 ? "s" : ""} still empty — not required to create
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {empty.map(c => (
              <button
                key={c.stepKey}
                onClick={() => onGoToStep(c.stepKey)}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(253,255,252,0.55)" }}
              >
                <span className="material-symbols-outlined text-[12px]">add_circle_outline</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Open field assignments */}
      {assignments.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(173,198,255,0.07)", border: "1px solid rgba(173,198,255,0.15)" }}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ color: "#7A9EAA" }}>pending</span>
          <p className="text-[12px]" style={{ color: "rgba(253,255,252,0.6)" }}>
            <span className="font-semibold" style={{ color: "#7A9EAA" }}>{assignments.length} field{assignments.length !== 1 ? "s" : ""} assigned to teammates</span>
            {" "}— won't block creation.
          </p>
        </div>
      )}

      {/* ── Sections ── */}

      {/* Address */}
      <SectionCard title="Address" icon="location_on" onEdit={() => onGoToStep("address")}>
        <Row label="Full address" value={address.formattedAddress ?? "—"} />
        <Row label="Deal name"    value={address.displayName ?? address.formattedAddress ?? "—"} />
        {address.lat != null && <Row label="Coordinates" value={`${address.lat?.toFixed(4)}, ${address.lng?.toFixed(4)}`} />}
      </SectionCard>

      {/* Property facts */}
      {facts && (
        <SectionCard title="Property Facts" icon="home" onEdit={() => onGoToStep("property")}>
          <div className="flex flex-wrap gap-3 mb-3">
            {facts.beds      != null && <Chip label={`${facts.beds} bd`}  />}
            {facts.baths     != null && <Chip label={`${facts.baths} ba`} color="#7A9EAA" />}
            {facts.sqft      != null && <Chip label={`${facts.sqft.toLocaleString()} sqft`} color="#ffd1aa" />}
            {facts.yearBuilt != null && <Chip label={`Built ${facts.yearBuilt}`} />}
            {facts.propertyType && <Chip label={facts.propertyType} color="rgba(253,255,252,0.5)" />}
          </div>
          <Row label="List Price"   value={fmtCents(facts.listPriceCents)} />
          <Row label="Est. Rent"    value={fmtCents(facts.estRentCents) + "/mo"} />
          <Row label="Last Sold"    value={fmtCents(facts.lastSoldPriceCents)} />
        </SectionCard>
      )}

      {/* Status */}
      {status.acquisitionStatus && (
        <SectionCard title="Acquisition Status" icon="flag" onEdit={() => onGoToStep("status")}>
          <Row
            label="Current status"
            value={ACQUISITION_STATUS_LABELS[status.acquisitionStatus as AcquisitionStatus] ?? status.acquisitionStatus}
          />
        </SectionCard>
      )}

      {/* Ownership */}
      {ownership.ownershipStructure && (
        <SectionCard title="Ownership" icon="account_tree" onEdit={() => onGoToStep("ownership")}>
          <Row label="Structure" value={OWNERSHIP_STRUCTURE_LABELS[ownership.ownershipStructure] ?? ownership.ownershipStructure} />
          {ownership.entityType && <Row label="Entity type" value={ownership.entityType} />}
          {ownership.entityName && <Row label="Entity name" value={ownership.entityName} />}
          {ownership.coOwners && ownership.coOwners.length > 0 && (
            <Row label="Co-owners" value={ownership.coOwners.join(", ")} />
          )}
        </SectionCard>
      )}

      {/* Terms */}
      {(terms.offerMadeCents || terms.acceptedPriceCents) && (
        <SectionCard title="Purchase Terms" icon="handshake" onEdit={() => onGoToStep("terms")}>
          <Row label="Offer"           value={fmtCents(terms.offerMadeCents)} />
          <Row label="Accepted price"  value={fmtCents(terms.acceptedPriceCents)} />
          <Row label="Earnest money"   value={fmtCents(terms.earnestMoneyCents)} />
          <Row label="Est. closing"    value={fmtCents(terms.estClosingCostsCents)} />
          <Row label="Amount paid"     value={fmtCents(terms.amountPaidCents)} />
          {terms.offerDate && <Row label="Offer date" value={fmtDate(terms.offerDate)} />}
        </SectionCard>
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
              Ready to create this project
            </p>
            <p className="text-[12px]" style={{ color: "rgba(253,255,252,0.4)" }}>
              {canCreate
                ? "You can always edit any section from the project detail page."
                : "An address is required to create a project. Go back and add one."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
          <div className="flex gap-2 flex-wrap">
            {checks.filter(c => c.filled).map(c => (
              <span key={c.stepKey} className="text-[10px] flex items-center gap-1" style={{ color: "#454955" }}>
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
