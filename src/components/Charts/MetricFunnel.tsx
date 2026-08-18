'use client';

import React from 'react';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from 'recharts';

interface MetricFunnelProps {
  data?: { value: number; name: string; fill: string }[];
}

export function MetricFunnel({
  data = [
    { value: 100, name: 'Listings Viewed', fill: '#1e293b' },
    { value: 65, name: 'Inquiries', fill: '#334155' },
    { value: 40, name: 'Showings / Meetings', fill: '#0f766e' },
    { value: 15, name: 'Offers Accepted', fill: '#10B981' },
  ],
}: MetricFunnelProps) {
  return (
    <div className="h-64 w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Marketing & Sales Funnel</h4>
      <ResponsiveContainer width="100%" height="85%">
        <FunnelChart>
          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', color: '#f8fafc' }} />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" fill="#cbd5e1" stroke="none" dataKey="name" fontSize={11} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
