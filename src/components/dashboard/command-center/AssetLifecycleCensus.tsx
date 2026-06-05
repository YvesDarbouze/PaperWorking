"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

/**
 * AssetLifecycleCensus — Recharts Donut Chart
 *
 * Shows project distribution across 4 REIL phases with a donut chart.
 * Center label shows total project count.
 * Phase colors: Acquisition=#3B82F6, Transaction=#20B2AA, Rehab=#F59E0B, Hold=#3f7d20
 */

interface PhaseData {
  name: string;
  value: number;
  color: string;
}

const PHASE_DATA: PhaseData[] = [
  { name: "Acquisition", value: 2, color: "#3B82F6" },
  { name: "Transaction", value: 1, color: "#20B2AA" },
  { name: "Rehab", value: 2, color: "#F59E0B" },
  { name: "Hold / Exit", value: 1, color: "#3f7d20" },
];

const TOTAL_PROJECTS = PHASE_DATA.reduce((sum, p) => sum + p.value, 0);

export function AssetLifecycleCensus() {
  return (
    <div
      className="rounded-2xl p-5 md:p-6 flex flex-col h-full"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <h3
        className="text-[10px] font-semibold uppercase tracking-widest mb-4"
        style={{ color: "rgba(218,228,236,0.4)" }}
      >
        Asset Lifecycle
      </h3>

      {/* Donut Chart */}
      <div className="flex-1 flex items-center justify-center relative min-h-[180px]">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={PHASE_DATA}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {PHASE_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-3xl font-bold"
            style={{ color: "rgba(218,228,236,0.95)" }}
          >
            {TOTAL_PROJECTS}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "rgba(218,228,236,0.4)" }}
          >
            Projects
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
        {PHASE_DATA.map((phase) => (
          <div key={phase.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: phase.color }}
            />
            <span
              className="text-[11px] truncate"
              style={{ color: "rgba(218,228,236,0.5)" }}
            >
              {phase.name}
            </span>
            <span
              className="text-[11px] font-mono font-bold ml-auto flex-shrink-0"
              style={{ color: phase.color }}
            >
              {String(phase.value).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
