import React from 'react';
import ReactECharts from 'echarts-for-react';

interface IRRData {
  year: number;
  irrPct: number | null;
  exitValue: number;
  totalCashFlows: number;
}

interface IRRChartProps {
  data: IRRData[];
  height?: number | string;
}

const fmtPct = (v: number) => `${(v).toFixed(1)}%`;
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function IRRChart({ data, height = 300 }: IRRChartProps) {
  const chartData = data.filter(d => d.irrPct !== null);

  const options = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = params[0];
        const val = item.value;
        const dataItem = chartData[item.dataIndex];
        return `
          <div style="font-family: inherit; font-size: 12px;">
            <strong>Year ${dataItem.year} Hold</strong><br/>
            <span style="color: #7F7F7F">IRR:</span> <strong style="color: #595959">${fmtPct(val)}</strong><br/>
            <span style="color: #7F7F7F">Exit Value:</span> <strong style="color: #595959">${fmtUSD(dataItem.exitValue)}</strong><br/>
            <span style="color: #7F7F7F">Total Cash Flows:</span> <strong style="color: #A5A5A5">${fmtUSD(dataItem.totalCashFlows)}</strong>
          </div>
        `;
      }
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 40,
      left: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.year),
      name: 'Hold Period (Years)',
      nameLocation: 'middle',
      nameGap: 25,
      nameTextStyle: {
        fontSize: 9,
        color: '#A5A5A5'
      },
      axisLabel: {
        fontSize: 10,
        color: '#A5A5A5',
      },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
        fontSize: 10,
        color: '#A5A5A5'
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#F2F2F2'
        }
      }
    },
    series: [
      {
        type: 'line',
        name: 'IRR %',
        data: chartData.map(d => d.irrPct),
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: '#7F7F7F'
        },
        lineStyle: {
          color: '#7F7F7F',
          width: 2.5
        },
        markLine: {
          symbol: 'none',
          data: [
            {
              yAxis: 10,
              label: { formatter: 'S&P 500 avg', position: 'insideEndTop', color: '#A5A5A5', fontSize: 9 },
              lineStyle: { color: '#A5A5A5', type: 'dashed' }
            },
            {
              yAxis: 0,
              label: { show: false },
              lineStyle: { color: '#EF4444', type: 'dashed' }
            }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={options} style={{ height, width: '100%' }} />;
}
