'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  title: string;
  color?: string; // Hex color code (default: #10b981)
  unit?: 'currency' | 'percent' | 'ratio' | 'days' | 'count' | string;
  height?: number | string;
}

export function TimeSeriesChart({
  data,
  title,
  color = '#10b981',
  unit = 'count',
  height = 280
}: TimeSeriesChartProps) {
  
  const formatValue = (v: number) => {
    switch (unit) {
      case 'currency':
        return v < 0
          ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      case 'percent':
        return `${v.toFixed(1)}%`;
      case 'ratio':
        return `${v.toFixed(2)}`;
      case 'days':
        return `${Math.round(v)} days`;
      default:
        return `${v}`;
    }
  };

  const option = {
    title: {
      text: title,
      show: false, // Title will be rendered in the HTML card header instead
    },
    tooltip: {
      trigger: 'axis',
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
        const date = item.name;
        const val = Number(item.value);
        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #94A3B8; display: block; margin-bottom: 4px;">${date}</strong>
            <span style="color: #E2E8F0">${title}:</span> 
            <strong style="color: ${color}">${formatValue(val)}</strong>
          </div>
        `;
      }
    },
    grid: {
      top: 20,
      right: 15,
      bottom: 50,
      left: 15,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
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
        margin: 12
      }
    },
    yAxis: {
      type: 'value',
      scale: true, // auto-scale Y-axis
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
        fontFamily: 'Inter, sans-serif',
        formatter: (v: number) => {
          if (unit === 'currency') {
            if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
            return `$${v}`;
          }
          if (unit === 'percent') {
            return `${v}%`;
          }
          return `${v}`;
        }
      }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        height: 14,
        bottom: 10,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        fillerColor: 'rgba(16, 185, 129, 0.1)',
        dataBackground: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.1)' },
          areaStyle: { color: 'rgba(255, 255, 255, 0.02)' }
        },
        selectedDataBackground: {
          lineStyle: { color: color },
          areaStyle: { color: `${color}33` }
        },
        handleSize: '100%',
        handleStyle: {
          color: '#cbd5e1',
          borderColor: '#94a3b8'
        },
        textStyle: {
          color: '#94A3B8',
          fontSize: 8,
          fontFamily: 'Inter, sans-serif'
        }
      }
    ],
    series: [
      {
        name: title,
        type: 'line',
        data: data.map(d => d.value),
        smooth: true, // spline curve
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        itemStyle: {
          color: color
        },
        lineStyle: {
          width: 2.5,
          color: color
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}33` }, // color with 20% opacity
              { offset: 1, color: `${color}00` }  // fully transparent
            ]
          }
        }
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
