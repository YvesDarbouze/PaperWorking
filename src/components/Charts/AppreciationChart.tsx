'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface AppreciationDataPoint {
  year: number;
  conservative: number;
  projected: number;
  optimistic: number;
  equityGained: number;
  projRate: number;
}

interface AppreciationChartProps {
  data: AppreciationDataPoint[];
  holdYears: number;
  appreciationRate: number;
}

export default function AppreciationChart({ data, holdYears, appreciationRate }: AppreciationChartProps) {
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
        const fmtUSD = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        return `
          <div style="font-weight: bold; margin-bottom: 4px;">Year ${d.year}</div>
          <div style="color: #A5A5A5">Conservative (3%): ${fmtUSD(d.conservative)}</div>
          <div style="color: #7F7F7F">Projected (${d.projRate}%): ${fmtUSD(d.projected)}</div>
          <div style="color: #595959">Optimistic (7%): ${fmtUSD(d.optimistic)}</div>
          <div style="margin-top: 4px; color: #595959;">Equity Built: ${fmtUSD(d.equityGained)}</div>
        `;
      }
    },
    legend: {
      data: ['Optimistic (7%)', `Projected (${appreciationRate}%)`, 'Conservative (3%)'],
      top: 0,
      textStyle: {
        fontSize: 10,
        color: 'var(--text-secondary, #6B7280)'
      }
    },
    grid: {
      top: 40,
      right: 20,
      bottom: 20,
      left: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.year.toString()),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'var(--text-secondary, #6B7280)',
        fontSize: 10
      },
      name: 'Years Held',
      nameLocation: 'middle',
      nameGap: 25,
      nameTextStyle: {
        color: 'var(--text-secondary, #6B7280)',
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
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
        formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`
      }
    },
    series: [
      {
        name: 'Optimistic (7%)',
        type: 'line',
        data: data.map(d => ({ value: d.optimistic, ...d })),
        symbol: 'none',
        lineStyle: {
          color: '#595959',
          width: 1.5
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(89,89,89,0.15)' },
              { offset: 1, color: 'rgba(89,89,89,0)' }
            ]
          }
        },
        markLine: {
          data: [
            {
              xAxis: holdYears.toString(),
              label: {
                formatter: `Exit Yr ${holdYears}`,
                position: 'insideEndTop',
                color: '#595959',
                fontSize: 10
              },
              lineStyle: {
                color: '#595959',
                type: 'dashed',
                width: 1
              }
            }
          ],
          symbol: ['none', 'none']
        }
      },
      {
        name: `Projected (${appreciationRate}%)`,
        type: 'line',
        data: data.map(d => ({ value: d.projected, ...d })),
        symbol: 'none',
        lineStyle: {
          color: '#7F7F7F',
          width: 2.5
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(127,127,127,0.2)' },
              { offset: 1, color: 'rgba(127,127,127,0)' }
            ]
          }
        }
      },
      {
        name: 'Conservative (3%)',
        type: 'line',
        data: data.map(d => ({ value: d.conservative, ...d })),
        symbol: 'none',
        lineStyle: {
          color: '#A5A5A5',
          width: 1.5
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(165,165,165,0.15)' },
              { offset: 1, color: 'rgba(165,165,165,0)' }
            ]
          }
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
}
