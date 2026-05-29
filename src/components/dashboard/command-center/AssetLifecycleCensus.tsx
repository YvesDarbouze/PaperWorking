"use client";

import React from "react";

export function AssetLifecycleCensus() {
  const phases = [
    { label: "Acquire", count: "04", width: "30%", color: "bg-primary/40" },
    { label: "Purchase", count: "02", width: "15%", color: "bg-primary/60" },
    { label: "Hold", count: "07", width: "50%", color: "bg-primary" },
    { label: "Exit", count: "01", width: "5%", color: "bg-white/20" },
  ];

  return (
    <div className="glass-card p-margin-mobile rounded-2xl flex flex-col h-full">
      <h3 className="font-label-md text-label-md text-outline-variant uppercase tracking-widest mb-6">
        Asset Lifecycle
      </h3>
      <div className="space-y-4 flex-1 flex flex-col justify-center">
        {phases.map((phase, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between font-label-sm text-label-sm text-on-surface">
              <span>{phase.label}</span>
              <span className="font-mono text-primary">{phase.count}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${phase.color}`} 
                style={{ width: phase.width }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
