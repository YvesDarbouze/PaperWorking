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
    <div className="bg-[#FFFFFF] border border-[#A5A5A5] rounded-2xl p-6 shadow-sm h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">Analytics</h2>
          <p className="text-sm text-[#7F7F7F]">Productivity analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#1A1A1A]">Select Chart</span>
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-[#A5A5A5] rounded-full text-sm font-medium text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
            >
              {selectedMetric}
              <ChevronDown className="w-4 h-4 text-[#7F7F7F]" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] border border-[#A5A5A5] rounded-xl shadow-lg overflow-hidden z-10">
                {metrics.map((m) => (
                  <button
                    key={m}
                    className="w-full text-left px-4 py-3 text-sm text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
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
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#7F7F7F" />
            <YAxis fontSize={10} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} width={60} stroke="#7F7F7F" />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #A5A5A5', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              itemStyle={{ color: '#1A1A1A' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#595959" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#1A1A1A' }} 
              activeDot={{ r: 6, fill: '#1A1A1A' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="absolute bottom-6 right-6 text-right">
        <p className="text-3xl font-bold text-[#1A1A1A]">{formattedValue}</p>
        <p className="text-xs text-[#7F7F7F] uppercase tracking-wider font-semibold">Avg. {selectedMetric}</p>
      </div>
    </div>
  );
}
