"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { deriveAllMetrics } from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";
import { PHASE_COLORS as CANONICAL_PHASES, getPhaseLabel } from '@/lib/constants/phaseColors';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "coc" | "irr";

interface PerformerRow {
  id: string;
  name: string;
  phase: number;
  coc: number | null;
  assetClass?: string;
  accentColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<number, string> = {
  1: CANONICAL_PHASES[1].hex,
  2: CANONICAL_PHASES[2].hex,
  3: CANONICAL_PHASES[3].hex,
  4: CANONICAL_PHASES[4].hex,
};

const PHASE_LABELS: Record<number, string> = {
  1: getPhaseLabel(1),
  2: getPhaseLabel(2),
  3: getPhaseLabel(3),
  4: getPhaseLabel(4),
};

// ─── Derivation ───────────────────────────────────────────────────────────────

function derivePerformers(projects: Project[]): PerformerRow[] {
  return projects
    .filter((p) => !!p.financials)
    .map((p) => {
      const f = p.financials;
      let coc: number | null = null;

      try {
        const m = deriveAllMetrics(
          f,
          f.estimatedCurrentValue || f.estimatedARV,
          p.dispositionType,
          p.currentPhase,
          p.createdAt,
        );
        coc = Number.isFinite(m.cashOnCashReturn) ? m.cashOnCashReturn : null;
      } catch {
        // skip projects where metrics can't be derived
      }

      const phase = p.currentPhase ?? 1;
      return {
        id: p.id,
        name: p.propertyName || p.address || "Unnamed",
        phase,
        coc,
        assetClass: p.assetClass,
        accentColor: PHASE_COLORS[phase] ?? "#454955",
      };
    });
}

function formatPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopPerformersWidget() {
  const projects = useProjectStore((s) => s.projects);
  const router   = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("coc");

  const performers = useMemo(() => {
    const rows = derivePerformers(projects);
    return [...rows]
      .sort((a, b) => {
        const av = sortKey === "coc" ? (a.coc ?? -Infinity) : -Infinity;
        const bv = sortKey === "coc" ? (b.coc ?? -Infinity) : -Infinity;
        return bv - av;
      })
      .slice(0, 5);
  }, [projects, sortKey]);

  const isEmpty = performers.length === 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(22,19,24,0.6) 0%, rgba(13,10,11,0.85) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-4 flex justify-between items-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: "#454955", fontVariationSettings: "'FILL' 0" }}
          >
            emoji_events
          </span>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "rgba(253,255,252,0.5)", letterSpacing: "0.08em" }}
          >
            Top Performers
          </span>
        </div>

        {/* Sort toggle */}
        <div
          className="flex rounded-lg overflow-hidden text-[11px] font-bold"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {(["coc", "irr"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className="px-2.5 py-1 transition-colors duration-150"
              style={{
                background:
                  sortKey === k ? "rgba(69,73,85,0.12)" : "transparent",
                color:
                  sortKey === k ? "#454955" : "rgba(253,255,252,0.35)",
              }}
            >
              {k === "coc" ? "CoC" : "IRR"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty State ── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-8 px-5 text-center">
          <span
            className="material-symbols-outlined text-3xl mb-2"
            style={{ color: "rgba(253,255,252,0.15)" }}
          >
            bar_chart
          </span>
          <p
            className="text-[12px] font-medium mb-1"
            style={{ color: "rgba(253,255,252,0.5)" }}
          >
            No performance data yet.
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "rgba(253,255,252,0.25)" }}
          >
            Rankings appear once projects have financial data.
          </p>
        </div>
      )}

      {/* ── Performer Rows ── */}
      {!isEmpty && (
        <div>
          {performers.map((row, idx) => {
            const value = sortKey === "coc" ? row.coc : null;
            const isPositive = value !== null && value > 0;

            return (
              <div
                key={row.id}
                className="flex items-center gap-3 px-5 py-3 cursor-pointer group"
                style={{
                  borderBottom:
                    idx < performers.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
                onClick={() => router.push(`/dashboard/projects/${row.id}`)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.025)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {/* Rank */}
                <span
                  className="text-[11px] font-bold w-5 text-center flex-shrink-0 tabular-nums"
                  style={{
                    color:
                      idx === 0
                        ? "#454955"
                        : "rgba(253,255,252,0.25)",
                  }}
                >
                  #{idx + 1}
                </span>

                {/* Phase dot */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: row.accentColor }}
                />

                {/* Name + sublabel */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-semibold truncate"
                    style={{ color: "rgba(253,255,252,0.85)" }}
                  >
                    {row.name}
                  </p>
                  <p
                    className="text-[10px] truncate"
                    style={{ color: "rgba(253,255,252,0.3)" }}
                  >
                    {PHASE_LABELS[row.phase] ?? "Active"}
                    {row.assetClass ? ` · ${row.assetClass}` : ""}
                  </p>
                </div>

                {/* Metric value */}
                <span
                  className="text-[13px] font-bold flex-shrink-0 tabular-nums"
                  style={{
                    color:
                      value === null
                        ? "rgba(253,255,252,0.25)"
                        : isPositive
                        ? "#454955"
                        : "#F06543",
                  }}
                >
                  {formatPct(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
