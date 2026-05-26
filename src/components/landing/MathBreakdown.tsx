'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ArrowUpRight, RefreshCw } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   MathBreakdown — Interactive ROI Calculator (Landing Page)
   Left: static copy. Right: live sliders that update profit/ROI
   in real time as users drag inputs.
   ═══════════════════════════════════════════════════════════════ */

const DEFAULTS = {
  purchasePrice:  150_000,
  rehabBudget:     45_000,
  holdingMonths:        3,
  closingPct:          6,   // % of ARV
  arv:            300_000,
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  color = '#2dd4bf',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60 font-mono uppercase tracking-widest">{label}</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.12) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.12) 100%)`,
          accentColor: color,
        }}
      />
      <div className="flex justify-between text-[9px] font-mono text-white/30">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function fmt$(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${v.toLocaleString('en-US')}`;
}

function fmtPct(v: number) { return `${v.toFixed(1)}%`; }
function fmtMo(v: number)  { return `${v} mo`; }

export default function MathBreakdown() {
  const [pp,  setPP]  = useState(DEFAULTS.purchasePrice);
  const [rh,  setRH]  = useState(DEFAULTS.rehabBudget);
  const [mo,  setMo]  = useState(DEFAULTS.holdingMonths);
  const [cp,  setCP]  = useState(DEFAULTS.closingPct);
  const [arv, setARV] = useState(DEFAULTS.arv);

  const calc = useMemo(() => {
    const monthlyHolding = pp * 0.01; // ~1% of purchase per month
    const holdingCost    = monthlyHolding * mo;
    const closingCost    = arv * (cp / 100);
    const allIn          = pp + rh + holdingCost + closingCost;
    const profit         = arv - allIn;
    const roi            = allIn > 0 ? (profit / allIn) * 100 : 0;
    const cocReturn      = (pp * 0.25) > 0 ? (profit / (pp * 0.25)) * 100 : 0; // assumes 25% down
    return { holdingCost, closingCost, allIn, profit, roi, cocReturn };
  }, [pp, rh, mo, cp, arv]);

  const profitColor = calc.profit >= 0 ? '#4ade80' : '#f87171';

  const reset = () => {
    setPP(DEFAULTS.purchasePrice); setRH(DEFAULTS.rehabBudget);
    setMo(DEFAULTS.holdingMonths); setCP(DEFAULTS.closingPct);
    setARV(DEFAULTS.arv);
  };

  return (
    <section className="py-24 sm:py-32 bg-pw-black text-pw-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* ── Left: Copy ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center space-x-3 px-4 py-2 bg-bg-surface/10 rounded-full mb-8">
              <Calculator className="w-4 h-4 text-pw-accent" />
              <span className="text-xs font-bold uppercase tracking-widest">Calculating the Costs</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-8 leading-tight">
              To understand your profit, <br />
              <span className="text-text-secondary">you must track every penny.</span>
            </h2>

            <p className="text-text-secondary text-lg leading-relaxed mb-10 max-w-lg">
              The PaperWorking ledger automatically tallies your entry prices, ongoing holding costs, and dynamic refurbishment budgets so nothing slips through the cracks.
            </p>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-pw-accent mr-3 inline-block" /> The Purchase Price
                </h3>
                <p className="text-text-secondary text-sm mb-4">This is the entry price into the investment.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-pw-white/10 p-4">
                    <p className="text-pw-accent text-xs font-black uppercase mb-1">Initial Cost</p>
                    <p className="text-sm font-medium">The agreed-upon sale price.</p>
                  </div>
                  <div className="border border-pw-white/10 p-4">
                    <p className="text-pw-accent text-xs font-black uppercase mb-1">Holding Costs</p>
                    <p className="text-sm font-medium">Taxes, insurance, and utilities.</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-pw-accent mr-3 inline-block" /> Refurbishing Costs
                </h3>
                <p className="text-text-secondary text-sm mb-4">Vary based on property condition and strategy.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {['Materials', 'Labor', 'Contingency'].map((label, i) => (
                    <div key={label} className="border border-pw-white/10 p-4">
                      <p className="text-pw-accent text-xs font-black uppercase mb-1">{label}</p>
                      <p className="text-sm font-medium">{['Flooring, paint, fixtures.', 'GCs, plumbers, electricians.', '10–15% buffer for surprises.'][i]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Right: Interactive Calculator ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-[#0e1a20] border border-white/10 p-7 shadow-2xl rounded-lg relative overflow-hidden">
              {/* Corner decoration */}
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <div className="w-32 h-32 border-r-2 border-t-2 border-pw-white rounded-tr-lg" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest">Interactive ROI Calculator</p>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-5 mb-7">
                <SliderRow label="Purchase Price" value={pp}  min={50_000}  max={500_000} step={5_000}  format={fmt$}   onChange={setPP}  color="#2dd4bf" />
                <SliderRow label="Rehab Budget"   value={rh}  min={0}       max={150_000} step={1_000}  format={fmt$}   onChange={setRH}  color="#818cf8" />
                <SliderRow label="Hold Period"    value={mo}  min={1}       max={24}      step={1}      format={fmtMo}  onChange={setMo}  color="#fb923c" />
                <SliderRow label="Closing Costs"  value={cp}  min={1}       max={12}      step={0.5}    format={fmtPct} onChange={setCP}  color="#f87171" />
                <SliderRow label="Target ARV"     value={arv} min={100_000} max={800_000} step={10_000} format={fmt$}   onChange={setARV} color="#4ade80" />
              </div>

              {/* Ledger */}
              <div className="space-y-3 font-mono text-sm border-t border-white/10 pt-5">
                {[
                  { label: 'Purchase Price',     value: pp,                  color: 'text-white/70' },
                  { label: '+ Rehab Budget',      value: rh,                  color: 'text-[#818cf8]' },
                  { label: `+ Holding (${mo}mo)`, value: calc.holdingCost,    color: 'text-[#fb923c]' },
                  { label: `+ Closing (${cp}%)`,  value: calc.closingCost,    color: 'text-[#f87171]' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-white/50 text-xs">{row.label}</span>
                    <span className={`${row.color} font-semibold tabular-nums`}>{fmt$(row.value)}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center border-t border-white/10 pt-3 pb-1">
                  <span className="text-white/50 text-xs uppercase tracking-widest">All-In Cost</span>
                  <span className="text-white font-bold tabular-nums">{fmt$(calc.allIn)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs uppercase tracking-widest">Target ARV</span>
                  <span className="text-[#4ade80] font-bold tabular-nums">{fmt$(arv)}</span>
                </div>
              </div>

              {/* Result */}
              <div className="mt-5 pt-4 border-t-2 border-white/20 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-white/70 font-bold font-mono uppercase tracking-widest text-xs">Net Profit</span>
                  <span className="text-3xl font-black font-mono tabular-nums" style={{ color: profitColor }}>
                    {fmt$(Math.abs(calc.profit))}
                    {calc.profit < 0 && <span className="text-base ml-1">LOSS</span>}
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2.5 text-center">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-0.5">ROI</p>
                    <p className="font-bold font-mono text-lg" style={{ color: profitColor }}>
                      {calc.roi >= 0 ? '+' : ''}{calc.roi.toFixed(1)}%
                    </p>
                  </div>
                  <div className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2.5 text-center">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-0.5">Cash-on-Cash</p>
                    <p className="font-bold font-mono text-lg" style={{ color: profitColor }}>
                      {calc.cocReturn >= 0 ? '+' : ''}{calc.cocReturn.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <a
                href="/signup"
                className="mt-5 w-full py-3 flex items-center justify-center gap-2 rounded-lg bg-[#2dd4bf] text-[#003731] font-bold text-sm uppercase tracking-widest hover:bg-[#57f1db] transition-colors"
              >
                Analyze Your Deal Free
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
