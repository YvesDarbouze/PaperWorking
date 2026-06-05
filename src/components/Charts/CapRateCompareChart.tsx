'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface CapRateComparePoint {
  name: string;
  capRate: number;
  arvCapRate: number;
  color: string;
}

interface CapRateCompareChartProps {
  data: CapRateComparePoint[];
  height?: number | string;
}

export default function CapRateCompareChart({ data, height = 300 }: CapRateCompareChartProps) {
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
        const itemCR = params.find(p => p.seriesName === 'Cap Rate');
        const itemARV = params.find(p => p.seriesName === 'ARV Cap Rate');
        const name = params[0]?.name ?? '';

        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #dae4ec; display: block; margin-bottom: 4px;">${name}</strong>
            ${itemCR ? `<span style="color: #bacac5">Cap Rate:</span> <strong style="color: #20B2AA">${itemCR.value.toFixed(2)}%</strong><br/>` : ''}
            ${itemARV ? `<span style="color: #bacac5">ARV Cap Rate:</span> <strong style="color: #a0a4b0">${itemARV.value.toFixed(2)}%</strong>` : ''}
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
      left: 40,
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
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'Cap Rate',
        type: 'bar',
        data: data.map(d => ({
          value: d.capRate,
          itemStyle: {
            color: d.color,
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barMaxWidth: 16
      },
      {
        name: 'ARV Cap Rate',
        type: 'bar',
        data: data.map(d => d.arvCapRate),
        itemStyle: {
          color: '#454955', // primary brand color
          borderRadius: [4, 4, 0, 0]
        },
        barMaxWidth: 16
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
