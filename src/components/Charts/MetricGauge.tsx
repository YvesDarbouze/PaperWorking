'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MetricGaugeProps {
  value: number | null; // 0 to 100
  label?: string;
  isProjected?: boolean;
}

export function MetricGauge({ value, label = 'Occupancy', isProjected = false }: MetricGaugeProps) {
  if (value === null || value === undefined) {
    return (
      <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-700 rounded-lg p-2">
        <span className="text-sm font-semibold text-slate-400">—</span>
        <span className="text-xs text-amber-500 mt-1">Data Needed</span>
      </div>
    );
  }

  const safeVal = Math.min(100, Math.max(0, value));
  const data = [
    { name: 'Value', value: safeVal },
    { name: 'Remaining', value: 100 - safeVal },
  ];

  const color = isProjected ? '#F59E0B' : safeVal >= 80 ? '#10B981' : safeVal >= 50 ? '#F59E0B' : '#F43F5E';

  return (
    <div className={`h-28 w-full flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/50 ${isProjected ? 'border-2 border-dashed border-amber-500/50' : 'border border-slate-800'}`}>
      <ResponsiveContainer width="100%" height={80}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={30}
            outerRadius={42}
            paddingAngle={2}
            dataKey="value"
          >
            <Cell key="cell-0" fill={color} />
            <Cell key="cell-1" fill="#334155" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-6">
        <span className="text-base font-bold text-white">{safeVal.toFixed(1)}%</span>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}
