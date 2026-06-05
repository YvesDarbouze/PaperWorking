"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * EquityPerformanceChart — Recharts AreaChart
 *
 * Displays portfolio equity over 12 months with a teal gradient fill.
 * Uses Recharts for proper charting with tooltips and responsive sizing.
 * Demo data: ascending equity curve from $250K to $320K.
 */

const EQUITY_DATA = [
  { month: "Jun", equity: 250000 },
  { month: "Jul", equity: 255000 },
  { month: "Aug", equity: 261000 },
  { month: "Sep", equity: 258000 },
  { month: "Oct", equity: 267000 },
  { month: "Nov", equity: 274000 },
  { month: "Dec", equity: 278000 },
  { month: "Jan", equity: 285000 },
  { month: "Feb", equity: 290000 },
  { month: "Mar", equity: 298000 },
  { month: "Apr", equity: 310000 },
  { month: "May", equity: 320000 },
];

const formatDollar = (value: number): string => {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-xl"
      style={{
        backgroundColor: "rgba(15,20,25,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      <p
        className="text-sm font-bold"
        style={{ color: "rgba(218,228,236,0.95)" }}
      >
        ${payload[0].value.toLocaleString()}
      </p>
      <p
        className="text-[10px] font-mono"
        style={{ color: "rgba(218,228,236,0.5)" }}
      >
        {label} · Portfolio Equity
      </p>
    </div>
  );
}

export function EquityPerformanceChart() {
  // Calculate growth
  const startVal = EQUITY_DATA[0].equity;
  const endVal = EQUITY_DATA[EQUITY_DATA.length - 1].equity;
  const growthPercent = ((endVal - startVal) / startVal * 100).toFixed(1);

  return (
    <div
      className="rounded-2xl p-5 md:p-6 h-full flex flex-col"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3
            className="text-lg font-semibold tracking-tight"
            style={{ color: "rgba(218,228,236,0.9)" }}
          >
            Equity Growth
          </h3>
          <p
            className="text-xs mt-0.5"
            style={{ color: "rgba(218,228,236,0.4)" }}
          >
            12-month portfolio performance
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="material-symbols-outlined text-sm"
            style={{ color: "#20B2AA" }}
          >
            arrow_upward
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: "#20B2AA" }}
          >
            +{growthPercent}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={EQUITY_DATA}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(32, 178, 170,0.25)" />
                <stop offset="100%" stopColor="rgba(32, 178, 170,0)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(218,228,236,0.3)",
                fontSize: 10,
                fontFamily: "monospace",
              }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "rgba(218,228,236,0.3)",
                fontSize: 10,
                fontFamily: "monospace",
              }}
              tickFormatter={formatDollar}
              dx={-4}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "rgba(32, 178, 170,0.3)",
                strokeDasharray: "3 3",
              }}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#20B2AA"
              strokeWidth={2.5}
              fill="url(#equityGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#20B2AA",
                stroke: "rgba(15,20,25,0.8)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
