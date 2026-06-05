"use client";

import React from "react";
import Link from "next/link";

/**
 * KPIDashStrip — 10 REIL Metric KPI Cards
 *
 * Displays all 10 core REI metrics in a responsive grid.
 * Uses seed values as demo data for empty portfolios.
 * Each card is a glass surface with status zone indicators.
 */

interface KPIMetric {
  slug: string;
  label: string;
  value: string;
  icon: string;
  status: "healthy" | "watch" | "alert";
}

const SEED_METRICS: KPIMetric[] = [
  { slug: "noi", label: "NOI", value: "$12,486", icon: "account_balance", status: "healthy" },
  { slug: "cash-flow", label: "Cash Flow", value: "-$4,443/yr", icon: "payments", status: "alert" },
  { slug: "cap-rate", label: "Cap Rate", value: "4.5%", icon: "percent", status: "watch" },
  { slug: "coc-return", label: "CoC Return", value: "-7.41%", icon: "savings", status: "alert" },
  { slug: "grm", label: "GRM", value: "11.9x", icon: "calculate", status: "watch" },
  { slug: "dscr", label: "DSCR", value: "0.74x", icon: "shield", status: "alert" },
  { slug: "irr", label: "IRR", value: "-7.41%", icon: "trending_up", status: "alert" },
  { slug: "occupancy", label: "Occupancy", value: "93%", icon: "apartment", status: "healthy" },
  { slug: "oer", label: "OER", value: "39.6%", icon: "pie_chart", status: "healthy" },
  { slug: "appreciation", label: "Appreciation", value: "2.83%", icon: "show_chart", status: "healthy" },
];

const statusColors: Record<KPIMetric["status"], { bg: string; dot: string; label: string }> = {
  healthy: {
    bg: "rgba(63, 125, 32,0.1)",
    dot: "#3f7d20",
    label: "Healthy",
  },
  watch: {
    bg: "rgba(245,158,11,0.1)",
    dot: "#F59E0B",
    label: "Watch",
  },
  alert: {
    bg: "rgba(239,68,68,0.1)",
    dot: "#F06543",
    label: "Alert",
  },
};

export function KPIDashStrip() {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 min-w-[600px] md:min-w-0">
        {SEED_METRICS.map((metric) => {
          const status = statusColors[metric.status];
          return (
            <Link
              key={metric.slug}
              href={`/dashboard/intelligence/${metric.slug}`}
              className="group block"
            >
              <div
                className="rounded-xl p-4 md:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 cursor-pointer h-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 w-full h-[2px]"
                  style={{
                    background: `linear-gradient(to right, ${status.dot}, transparent)`,
                    opacity: 0.5,
                  }}
                />

                {/* Header row */}
                <div className="flex justify-between items-start mb-3">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(253,255,252,0.5)" }}
                  >
                    {metric.label}
                  </span>
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ color: "rgba(253,255,252,0.3)" }}
                  >
                    {metric.icon}
                  </span>
                </div>

                {/* Value */}
                <div
                  className="text-xl md:text-2xl font-bold tracking-tight mb-3"
                  style={{ color: "rgba(253,255,252,0.95)" }}
                >
                  {metric.value}
                </div>

                {/* Status zone badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full self-start"
                  style={{ backgroundColor: status.bg }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: status.dot }}
                  />
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: status.dot }}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
