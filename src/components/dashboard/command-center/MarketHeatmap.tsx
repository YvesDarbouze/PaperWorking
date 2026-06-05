"use client";

import React from "react";

/**
 * MarketHeatmap — MLS Data Feed Placeholder
 *
 * Displays a placeholder card with a subtle grid pattern background
 * and a CTA to connect MLS data feed. Maintains glass card aesthetic.
 */

export function MarketHeatmap() {
  return (
    <div
      className="rounded-2xl overflow-hidden relative h-full min-h-[280px] flex flex-col items-center justify-center"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Grid pattern background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Radial gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(32, 178, 170,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(32, 178, 170,0.08)" }}
        >
          <span
            className="material-symbols-outlined text-3xl"
            style={{ color: "rgba(32, 178, 170,0.6)" }}
          >
            map
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: "rgba(218,228,236,0.7)" }}
          >
            Market Heatmap
          </h3>
          <p
            className="text-xs max-w-[260px]"
            style={{ color: "rgba(218,228,236,0.35)" }}
          >
            Connect your MLS data feed to visualize yield density across your
            target markets.
          </p>
        </div>

        {/* CTA Button */}
        <button
          className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: "rgba(32, 178, 170,0.12)",
            color: "#20B2AA",
            border: "1px solid rgba(32, 178, 170,0.2)",
          }}
        >
          <span className="material-symbols-outlined text-base">
            add_link
          </span>
          Connect MLS Data Feed
        </button>

        {/* Subtle feature badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {["Yield Density", "Comp Analysis", "Trend Overlay"].map((feature) => (
            <span
              key={feature}
              className="text-[10px] px-2 py-1 rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "rgba(218,228,236,0.3)",
              }}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
