import React from 'react';
import ReactECharts from 'echarts-for-react';

interface PortfolioItem {
  name: string;
  ratio: number;
  color: string;
}

interface ExpenseRatioBarChartProps {
  data: PortfolioItem[];
  height?: number | string;
}

export default function ExpenseRatioBarChart({ data, height = '100%' }: ExpenseRatioBarChartProps) {
  const options = {
    grid: {
      top: 20,
      right: 40,
      bottom: 40,
      left: 30,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderColor: 'var(--border-ui, #e5e7eb)',
      textStyle: {
        color: 'var(--text-primary, #000000)',
        fontSize: 12
      },
      formatter: (params: any) => {
        const d = params[0];
        return `
          <div style="font-weight:bold;margin-bottom:4px;">${d.name}</div>
          <div style="color:#595959;font-weight:bold;">Expense Ratio: ${d.value.toFixed(1)}%</div>
        `;
      }
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'var(--text-secondary, #666)',
        fontSize: 10,
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'var(--border-ui, #e5e7eb)'
        }
      },
      axisLabel: {
        color: 'var(--text-secondary, #666)',
        fontSize: 10,
        formatter: '{value}%'
      }
    },
    series: [
      {
        data: data.map(d => ({
          value: d.ratio,
          itemStyle: { color: d.color, borderRadius: [4, 4, 0, 0] }
        })),
        type: 'bar',
        barMaxWidth: 36,
        markLine: {
          symbol: ['none', 'none'],
          data: [{ yAxis: 40 }],
          label: {
            position: 'end',
            formatter: '40% avg',
            color: '#A5A5A5',
            fontSize: 10
          },
          lineStyle: {
            color: '#A5A5A5',
            type: 'dashed'
          }
        }
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
