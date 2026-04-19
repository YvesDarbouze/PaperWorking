'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldAlert, Hammer, TrendingUp } from 'lucide-react';

const PHASES = [
  {
    id: '01',
    title: 'Find and Fund',
    icon: Search,
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
    items: [
      { subtitle: 'Inspection', desc: 'Identify structural issues, plumbing, or electrical problems that could sink the flip.' },
      { subtitle: 'Title Search', desc: 'Ensure there are no liens or legal surprises attached to the property.' }
    ]
  },
  {
    id: '03',
    title: 'The Renovation',
    icon: Hammer,
    items: [
      { subtitle: 'Focus on ROI', desc: 'Prioritize kitchens and bathrooms. Avoid over-improving for the neighborhood.' },
      { subtitle: 'Permits', desc: 'Ensure all work is legal to avoid massive headaches during the sale.' }
    ]
  },
  {
    id: '04',
    title: 'The Exit Strategy',
    icon: TrendingUp,
    items: [
      { subtitle: 'Staging', desc: 'High-quality staging can help buyers visualize the lifestyle.' },
      { subtitle: 'Marketing', desc: 'Professional photography and listing on the MLS.' }
    ]
  }
];

export default function FlippingPhases() {
  return (
    <section className="py-24 sm:py-32 bg-pw-bg border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pw-accent mb-4">
            The Flipping Blueprint
          </p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 mb-6">
            4 Phases to Profitability
          </h2>
          <p className="max-w-2xl text-gray-600 text-lg leading-relaxed">
            Flipping a house is essentially a high-stakes project management puzzle. We help you balance a strict timeline with an even stricter budget.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          {PHASES.map((phase, idx) => (
            <motion.div 
              key={phase.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative pl-6 border-l border-gray-200"
            >
              <div className="absolute -left-3 top-0 w-6 h-6 bg-white border-2 border-pw-black flex items-center justify-center rounded-full">
                <phase.icon className="w-3 h-3 text-pw-black" />
              </div>
              <h3 className="text-4xl font-black text-gray-100 mb-4">{phase.id}</h3>
              <h4 className="text-xl font-bold text-gray-900 mb-6">{phase.title}</h4>
              <ul className="space-y-6">
                {phase.items.map((item, i) => (
                  <li key={i}>
                    <h5 className="text-sm font-bold text-gray-900 mb-1">{item.subtitle}</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
