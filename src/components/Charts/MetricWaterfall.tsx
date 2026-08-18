'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface MetricWaterfallProps {
  data?: { category: string; value: number }[];
}

export function MetricWaterfall({
  data = [
    { category: 'Gross Rent', value: 28800 },
    { category: 'Vacancy', value: -864 },
    { category: 'OpEx', value: -11880 },
    { category: 'Debt Service', value: -16929 },
    { category: 'Net Cash Flow', value: -873 },
  ],
}: MetricWaterfallProps) {
  return (
    <div className="h-64 w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Cash Flow Waterfall Breakdown</h4>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <XAxis dataKey="category" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `$${v}`} />
          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', color: '#f8fafc' }} />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10B981' : '#F43F5E'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
