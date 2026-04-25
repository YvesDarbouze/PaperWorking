'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, Layout, Users, TrendingUp, ShieldCheck, Zap } from 'lucide-react';

const FEATURES = [
  {
    title: "OPERATIONAL MATH",
    description: "Institutional-grade ROI calculators and waterfall distribution logic. Eliminate reliance on fragile spreadsheets for high-yield modeling.",
    icon: Calculator,
    details: ["Multi-tier waterfalls", "Equity modeling", "Instant P&L audits"]
  },
  {
    title: "DATA ROOMS",
    description: "Centralized command for institutional data. Every document, deadline, and draw request structured precisely for professional audit trails.",
    icon: Layout,
    details: ["Dynamic Kanban tracks", "Digital Draw control", "Integration suite"]
  },
  {
    title: "PROFESSIONAL MARKETPLACE",
    description: "Pre-vetted legal counsel and certified appraisers. Secure the specialized labor and liquidity required for high-volume scale.",
    icon: Users,
    details: ["Verified labor network", "Lender bidding", "Insurance compliance"]
  }
];

export default function ValuePropGrid() {
  return (
    <section id="features" className="py-32 sm:py-48 bg-bg-surface border-t border-border-accent">
      <div className="mx-auto max-w-7xl px-10">
        <div className="mx-auto max-w-4xl mb-32">
           <p className="text-xs font-black uppercase tracking-[0.5em] text-pw-accent mb-6">SYSTEM CORE — CORE FUNCTIONALITY</p>
           <h2 className="text-5xl sm:text-7xl font-black text-text-primary tracking-tighter leading-none uppercase">
             THE ENGINE BUILT <br/> FOR INSTITUTIONAL SCALE.
           </h2>
        </div>

        {/* Antigravity Workbench Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-border-accent bg-bg-primary">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col group p-12 border-r border-b border-border-accent hover:bg-pw-black transition-all"
            >
              <div className="w-14 h-14 border border-border-accent bg-bg-surface flex items-center justify-center mb-12 group-hover:bg-pw-accent group-hover:border-pw-accent transition-all">
                 <feature.icon className="w-5 h-5 text-text-primary group-hover:text-pw-white transition-colors" />
              </div>
              
              <h3 className="text-2xl font-black text-text-primary mb-6 uppercase tracking-tighter group-hover:text-pw-white">
                {feature.title}
              </h3>
              
              <p className="text-text-secondary text-sm font-bold uppercase tracking-tight leading-relaxed mb-12 flex-1 group-hover:text-pw-white/70">
                {feature.description}
              </p>

              <ul className="space-y-6">
                {feature.details.map((detail) => (
                   <li key={detail} className="flex items-center text-xs font-black uppercase tracking-[0.2em] text-text-secondary group-hover:text-pw-white">
                      <div className="w-1.5 h-1.5 bg-pw-accent mr-5" />
                      {detail}
                   </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        
        {/* Institutional System Audit Box */}
        <div className="mt-48 p-20 border border-border-accent bg-pw-black flex flex-col md:flex-row items-center gap-16">
           <div className="w-24 h-24 border-2 border-pw-white flex items-center justify-center flex-shrink-0 animate-pulse">
              <TrendingUp className="w-10 h-10 text-pw-white" />
           </div>
           <div className="flex-1 text-left">
             <h4 className="text-3xl font-black text-pw-white mb-6 uppercase tracking-tight leading-none">Scale portfolio with institutional rigor</h4>
             <p className="max-w-3xl text-sm text-pw-white/50 font-black tracking-[0.2em] leading-loose uppercase">
               Standardized by family offices and full-time renovation teams to audit and manage 
               high-yield construction pipelines in excess of $1B globally. System integrity verified via Antigravity protocols.
             </p>
           </div>
           <div className="w-full md:w-px h-px md:h-12 bg-bg-surface/20" />
           <div className="text-nowrap">
             <span className="text-xs font-black text-pw-accent uppercase tracking-[0.5em]">PROTOCOL STATUS</span>
             <p className="text-2xl font-black text-pw-white uppercase">VERIFIED</p>
           </div>
        </div>
      </div>
    </section>
  );
}
