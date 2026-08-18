'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface MetricDonutProps {
  data?: { name: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
}

export function MetricDonut({
  data = [
    { name: 'Property Tax', value: 2400, color: '#3b82f6' },
    { name: 'Insurance', value: 1800, color: '#10b981' },
    { name: 'Maintenance', value: 2400, color: '#f59e0b' },
    { name: 'Management', value: 2880, color: '#8b5cf6' },
    { name: 'Utilities', value: 1200, color: '#ec4899' },
    { name: 'CapEx', value: 1200, color: '#06b6d4' },
  ],
  centerLabel = 'Total OpEx',
  centerValue = '$11,880',
}: MetricDonutProps) {
  return (
    <div className="h-64 w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col">
      <h4 className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Expense Breakdown (Canonical 8 Tags)</h4>
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', color: '#f8fafc' }} />
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-400">{centerLabel}</span>
          <span className="text-sm font-bold text-white">{centerValue}</span>
        </div>
      </div>
    </div>
  );
}
