"use client";

import React from "react";
import { useTheme } from "@/lib/utils/ThemeProvider";

interface JourneyErrorCardProps {
  title?: string;
  description?: string;
  onRetry: () => void;
  className?: string;
}

export function JourneyErrorCard({
  title = "Unable to load data",
  description = "A temporary connection issue occurred while fetching details. Please retry.",
  onRetry,
  className = "",
}: JourneyErrorCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      data-testid="journey-error-card"
      className={`w-full p-6 rounded-2xl border border-solid flex flex-col items-center justify-center text-center ${className}`}
      style={{
        background: isDark ? "rgba(240,101,67,0.06)" : "rgba(240,101,67,0.04)",
        borderColor: "rgba(240,101,67,0.2)",
      }}
    >
      <span className="material-symbols-outlined text-3xl mb-2 text-[#F06543]">
        warning
      </span>

      <h3 className="text-sm font-bold mb-1" style={{ color: "var(--color-on-surface)" }}>
        {title}
      </h3>

      <p className="text-xs max-w-md opacity-70 mb-4 leading-relaxed">
        {description}
      </p>

      <button
        id="retry-fetch-btn"
        data-testid="retry-fetch-btn"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm flex items-center gap-2"
        style={{ background: "#627C85" }}
      >
        <span className="material-symbols-outlined text-[16px]">refresh</span>
        Retry Request
      </button>
    </div>
  );
}
