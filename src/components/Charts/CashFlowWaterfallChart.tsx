'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface CashFlowWaterfallPoint {
  name: string;
  value: number;
  fill: string;
  type: string;
}

interface CashFlowWaterfallChartProps {
  data: CashFlowWaterfallPoint[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function CashFlowWaterfallChart({ data, height = 300 }: CashFlowWaterfallChartProps) {
  // Compute ECharts Waterfall series data
  let runningSum = 0;
  const helperData: number[] = [];
  const valueData: number[] = [];
  const colors: string[] = [];

  data.forEach((item, index) => {
    if (index === 0) {
      helperData.push(0);
      valueData.push(item.value);
      runningSum = item.value;
    } else if (index === data.length - 1) {
      helperData.push(0);
      valueData.push(item.value);
    } else {
      if (item.value >= 0) {
        helperData.push(runningSum);
        valueData.push(item.value);
        runningSum += item.value;
      } else {
        runningSum += item.value;
        helperData.push(runningSum);
        valueData.push(Math.abs(item.value));
      }
    }
    colors.push(item.fill);
  });

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
        const visibleParam = params.find(p => p.seriesName === 'Value');
        if (!visibleParam) return '';
        const idx = visibleParam.dataIndex;
        const item = data[idx];
        if (!item) return '';

        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #9E9DA0; display: block; margin-bottom: 4px;">${item.name}</strong>
            <span style="color: #9E9DA0">Amount:</span> <strong style="color: ${item.value >= 0 ? '#454955' : '#ffb4ab'}">${fmtUSD(item.value)}</strong>
          </div>
        `;
      }
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 40,
      left: 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
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
        name: 'Placeholder',
        type: 'bar',
        stack: 'Total',
        silent: true,
        itemStyle: {
          borderColor: 'transparent',
          color: 'transparent'
        },
        data: helperData
      },
      {
        name: 'Value',
        type: 'bar',
        stack: 'Total',
        data: valueData.map((val, idx) => ({
          value: val,
          itemStyle: {
            color: colors[idx]
          }
        })),
        barMaxWidth: 48,
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            const idx = params.dataIndex;
            const item = data[idx];
            if (!item || Math.abs(item.value) < 100) return '';
            return fmtUSD(item.value);
          },
          fontSize: 10,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          color: '#ffffff'
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
