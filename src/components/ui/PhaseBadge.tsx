'use client';

import React from 'react';

type ProjectPhase = 'acquisition' | 'fund' | 'hold' | 'exit';

interface PhaseBadgeProps {
  status: string | ProjectPhase;
  className?: string;
}

/**
 * PhaseBadge — Standardized status identifier for Deals
 * 
 * Maps property phases to the specific Antigravity color scale.
 */
export default function PhaseBadge({ status, className = '' }: PhaseBadgeProps) {
  // Normalize status for consistent mapping
  const normalizedStatus = String(status).toLowerCase() as ProjectPhase;

  // Determine if the phase is "dark" (requires white text)
  const isDarkPhase = [
    'hold', 'exit'
  ].includes(normalizedStatus);

  // Map normalized status to phase background variables
  const getBadgeStyle = (s: ProjectPhase) => {
    switch (s) {
      case 'acquisition':
        return 'bg-phase-sourcing'; // Amber
      case 'fund':
        return 'bg-phase-contract'; // Blue
      case 'hold':
        return 'bg-phase-rehab'; // Orange
      case 'exit':
        return 'bg-phase-closed'; // Green
      default:
        return 'bg-bg-primary'; // Fallback
    }
  };

  const bgColorClass = getBadgeStyle(normalizedStatus);
  const textColorClass = isDarkPhase ? 'text-white' : 'text-pw-black';

  const labelMap: Record<string, string> = {
    'acquisition': 'Acquisition',
    'fund': 'Fund',
    'hold': 'Hold',
    'exit': 'Exit',
  };

  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 
      text-xs font-black uppercase tracking-widest 
      border border-black/5
      ${bgColorClass} ${textColorClass}
      ${className}
    `}>
      {labelMap[normalizedStatus] || status}
    </span>
  );
}
