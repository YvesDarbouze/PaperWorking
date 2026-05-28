"use client";

import React, { useState } from "react";

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("Y");
  const [filterType, setFilterType] = useState("Property");

  const metrics = [
    { label: "NOI", value: "$42.8k", color: "primary", sparkline: [1, 2, 3, 4] },
    { label: "Cash Flow", value: "$12.1k", color: "primary", sparkline: [1] },
    { label: "Cap Rate", value: "6.4%", color: "primary", border: true },
    { label: "CoC", value: "8.2%", color: "error", border: true },
    { label: "GRM", value: "12.5", color: "primary", border: true },
    { label: "DSCR", value: "1.45", color: "primary", border: true },
    { label: "IRR", value: "18.2%", color: "primary", border: true },
    { label: "Occupancy", value: "94%", color: "error", border: true },
    { label: "Exp Ratio", value: "32%", color: "primary", border: true },
    { label: "Appreciation", value: "5.2%", color: "primary", border: true },
    { label: "Cap Raised", value: "$2.4M", color: "primary", border: true },
  ];

  return (
    <div className="pt-4 px-gutter-mobile md:px-gutter-desktop space-y-6 max-w-container-max mx-auto">
      {/* Control Row & Quick Actions */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 glass-card p-1 rounded-lg flex items-center h-10">
              <button
                className={`flex-1 h-full rounded-md font-label-md text-label-md ${
                  filterType === "Property" ? "bg-primary text-on-primary font-bold" : "text-on-surface-variant"
                }`}
                onClick={() => setFilterType("Property")}
              >
                Property
              </button>
              <button
                className={`flex-1 h-full rounded-md font-label-md text-label-md ${
                  filterType === "My Share" ? "bg-primary text-on-primary font-bold" : "text-on-surface-variant"
                }`}
                onClick={() => setFilterType("My Share")}
              >
                My Share
              </button>
            </div>
            <div className="flex-1 glass-card p-1 rounded-lg flex items-center h-10 overflow-hidden">
              {["M", "Q", "Y", "ALL"].map((range) => (
                <button
                  key={range}
                  className={`flex-1 h-full ${
                    timeRange === range
                      ? "rounded-md bg-white/10 text-primary font-bold text-[10px]"
                      : "font-label-sm text-[10px] text-on-surface-variant"
                  }`}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="h-10 glass-card rounded-lg flex items-center justify-center gap-2 text-primary active:scale-95 transition-transform text-[11px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm" data-icon="add_circle">
                add_circle
              </span>
              Create
            </button>
            <button className="h-10 glass-card rounded-lg flex items-center justify-center gap-2 text-primary active:scale-95 transition-transform text-[11px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm" data-icon="sell">
                sell
              </span>
              Post Deal
            </button>
            <button className="h-10 glass-card rounded-lg flex items-center justify-center gap-2 text-primary active:scale-95 transition-transform text-[11px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm" data-icon="person_search">
                person_search
              </span>
              Vendor
            </button>
          </div>
        </div>
      </section>

      {/* Metric Strip (Horizontal Grid/Scroll) */}
      <section className="overflow-x-auto hide-scrollbar -mx-gutter-mobile px-gutter-mobile md:-mx-0 md:px-0">
        <div className="flex gap-3 w-max">
          {metrics.map((metric, i) => (
            <div
              key={i}
              className={`w-32 glass-card p-3 rounded-xl flex flex-col justify-between relative overflow-hidden border-b-2 ${
                metric.color === "error" ? "border-error/50" : "border-primary/50"
              }`}
            >
              <span className="font-label-sm text-[10px] text-on-surface-variant block mb-1">
                {metric.label}
              </span>
              <span
                className={`font-headline-md text-headline-md font-bold ${
                  metric.color === "error" ? "text-on-background" : "text-primary"
                }`}
              >
                {metric.value}
              </span>
              <div className="mt-2 h-4 w-full flex items-end gap-0.5 opacity-40">
                {metric.sparkline ? (
                  metric.sparkline.map((h, j) => (
                    <div
                      key={j}
                      className={`w-full ${
                        metric.color === "error" ? "bg-error" : "bg-primary"
                      }`}
                      style={{ height: `${h * 25}%` }}
                    />
                  ))
                ) : (
                  <div
                    className={`h-4 w-full rounded border ${
                      metric.color === "error"
                        ? "bg-error/10 border-error/20"
                        : "bg-primary/5 border-primary/20"
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Performance Chart */}
      <section className="glass-card p-5 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-widest text-[10px]">
            Portfolio Performance
          </h3>
          <span className="text-primary font-label-sm text-[11px] font-bold">+12.4% LY</span>
        </div>
        <div className="h-40 w-full relative">
          <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
            <defs>
              <linearGradient id="p-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: "rgba(45, 212, 191, 0.15)", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "rgba(45, 212, 191, 0)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <path
              d="M 0 120 Q 50 110, 80 80 T 150 70 T 220 90 T 300 40 T 400 20 L 400 150 L 0 150 Z"
              fill="url(#p-gradient)"
            />
            <path
              d="M 0 120 Q 50 110, 80 80 T 150 70 T 220 90 T 300 40 T 400 20"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="2.5"
            />
            <circle cx="300" cy="40" fill="#2dd4bf" r="3.5" />
            <circle className="animate-pulse" cx="400" cy="20" fill="#2dd4bf" r="3.5" />
          </svg>
          <div className="absolute bottom-0 left-0 w-full flex justify-between px-2 pt-2 border-t border-white/5 font-label-sm text-[9px] text-on-surface-variant font-mono">
            <span>01</span>
            <span>03</span>
            <span>05</span>
            <span>07</span>
            <span>09</span>
            <span>11</span>
          </div>
        </div>
      </section>

      {/* Pipeline Band */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="glass-card p-2 rounded-xl text-center border-l-[3px] border-primary">
          <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">
            Acquisition
          </span>
          <span className="block font-headline-md text-primary text-lg font-black leading-none mt-1">3</span>
          <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">$1.2M</span>
        </div>
        <div className="glass-card p-2 rounded-xl text-center border-l-[3px] border-secondary">
          <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">
            Purchase
          </span>
          <span className="block font-headline-md text-secondary text-lg font-black leading-none mt-1">1</span>
          <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">$840k</span>
        </div>
        <div className="glass-card p-2 rounded-xl text-center border-l-[3px] border-on-surface-variant">
          <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">
            Hold
          </span>
          <span className="block font-headline-md text-on-surface text-lg font-black leading-none mt-1">14</span>
          <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">$12.4M</span>
        </div>
        <div className="glass-card p-2 rounded-xl text-center border-l-[3px] border-error">
          <span className="block font-label-sm text-[9px] text-on-surface-variant uppercase tracking-tighter">
            Exit/Rent
          </span>
          <span className="block font-headline-md text-error text-lg font-black leading-none mt-1">2</span>
          <span className="block font-label-sm text-[9px] text-on-surface-variant mt-0.5">$950k</span>
        </div>
      </section>

      {/* Property Folders */}
      <section className="space-y-3">
        <h3 className="font-label-md text-label-md text-on-surface flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
          <img
            alt="Logo"
            className="w-4 h-4"
            src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
          />
          Active Portfolios
        </h3>
        <div className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-11 h-11 shrink-0 rounded-lg bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined" data-icon="home_work">
              home_work
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-label-md text-body-sm truncate text-on-surface font-bold">
                1248 Oakwood Ave
              </h4>
              <span className="px-2 py-0.5 rounded-sm bg-primary/10 text-primary text-[9px] font-black border border-primary/20">
                FLIP
              </span>
            </div>
            <div className="flex items-center gap-3 font-label-sm text-[10px] text-on-surface-variant mb-2">
              <span>Equity: 85%</span>
              <span>•</span>
              <span>Renovation</span>
            </div>
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary luminous-glow" style={{ width: "72%" }}></div>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-xl">
            chevron_right
          </span>
        </div>
        <div className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-11 h-11 shrink-0 rounded-lg bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined" data-icon="apartment">
              apartment
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-label-md text-body-sm truncate text-on-surface font-bold">
                92 Skyline Tower
              </h4>
              <span className="px-2 py-0.5 rounded-sm bg-white/5 text-on-surface-variant text-[9px] font-black border border-white/10 uppercase">
                Rental
              </span>
            </div>
            <div className="flex items-center gap-3 font-label-sm text-[10px] text-on-surface-variant mb-2">
              <span>Equity: 42%</span>
              <span>•</span>
              <span>Stabilized</span>
            </div>
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-on-surface-variant" style={{ width: "100%" }}></div>
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-xl">
            chevron_right
          </span>
        </div>
      </section>

      {/* Activity Feed */}
      <section className="space-y-3 pb-8">
        <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest text-[10px] font-bold">
          Audit Log
        </h3>
        <div className="space-y-3 px-1">
          <div className="flex items-start gap-4">
            <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0"></div>
            <div className="min-w-0 border-l border-white/5 pl-4 pb-2">
              <p className="font-body-sm text-[13px] text-on-surface">
                <span className="text-primary font-bold">Sarah M.</span> updated docs for{" "}
                <span className="underline underline-offset-2 decoration-white/10">123 Skyline</span>
              </p>
              <p className="font-label-sm text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">
                02:44 PM
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-1 h-1 rounded-full bg-secondary mt-2 shrink-0"></div>
            <div className="min-w-0 border-l border-white/5 pl-4 pb-2">
              <p className="font-body-sm text-[13px] text-on-surface">
                <span className="text-secondary font-bold">System</span> auto-cleared escrow for{" "}
                <span className="underline underline-offset-2 decoration-white/10">Oakwood</span>
              </p>
              <p className="font-label-sm text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">
                10:12 AM
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
