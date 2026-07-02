"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types/schema";

// ─── Phase config ─────────────────────────────────────────────────────────────

const LANES = [
  {
    phase: "Acquisition",
    phaseKey: 1,
    icon: "domain_add",
    accentColor: "#454955",
    emptyLabel: "No deals in sourcing",
  },
  {
    phase: "Closing",
    phaseKey: 2,
    icon: "receipt_long",
    accentColor: "#7A9EAA",
    emptyLabel: "No deals in closing",
  },
  {
    phase: "Rehab",
    phaseKey: 3,
    icon: "construction",
    accentColor: "#ffac5a",
    emptyLabel: "No active rehabs",
  },
  {
    phase: "Hold / Exit",
    phaseKey: 4,
    icon: "exit_to_app",
    accentColor: "#5aaa3f",
    emptyLabel: "No held properties",
  },
];

function statusLabel(p: Project): string {
  const phase = p.currentPhase ?? 1;
  if (phase === 1) {
    const offer = p.financials?.offerStatus;
    return (offer === "Accepted" || offer === "Sent" || offer === "Countered") ? "Offer Active" : "Underwriting";
  }
  if (phase === 2) return "Closing";
  if (phase === 3) return "Renovation";
  return p.financials?.exitStrategyType === "Sell" ? "For Sale" : "Rented";
}

function progressPct(p: Project): number {
  const phase = p.currentPhase ?? 1;
  if (phase === 1) return p.financials?.purchasePrice ? 60 : 25;
  if (phase === 2) return p.financials?.loanAmount ? 75 : 40;
  if (phase === 3) {
    const budget = p.financials?.rehabBudget ?? p.financials?.projectedRehabCost ?? 0;
    const actual = p.financials?.rehabActual ?? 0;
    return budget > 0 ? Math.min(Math.round((actual / budget) * 100), 99) : 30;
  }
  return 80;
}

function progressLabel(p: Project): string {
  const phase = p.currentPhase ?? 1;
  if (phase === 1) return "Phase 1 of 4";
  if (phase === 2) return "Finalizing docs";
  if (phase === 3) {
    const budget = p.financials?.rehabBudget ?? p.financials?.projectedRehabCost ?? 0;
    const actual = p.financials?.rehabActual ?? 0;
    if (budget > 0) return `$${(actual / 1000).toFixed(0)}k / $${(budget / 1000).toFixed(0)}k`;
    return "In progress";
  }
  return "Operating";
}

function projectSubtext(p: Project): string {
  const parts: string[] = [];
  if (p.assetClass) parts.push(p.assetClass);
  // address is a plain string on the Project type
  if (p.address) parts.push(p.address);
  return parts.join(" · ") || "—";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivePipeline() {
  const router = useRouter();
  const projects = useProjectStore(state => state.projects);

  const lanes = useMemo(() =>
    LANES.map(lane => ({
      ...lane,
      items: projects.filter(p => (p.currentPhase ?? 1) === lane.phaseKey),
    })),
    [projects],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {lanes.map(lane => {
        const primary = lane.items[0] ?? null;
        const extra   = lane.items.length - 1;

        return (
          <div
            key={lane.phase}
            className="relative rounded-2xl p-5 flex flex-col cursor-pointer group transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, rgba(22,19,24,0.6) 0%, rgba(13,10,11,0.85) 100%)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: `2px solid ${lane.accentColor}55`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            }}
            onClick={() => primary && router.push(`/dashboard/projects/${primary.id ?? ""}`)}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: `radial-gradient(circle at 50% 0%, ${lane.accentColor}08 0%, transparent 70%)` }}
            />

            {/* Phase icon + status */}
            <div className="relative flex justify-between items-start mb-6">
              <div
                className="p-2 rounded-xl"
                style={{ background: `${lane.accentColor}14`, color: lane.accentColor }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                  {lane.icon}
                </span>
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                style={{
                  background: "rgba(45,54,61,0.8)",
                  color: primary ? lane.accentColor : "rgba(253,255,252,0.3)",
                  letterSpacing: "0.06em",
                }}
              >
                {primary ? statusLabel(primary) : lane.phase}
              </span>
            </div>

            {/* Content */}
            {primary ? (
              <div className="relative flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    className="text-[15px] font-semibold mb-1 leading-snug"
                    style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "0.01em" }}
                  >
                    {primary.propertyName || primary.address || "Unnamed Project"}
                  </h3>
                  <p className="text-[13px] mb-4" style={{ color: "rgba(253,255,252,0.45)" }}>
                    {projectSubtext(primary)}
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(45,54,61,0.9)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progressPct(primary)}%`, background: lane.accentColor }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px]" style={{ color: "rgba(253,255,252,0.4)" }}>
                      {progressLabel(primary)}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: lane.accentColor }}>
                      {progressPct(primary)}%
                    </span>
                  </div>

                  {extra > 0 && (
                    <div
                      className="mt-3 pt-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className="text-[11px]" style={{ color: "rgba(253,255,252,0.35)" }}>
                        +{extra} more deal{extra > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="relative flex-1 flex flex-col items-center justify-center rounded-xl py-6"
                style={{ border: "1.5px dashed rgba(255,255,255,0.07)" }}
              >
                <span className="material-symbols-outlined text-[28px] mb-2" style={{ color: "rgba(253,255,252,0.15)" }}>
                  add_circle_outline
                </span>
                <span className="text-[12px] text-center leading-snug" style={{ color: "rgba(253,255,252,0.25)" }}>
                  {lane.emptyLabel}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
