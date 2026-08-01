'use client';

import React from 'react';

interface FeatureComparisonTableProps {
  onSelectPlan: (plan: string) => void;
}

const PLAN_COLUMNS = [
  { key: 'vendor', label: 'Vendor', price: '$390/yr', cta: 'Join the Marketplace', planLabel: 'Vendor Marketplace Annual' },
  { key: 'individual', label: 'Investor', price: '$499/yr', cta: 'Start Free 14-Day Trial', planLabel: 'Investor Annual' },
  { key: 'team', label: 'Investment Team', price: '$999/yr', cta: 'Start Free 14-Day Trial', planLabel: 'Investment Team Annual' },
];

export default function FeatureComparisonTable({ onSelectPlan }: FeatureComparisonTableProps) {
  return (
    <div className="w-full">
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-surface-container-low/40">
              <th className="p-4 font-jetbrains text-xs uppercase tracking-wider text-on-surface-variant/60 w-[40%]">
                Feature
              </th>
              {PLAN_COLUMNS.map((col) => (
                <th key={col.key} className="p-4 text-center">
                  <div className="font-bold text-sm text-on-surface">{col.label}</div>
                  <div className="text-xs text-primary font-mono font-semibold mt-0.5">{col.price}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="p-4 text-sm text-on-surface">Four-phase REIL project management</td>
              <td className="p-4 text-center text-primary">✓</td>
              <td className="p-4 text-center text-primary">✓</td>
              <td className="p-4 text-center text-primary">✓</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="p-4 text-sm text-on-surface">All 33 Investor KPIs</td>
              <td className="p-4 text-center text-on-surface-variant/40">—</td>
              <td className="p-4 text-center text-primary">✓</td>
              <td className="p-4 text-center text-primary">✓</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="p-4 text-sm text-on-surface">Team accounts & role permissions</td>
              <td className="p-4 text-center text-on-surface-variant/40">—</td>
              <td className="p-4 text-center text-on-surface-variant/40">Solo</td>
              <td className="p-4 text-center text-primary">Up to 10</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
