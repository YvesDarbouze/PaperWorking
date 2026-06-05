"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  ACQUISITION_STATUS_LABELS,
  OWNERSHIP_STRUCTURE_LABELS,
  type AcquisitionStatus,
} from "@/lib/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> };

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

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Lifecycle stages config ──────────────────────────────────────────────────

const LIFECYCLE_STAGES = [
  {
    key:         "acquisition",
    label:       "Acquisition",
    description: "Find, analyze, and close the deal.",
    icon:        "domain_add",
    color:       "#57f1db",
    wizardBase:  "/dashboard/projects/new?resume=",
  },
  {
    key:         "fund",
    label:       "Fund",
    description: "Capital raise, financing, and closing room.",
    icon:        "account_balance",
    color:       "#adc6ff",
    locked:      true,
  },
  {
    key:         "hold",
    label:       "Hold & Rehab",
    description: "Renovation budget, holding costs, and operations.",
    icon:        "construction",
    color:       "#ffac5a",
    locked:      true,
  },
  {
    key:         "exit",
    label:       "Exit",
    description: "Sale, settlement, and realized ROI.",
    icon:        "exit_to_app",
    color:       "#62fae3",
    locked:      true,
  },
] as const;

type StageKey = (typeof LIFECYCLE_STAGES)[number]["key"];

// ─── Section components ───────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-[12px]" style={{ color: "rgba(218,228,236,0.4)" }}>{label}</span>
      <span className="text-[12px] font-medium" style={{ color: value === "—" ? "rgba(218,228,236,0.2)" : "rgba(218,228,236,0.85)" }}>
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title, icon, editHref, children,
}: { title: string; icon: string; editHref?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(20,29,35,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex justify-between items-center px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]" style={{ color: "#57f1db", fontVariationSettings: "'FILL' 0" }}>{icon}</span>
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.4)", letterSpacing: "0.07em" }}>
            {title}
          </span>
        </div>
        {editHref && (
          <button
            onClick={() => router.push(editHref)}
            className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-70"
            style={{ color: "#57f1db" }}
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

// ─── Page component ───────────────────────────────────────────────────────────

async function fetchProject(id: string, token: string) {
  const res = await fetch(`/api/reil/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Project not found.");
  return res.json();
}

export default function ReilProjectDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const router    = useRouter();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["reil-project", id],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated.");
      return fetchProject(id, token);
    },
    enabled:   !!user,
    staleTime: 60_000,
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "rgba(8,14,19,0.97)" }}>
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(87,241,219,0.2)", borderTopColor: "#57f1db" }} />
          <span className="text-sm" style={{ color: "rgba(218,228,236,0.4)" }}>Loading project…</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-sm" style={{ color: "#ef4444" }}>Project not found or access denied.</p>
        <button onClick={() => router.push("/dashboard")} className="text-[13px]" style={{ color: "#57f1db" }}>
          ← Back to Portfolio
        </button>
      </div>
    );
  }

  const facts       = project.propertyFacts;
  const terms       = project.purchaseTerms;
  const statusEvents = project.statusEvents ?? [];
  const openAssignments = (project.fieldAssignments ?? []).filter((a: any) => a.status === "OPEN");

  const wizardResumeUrl = `/dashboard/projects/new?resume=${id}`;

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
      <div className="max-w-[900px] mx-auto px-8 py-10 space-y-8">

        {/* ── Page header ── */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-[12px] flex items-center gap-1 hover:opacity-70"
                style={{ color: "rgba(218,228,236,0.4)" }}
              >
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                Portfolio
              </button>
              <span style={{ color: "rgba(218,228,236,0.15)" }}>/</span>
              <span className="text-[12px]" style={{ color: "rgba(218,228,236,0.4)" }}>
                {project.displayName ?? project.addressLine}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "rgba(218,228,236,0.95)", letterSpacing: "-0.02em" }}>
              {project.displayName ?? project.addressLine}
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(218,228,236,0.4)" }}>
              {[project.addressLine, project.city, project.state, project.zip].filter(Boolean).join(", ")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {project.acquisitionStatus && (
              <span
                className="text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: "rgba(87,241,219,0.12)", color: "#57f1db", border: "1px solid rgba(87,241,219,0.25)" }}
              >
                {ACQUISITION_STATUS_LABELS[project.acquisitionStatus as AcquisitionStatus] ?? project.acquisitionStatus}
              </span>
            )}
            <button
              onClick={() => router.push(wizardResumeUrl)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(218,228,236,0.6)" }}
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              Edit deal
            </button>
          </div>
        </div>

        {/* ── Open assignments warning ── */}
        {openAssignments.length > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,209,170,0.07)", border: "1px solid rgba(255,209,170,0.18)" }}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ color: "#ffd1aa" }}>pending</span>
            <span className="text-[12px]" style={{ color: "rgba(218,228,236,0.6)" }}>
              <span className="font-semibold" style={{ color: "#ffd1aa" }}>{openAssignments.length} field{openAssignments.length !== 1 ? "s" : ""} awaiting teammates</span>
              {" "}— open assignments don't block this project.
            </span>
          </div>
        )}

        {/* ── Property photo ── */}
        {facts?.photoUrl && (
          <div className="w-full rounded-2xl overflow-hidden" style={{ height: "240px" }}>
            <img src={facts.photoUrl} alt="Property" className="w-full h-full object-cover" />
          </div>
        )}

        {/* ── Lifecycle stages ── */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(218,228,236,0.35)", letterSpacing: "0.08em" }}>
            REIL Lifecycle
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {LIFECYCLE_STAGES.map(stage => {
              const isActive = stage.key === "acquisition";
              const isLocked = (stage as any).locked;
              return (
                <div
                  key={stage.key}
                  className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{
                    background: isActive
                      ? `${stage.color}08`
                      : "rgba(14,22,28,0.5)",
                    border: `1px solid ${isActive ? `${stage.color}25` : "rgba(255,255,255,0.06)"}`,
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${stage.color}14` }}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ color: stage.color, fontVariationSettings: "'FILL' 0" }}>
                        {stage.icon}
                      </span>
                    </div>
                    {isLocked && (
                      <span className="material-symbols-outlined text-[14px]" style={{ color: "rgba(218,228,236,0.2)" }}>lock</span>
                    )}
                    {isActive && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${stage.color}15`, color: stage.color }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold mb-0.5" style={{ color: isActive ? "rgba(218,228,236,0.9)" : "rgba(218,228,236,0.4)" }}>
                      {stage.label}
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(218,228,236,0.3)" }}>
                      {stage.description}
                    </p>
                  </div>
                  {isActive && (
                    <button
                      onClick={() => router.push(wizardResumeUrl)}
                      className="flex items-center gap-1 text-[11px] font-semibold"
                      style={{ color: stage.color }}
                    >
                      Edit <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </button>
                  )}
                  {isLocked && (
                    <p className="text-[10px]" style={{ color: "rgba(218,228,236,0.2)" }}>
                      Unlocks after Acquisition closes
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Data sections ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Address */}
          <SectionCard title="Address" icon="location_on" editHref={`${wizardResumeUrl}#address`}>
            <DetailRow label="Full address" value={[project.addressLine, project.city, project.state].filter(Boolean).join(", ") || "—"} />
            <DetailRow label="Zip"    value={project.zip || "—"} />
            {project.lat != null && <DetailRow label="Coordinates" value={`${Number(project.lat).toFixed(4)}, ${Number(project.lng).toFixed(4)}`} />}
          </SectionCard>

          {/* Property facts */}
          {facts && (
            <SectionCard title="Property Facts" icon="home" editHref={`${wizardResumeUrl}#property`}>
              <DetailRow label="Beds / Baths" value={`${facts.beds ?? "—"} bd / ${facts.baths ?? "—"} ba`} />
              <DetailRow label="Sq ft"       value={facts.sqft ? facts.sqft.toLocaleString() : "—"} />
              <DetailRow label="Year built"  value={facts.yearBuilt ? String(facts.yearBuilt) : "—"} />
              <DetailRow label="Type"        value={facts.propertyType ?? "—"} />
              <DetailRow label="List price"  value={fmtCents(facts.listPriceCents)} />
              <DetailRow label="Est. rent"   value={fmtCents(facts.estRentCents) + "/mo"} />
            </SectionCard>
          )}

          {/* Acquisition status */}
          <SectionCard title="Acquisition Status" icon="flag" editHref={`${wizardResumeUrl}#status`}>
            <DetailRow
              label="Current status"
              value={project.acquisitionStatus
                ? (ACQUISITION_STATUS_LABELS[project.acquisitionStatus as AcquisitionStatus] ?? project.acquisitionStatus)
                : "—"}
            />
            {statusEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                {statusEvents.slice(0, 3).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(218,228,236,0.4)" }}>
                    <span className="material-symbols-outlined text-[11px]" style={{ color: "#57f1db", fontVariationSettings: "'FILL' 1" }}>history</span>
                    <span>{ACQUISITION_STATUS_LABELS[e.status as AcquisitionStatus] ?? e.status}</span>
                    <span style={{ color: "rgba(218,228,236,0.2)" }}>·</span>
                    <span>{timeAgo(e.occurredAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Ownership */}
          <SectionCard title="Ownership" icon="account_tree" editHref={`${wizardResumeUrl}#ownership`}>
            <DetailRow
              label="Structure"
              value={project.ownershipStructure
                ? (OWNERSHIP_STRUCTURE_LABELS[project.ownershipStructure] ?? project.ownershipStructure)
                : "—"}
            />
            {project.entityType && <DetailRow label="Entity type" value={project.entityType} />}
            {project.entityName && <DetailRow label="Entity name" value={project.entityName} />}
            {project.coOwners?.length > 0 && (
              <DetailRow label="Co-owners" value={(project.coOwners as string[]).join(", ")} />
            )}
          </SectionCard>

          {/* Purchase terms */}
          {terms && (
            <SectionCard title="Purchase Terms" icon="handshake" editHref={`${wizardResumeUrl}#terms`}>
              <DetailRow label="Offer"      value={fmtCents(terms.offerMadeCents)} />
              <DetailRow label="Accepted"   value={fmtCents(terms.acceptedPriceCents)} />
              <DetailRow label="Earnest"    value={fmtCents(terms.earnestMoneyCents)} />
              <DetailRow label="Est. close" value={fmtCents(terms.estClosingCostsCents)} />
              {terms.offerDate && <DetailRow label="Offer date" value={fmtDate(terms.offerDate)} />}
              {terms.sellerResponse !== "PENDING" && (
                <DetailRow label="Seller response" value={terms.sellerResponse} />
              )}
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  );
}
