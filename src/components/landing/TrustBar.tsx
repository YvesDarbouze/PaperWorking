'use client';

import React from 'react';

/**
 * TrustBar
 *
 * Three glass-card stat bento tiles matching the Stitch Obsidian design.
 * Renders: $2.4B+ Capital Tracked · 12,000+ Active Deals · 4 Phases End-to-End
 */

const stats = [
  { value: '$2.4B+', label: 'Capital Tracked' },
  { value: '12,000+', label: 'Active Deals' },
  { value: '4 Phases', label: 'End-to-End' },
];

export default function TrustBar() {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-surface-container-low/80 transition-colors duration-300"
        >
          <span className="text-[32px] leading-[40px] font-bold tracking-tight text-primary">
            {stat.value}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant mt-1">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
