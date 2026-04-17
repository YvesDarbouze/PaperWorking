'use client';

import React from 'react';

/**
 * TrustBar
 *
 * Displays 5 abstract company logos in grayscale that transition
 * to full contrast on hover. Uses the PaperWorking palette strictly.
 * These represent the industries PaperWorking serves (real estate,
 * title, construction, finance, law).
 */

const logos = [
  { name: 'Meridian Capital', initials: 'MC', tagline: 'CAPITAL' },
  { name: 'Apex Title Group', initials: 'AT', tagline: 'TITLE' },
  { name: 'Ironclad Builds', initials: 'IB', tagline: 'CONSTRUCTION' },
  { name: 'Vanguard RE', initials: 'VR', tagline: 'INVESTMENTS' },
  { name: 'Sterling & Assoc.', initials: 'SA', tagline: 'LAW' },
];

export default function TrustBar() {
  return (
    <section className="py-10 border-b border-phase-1 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-phase-2 mb-8">
          Trusted by teams across the real estate lifecycle
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="group flex items-center space-x-2 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-default"
              title={logo.name}
            >
              {/* Logo Mark */}
              <div className="w-8 h-8 bg-phase-4 group-hover:bg-black flex items-center justify-center transition-colors duration-300">
                <span className="text-xs font-bold text-white tracking-tight">
                  {logo.initials}
                </span>
              </div>
              {/* Logo Type */}
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-phase-4 group-hover:text-black tracking-tight transition-colors duration-300">
                  {logo.name}
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-phase-2 group-hover:text-phase-3 transition-colors duration-300">
                  {logo.tagline}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
