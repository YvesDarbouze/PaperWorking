'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldAlert, Hammer, TrendingUp } from 'lucide-react';

const PHASES = [
  {
    id: '01',
    title: 'Find and Fund',
    icon: Search,
    bg: '#f2f2f2', // --phase-sourcing
    text: '#595959',
    items: [
      { subtitle: 'Analyze Markets', desc: 'Look for emerging neighborhoods where property values are rising but haven\'t peaked.' },
      { subtitle: 'The 70% Rule', desc: 'Never pay more than 70% of the After Repair Value (ARV) minus the cost of repairs.' },
      { subtitle: 'Secure Funding', desc: 'Options include traditional mortgages, Hard Money Loans, or private investors.' }
    ]
  },
  {
    id: '02',
    title: 'Acquisition & Due Diligence',
    icon: ShieldAlert,
    bg: '#cccccc', // --phase-contract
    text: '#595959',
    items: [
      { subtitle: 'Inspection', desc: 'Identify structural issues, plumbing, or electrical issues that could affect your capital position.' },
      { subtitle: 'Title Search', desc: 'Ensure there are no liens or legal surprises attached to the property.' }
    ]
  },
  {
    id: '03',
    title: 'The Renovation',
    icon: Hammer,
    bg: '#a5a5a5', // --phase-rehab
    text: '#f2f2f2',
    items: [
      { subtitle: 'Focus on ROI', desc: 'Prioritize kitchens and bathrooms. Avoid over-improving for the neighborhood.' },
      { subtitle: 'Permits', desc: 'Ensure all work is legal to avoid massive headaches during the sale.' }
    ]
  },
  {
    id: '04',
    title: 'The Exit Strategy',
    icon: TrendingUp,
    bg: '#7f7f7f', // --phase-listed
    text: '#f2f2f2',
    items: [
      { subtitle: 'Staging', desc: 'High-quality staging can help buyers visualize the lifestyle.' },
      { subtitle: 'Marketing', desc: 'Professional photography and listing on the MLS.' }
    ]
  }
];

// Dot matrix backdrop similar to the ML Weather Patterns app reference
const DotPattern = ({ color = 'currentColor', opacity = 0.1 }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="2" fill={color} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dotGrid)" />
  </svg>
);

const PhaseCard = ({ phase, index }: { phase: any, index: number }) => {
  return (
    <div 
      className="sticky w-full mb-[30vh]"
      style={{ 
        // 5vh base + 64px offset per card to ensure the "folder tab" remains visible when stacked
        top: `calc(5vh + ${index * 64}px)`, 
        zIndex: index + 10 
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ margin: "-100px", once: true }}
        transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }} 
        className="relative w-full max-w-5xl mx-auto overflow-hidden shadow-2xl"
        style={{ 
          backgroundColor: phase.bg,
          color: phase.text,
          minHeight: '65vh',
          borderRadius: '40px', // --radius-lg equivalent or explicitly soft
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Abstract pattern to mimic "Machine Learning Identifies..." dots graphic */}
        <div className="absolute right-0 bottom-0 pointer-events-none transform translate-x-1/4 translate-y-1/4 w-[800px] h-[800px] rounded-full overflow-hidden mask-radial-gradient">
           <DotPattern color={phase.text} opacity={0.06} />
        </div>

        {/* Top "Folder Tab" section - visible even when stacked */}
        <div className="absolute top-0 left-0 w-full h-[64px] flex items-center justify-between px-10 z-20">
          <span className="text-xl font-bold tracking-tight opacity-70">
            Phase {phase.id}
          </span>
          <div className="flex items-center justify-center p-2.5 rounded-full" 
               style={{ backgroundColor: phase.text, color: phase.bg }}>
            <phase.icon className="w-5 h-5" />
          </div>
        </div>

        {/* Content Section */}
        <div className="pt-24 pb-16 px-10 md:px-16 flex flex-col h-full z-10 relative">
          <div className="max-w-3xl mb-auto">
            <h3 className="text-[4rem] sm:text-[6rem] leading-[0.9] font-black tracking-tighter mb-4">
              {phase.title}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-16 pt-10 border-t border-black/10">
            {phase.items.map((item: any, i: number) => (
              <div key={i} className="flex flex-col">
                <h5 className="text-2xl font-bold mb-3 tracking-tight">{item.subtitle}</h5>
                <p className="text-lg leading-relaxed opacity-80 font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function FlippingPhases() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section 
      ref={containerRef} 
      className="relative text-white overflow-visible pt-32 pb-[50vh]"
      style={{ backgroundColor: '#595959' }} // Background uses the final darkest color to cap the sequence
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <DotPattern color="#ffffff" opacity={0.03} />
      </div>

      <div className="mx-auto max-w-5xl px-6 lg:px-8 relative z-10 mb-32">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#cccccc] mb-6">
            The REI Blueprint
          </p>
          <h2 className="text-[5rem] sm:text-[7rem] font-black tracking-tighter leading-[0.9] text-[#f2f2f2] mb-10">
            4 Phases to Profitability
          </h2>
          <p className="text-2xl text-[#a5a5a5] leading-snug font-medium max-w-xl">
            Value-add real estate investing is a high-stakes project management discipline. We help you balance a strict timeline with an even stricter capital budget.
          </p>
        </div>
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {PHASES.map((phase, index) => (
          <PhaseCard 
            key={phase.id} 
            phase={phase} 
            index={index} 
          />
        ))}
      </div>
    </section>
  );
}
