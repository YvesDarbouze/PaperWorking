import React from 'react';
import ReactECharts from 'echarts-for-react';

interface ExpenseItem {
  name: string;
  value: number;
  color: string;
}

interface ExpenseRatioPieChartProps {
  data: ExpenseItem[];
  height?: number | string;
}

export default function ExpenseRatioPieChart({ data, height = 220 }: ExpenseRatioPieChartProps) {
  const options = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderColor: 'var(--border-ui, #e5e7eb)',
      textStyle: {
        color: 'var(--text-primary, #000000)',
        fontSize: 12
      },
      formatter: (params: any) => {
        const value = params.value;
        const fmtUSD = `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        return `
          <div style="font-weight:bold;margin-bottom:4px;">${params.name}</div>
          <div style="color:${params.color};font-weight:bold;">${fmtUSD}/yr</div>
          <div style="color:var(--text-secondary, #666);">${params.percent.toFixed(1)}% of expenses</div>
        `;
      }
    },
    series: [
      {
        name: 'Operating Expenses',
        type: 'pie',
        radius: ['60%', '95%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: 'var(--bg-surface, #fff)',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: false,
          }
        },
        labelLine: {
          show: false
        },
        data: data.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: item.color }
        }))
      }
    ]
  };

  return (
    <ReactECharts
      option={options}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
}
