'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

interface MetricSparklineProps {
  data?: { month: string; value: number }[];
  color?: string;
  isProjected?: boolean;
}

export function MetricSparkline({
  data = [
    { month: 'M1', value: 1200 },
    { month: 'M2', value: 1250 },
    { month: 'M3', value: 1300 },
    { month: 'M4', value: 1280 },
    { month: 'M5', value: 1340 },
    { month: 'M6', value: 1400 },
  ],
  color = '#10B981',
  isProjected = false,
}: MetricSparklineProps) {
  if (!data || data.length === 0) {
    return <div className="h-10 text-xs text-slate-500 flex items-center justify-center">No Data</div>;
  }

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', color: '#f8fafc' }}
            formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Value']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={isProjected ? '#F59E0B' : color}
            strokeDasharray={isProjected ? '4 4' : undefined}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
