'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface ProjectComparisonPoint {
  projectId: string;
  projectName: string;
  value: number;
}

interface PortfolioComparisonChartProps {
  data: ProjectComparisonPoint[];
  metricId: string;
  averageValue: number | null;
  height?: number | string;
}

export function PortfolioComparisonChart({
  data,
  metricId,
  averageValue,
  height = 320
}: PortfolioComparisonChartProps) {
  
  // Truncate name helper
  const truncateName = (name: string) => {
    if (name.length > 15) {
      return `${name.substring(0, 12)}...`;
    }
    return name;
  };

  const lowerIsBetter = [
    'grm',
    'ltv',
    'oer',
    'tenant_turnover',
    'days_on_market',
    'maintenance_per_unit',
    'risk_score'
  ].includes(metricId.toLowerCase());

  // Determine top 3 and bottom 3 indices
  // 1. Pair value with original index
  const indexedData = data.map((d, index) => ({ ...d, originalIndex: index }));
  
  // 2. Sort by value ascending
  const sorted = [...indexedData].sort((a, b) => a.value - b.value);

  const top3OriginalIdxs = new Set<number>();
  const bottom3OriginalIdxs = new Set<number>();

  if (sorted.length > 0) {
    if (lowerIsBetter) {
      // Lower values are better (Top)
      // Top 3: first 3 items in sorted array
      sorted.slice(0, 3).forEach(item => top3OriginalIdxs.add(item.originalIndex));
      // Bottom 3: last 3 items in sorted array
      sorted.slice(Math.max(3, sorted.length - 3)).forEach(item => bottom3OriginalIdxs.add(item.originalIndex));
    } else {
      // Higher values are better (Top)
      // Top 3: last 3 items in sorted array
      sorted.slice(Math.max(0, sorted.length - 3)).forEach(item => top3OriginalIdxs.add(item.originalIndex));
      // Bottom 3: first 3 items in sorted array
      sorted.slice(0, Math.min(sorted.length - 3, 3)).forEach(item => bottom3OriginalIdxs.add(item.originalIndex));
    }
  }

  // Format value display based on metric type
  const formatVal = (v: number) => {
    const mId = metricId.toLowerCase();
    if (mId.includes('rate') || mId === 'coc' || mId === 'oer' || mId === 'ltv' || mId === 'tenant_turnover' || mId === 'lease_renewal' || mId === 'roi') {
      return `${v.toFixed(1)}%`;
    }
    if (mId === 'dscr' || mId === 'grm' || mId === 'equity_multiple' || mId === 'listing_to_meeting' || mId === 'interest_coverage') {
      return `${v.toFixed(2)}`;
    }
    if (mId === 'days_on_market' || mId === 'payback_period') {
      return `${Math.round(v)} days`;
    }
    if (mId.includes('price') || mId === 'noi' || mId === 'cash_flow' || mId === 'capex' || mId === 'goi' || mId === 'maintenance_per_unit' || mId === 'construction_per_sqft' || mId === 'avg_commission') {
      return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    return `${v}`;
  };

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(30, 27, 32, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#E2E8F0',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif'
      },
      formatter: (params: any[]) => {
        const item = params[0];
        if (!item) return '';
        const name = data[item.dataIndex]?.projectName || '';
        const rawVal = Number(item.value);
        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #94A3B8; display: block; margin-bottom: 4px;">${name}</strong>
            <span style="color: #E2E8F0">Value:</span> 
            <strong style="color: ${item.color}">${formatVal(rawVal)}</strong>
          </div>
        `;
      }
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 40,
      left: 15,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => truncateName(d.projectName)),
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
        interval: 0,
        rotate: data.length > 5 ? -15 : 0
      }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif'
      }
    },
    series: [
      {
        type: 'bar',
        barWidth: '40%',
        data: data.map((d, index) => {
          let color = '#6366f1'; // Default Indigo
          if (top3OriginalIdxs.has(index)) {
            color = '#10b981'; // Green for top 3
          } else if (bottom3OriginalIdxs.has(index)) {
            color = '#ef4444'; // Red for bottom 3
          }

          return {
            value: d.value,
            itemStyle: {
              color: color,
              borderRadius: [4, 4, 0, 0]
            }
          };
        }),
        // Add Reference Line for average
        markLine: averageValue !== null ? {
          silent: true,
          symbol: 'none',
          lineStyle: {
            type: 'dashed',
            color: '#f59e0b', // Amber reference line
            width: 1.5
          },
          label: {
            show: true,
            position: 'end',
            formatter: `Avg: ${formatVal(averageValue)}`,
            color: '#f59e0b',
            fontSize: 9,
            fontFamily: 'Inter, sans-serif'
          },
          data: [
            { yAxis: averageValue }
          ]
        } : undefined
      }
    ]
  };

  if (data.length === 0) {
    return (
      <div 
        style={{ height }} 
        className="flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#121014]/40 text-center"
      >
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No Data Available</p>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
