'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════
   CapitalStackProgress — Visual Capital Raised Bar

   Displays "Total Capital Needed" vs. "Capital Pledged"
   as a segmented animated progress bar.
   ═══════════════════════════════════════════════════════ */

interface Props {
  capitalNeeded: number;
  capitalPledged: number;
  investorCount: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function CapitalStackProgress({ capitalNeeded, capitalPledged, investorCount }: Props) {
  const percent = capitalNeeded > 0 ? Math.min((capitalPledged / capitalNeeded) * 100, 100) : 0;
  const remaining = capitalNeeded - capitalPledged;
  const isFunded = percent >= 100;

  return (
    <div className="w-full">
      {/* Header Stats */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="ag-label mb-1">Capital Stack</p>
          <p className="text-2xl font-semibold tracking-tight text-gray-900">
            {formatCurrency(capitalPledged)}
            <span className="text-sm font-normal text-gray-400 ml-1">
              of {formatCurrency(capitalNeeded)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <span className="ag-label">{investorCount} Investor{investorCount !== 1 ? 's' : ''}</span>
          <p className={`text-lg font-bold ${isFunded ? 'text-emerald-600' : 'text-phase-findandfund-accent'}`}>
            {percent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            background: isFunded
              ? 'linear-gradient(90deg, #059669, #10b981)'
              : 'linear-gradient(90deg, #0d9488, #2dd4bf)',
          }}
        />
        {/* Animated shimmer overlay */}
        {!isFunded && percent > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-30"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Bottom Labels */}
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">
          {isFunded ? '✓ Fully Funded' : `${formatCurrency(remaining)} remaining`}
        </span>
        <span className="text-xs text-gray-400">Target</span>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
