'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface DonutItem {
  name: string;
  value: number;
  fill: string;
}

interface ExpenseDonutChartProps {
  data: DonutItem[];
  height?: number | string;
  centerText?: string;
  centerSubtext?: string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function ExpenseDonutChart({
  data,
  height = 240,
  centerText,
  centerSubtext
}: ExpenseDonutChartProps) {
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#182127', // var(--color-surface-container)
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#dae4ec', // var(--color-on-surface)
        fontSize: 12,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      },
      formatter: (params: any) => {
        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #dae4ec; display: block; margin-bottom: 4px;">${params.name}</strong>
            <span style="color: #bacac5">Amount:</span> <strong style="color: ${params.color}">${fmtUSD(params.value)}</strong> (${params.percent.toFixed(1)}%)
          </div>
        `;
      }
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%',
      left: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        color: '#bacac5',
        fontSize: 10,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }
    },
    series: [
      {
        name: 'Expense Composition',
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        padAngle: 3,
        itemStyle: {
          borderRadius: 4
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: false
          }
        },
        labelLine: {
          show: false
        },
        data: data.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: d.fill
          }
        }))
      }
    ],
    // If centerText or centerSubtext is provided, we can overlay it using graphic components or let ECharts render it
    graphic: (centerText || centerSubtext) ? [
      {
        type: 'group',
        left: 'center',
        top: '38%',
        children: [
          {
            type: 'text',
            z: 100,
            left: 'center',
            top: 'middle',
            style: {
              fill: '#dae4ec',
              text: centerText || '',
              font: 'bold 16px Plus Jakarta Sans, sans-serif',
              textAlign: 'center'
            }
          },
          {
            type: 'text',
            z: 100,
            left: 'center',
            top: 20,
            style: {
              fill: '#bacac5',
              text: centerSubtext || '',
              font: '9px Plus Jakarta Sans, sans-serif',
              textAlign: 'center'
            }
          }
        ]
      }
    ] : []
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
