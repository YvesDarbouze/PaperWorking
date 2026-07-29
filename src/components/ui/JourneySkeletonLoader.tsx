"use client";

import React from "react";
import { useTheme } from "@/lib/utils/ThemeProvider";

interface JourneySkeletonLoaderProps {
  rows?: number;
  type?: "card" | "table" | "grid";
  className?: string;
}

export function JourneySkeletonLoader({
  rows = 3,
  type = "card",
  className = "",
}: JourneySkeletonLoaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const skeletonBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.08)";

  return (
    <div
      data-testid="journey-skeleton-loader"
      className={`w-full p-6 rounded-2xl border border-solid animate-pulse ${className}`}
      style={{
        background: isDark ? "rgba(18,16,20,0.6)" : "#FFFFFF",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.08)",
      }}
    >
      <div className="h-6 w-1/3 rounded-lg mb-6" style={{ background: skeletonBg }} />

      {type === "table" ? (
        <div className="space-y-3">
          <div className="h-8 w-full rounded-md" style={{ background: skeletonBg }} />
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded-md" style={{ background: skeletonBg }} />
          ))}
        </div>
      ) : type === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl" style={{ background: skeletonBg }} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-xl" style={{ background: skeletonBg }} />
          ))}
        </div>
      )}
    </div>
  );
}
