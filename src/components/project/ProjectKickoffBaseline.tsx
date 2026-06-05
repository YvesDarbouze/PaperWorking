"use client";

import React, { useRef } from "react";

export default function ProjectKickoffBaseline() {
  const ctaRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctaRef.current.style.setProperty("--glow-x", `${x}px`);
    ctaRef.current.style.setProperty("--glow-y", `${y}px`);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center p-6 lg:p-12 dark">
      <main className="w-full max-w-[1280px] flex-1 flex flex-col border border-white/5 rounded-3xl overflow-hidden bg-[#0d0a0b] relative shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-tertiary"></div>
        <div className="p-8 lg:p-12 flex-1 flex flex-col h-full z-10">
          <div className="mb-12">
            <h1 className="text-[40px] leading-tight font-semibold text-white tracking-tight mb-4">Baseline Calibration</h1>
            <p className="text-on-surface-variant text-[16px] max-w-2xl">
              Initialize the core financial parameters for Project Obsidian. This baseline will calibrate the underwriting engine and automated NOI forecasts.
            </p>
          </div>

          {/* Balanced Grid Layout: 4 Critical Bridging Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Target Closing Date */}
            <div className="bg-gradient-to-br from-[#1e1b20]/70 to-[#0d0a0b]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col justify-between group hover:bg-white/5 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(69,73,85,0.2)]">
              <div className="space-y-1 mb-6">
                <span className="text-primary text-[12px] uppercase tracking-widest font-semibold block">Closing Window</span>
                <h3 className="text-[24px] font-semibold text-white">Target Closing Date</h3>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Q4 2024"
                  className="w-full bg-[#161318] border border-outline-variant focus:border-primary rounded-lg px-4 py-3 outline-none transition-all text-on-surface placeholder:text-on-surface-variant/40"
                />
                <span className="material-symbols-outlined absolute right-3 top-3.5 text-on-surface-variant">calendar_today</span>
              </div>
            </div>

            {/* Estimated Purchase Price */}
            <div className="bg-gradient-to-br from-[#1e1b20]/70 to-[#0d0a0b]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col justify-between group hover:bg-white/5 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(69,73,85,0.2)]">
              <div className="space-y-1 mb-6">
                <span className="text-primary text-[12px] uppercase tracking-widest font-semibold block">Valuation</span>
                <h3 className="text-[24px] font-semibold text-white">Est. Purchase Price</h3>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="$0.00"
                  className="w-full bg-[#161318] border border-outline-variant focus:border-primary rounded-lg px-4 py-3 outline-none transition-all text-on-surface placeholder:text-on-surface-variant/40"
                />
                <span className="material-symbols-outlined absolute right-3 top-3.5 text-on-surface-variant">payments</span>
              </div>
            </div>

            {/* Initial Capital Ready to Deploy */}
            <div className="bg-gradient-to-br from-[#1e1b20]/70 to-[#0d0a0b]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col justify-between group hover:bg-white/5 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(69,73,85,0.2)]">
              <div className="space-y-1 mb-6">
                <span className="text-primary text-[12px] uppercase tracking-widest font-semibold block">Liquidity</span>
                <h3 className="text-[24px] font-semibold text-white">Initial Capital</h3>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="$0.00"
                  className="w-full bg-[#161318] border border-outline-variant focus:border-primary rounded-lg px-4 py-3 outline-none transition-all text-on-surface placeholder:text-on-surface-variant/40"
                />
                <span className="material-symbols-outlined absolute right-3 top-3.5 text-on-surface-variant">account_balance_wallet</span>
              </div>
            </div>

            {/* Target Hold Period */}
            <div className="bg-gradient-to-br from-[#1e1b20]/70 to-[#0d0a0b]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col justify-between group hover:bg-white/5 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(69,73,85,0.2)]">
              <div className="space-y-1 mb-6">
                <span className="text-primary text-[12px] uppercase tracking-widest font-semibold block">Strategy</span>
                <h3 className="text-[24px] font-semibold text-white">Target Hold Period</h3>
              </div>
              <div className="relative">
                <select className="w-full bg-[#161318] border border-outline-variant focus:border-primary rounded-lg px-4 py-3 outline-none transition-all text-on-surface appearance-none">
                  <option>5 Years</option>
                  <option>7 Years</option>
                  <option>10 Years</option>
                  <option>Perpetual</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3.5 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>

          {/* Bento Preview Section */}
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
            <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-[#1e1b20]/70 to-[#0d0a0b]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden relative group">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA00unDZFTq2JpuoiaM7ivfODQhL-KVJWUl-RdU5t4GUvKqSkBp1xY2Y827X0aF6Gcr3l-syfQ7L1Bq7iUK-jsPOQrCfgx3uF-ojGta8ySGmOX07n7TrOMTzN9aeZrRe6sFRSgANKXOpRRUA7j70XzYQGPejr_7W9ePmCs51_UTTlowKFEC-T9i9QIq-3Tng39F_wtnPSj5SWn6NUWS3N3PInT9I1KUqjc3oac6NC2PDj9oVCUBL0DA1SdBAbRrYDXo_a6juf0VyJTr"
                alt="Metropolitan development"
                className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a0b] via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[12px] font-semibold border border-primary/30">LOCKED ASSET</span>
                  <span className="text-on-surface-variant text-[12px] font-semibold">ID: PRJ-8821-OBS</span>
                </div>
                <h4 className="text-[24px] font-semibold text-white">Project Obsidian: Mixed-Use Terminal</h4>
                <p className="text-on-surface-variant text-[16px] max-w-md">
                  Institutional underwriting ready for debt-stack optimization and secondary market readiness analysis.
                </p>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              <div className="bg-gradient-to-br from-[#1e1b20]/70 to-[#0d0a0b]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex-1 flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#7A9EAA]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#7A9EAA] text-3xl">insights</span>
                </div>
                <div>
                  <h4 className="text-[20px] font-semibold text-on-surface">Market Pulse</h4>
                  <p className="text-on-surface-variant text-[14px] mt-1">Local cap rates are trending at 4.2% for comparable assets.</p>
                </div>
                <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-2/3 shadow-[0_0_8px_rgba(69,73,85,0.5)]"></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1e1b20]/70 to-[#0d0a0b]/80 backdrop-blur-xl border border-primary/20 p-6 rounded-xl flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[14px] font-semibold text-primary">Next Step</span>
                  <span className="material-symbols-outlined text-primary/40">arrow_forward_ios</span>
                </div>
                <div className="space-y-4">
                  <h2 className="text-[24px] font-semibold text-on-surface leading-tight">Enter Workspace &amp; Setup NOI</h2>
                  <button
                    ref={ctaRef}
                    onMouseMove={handleMouseMove}
                    className="w-full py-4 bg-primary text-[#454955] text-[14px] font-semibold rounded-lg shadow-[0_0_20px_-5px_rgba(69, 73, 85,0.5)] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden relative"
                  >
                    BEGIN UNDERWRITING
                    <span className="material-symbols-outlined">rocket_launch</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
