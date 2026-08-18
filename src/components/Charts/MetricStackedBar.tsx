'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface MetricStackedBarProps {
  data?: any[];
}

export function MetricStackedBar({
  data = [
    { month: 'Jan', tax: 200, insurance: 150, maintenance: 200, management: 240, utilities: 100, capex: 100 },
    { month: 'Feb', tax: 200, insurance: 150, maintenance: 200, management: 240, utilities: 100, capex: 100 },
    { month: 'Mar', tax: 200, insurance: 150, maintenance: 350, management: 240, utilities: 100, capex: 100 },
    { month: 'Apr', tax: 200, insurance: 150, maintenance: 200, management: 240, utilities: 100, capex: 100 },
  ],
}: MetricStackedBarProps) {
  return (
    <div className="h-64 w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Monthly Operating Expenses by Category</h4>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `$${v}`} />
          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', color: '#f8fafc' }} />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
          <Bar dataKey="tax" stackId="a" fill="#3b82f6" name="Tax" />
          <Bar dataKey="insurance" stackId="a" fill="#10b981" name="Insurance" />
          <Bar dataKey="maintenance" stackId="a" fill="#f59e0b" name="Maintenance" />
          <Bar dataKey="management" stackId="a" fill="#8b5cf6" name="Management" />
          <Bar dataKey="utilities" stackId="a" fill="#ec4899" name="Utilities" />
          <Bar dataKey="capex" stackId="a" fill="#06b6d4" name="CapEx" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
