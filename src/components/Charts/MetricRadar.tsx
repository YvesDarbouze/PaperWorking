'use client';

import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface MetricRadarProps {
  data?: { subject: string; score: number; fullMark: number }[];
}

export function MetricRadar({
  data = [
    { subject: 'Financial', score: 75, fullMark: 100 },
    { subject: 'Market', score: 85, fullMark: 100 },
    { subject: 'Operational', score: 65, fullMark: 100 },
    { subject: 'Compliance', score: 90, fullMark: 100 },
  ],
}: MetricRadarProps) {
  return (
    <div className="h-64 w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Risk Radar Assessment</h4>
      <ResponsiveContainer width="100%" height="90%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10 }} />
          <Radar name="Risk Score" dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
