'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface AlternativeItem {
  name: string;
  rate: number;
  color: string;
}

interface CoCAlternativesChartProps {
  data: AlternativeItem[];
  height?: number | string;
}

export default function CoCAlternativesChart({ data, height = 240 }: CoCAlternativesChartProps) {
  // ECharts displays category axis from bottom to top, so reverse the data to keep "This Property" at the top
  const reversedData = [...data].reverse();

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
        const item = params[0];
        if (!item) return '';
        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #dae4ec; display: block; margin-bottom: 4px;">${item.name}</strong>
            <span style="color: #bacac5">Return Rate:</span> <strong style="color: ${item.color}">${item.value.toFixed(2)}%</strong>
          </div>
        `;
      }
    },
    grid: {
      top: 10,
      right: 30,
      bottom: 20,
      left: 10,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      axisLabel: {
        color: '#bacac5',
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        formatter: '{value}%'
      }
    },
    yAxis: {
      type: 'category',
      data: reversedData.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#dae4ec',
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }
    },
    series: [
      {
        name: 'Return Rate',
        type: 'bar',
        data: reversedData.map(d => ({
          value: d.rate,
          itemStyle: {
            color: d.color,
            borderRadius: [0, 4, 4, 0]
          }
        })),
        barMaxWidth: 16
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
