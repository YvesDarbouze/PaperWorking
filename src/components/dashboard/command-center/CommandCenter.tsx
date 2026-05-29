"use client";

import React from "react";
import { KPIDashStrip } from "./KPIDashStrip";
import { EquityPerformanceChart } from "./EquityPerformanceChart";
import { AssetLifecycleCensus } from "./AssetLifecycleCensus";
import { ActivePipeline } from "./ActivePipeline";
import { TerminalAuditFeed } from "./TerminalAuditFeed";
import { MarketHeatmap } from "./MarketHeatmap";

export function CommandCenter() {
  return (
    <div className="p-margin-mobile md:p-margin-desktop space-y-stack-lg max-w-container-max mx-auto dark">
      {/* SECTION 1: Portfolio Performance KPIs */}
      <div className="space-y-stack-sm">
        <div className="flex justify-between items-end">
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Portfolio Performance
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Live Data feed
          </span>
        </div>
        <KPIDashStrip />
      </div>

      {/* SECTION 2: Chart & Asset Lifecycle Census */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter-desktop">
        <div className="lg:col-span-2">
          <EquityPerformanceChart />
        </div>
        <div>
          <AssetLifecycleCensus />
        </div>
      </div>

      {/* SECTION 3: Active Pipeline */}
      <ActivePipeline />

      {/* SECTION 4: Bottom Widgets (Activity & Heatmap) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter-desktop">
        <div className="lg:col-span-1">
          <TerminalAuditFeed />
        </div>
        <div className="lg:col-span-2">
          <MarketHeatmap />
        </div>
      </div>
      
      <div className="h-margin-desktop"></div>
      
      {/* FAB Interaction (Global Chat) */}
      <button className="fixed bottom-margin-desktop right-margin-desktop w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center luminous-glow shadow-2xl active:scale-90 transition-transform z-50 cursor-pointer">
        <span className="material-symbols-outlined text-2xl" data-weight="fill">chat_bubble</span>
      </button>
    </div>
  );
}

