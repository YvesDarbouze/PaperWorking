"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useProjectStore } from "@/store/projectStore";
import CommandCenterKPIStrip from "@/components/dashboard/home/CommandCenterKPIStrip";
import { EquityPerformanceChart } from "./EquityPerformanceChart";
import { AssetLifecycleCensus } from "./AssetLifecycleCensus";
import { ActivePipeline } from "./ActivePipeline";
import { TerminalAuditFeed } from "./TerminalAuditFeed";
import { MarketHeatmap } from "./MarketHeatmap";
import { RecentProjects } from "./RecentProjects";

/**
 * CommandCenter — Portfolio Command Center (Phase 2)
 * 
 * Orchestrator for the main dashboard view.
 * Greeting with user's first name, live data indicator,
 * and all sub-components laid out in a responsive grid.
 */
export function CommandCenter() {
  const { user, profile } = useAuth();
  const projects = useProjectStore(state => state.projects);

  // Extract first name from profile displayName or Firebase user
  const displayName = profile?.displayName || user?.displayName || "Investor";
  const firstName = displayName.split(" ")[0];

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Format current date nicely: "Friday, May 30, 2026"
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-margin-mobile md:p-margin-desktop space-y-stack-lg max-w-container-max mx-auto dark">
      {/* Header: Greeting + Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
        <div>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: "rgba(218,228,236,0.95)" }}
          >
            {greeting}, {firstName}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(218,228,236,0.5)" }}
          >
            {formattedDate}
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs font-medium" style={{ color: "rgba(218,228,236,0.5)" }}>
          <span
            className="relative flex h-2 w-2"
          >
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "#2dd4bf" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: "#2dd4bf" }}
            />
          </span>
          Live Data Feed
        </span>
      </div>

      {/* SECTION 1: Portfolio Performance KPIs */}
      <div className="space-y-stack-sm">
        <h2
          className="font-headline-md text-headline-md tracking-tight"
          style={{ color: "rgba(218,228,236,0.9)" }}
        >
          Portfolio Performance
        </h2>
        <CommandCenterKPIStrip projects={projects} scope="property" period="ALL" />
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

      {/* SECTION 3.5: Recent Projects */}
      <RecentProjects />

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
