"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTheme } from "@/lib/utils/ThemeProvider";

interface ApiErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isDark?: boolean;
  className?: string;
}

export function ApiErrorCard({
  title = "Unable to load data",
  message = "A network or server error occurred while retrieving this content. Please check your connection and try again.",
  onRetry,
  isDark: isDarkProp,
  className = "",
}: ApiErrorCardProps) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === "dark";

  return (
    <div
      data-testid="api-error-card"
      className={`w-full p-5 rounded-2xl border border-solid flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${className}`}
      style={{
        background: isDark ? "rgba(240,101,67,0.08)" : "rgba(240,101,67,0.05)",
        borderColor: isDark ? "rgba(240,101,67,0.25)" : "rgba(240,101,67,0.3)",
      }}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "rgba(240,101,67,0.15)", color: "#F06543" }}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <h4
            className="text-sm font-bold truncate mb-0.5"
            style={{ color: isDark ? "#FDFFFC" : "#121317" }}
          >
            {title}
          </h4>
          <p
            className="text-xs leading-relaxed"
            style={{ color: isDark ? "rgba(253,255,252,0.7)" : "rgba(69,73,85,0.8)" }}
          >
            {message}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          data-testid="retry-btn"
          onClick={onRetry}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer self-end sm:self-center"
          style={{
            background: "#F06543",
            color: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(240,101,67,0.25)",
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
}
