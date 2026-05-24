import React from 'react';
import ReactECharts from 'echarts-for-react';

interface DSCRData {
  name: string;
  dscr: number;
  noi: number;
  annualDebtService: number;
}

interface DSCRChartProps {
  data: DSCRData[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function DSCRChart({ data, height = 300 }: DSCRChartProps) {
  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        const val = item.value;
        const dataItem = data[item.dataIndex];
        return `
          <div style="font-family: inherit; font-size: 12px;">
            <strong>${item.name}</strong><br/>
            <span style="color: #7F7F7F">DSCR:</span> <strong style="color: #595959">${val.toFixed(2)}×</strong><br/>
            <span style="color: #7F7F7F">NOI:</span> <strong>${fmtUSD(dataItem.noi)}/yr</strong><br/>
            <span style="color: #7F7F7F">Debt Service:</span> <strong>${fmtUSD(dataItem.annualDebtService)}/yr</strong>
          </div>
        `;
      }
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 60,
      left: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: {
        rotate: 30,
        interval: 0,
        fontSize: 10,
        color: '#A5A5A5',
        margin: 15
      },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}×',
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
        type: 'bar',
        data: data.map(d => {
          let color = '#EF4444'; // below 1.0 red
          if (d.dscr >= 1.5) color = '#595959';
          else if (d.dscr >= 1.25) color = '#7F7F7F';
          else if (d.dscr >= 1.0) color = '#A5A5A5';
          else if (d.dscr < 0.8) color = '#DC2626'; // deeper red for critical
          
          return {
            value: d.dscr,
            itemStyle: {
              color,
              borderRadius: [4, 4, 0, 0]
            }
          };
        }),
        barMaxWidth: 40,
        markLine: {
          symbol: 'none',
          data: [
            {
              yAxis: 1.0,
              label: { formatter: '1.0 break-even', position: 'insideEndTop', color: '#EF4444', fontSize: 9 },
              lineStyle: { color: '#EF4444', type: 'dashed' }
            },
            {
              yAxis: 1.25,
              label: { formatter: '1.25 typical lender min', position: 'insideEndTop', color: '#A5A5A5', fontSize: 9 },
              lineStyle: { color: '#A5A5A5', type: 'dashed' }
            }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={options} style={{ height, width: '100%' }} />;
}
