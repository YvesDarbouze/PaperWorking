"use client";

import React from "react";

/**
 * TerminalAuditFeed — Activity Feed
 *
 * Displays 6 recent activity items with icons, actor names,
 * action descriptions, and relative timestamps.
 * Glass card with custom scrollbar styling.
 */

interface FeedItem {
  id: string;
  icon: string;
  iconColor: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

const DEMO_FEED: FeedItem[] = [
  {
    id: "f1",
    icon: "swap_horiz",
    iconColor: "#3B82F6",
    actor: "System",
    action: "Phase transition",
    target: "Skyline Lofts → Transaction",
    timestamp: "12m ago",
  },
  {
    id: "f2",
    icon: "upload_file",
    iconColor: "#8B5CF6",
    actor: "Yves D.",
    action: "Document uploaded",
    target: "Appraisal Report — Vertex Center",
    timestamp: "2h ago",
  },
  {
    id: "f3",
    icon: "person_add",
    iconColor: "#10B981",
    actor: "Yves D.",
    action: "Team member added",
    target: "Sarah Chen (Inspector)",
    timestamp: "4h ago",
  },
  {
    id: "f4",
    icon: "analytics",
    iconColor: "#2dd4bf",
    actor: "REIL Engine",
    action: "Metric updated",
    target: "Portfolio NOI recalculated",
    timestamp: "6h ago",
  },
  {
    id: "f5",
    icon: "gavel",
    iconColor: "#F59E0B",
    actor: "System",
    action: "Offer submitted",
    target: "Cedar Park Duplex — $265,000",
    timestamp: "1d ago",
  },
  {
    id: "f6",
    icon: "verified",
    iconColor: "#10B981",
    actor: "Marcus W.",
    action: "Inspection cleared",
    target: "The Foundry Bloc — Electrical",
    timestamp: "2d ago",
  },
];

export function TerminalAuditFeed() {
  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex justify-between items-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="material-symbols-outlined text-base"
            style={{ color: "#2dd4bf" }}
          >
            notifications_active
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "rgba(218,228,236,0.5)" }}
          >
            Activity
          </span>
        </div>
        <span
          className="text-[10px] font-mono"
          style={{ color: "rgba(218,228,236,0.25)" }}
        >
          {DEMO_FEED.length} events
        </span>
      </div>

      {/* Feed Items */}
      <div
        className="flex-1 overflow-y-auto px-4 py-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.08) transparent",
        }}
      >
        {DEMO_FEED.map((item, index) => (
          <div
            key={item.id}
            className="flex gap-3 py-3"
            style={{
              borderBottom:
                index < DEMO_FEED.length - 1
                  ? "1px solid rgba(255,255,255,0.04)"
                  : "none",
            }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${item.iconColor}15` }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px", color: item.iconColor }}
              >
                {item.icon}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "rgba(218,228,236,0.8)" }}
                >
                  {item.actor}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "rgba(218,228,236,0.4)" }}
                >
                  {item.action}
                </span>
              </div>
              <p
                className="text-[11px] truncate mt-0.5"
                style={{ color: "rgba(218,228,236,0.35)" }}
              >
                {item.target}
              </p>
            </div>

            {/* Timestamp */}
            <span
              className="text-[10px] font-mono flex-shrink-0 pt-0.5"
              style={{ color: "rgba(218,228,236,0.25)" }}
            >
              {item.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
