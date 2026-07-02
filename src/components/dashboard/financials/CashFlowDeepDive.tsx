"use client";

import React, { useMemo, useState } from "react";
import { usePortfolioMetricSnapshots } from "@/hooks/usePortfolioMetricSnapshots";

// Matches the dashboard-API threshold: sparkline.length < 2 → insufficientData
const MIN_SPARKLINE_POINTS = 2;

interface CashFlowDeepDiveProps {
  annualDebtService: number;
  monthlyPI: number;
  dscr: number;
  cashFlow: number;
}

interface SparkPoint {
  value: number;
  period: string;
  label: string;
}

interface TooltipState {
  pageX: number;
  pageY: number;
  text: string;
}

export default function CashFlowDeepDive({
  annualDebtService,
  monthlyPI,
  dscr,
  cashFlow,
}: CashFlowDeepDiveProps) {
  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  // ── Real snapshot data ────────────────────────────────────────────
  const { snapshots } = usePortfolioMetricSnapshots("monthly");

  const series: SparkPoint[] = useMemo(() => {
    return [...snapshots]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((s) => ({
        value: s.monthlyCashFlow ?? 0,
        period: s.period,
        label: s.date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
      }));
  }, [snapshots]);

  const isCollecting = series.length < MIN_SPARKLINE_POINTS;

  // ── Sparkline geometry ────────────────────────────────────────────
  const VW = 100;
  const VH = 40;
  const PAD = 4; // vertical padding so dots don't clip

  const points = useMemo(() => {
    if (isCollecting) return [];
    const vals = series.map((s) => s.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    return series.map((s, i) => ({
      ...s,
      x:
        series.length > 1 ? (i / (series.length - 1)) * VW : VW / 2,
      y: VH - PAD - ((s.value - minV) / range) * (VH - PAD * 2),
    }));
  }, [series, isCollecting]);

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `M0,${VH} L${points.map((p) => `${p.x},${p.y}`).join(" L")} L${VW},${VH} Z`
      : "";

  // ── Tooltip ───────────────────────────────────────────────────────
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  return (
    <section
      className="glass-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-center h-full"
      style={{
        background: "rgba(13, 10, 11, 0.6)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="space-y-8">
        {/* ── DSCR header ── */}
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">
              DSCR
            </span>
            <span
              className={`text-3xl font-mono font-bold tabular-nums ${
                dscr >= 1.25
                  ? "text-primary"
                  : dscr >= 1.0
                  ? "text-amber-500"
                  : "text-error"
              }`}
            >
              {dscr.toFixed(2)}x
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">
              Status
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                dscr >= 1.25
                  ? "bg-primary/20 text-primary"
                  : dscr >= 1.0
                  ? "bg-amber-500/20 text-amber-500"
                  : "bg-error/20 text-error"
              }`}
            >
              {dscr >= 1.25 ? "Strong" : dscr >= 1.0 ? "Marginal" : "Danger"}
            </span>
          </div>
        </div>

        {/* ── Debt figures ── */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Annual Debt Service</span>
            <span className="font-mono tabular-nums text-on-surface">
              {formatCur(annualDebtService)}/yr
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Monthly P&I</span>
            <span className="font-mono tabular-nums text-on-surface">
              {formatCur(monthlyPI)}/mo
            </span>
          </div>
        </div>

        {/* ── Cash Flow Trend sparkline ── */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase text-on-surface-variant font-bold">
              Cash Flow Trend
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                cashFlow > 0 ? "text-primary" : "text-error"
              }`}
            >
              {formatCur(cashFlow / 12)}/mo
            </span>
          </div>

          <div className="h-16 w-full relative overflow-hidden rounded">
            {isCollecting ? (
              /* Honest empty state — fewer than MIN_SPARKLINE_POINTS real periods */
              <div className="h-full flex flex-col items-center justify-center gap-1.5">
                <svg
                  width="100%"
                  height="16"
                  preserveAspectRatio="none"
                  className="opacity-20"
                >
                  <line
                    x1="0"
                    y1="8"
                    x2="100%"
                    y2="8"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                </svg>
                <span className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest select-none">
                  Collecting data
                </span>
              </div>
            ) : (
              /* Real sparkline driven by portfolio metric snapshots */
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
                <svg
                  className="absolute bottom-0 w-full h-full"
                  preserveAspectRatio="none"
                  viewBox={`0 0 ${VW} ${VH}`}
                >
                  {/* Area fill */}
                  <path d={areaPath} fill="rgba(69, 73, 85, 0.18)" />

                  {/* Line */}
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="#454955"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data-point dots — each carries a native <title> for keyboard/a11y */}
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={3}
                      fill="#454955"
                      stroke="rgba(253,255,252,0.15)"
                      strokeWidth="1"
                      className="cursor-crosshair"
                      onMouseEnter={(e) => {
                        const pageX = typeof e.pageX === "number" && !isNaN(e.pageX) ? e.pageX : (e.clientX || 0);
                        const pageY = typeof e.pageY === "number" && !isNaN(e.pageY) ? e.pageY : (e.clientY || 0);
                        setTooltip({
                          pageX,
                          pageY,
                          text: `${p.label} · ${formatCur(p.value)}/mo`,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <title>{`${p.label}: ${formatCur(p.value)}/mo`}</title>
                    </circle>
                  ))}
                </svg>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating tooltip — rendered via portal-style fixed overlay */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded text-[10px] font-mono tabular-nums pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.pageX + 12,
            top: tooltip.pageY - 28,
            background: "rgba(18,16,20,0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fdfffc",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </section>
  );
}
