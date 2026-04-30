'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { PieChart, Layout } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AssetMixChart — Portfolio Concentration
   
   Visualizes where capital (Estimated ARV) is concentrated across 
   different deal phases.
   Aesthetics: Grayscale hierarchy, institutional treemap layout.
   ═══════════════════════════════════════════════════════════════ */

interface MixDataPoint {
  name: string;
  value: number;
  count: number;
  color: string;
  [key: string]: any;
}

function computeMixData(projects: Project[]): MixDataPoint[] {
  const phaseMap: Record<string, { value: number; count: number; color: string }> = {
    'Lead':           { value: 0, count: 0, color: '#F2F2F2' },
    'Evaluation':     { value: 0, count: 0, color: '#CCCCCC' },
    'Under Contract': { value: 0, count: 0, color: '#A5A5A5' },
    'Renovating':     { value: 0, count: 0, color: '#7F7F7F' },
    'Listed':         { value: 0, count: 0, color: '#595959' },
    'Sold':           { value: 0, count: 0, color: '#000000' },
  };

  projects.forEach(p => {
    const phase = p.status || 'Lead';
    const value = p.financials?.estimatedARV || p.financials?.purchasePrice || 0;
    
    if (phaseMap[phase]) {
      phaseMap[phase].value += value;
      phaseMap[phase].count += 1;
    } else {
      // Handle custom statuses if any
      if (!phaseMap['Other']) phaseMap['Other'] = { value: 0, count: 0, color: '#DEDEDE' };
      phaseMap['Other'].value += value;
      phaseMap['Other'].count += 1;
    }
  });

  return Object.entries(phaseMap)
    .filter(([, data]) => data.count > 0)
    .map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
      color: data.color,
    }));
}

const CustomizedContent = (props: any) => {
  const { x, y, width, height, index, name, color, value } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: '#FFFFFF',
          strokeWidth: 2,
          strokeOpacity: 0.1,
        }}
      />
      {width > 60 && height > 40 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={index > 3 ? '#FFFFFF' : '#595959'}
          fontSize={10}
          fontWeight={700}
          className="uppercase tracking-widest pointer-events-none"
        >
          {name}
        </text>
      )}
    </g>
  );
};

function formatCurrency(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
  return `$${val}`;
}

interface AssetMixChartProps {
  projects: Project[];
}

export default function AssetMixChart({ projects }: AssetMixChartProps) {
  const data = useMemo(() => computeMixData(projects), [projects]);

  return (
    <div className="w-full h-full p-6 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-bg-primary/50 flex items-center justify-center text-text-secondary group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500 shadow-sm border border-border-accent/5">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <p className="ag-label opacity-40 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-[0.25em] text-[9px] text-pw-black">
              Asset Concentration
            </p>
            <h3 className="text-2xl font-light text-text-primary tracking-tighter">Portfolio Mix</h3>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary opacity-30">
          <PieChart className="w-10 h-10 mb-3 stroke-[1px]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[10px]">No Asset Data</p>
          <p className="text-[10px] mt-1 opacity-50">Add project financials to see allocation</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="#FFFFFF"
                content={<CustomizedContent />}
                animationDuration={1500}
              >
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                    padding: '12px',
                  }}
                  itemStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  formatter={(value: any, name: any, props: any) => {
                    return [formatCurrency(Number(value)), props.payload.name];
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>

          {/* Breakdown List */}
          <div className="grid grid-cols-2 gap-px bg-border-accent/5 border border-border-accent/5 rounded-xl overflow-hidden shadow-sm">
            {data.map((item) => (
              <div key={item.name} className="bg-white/50 backdrop-blur-sm p-4 flex items-center justify-between group/item hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] group-hover/item:text-text-primary transition-colors">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono text-text-primary tracking-tight">{formatCurrency(item.value)}</p>
                  <p className="text-[9px] text-text-secondary opacity-40 font-bold uppercase tracking-widest">{item.count} deal{item.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
