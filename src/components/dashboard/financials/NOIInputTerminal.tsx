"use client";

import React from "react";

interface NOIInputTerminalProps {
  gri: number;
  setGri: (val: number) => void;
  otherIncome: number;
  setOtherIncome: (val: number) => void;
  vacancyPct: number;
  setVacancyPct: (val: number) => void;
  opex: number;
  setOpex: (val: number) => void;
  vacancyLoss: number;
}

export default function NOIInputTerminal({
  gri,
  setGri,
  otherIncome,
  setOtherIncome,
  vacancyPct,
  setVacancyPct,
  opex,
  setOpex,
  vacancyLoss,
}: NOIInputTerminalProps) {
  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Income Panel */}
        <section className="glass-card rounded-xl overflow-hidden relative" style={{ background: "rgba(11, 20, 26, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-primary/5 to-transparent">
            <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">INCOME</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Gross Rental Income (GRI) / yr</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                <input 
                  type="number" 
                  value={gri} 
                  onChange={e => setGri(Number(e.target.value))}
                  className="w-full bg-surface-container-high border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Other Income / yr</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                <input 
                  type="number" 
                  value={otherIncome} 
                  onChange={e => setOtherIncome(Number(e.target.value))}
                  className="w-full bg-surface-container-high border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Expenses & Vacancy Panel */}
        <div className="space-y-6">
          <section className="glass-card rounded-xl p-6 relative overflow-hidden" style={{ background: "rgba(11, 20, 26, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <h3 className="font-headline-md text-primary">Vacancy Assumption</h3>
                <div className="text-right">
                  <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Loss Adjustment</span>
                  <span className="font-mono text-error font-bold">-{formatCur(vacancyLoss)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" max="20" 
                  value={vacancyPct} 
                  onChange={e => setVacancyPct(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="font-mono text-primary font-bold w-12 text-right">{vacancyPct}%</span>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-xl p-6 relative overflow-hidden" style={{ background: "rgba(11, 20, 26, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <h3 className="font-headline-md text-primary">Operating Expenses</h3>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Annual OpEx</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                  <input 
                    type="number" 
                    value={opex} 
                    onChange={e => setOpex(Number(e.target.value))}
                    className="w-full bg-surface-container-high border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
