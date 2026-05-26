'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface CoCComparePoint {
  name: string;
  cocReturn: number;
  annualCashFlow: number;
  totalCashInvested: number;
  color: string;
}

interface CoCCompareChartProps {
  data: CoCComparePoint[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function CoCCompareChart({ data, height = 300 }: CoCCompareChartProps) {
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
        const idx = item.dataIndex;
        const d = data[idx];
        if (!d) return '';

        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #dae4ec; display: block; margin-bottom: 4px;">${d.name}</strong>
            <span style="color: #bacac5">CoC Return:</span> <strong style="color: #57f1db">${d.cocReturn.toFixed(2)}%</strong><br/>
            <span style="color: #bacac5">Cash Flow:</span> <strong style="color: #dae4ec">${fmtUSD(d.annualCashFlow)}/yr</strong><br/>
            <span style="color: #bacac5">Invested:</span> <strong style="color: #dae4ec">${fmtUSD(d.totalCashInvested)}</strong>
          </div>
        `;
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
        name: 'CoC Return',
        type: 'bar',
        data: data.map(d => ({
          value: d.cocReturn,
          itemStyle: {
            color: d.color,
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barMaxWidth: 30,
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          data: [
            {
              yAxis: 8,
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)',
                type: 'dashed',
                width: 1.5
              },
              label: {
                formatter: '8% Target',
                position: 'end',
                fontSize: 9,
                color: '#bacac5',
                fontFamily: 'Plus Jakarta Sans, sans-serif'
              }
            },
            {
              yAxis: 12,
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)',
                type: 'dashed',
                width: 1.5
              },
              label: {
                formatter: '12% Excellent',
                position: 'end',
                fontSize: 9,
                color: '#bacac5',
                fontFamily: 'Plus Jakarta Sans, sans-serif'
              }
            }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
