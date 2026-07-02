'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface CashFlowComparePoint {
  name: string;
  noi: number;
  debtService: number;
  cashFlow: number;
}

interface CashFlowCompareChartProps {
  data: CashFlowComparePoint[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function CashFlowCompareChart({ data, height = 300 }: CashFlowCompareChartProps) {
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
        const itemNOI = params.find(p => p.seriesName === 'NOI');
        const itemDebt = params.find(p => p.seriesName === 'Debt Service');
        const itemCF = params.find(p => p.seriesName === 'Cash Flow');
        const name = params[0]?.name ?? '';

        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #9E9DA0; display: block; margin-bottom: 4px;">${name}</strong>
            ${itemNOI ? `<span style="color: #9E9DA0">NOI:</span> <strong style="color: #9E9DA0">${fmtUSD(itemNOI.value)}</strong><br/>` : ''}
            ${itemDebt ? `<span style="color: #9E9DA0">Debt Service:</span> <strong style="color: #ffb4ab">(${fmtUSD(Math.abs(itemDebt.value))})</strong><br/>` : ''}
            ${itemCF ? `<span style="color: #9E9DA0">Cash Flow:</span> <strong style="color: #454955">${fmtUSD(itemCF.value)}</strong>` : ''}
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
        color: '#9E9DA0',
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
        color: '#9E9DA0',
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
        color: '#9E9DA0',
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
        name: 'NOI',
        type: 'bar',
        data: data.map(d => d.noi),
        itemStyle: {
          color: '#7f7f7f',
          borderRadius: [4, 4, 0, 0]
        },
        barMaxWidth: 12
      },
      {
        name: 'Debt Service',
        type: 'bar',
        data: data.map(d => -Math.abs(d.debtService)), // explicitly negative representation
        itemStyle: {
          color: '#ffb4ab',
          borderRadius: [0, 0, 4, 4]
        },
        barMaxWidth: 12
      },
      {
        name: 'Cash Flow',
        type: 'bar',
        data: data.map(d => d.cashFlow),
        itemStyle: {
          color: '#454955',
          borderRadius: [4, 4, 0, 0]
        },
        barMaxWidth: 12
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
