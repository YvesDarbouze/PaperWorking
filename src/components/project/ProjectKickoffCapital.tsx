"use client";

import React, { useState, useEffect } from "react";

export default function ProjectKickoffCapital() {
  const [purchasePrice, setPurchasePrice] = useState("1,240,000");
  const [initialCapital, setInitialCapital] = useState("350,000");

  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    let value = e.target.value.replace(/,/g, "");
    if (!isNaN(Number(value)) && value.length > 0) {
      setter(parseFloat(value).toLocaleString("en-US"));
    } else if (value.length === 0) {
      setter("");
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const mesh = document.getElementById("bg-mesh");
      if (mesh) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        mesh.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b141a] dark relative overflow-hidden">
      {/* Background Decor */}
      <div id="bg-mesh" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#182127]/50 via-[#0b141a]/80 to-[#0b141a] transition-transform duration-300 ease-out"></div>
      
      <main className="w-full max-w-[1280px] z-10 px-6 md:px-12 py-24 flex flex-col items-center">
        {/* Hero Section */}
        <div className="w-full max-w-3xl text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(87,241,219,0.8)]"></span>
            <span className="text-[12px] uppercase tracking-widest text-primary font-semibold">Step 6 of 6</span>
            <span className="w-[1px] h-3 bg-white/20 mx-1"></span>
            <span className="text-[12px] text-on-surface-variant font-semibold">Workspace Unlocked</span>
          </div>
          <h1 className="text-[32px] md:text-[48px] font-bold leading-tight mb-4 text-white">
            Project Initialized. <br />
            <span className="text-primary/90">Let's establish your baseline.</span>
          </h1>
          <p className="text-[18px] text-on-surface-variant/80 max-w-xl mx-auto">
            Define the critical financial and timing parameters to generate your first net operating income (NOI) forecast.
          </p>
        </div>

        {/* The Bridge: 4-Field Input Grid */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Field 1: Closing Date */}
          <div className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-semibold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                Target Closing Date
              </label>
            </div>
            <div className="bg-[#141d23] rounded-lg px-4 py-3 flex items-center gap-3 border border-outline-variant/30 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(87,241,219,0.2)] transition-all">
              <input type="date" defaultValue="2024-11-15" className="bg-transparent border-none outline-none w-full font-mono text-primary p-0" />
            </div>
          </div>

          {/* Field 2: Purchase Price */}
          <div className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-semibold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Estimated Purchase Price
              </label>
            </div>
            <div className="bg-[#141d23] rounded-lg px-4 py-3 flex items-center gap-3 border border-outline-variant/30 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(87,241,219,0.2)] transition-all">
              <span className="text-on-surface-variant font-mono">$</span>
              <input
                type="text"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => handleNumericInput(e, setPurchasePrice)}
                className="bg-transparent border-none outline-none w-full font-mono text-primary p-0"
              />
            </div>
          </div>

          {/* Field 3: Initial Capital */}
          <div className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-semibold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                Initial Capital Ready to Deploy
              </label>
              <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Liquid Asset</span>
              </div>
            </div>
            <div className="bg-[#141d23] rounded-lg px-4 py-3 flex items-center gap-3 border border-outline-variant/30 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(87,241,219,0.2)] transition-all">
              <span className="text-on-surface-variant font-mono">$</span>
              <input
                type="text"
                placeholder="0.00"
                value={initialCapital}
                onChange={(e) => handleNumericInput(e, setInitialCapital)}
                className="bg-transparent border-none outline-none w-full font-mono text-primary p-0"
              />
            </div>
          </div>

          {/* Field 4: Hold Period */}
          <div className="bg-gradient-to-br from-[#182127]/70 to-[#0b141a]/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-semibold text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">timelapse</span>
                Target Hold Period
              </label>
              <span className="material-symbols-outlined text-on-surface-variant/40 text-[20px]">expand_more</span>
            </div>
            <div className="bg-[#141d23] rounded-lg px-4 py-3 flex items-center gap-3 border border-outline-variant/30 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_-5px_rgba(87,241,219,0.2)] transition-all">
              <select className="bg-transparent border-none outline-none w-full font-mono text-primary p-0 appearance-none">
                <option className="bg-[#141d23]" value="short">&lt; 6 Months</option>
                <option className="bg-[#141d23]" value="mid" selected>1-3 Years</option>
                <option className="bg-[#141d23]" value="long">5+ Years</option>
                <option className="bg-[#141d23]" value="forever">Forever</option>
              </select>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer className="fixed bottom-0 w-full z-50 bg-[#141d23]/90 backdrop-blur-2xl border-t border-white/5 shadow-[0_-8px_32px_0_rgba(0,0,0,0.8)] rounded-t-xl">
        <div className="flex justify-between items-center h-24 pb-4 px-6 md:px-12 max-w-[1280px] mx-auto">
          <div className="hidden sm:flex flex-col">
            <span className="text-[12px] text-on-surface-variant uppercase tracking-wider font-semibold">Project Name</span>
            <span className="text-[16px] text-white font-semibold">Skyline Industrial Phase I</span>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-6 py-3 rounded-lg border border-white/10 text-[14px] font-semibold text-on-surface-variant hover:bg-white/5 transition-all active:scale-95">
              Save Progress
            </button>
            <button className="flex-[2] sm:flex-none px-8 py-3 rounded-lg bg-primary text-[#00574d] text-[14px] font-bold flex items-center justify-center gap-2 group shadow-[0_0_20px_-5px_rgba(87,241,219,0.5)] hover:brightness-110 active:scale-95 transition-all">
              Enter Workspace &amp; Setup NOI
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
