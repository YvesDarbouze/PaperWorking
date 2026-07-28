"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { useTheme } from "@/lib/utils/ThemeProvider";
import type { Project } from "@/types/schema";
import { ccTokens, type CcTokens } from "./ccTheme";

function laneAccent(phaseKey: number, t: CcTokens): string {
  if (phaseKey === 2) return t.phase2;
  if (phaseKey === 3) return t.phase3;
  if (phaseKey === 4) return t.phase4;
  return t.phase1;
}

const LANES = [
  { phase: "Acquisition", phaseKey: 1, icon: "domain_add", emptyLabel: "No deals in sourcing" },
  { phase: "Closing", phaseKey: 2, icon: "receipt_long", emptyLabel: "No deals in closing" },
  { phase: "Rehab", phaseKey: 3, icon: "construction", emptyLabel: "No active rehabs" },
  { phase: "Hold / Exit", phaseKey: 4, icon: "exit_to_app", emptyLabel: "No held properties" },
];

function statusLabel(p: Project): string {
  const phase = p.currentPhase ?? 1;
  if (phase === 1) {
    const offer = p.financials?.offerStatus;
    return (offer === "Accepted" || offer === "Sent" || offer === "Countered") ? "Offer Active" : "Underwriting";
  }
  if (phase === 2) return "Closing";
  if (phase === 3) return "Renovation";
  return p.dispositionType === "SALE" ? "For Sale" : p.dispositionType === "LEASE" ? "Leased" : "Rented";
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
  if (p.address) parts.push(p.address);
  return parts.join(" · ") || "—";
}

export function ActivePipeline() {
  const router = useRouter();
  const projects = useProjectStore(state => state.projects);
  const { theme } = useTheme();
  const t = ccTokens(theme === "dark");

  const lanes = useMemo(() =>
    LANES.map(lane => ({
      ...lane,
      items: projects.filter(p => (p.currentPhase ?? 1) === lane.phaseKey),
    })),
    [projects],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {lanes.map(lane => {
        const primary = lane.items[0] ?? null;
        const extra = lane.items.length - 1;
        const accent = laneAccent(lane.phaseKey, t);

        return (
          <div
            key={lane.phase}
            className="relative p-4 flex flex-col cursor-pointer transition-colors"
            style={{
              background: t.panelBg,
              border: `1px solid ${t.border}`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: 2,
              boxShadow: t.panelShadow,
              minHeight: 168,
            }}
            onClick={() => primary && router.push(`/dashboard/projects/${primary.id ?? ""}`)}
            onMouseEnter={(e) => { e.currentTarget.style.background = theme === "dark" ? "#1C1E26" : "#FAFBFC"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = t.panelBg; }}
          >
            <div className="flex justify-between items-start mb-4 gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center shrink-0"
                style={{ background: `${accent}18`, color: accent, borderRadius: 2 }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 0" }}>
                  {lane.icon}
                </span>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
                style={{
                  background: primary ? `${accent}18` : t.hover,
                  color: primary ? accent : t.muted,
                  borderRadius: 2,
                }}
              >
                {primary ? statusLabel(primary) : lane.phase}
              </span>
            </div>

            {primary ? (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold mb-0.5 leading-snug truncate" style={{ color: t.heading }}>
                    {primary.propertyName || primary.address || "Unnamed Project"}
                  </h3>
                  <p className="text-[12px] mb-3 line-clamp-2" style={{ color: t.muted }}>
                    {projectSubtext(primary)}
                  </p>
                </div>

                <div>
                  <div className="w-full h-1 overflow-hidden" style={{ background: t.hover, borderRadius: 1 }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${progressPct(primary)}%`, background: accent, borderRadius: 1 }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[11px]" style={{ color: t.muted }}>{progressLabel(primary)}</span>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: accent }}>
                      {progressPct(primary)}%
                    </span>
                  </div>
                  {extra > 0 && (
                    <div className="mt-2.5 pt-2" style={{ borderTop: `1px solid ${t.divider}` }}>
                      <span className="text-[11px]" style={{ color: t.muted }}>
                        +{extra} more deal{extra > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="flex-1 flex flex-col items-center justify-center py-5"
                style={{ border: `1px dashed ${t.border}`, borderRadius: 2 }}
              >
                <span className="material-symbols-outlined text-[24px] mb-1.5" style={{ color: t.muted, opacity: 0.45 }}>
                  add_circle_outline
                </span>
                <span className="text-[12px] text-center" style={{ color: t.muted }}>{lane.emptyLabel}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
