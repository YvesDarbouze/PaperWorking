'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * First60Seconds
 *
 * The "Anti-Tutorial" block. Shows a stylized dashboard screenshot
 * with interactive hotspot tooltips that reveal how users get their
 * first win without a long onboarding tour.
 * Strict PaperWorking palette.
 */

interface Hotspot {
  id: string;
  x: string;        // CSS percentage position
  y: string;
  label: string;
  description: string;
  step: number;
}

const hotspots: Hotspot[] = [
  {
    id: 'add-deal',
    x: '12%',
    y: '18%',
    label: 'Create Your First Deal',
    description: 'Click "+ New Deal" in the sidebar. Enter the property address and purchase price — that\'s all you need to start.',
    step: 1,
  },
  {
    id: 'upload-doc',
    x: '55%',
    y: '35%',
    label: 'Upload a Document',
    description: 'Drag any closing document into the drop zone. The system auto-extracts key fields and routes it to the right team member.',
    step: 2,
  },
  {
    id: 'see-roi',
    x: '78%',
    y: '65%',
    label: 'See Your Projected ROI',
    description: 'The Engine Room instantly calculates your projected return based on the deal data. No spreadsheets required.',
    step: 3,
  },
];

export default function First60Seconds() {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  return (
    <section className="py-24 bg-dashboard border-b border-phase-1">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-phase-2 mb-4">
            No Onboarding Required
          </p>
          <h2 className="text-3xl font-medium tracking-tight text-black sm:text-4xl mb-4">
            The First 60 Seconds.
          </h2>
          <p className="mx-auto max-w-lg text-sm text-phase-3 leading-relaxed">
            Three clicks to your first win. Hover over each hotspot to see exactly what happens.
          </p>
        </div>

        {/* Dashboard Screenshot with Hotspots */}
        <div className="relative mx-auto max-w-4xl">
          {/* Simulated Dashboard Frame */}
          <div className="bg-white border border-phase-1 shadow-lg overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-dashboard bg-dashboard">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-phase-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-phase-3">PaperWorking Dashboard</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-phase-2">y@massters.io</span>
                <div className="w-5 h-5 bg-phase-1 flex items-center justify-center text-xs font-bold text-phase-3">YD</div>
              </div>
            </div>

            {/* Dashboard body */}
            <div className="flex min-h-[350px] sm:min-h-[420px]">
              {/* Sidebar */}
              <div className="w-44 border-r border-dashboard bg-dashboard/50 p-3 space-y-1 hidden sm:block">
                <div className="px-3 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest">
                  + New Deal
                </div>
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-phase-3 hover:bg-white transition-colors">
                  Pipeline
                </div>
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-phase-3 hover:bg-white transition-colors">
                  Engine Room
                </div>
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-phase-2 hover:bg-white transition-colors">
                  Triage Queue
                </div>
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-phase-2 hover:bg-white transition-colors">
                  Closing Room
                </div>
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-phase-2 hover:bg-white transition-colors">
                  Team Settings
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-5 relative">
                {/* Pipeline header */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold text-black">Deal Pipeline</h3>
                  <span className="text-xs text-phase-2">3 active deals</span>
                </div>

                {/* Mini pipeline cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {[
                    { address: '421 Oak St', phase: 'Acquisition', price: '$420K' },
                    { address: '88 Bergen Ave', phase: 'Renovation', price: '$310K' },
                    { address: '15 Elm Ct', phase: 'Exit', price: '$580K' },
                  ].map((deal) => (
                    <div key={deal.address} className="border border-phase-1 p-3 hover:bg-dashboard transition-colors">
                      <p className="text-xs font-medium text-black mb-1">{deal.address}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-phase-2">{deal.phase}</span>
                        <span className="text-xs text-phase-3 tabular-nums">{deal.price}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Document drop zone */}
                <div className="border-2 border-dashed border-phase-1 p-6 text-center mb-5 hover:border-phase-2 transition-colors">
                  <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mb-1">Drop Documents Here</p>
                  <p className="text-xs text-phase-2">PDF, DOCX, or image files</p>
                </div>

                {/* ROI Widget */}
                <div className="flex items-center justify-between border border-phase-1 p-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-phase-2 block">Portfolio ROI</span>
                    <span className="text-lg font-medium text-black tabular-nums">34.2%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold uppercase tracking-widest text-phase-2 block">Total Deployed</span>
                    <span className="text-lg font-medium text-black tabular-nums">$847K</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hotspot Overlays */}
          {hotspots.map((spot) => {
            const isActive = activeHotspot === spot.id;
            return (
              <div
                key={spot.id}
                className="absolute"
                style={{ left: spot.x, top: spot.y }}
              >
                {/* Pulse ring */}
                <button
                  onMouseEnter={() => setActiveHotspot(spot.id)}
                  onMouseLeave={() => setActiveHotspot(null)}
                  onClick={() => setActiveHotspot(isActive ? null : spot.id)}
                  className="relative w-8 h-8 flex items-center justify-center cursor-pointer group"
                  aria-label={spot.label}
                >
                  <span className="absolute inset-0 bg-black/10 animate-ping" style={{ animationDuration: '2s' }} />
                  <span className="relative w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-bold shadow-md z-10">
                    {spot.step}
                  </span>
                </button>

                {/* Tooltip */}
                {isActive && (
                  <div className="absolute left-10 top-0 w-56 bg-black text-white p-4 shadow-xl z-20 animate-in fade-in duration-200">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
                      Step {spot.step}
                    </p>
                    <p className="text-sm font-bold mb-2">{spot.label}</p>
                    <p className="text-xs text-white/80 leading-relaxed">{spot.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <a
            href="/pricing"
            className="inline-flex items-center text-sm font-bold text-phase-4 hover:text-black transition-colors"
          >
            Try it yourself — no setup required
            <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
