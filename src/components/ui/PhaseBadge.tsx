'use client';

import React from 'react';

type DealPhase = 'Lead' | 'Sourcing' | 'Under Contract' | 'Rehab' | 'Renovating' | 'Listed' | 'Sold' | 'Rented' | 'Closed';

interface PhaseBadgeProps {
  status: string | DealPhase;
  className?: string;
}

/**
 * PhaseBadge — Standardized status identifier for Deals
 * 
 * Maps property phases to the specific Antigravity color scale.
 * Implements dynamic text contrast logic (Black text on Phase 0-1, White on 2-5).
 */
export default function PhaseBadge({ status, className = '' }: PhaseBadgeProps) {
  // Normalize status for consistent mapping
  const normalizedStatus = status as DealPhase;

  // Determine if the phase is "dark" (requires white text)
  const isDarkPhase = [
    'Rehab', 'Renovating', 'Listed', 'Sold', 'Rented', 'Closed'
  ].includes(normalizedStatus);

  // Map normalized status to phase background variables
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case 'Lead':
      case 'Sourcing':
        return 'bg-phase-sourcing';
      case 'Under Contract':
        return 'bg-phase-contract';
      case 'Rehab':
      case 'Renovating':
        return 'bg-phase-rehab';
      case 'Listed':
        return 'bg-phase-listed';
      case 'Sold':
      case 'Rented':
      case 'Closed':
        return 'bg-phase-closed';
      default:
        return 'bg-gray-100'; // Fallback
    }
  };

  const bgColorClass = getBadgeStyle(normalizedStatus);
  const textColorClass = isDarkPhase ? 'text-white' : 'text-[#111111]';

  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 
      text-[10px] font-black uppercase tracking-[0.15em] 
      rounded-none border border-black/5
      ${bgColorClass} ${textColorClass}
      ${className}
    `}>
      {status}
    </span>
  );
}
