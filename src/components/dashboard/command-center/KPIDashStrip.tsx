"use client";

import React from "react";

export function KPIDashStrip() {
  const kpis = [
    {
      label: "Total NOI",
      value: "$1.24M",
      trend: "+12.4%",
      trendUp: true,
      icon: "analytics",
    },
    {
      label: "Avg. Cap Rate",
      value: "5.82%",
      trend: "-0.2bps",
      trendUp: false,
      icon: "show_chart",
    },
    {
      label: "Active Deals",
      value: "14 Units",
      trend: "Stable",
      trendUp: true,
      icon: "dynamic_feed",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-desktop">
      {kpis.map((kpi, index) => (
        <div key={index} className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary luminous-glow"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-outline-variant font-label-sm text-label-sm uppercase tracking-widest">
              {kpi.label}
            </span>
            <span className="material-symbols-outlined text-primary opacity-50">
              {kpi.icon}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface">
              {kpi.value}
            </span>
            <span className="text-primary font-mono text-xs">{kpi.trend}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
