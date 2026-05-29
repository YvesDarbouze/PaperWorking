"use client";

import React from "react";

export function KPIDashStrip() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-desktop">
      {/* KPI Card 1: Target IRR */}
      <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50"></div>
        <div className="flex justify-between items-start mb-4">
          <span className="font-label-md text-label-md text-on-surface-variant">Target IRR</span>
          <span className="material-symbols-outlined text-primary text-xl">trending_up</span>
        </div>
        <div>
          <div className="font-headline-xl text-headline-xl text-on-surface flex items-baseline">
            <span>24.8</span>
            <span className="text-primary text-2xl ml-1 font-semibold">%</span>
          </div>
          <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
              <span>2.1%</span>
            </span>
            <span className="text-on-surface-variant">vs last quarter</span>
          </div>
        </div>
      </div>

      {/* KPI Card 2: Equity Multiple */}
      <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-transparent opacity-50"></div>
        <div className="flex justify-between items-start mb-4">
          <span className="font-label-md text-label-md text-on-surface-variant">Equity Multiple</span>
          <span className="material-symbols-outlined text-secondary text-xl">layers</span>
        </div>
        <div>
          <div className="font-headline-xl text-headline-xl text-on-surface">2.1x</div>
          <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm">
            <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">
              On Track
            </span>
            <span className="text-on-surface-variant">Projected 2.5x</span>
          </div>
        </div>
      </div>

      {/* KPI Card 3: Realized Profit */}
      <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tertiary-container to-transparent opacity-50"></div>
        <div className="flex justify-between items-start mb-4">
          <span className="font-label-md text-label-md text-on-surface-variant">Realized Profit</span>
          <span className="material-symbols-outlined text-tertiary-container text-xl">account_balance_wallet</span>
        </div>
        <div>
          <div className="font-headline-xl text-headline-xl text-on-surface flex items-baseline">
            <span className="text-on-surface-variant text-2xl mr-1 font-semibold">$</span>
            <span>14.2</span>
            <span className="text-on-surface-variant text-2xl ml-1 font-semibold">M</span>
          </div>
          <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm">
            <span className="bg-tertiary-container/10 text-tertiary-container px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
              <span>8.4%</span>
            </span>
            <span className="text-on-surface-variant">YTD Growth</span>
          </div>
        </div>
      </div>
    </div>
  );
}

