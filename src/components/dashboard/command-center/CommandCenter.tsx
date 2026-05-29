"use client";

import React from "react";
import { KPIDashStrip } from "./KPIDashStrip";
import { EquityPerformanceChart } from "./EquityPerformanceChart";
import { AssetLifecycleCensus } from "./AssetLifecycleCensus";
import { PortfolioClustersGrid } from "./PortfolioClustersGrid";
import { TerminalAuditFeed } from "./TerminalAuditFeed";

export function CommandCenter() {
  return (
    <div className="p-margin-desktop space-y-stack-lg max-w-container-max mx-auto dark">
      {/* KPI Strip */}
      <KPIDashStrip />

      {/* Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter-desktop">
        <div className="lg:col-span-2">
          <EquityPerformanceChart />
        </div>
        <div>
          <AssetLifecycleCensus />
        </div>
      </div>

      {/* Top Assets Grid */}
      <PortfolioClustersGrid />

      {/* Obsidian Terminal Activity Widget */}
      <TerminalAuditFeed />
      
      <div className="h-margin-desktop"></div>
      
      {/* FAB Interaction (Global Chat) */}
      <button className="fixed bottom-margin-desktop right-margin-desktop w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center luminous-glow shadow-2xl active:scale-90 transition-transform z-50">
        <span className="material-symbols-outlined text-2xl" data-weight="fill">chat_bubble</span>
      </button>
    </div>
  );
}
