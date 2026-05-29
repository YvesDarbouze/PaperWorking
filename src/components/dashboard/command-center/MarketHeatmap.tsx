"use client";

import React from "react";

export function MarketHeatmap() {
  return (
    <div className="glass-card rounded-xl overflow-hidden relative group h-full min-h-[240px]">
      <div className="absolute top-5 left-5 z-10">
        <h3 className="font-label-md text-label-md text-white drop-shadow-md">
          Market Heatmap: Yield Density
        </h3>
        <p className="font-label-sm text-label-sm text-white/70 drop-shadow-md">
          Top 25 MSA focus areas
        </p>
      </div>

      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background/40 z-0 pointer-events-none" />

      {/* Action button overlay */}
      <div className="absolute bottom-5 right-5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button className="bg-surface-container-high/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer">
          <span 
            className="material-symbols-outlined" 
            style={{ fontSize: "16px" }}
          >
            open_in_full
          </span>{" "}
          Expand Map
        </button>
      </div>

      {/* Map Image */}
      <img
        alt="Dark mode interactive market heatmap"
        className="w-full h-full object-cover grayscale opacity-60 mix-blend-screen"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuClV_E6kC-cxfEdL_aYoXwCGX0IXfvER9Khxz-UKXSIHqr2mLLBRjKNiuMqMgKzLkNfCmpsvNWZdIn37Mk7SLtzkx7LnKmky-lKkmKyZaC7mLeMzCefffGLrk_IRcaUZf8VK6_D4pIrIOEcz6bNIJJtZ84D7U1PHyW4ss61PY4-T3evmJ4ByFikCKQOyzz68ADjB8VsV9ycLjgYo_RFRpegliIJtIsNjWSoEgpEFPCibyAI9-5QkJearDQDtgbA2cwBIsefGkyjw1nb"
        style={{
          filter: "sepia(100%) hue-rotate(140deg) saturate(300%) contrast(150%) brightness(50%)",
        }}
      />
    </div>
  );
}
