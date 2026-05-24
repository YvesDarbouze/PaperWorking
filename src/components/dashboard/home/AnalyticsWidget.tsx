'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { Project } from '@/types/schema';
import { computeNOIComponents } from '@/lib/metrics/reiMetrics';

interface AnalyticsWidgetProps {
  projects: Project[];
}

type ChartMetric = 'Holding Costs' | 'Cost per Lead/Deal' | 'After Repair Value (ARV)';

const dummyData = [
  { month: 'Aug', holding: 1200, cpl: 400, arv: 450000 },
  { month: 'Sep', holding: 1500, cpl: 350, arv: 460000 },
  { month: 'Oct', holding: 1100, cpl: 450, arv: 455000 },
  { month: 'Nov', holding: 1800, cpl: 500, arv: 470000 },
  { month: 'Dec', holding: 1300, cpl: 420, arv: 480000 },
  { month: 'Jan', holding: 1600, cpl: 380, arv: 490000 },
];

export default function AnalyticsWidget({ projects }: AnalyticsWidgetProps) {
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('Holding Costs');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const metrics: ChartMetric[] = ['Holding Costs', 'Cost per Lead/Deal', 'After Repair Value (ARV)'];

  const chartData = useMemo(() => {
    // If we have actual project data, we could calculate this over time.
    // For now, mapping dummy data to the selected metric.
    return dummyData.map((d) => ({
      name: d.month,
      value: selectedMetric === 'Holding Costs' ? d.holding : selectedMetric === 'Cost per Lead/Deal' ? d.cpl : d.arv,
    }));
  }, [selectedMetric, projects]);

  const latestValue = chartData[chartData.length - 1].value;
  const formattedValue = selectedMetric === 'After Repair Value (ARV)' 
    ? `$${latestValue.toLocaleString()}` 
    : `$${latestValue.toFixed(2)}`;

  return (
    <div className="glass-card rounded-3xl p-6 h-full flex flex-col relative overflow-visible">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Analytics</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant opacity-80">Productivity analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Select Chart</span>
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 rounded-full font-label-sm text-label-sm text-on-surface hover:bg-white/10 transition-colors"
            >
              {selectedMetric}
              <ChevronDown className="w-4 h-4 text-on-surface-variant" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-lg overflow-hidden z-20">
                {metrics.map((m) => (
                  <button
                    key={m}
                    className="w-full text-left px-4 py-3 font-label-sm text-label-sm text-on-surface hover:bg-white/5 transition-colors"
                    onClick={() => {
                      setSelectedMetric(m);
                      setDropdownOpen(false);
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#A1A1AA" />
            <YAxis fontSize={10} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} width={60} stroke="#A1A1AA" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
              itemStyle={{ color: '#FFFFFF' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#00E5FF" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#00E5FF', stroke: '#00E5FF' }} 
              activeDot={{ r: 6, fill: '#00E5FF', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="absolute bottom-6 right-6 text-right z-10 pointer-events-none">
        <p className="font-display-sm text-display-sm text-primary tracking-tight glow-text-cyan">{formattedValue}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">Avg. {selectedMetric}</p>
      </div>
    </div>
  );
}
