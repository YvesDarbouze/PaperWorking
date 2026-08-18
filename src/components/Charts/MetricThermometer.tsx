'use client';

import React from 'react';

interface MetricThermometerProps {
  value: number | null; // 0 to 100
  label?: string;
}

export function MetricThermometer({ value, label = 'Compliance Rate' }: MetricThermometerProps) {
  const safeVal = value !== null && value !== undefined ? Math.min(100, Math.max(0, value)) : null;

  return (
    <div className="h-64 w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</h4>
        <p className="text-2xl font-bold text-white mt-1">{safeVal !== null ? `${safeVal.toFixed(1)}%` : '—'}</p>
      </div>

      <div className="w-full flex-1 max-h-40 flex items-center justify-center py-2">
        <div className="w-8 h-full bg-slate-800 rounded-full p-1 relative flex flex-col justify-end border border-slate-700">
          <div
            className="w-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ height: `${safeVal !== null ? safeVal : 0}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
