'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';

export default function MathBreakdown() {
  return (
    <section className="py-24 sm:py-32 bg-pw-black text-pw-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text */}
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
              To understand your profit, <br/>
              <span className="text-text-secondary">you must track every penny.</span>
            </h2>
            
            <p className="text-text-secondary text-lg leading-relaxed mb-10 max-w-lg">
              The Paperworking ledger automatically tallies your entry prices, ongoing holding costs, and dynamic refurbishment budgets so nothing slips through the cracks.
            </p>
            
            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-bg-surface mr-3"></span> The Purchase Price
                </h3>
                <p className="text-text-secondary text-sm mb-4">This is the entry price into the investment.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-pw-white/10 p-4">
                    <p className="text-pw-accent text-xs font-black uppercase mb-1">Initial Cost</p>
                    <p className="text-sm font-medium">The agreed-upon sale price.</p>
                  </div>
                  <div className="border border-pw-white/10 p-4">
                    <p className="text-pw-accent text-xs font-black uppercase mb-1">Holding Costs</p>
                    <p className="text-sm font-medium">Factor in taxes, insurance, and utilities.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-bg-surface mr-3"></span> Refurbishing Costs
                </h3>
                <p className="text-text-secondary text-sm mb-4">These vary wildly based on the property condition.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-pw-white/10 p-4">
                    <p className="text-pw-accent text-xs font-black uppercase mb-1">Materials</p>
                    <p className="text-sm font-medium">Flooring, paint, cabinetry, fixtures.</p>
                  </div>
                  <div className="border border-pw-white/10 p-4">
                    <p className="text-pw-accent text-xs font-black uppercase mb-1">Labor</p>
                    <p className="text-sm font-medium">General contractors, plumbers, electricians.</p>
                  </div>
                  <div className="border border-pw-white/10 p-4">
                    <p className="text-pw-accent text-xs font-black uppercase mb-1">Contingency</p>
                    <p className="text-sm font-medium">Add a 10–15% buffer for hidden issues.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Visualizer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#111] border border-pw-white/10 p-8 shadow-2xl relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <div className="w-32 h-32 border-r-2 border-t-2 border-pw-white" />
            </div>
            
            <p className="text-xs text-text-secondary font-mono mb-8 uppercase tracking-widest text-center">Interactive Ledger Preview</p>
            
            <div className="space-y-6 font-mono text-sm">
              <div className="flex justify-between items-end border-b border-pw-white/20 pb-4">
                <span className="text-text-secondary">Total Purchase</span>
                <span className="text-2xl text-pw-white">$150,000.00</span>
              </div>
              <div className="flex justify-between items-center text-pw-accent">
                <span>+ Refurbishment Est.</span>
                <span>$45,000.00</span>
              </div>
              <div className="flex justify-between items-center text-red-400">
                <span>+ Holding Costs (3mo)</span>
                <span>$4,500.00</span>
              </div>
              <div className="flex justify-between items-center text-red-400 border-b border-pw-white/20 pb-4">
                <span>+ Closing/Commissions</span>
                <span>$18,000.00</span>
              </div>
              <div className="flex justify-between items-end pt-4">
                <span className="text-text-secondary uppercase text-xs tracking-widest">Target ARV</span>
                <span className="text-3xl text-pw-white">$300,000.00</span>
              </div>
              <div className="flex justify-between items-center pt-8 border-t-2 border-pw-white/40">
                <span className="text-white font-bold uppercase tracking-widest">Net Profit</span>
                <span className="text-3xl text-[#4ADE80] font-black">$82,500.00</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
