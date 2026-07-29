"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "@/lib/utils/ThemeProvider";

interface JourneyProgressHeaderProps {
  projectId: string;
  currentPhase: number;
}

const PHASES = [
  { phase: 1, label: "Phase 1: Acquisition", sublabel: "Wizard & Intake", href: (id: string) => `/dashboard/projects/${id}` },
  { phase: 2, label: "Phase 2: Fund", sublabel: "Underwriting Workspace", href: (id: string) => `/dashboard/projects/${id}/underwriting` },
  { phase: 3, label: "Phase 3: Operations", sublabel: "Actuals & Variance", href: (id: string) => `/dashboard/projects/${id}/operations` },
  { phase: 4, label: "Phase 4: Exit", sublabel: "Hold-vs-Sell & Disposition", href: (id: string) => `/dashboard/projects/${id}/phase-4` },
];

export function JourneyProgressHeader({ projectId, currentPhase }: JourneyProgressHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      data-testid="journey-progress-header"
      className="w-full p-4 mb-6 rounded-2xl border border-solid shadow-sm transition-all"
      style={{
        background: isDark
          ? "linear-gradient(135deg, rgba(30,27,32,0.85) 0%, rgba(18,16,20,0.95) 100%)"
          : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.12)",
      }}
    >
      <div className="flex items-center justify-between overflow-x-auto custom-scrollbar gap-2 sm:gap-4 pb-1 sm:pb-0">
        {PHASES.map((p, idx) => {
          const isCompleted = p.phase < currentPhase;
          const isCurrent = p.phase === currentPhase;
          const isUpcoming = p.phase > currentPhase;

          const content = (
            <div
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                isCompleted ? "hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" : ""
              }`}
            >
              {/* Node indicator badge */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                  isCurrent ? "ring-2 ring-offset-1" : ""
                }`}
                style={{
                  background: isCompleted
                    ? "rgba(63, 125, 32, 0.15)"
                    : isCurrent
                    ? "#627C85"
                    : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(69,73,85,0.08)",
                  color: isCompleted
                    ? "#3f7d20"
                    : isCurrent
                    ? "#FFFFFF"
                    : isDark
                    ? "rgba(253,255,252,0.4)"
                    : "rgba(69,73,85,0.5)",
                }}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                ) : (
                  p.phase
                )}
              </div>

              {/* Node text */}
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-xs font-bold truncate ${
                    isCurrent ? "text-on-surface" : isCompleted ? "opacity-90" : "opacity-40"
                  }`}
                >
                  {p.label}
                </span>
                <span className="text-[10px] opacity-60 truncate hidden md:inline">
                  {p.sublabel}
                </span>
              </div>
            </div>
          );

          return (
            <React.Fragment key={p.phase}>
              {isCompleted ? (
                <Link href={p.href(projectId)} className="flex-1 min-w-[130px]">
                  {content}
                </Link>
              ) : (
                <div className="flex-1 min-w-[130px]">{content}</div>
              )}

              {/* Connecting line */}
              {idx < PHASES.length - 1 && (
                <div
                  className="hidden sm:block h-[2px] w-6 flex-shrink-0 rounded-full"
                  style={{
                    background: isCompleted
                      ? "#3f7d20"
                      : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(69,73,85,0.12)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
