'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface CashFlowTrendPoint {
  month: string;
  noi: number;
  cashFlow: number;
  debtService: number;
  isAnnual: boolean;
}

interface CashFlowTrendChartProps {
  data: CashFlowTrendPoint[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function CashFlowTrendChart({ data, height = 300 }: CashFlowTrendChartProps) {
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

        const cfColor = d.cashFlow < 0 ? '#ffb4ab' : '#57f1db';
        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #dae4ec; display: block; margin-bottom: 4px;">${d.month}</strong>
            <span style="color: #bacac5">NOI:</span> <strong style="color: #dae4ec">${fmtUSD(d.noi)}</strong><br/>
            <span style="color: #bacac5">Debt Service:</span> <strong style="color: #ffb4ab">(${fmtUSD(d.debtService)})</strong><br/>
            <span style="color: #bacac5">Cash Flow:</span> <strong style="color: ${cfColor}">${d.cashFlow >= 0 ? '+' : ''}${fmtUSD(d.cashFlow)}</strong>
          </div>
        `;
      }
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 40,
      left: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.month),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#bacac5',
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
        color: '#bacac5',
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
        name: 'Cash Flow',
        type: 'bar',
        data: data.map(d => ({
          value: d.cashFlow,
          itemStyle: {
            color: d.cashFlow < 0
              ? '#ffb4ab' // negative
              : d.isAnnual
                ? '#57f1db' // annual total
                : '#7f7f7f', // monthly positive
            borderRadius: d.cashFlow < 0 ? [0, 0, 4, 4] : [4, 4, 0, 0]
          }
        })),
        barMaxWidth: 30,
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          data: [
            {
              yAxis: 0,
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.2)',
                type: 'solid',
                width: 1.5
              },
              label: {
                formatter: 'Break-even',
                position: 'end',
                fontSize: 9,
                color: '#bacac5',
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
