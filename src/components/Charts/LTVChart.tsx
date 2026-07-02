'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface LTVDataPoint {
  period: string;
  ltv: number;
  loanBalance: number;
  propertyValue: number;
}

interface LTVChartProps {
  data: LTVDataPoint[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function LTVChart({ data, height = 300 }: LTVChartProps) {
  // Sort data chronologically if needed (assuming already sorted by caller)
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

        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #9E9DA0; display: block; margin-bottom: 4px;">${d.period}</strong>
            <span style="color: #9E9DA0">LTV Ratio:</span> <strong style="color: #454955">${d.ltv.toFixed(1)}%</strong><br/>
            <span style="color: #9E9DA0">Loan Balance:</span> <strong style="color: #9E9DA0">${fmtUSD(d.loanBalance)}</strong><br/>
            <span style="color: #9E9DA0">Property Value:</span> <strong style="color: #9E9DA0">${fmtUSD(d.propertyValue)}</strong>
          </div>
        `;
      }
    },
    legend: {
      show: false
    },
    grid: {
      top: 30,
      right: 40,
      bottom: 40,
      left: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.period),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9E9DA0', // var(--color-on-surface-variant)
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9E9DA0', // var(--color-on-surface-variant)
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'LTV Trajectory',
        type: 'line',
        data: data.map((d) => ({
          value: d.ltv,
          itemStyle: {
            color: '#454955' // var(--color-primary)
          }
        })),
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
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
              { offset: 0, color: 'rgba(87, 241, 189, 0.15)' },
              { offset: 1, color: 'rgba(87, 241, 189, 0)' }
            ]
          }
        },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          lineStyle: {
            color: '#ffb4ab', // var(--color-error)
            type: 'dashed',
            width: 1.5
          },
          label: {
            formatter: '80% Refy Threshold',
            position: 'end',
            fontSize: 9,
            color: '#ffb4ab',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: '600'
          },
          data: [
            { yAxis: 80 }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
