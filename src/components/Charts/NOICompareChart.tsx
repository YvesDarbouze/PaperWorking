'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface NOIComparePoint {
  name: string;
  actualNOI: number;
  estimate50: number;
}

interface NOICompareChartProps {
  data: NOIComparePoint[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function NOICompareChart({ data, height = 260 }: NOICompareChartProps) {
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#182127', // var(--color-surface-container)
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#dae4ec', // var(--color-on-surface)
        fontSize: 12,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      },
      formatter: (params: any[]) => {
        const item1 = params.find(p => p.seriesName === 'Actual NOI');
        const item2 = params.find(p => p.seriesName === '50% Estimate');
        const name = params[0]?.name ?? '';

        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #dae4ec; display: block; margin-bottom: 4px;">${name}</strong>
            ${item1 ? `<span style="color: #bacac5">${item1.seriesName}:</span> <strong style="color: #57f1db">${fmtUSD(item1.value)}</strong><br/>` : ''}
            ${item2 ? `<span style="color: #bacac5">${item2.seriesName}:</span> <strong style="color: #bacac5">${fmtUSD(item2.value)}</strong>` : ''}
          </div>
        `;
      }
    },
    legend: {
      show: true,
      top: '0%',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        color: '#bacac5',
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }
    },
    grid: {
      top: 40,
      right: 20,
      bottom: 40,
      left: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#bacac5',
        fontSize: 9,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        interval: 0,
        rotate: -20
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
        color: '#bacac5',
        fontSize: 9,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        formatter: (v: number) => {
          if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
          return `$${v}`;
        }
      }
    },
    series: [
      {
        name: 'Actual NOI',
        type: 'bar',
        data: data.map(d => d.actualNOI),
        itemStyle: {
          color: '#57f1db',
          borderRadius: [4, 4, 0, 0]
        },
        barMaxWidth: 16
      },
      {
        name: '50% Estimate',
        type: 'bar',
        data: data.map(d => d.estimate50),
        itemStyle: {
          color: '#7f7f7f',
          borderRadius: [4, 4, 0, 0]
        },
        barMaxWidth: 16
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
