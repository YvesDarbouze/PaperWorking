'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface NOITrendPoint {
  month: string;
  noi: number;
  benchmark: number;
}

interface NOITrendChartProps {
  data: NOITrendPoint[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function NOITrendChart({ data, height = 260 }: NOITrendChartProps) {
  const benchmarkVal = data[0]?.benchmark ?? 0;

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20', // var(--color-surface-container)
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#9E9DA0', // var(--color-on-surface)
        fontSize: 12,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      },
      formatter: (params: any[]) => {
        const item = params[0];
        if (!item) return '';
        const idx = item.dataIndex;
        const d = data[idx];
        if (!d) return '';

        const diff = d.noi - d.benchmark;
        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #9E9DA0; display: block; margin-bottom: 4px;">${d.month}</strong>
            <span style="color: #9E9DA0">NOI:</span> <strong style="color: ${d.noi >= 0 ? '#454955' : '#ffb4ab'}">${fmtUSD(d.noi)}</strong><br/>
            <span style="color: #9E9DA0">50% Rule Benchmark:</span> <strong style="color: #9E9DA0">${fmtUSD(d.benchmark)}</strong><br/>
            <span style="color: ${diff >= 0 ? '#454955' : '#ffb4ab'}; font-size: 10px;">
              ${diff >= 0 ? '+' : ''}${fmtUSD(diff)} vs benchmark
            </span>
          </div>
        `;
      }
    },
    grid: {
      top: 30,
      right: 40,
      bottom: 30,
      left: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.month),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9E9DA0',
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
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
        color: '#9E9DA0',
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        formatter: (v: number) => {
          if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
          return `$${v}`;
        }
      }
    },
    series: [
      {
        name: 'NOI',
        type: 'line',
        data: data.map(d => d.noi),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        itemStyle: {
          color: '#454955'
        },
        lineStyle: {
          color: '#454955',
          width: 2.5
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 73, 85, 0.25)' },
              { offset: 1, color: 'rgba(69, 73, 85, 0.02)' }
            ]
          }
        },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          data: [
            {
              yAxis: 0,
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.2)',
                type: 'solid',
                width: 1
              }
            },
            {
              yAxis: benchmarkVal,
              lineStyle: {
                color: '#9E9DA0',
                type: 'dashed',
                width: 1.5
              },
              label: {
                formatter: '50% Rule',
                position: 'end',
                fontSize: 9,
                color: '#9E9DA0',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: '600'
              }
            }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
