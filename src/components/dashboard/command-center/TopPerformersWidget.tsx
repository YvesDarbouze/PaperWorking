"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { useTheme } from "@/lib/utils/ThemeProvider";
import { deriveAllMetrics } from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";
import { ccTokens, phaseAccent } from "./ccTheme";

type SortKey = "coc" | "irr";

interface PerformerRow {
  id: string;
  name: string;
  phase: number;
  coc: number | null;
  assetClass?: string;
}

const PHASE_LABELS: Record<number, string> = {
  1: "Acquisition",
  2: "Closing",
  3: "Rehab",
  4: "Hold / Exit",
};

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

      return {
        id: p.id,
        name: p.propertyName || p.address || "Unnamed",
        phase: p.currentPhase ?? 1,
        coc,
        assetClass: p.assetClass,
      };
    });
}

function formatPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function TopPerformersWidget() {
  const projects = useProjectStore((s) => s.projects);
  const router = useRouter();
  const { theme } = useTheme();
  const t = ccTokens(theme === "dark");
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
      className="overflow-hidden h-full"
      style={{
        background: t.panelBg,
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        boxShadow: t.panelShadow,
      }}
    >
      <div
        className="px-4 py-3 flex justify-between items-center gap-2"
        style={{ borderBottom: `1px solid ${t.divider}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: t.accent, fontVariationSettings: "'FILL' 0" }}
          >
            emoji_events
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.muted }}>
            Top performers
          </span>
        </div>

        <div
          className="flex overflow-hidden text-[11px] font-semibold shrink-0"
          style={{ background: t.hover, borderRadius: 2 }}
        >
          {(["coc", "irr"] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className="pw-interactive-custom px-2.5 py-1 transition-colors"
              onClick={() => setSortKey(k)}
              style={{
                background: sortKey === k ? t.panelBg : "transparent",
                color: sortKey === k ? t.heading : t.muted,
                border: "none",
                borderRadius: 2,
                padding: "4px 10px",
                boxShadow: sortKey === k ? t.panelShadow : "none",
              }}
            >
              {k === "coc" ? "CoC" : "IRR"}
            </button>
          ))}
        </div>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-8 px-5 text-center">
          <span className="material-symbols-outlined text-3xl mb-2" style={{ color: t.muted, opacity: 0.4 }}>
            bar_chart
          </span>
          <p className="text-[12px] font-medium mb-1" style={{ color: t.heading }}>
            No performance data yet
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: t.muted }}>
            Rankings appear once projects have financial data.
          </p>
        </div>
      )}

      {!isEmpty && (
        <div>
          {performers.map((row, idx) => {
            const value = sortKey === "coc" ? row.coc : null;
            const isPositive = value !== null && value > 0;
            const accent = phaseAccent(row.phase, t);

            return (
              <div
                key={row.id}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                style={{
                  borderBottom: idx < performers.length - 1 ? `1px solid ${t.divider}` : "none",
                }}
                onClick={() => router.push(`/dashboard/projects/${row.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  className="text-[11px] font-semibold w-5 text-center flex-shrink-0 tabular-nums"
                  style={{ color: idx === 0 ? t.accent : t.muted }}
                >
                  #{idx + 1}
                </span>

                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: t.heading }}>
                    {row.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: t.muted }}>
                    {PHASE_LABELS[row.phase] ?? "Active"}
                    {row.assetClass ? ` · ${row.assetClass}` : ""}
                  </p>
                </div>

                <span
                  className="text-[13px] font-semibold flex-shrink-0 tabular-nums"
                  style={{
                    color: value === null ? t.muted : isPositive ? t.success : t.alert,
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
