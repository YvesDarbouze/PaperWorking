'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface AppreciationDataPoint {
  year: number;
  rate: number;
  isRealized: boolean;
}

interface AppreciationChartProps {
  data: AppreciationDataPoint[];
  holdYears: number;
}

export default function AppreciationChart({ data, holdYears }: AppreciationChartProps) {
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderColor: 'var(--border-ui, #e5e7eb)',
      textStyle: {
        color: 'var(--text-primary, #1A1A1A)',
        fontSize: 12
      },
      formatter: (params: any[]) => {
        const d = params[0].data;
        if (!d) return '';
        return `
          <div style="font-weight: bold; margin-bottom: 4px;">Year ${d.year}</div>
          <div style="color: #0d0d0d; font-weight: bold;">Annualized Appreciation: ${d.value.toFixed(2)}%</div>
          <div style="font-size: 10px; margin-top: 4px; color: ${d.isRealized ? '#595959' : '#7F7F7F'};">
            Status: ${d.isRealized ? 'Realized (Sale Closed)' : 'Estimated (Unrealized)'}
          </div>
        `;
      }
    },
    legend: {
      show: false
    },
    grid: {
      top: 40,
      right: 40,
      bottom: 40,
      left: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => `Yr ${d.year}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'var(--text-secondary, #6B7280)',
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: (value: any) => Math.max(8, Math.ceil(value.max + 2)),
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'var(--border-ui, #e5e7eb)'
        }
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'var(--text-secondary, #6B7280)',
        fontSize: 10,
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'Annualized Appreciation',
        type: 'line',
        data: data.map(d => ({
          value: d.rate,
          year: d.year,
          isRealized: d.isRealized,
          itemStyle: {
            color: d.isRealized ? '#0d0d0d' : '#7F7F7F'
          }
        })),
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: {
          color: '#595959',
          width: 2.5,
          type: 'solid'
        },
        markArea: {
          silent: true,
          itemStyle: {
            color: 'rgba(89,89,89,0.06)'
          },
          data: [
            [
              {
                yAxis: 3,
                name: 'Baseline Band (3-5%)',
                label: {
                  position: 'insideLeft',
                  color: '#A5A5A5',
                  fontSize: 9,
                  offset: [10, 0]
                }
              },
              {
                yAxis: 5
              }
            ]
          ]
        },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          lineStyle: {
            color: '#A5A5A5',
            type: 'dashed',
            width: 1
          },
          label: {
            formatter: '4% Long-Run Avg',
            position: 'end',
            fontSize: 9,
            color: '#A5A5A5'
          },
          data: [
            { yAxis: 4 }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />;
}
