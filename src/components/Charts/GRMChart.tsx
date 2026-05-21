import React from 'react';
import ReactECharts from 'echarts-for-react';

interface GRMData {
  name: string;
  grm: number;
  purchasePrice: number;
  grossAnnualRent: number;
}

interface GRMChartProps {
  data: GRMData[];
  height?: number | string;
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function GRMChart({ data, height = 300 }: GRMChartProps) {
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
            <span style="color: #7F7F7F">GRM:</span> <strong style="color: #595959">${val.toFixed(1)}×</strong><br/>
            <span style="color: #7F7F7F">Annual Rent:</span> <strong>${fmtUSD(dataItem.grossAnnualRent)}</strong><br/>
            <span style="color: #7F7F7F">Price:</span> <strong>${fmtUSD(dataItem.purchasePrice)}</strong>
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
          let color = '#DC2626'; // Very High (>20)
          if (d.grm <= 0) color = '#94A3B8'; // No Data
          else if (d.grm <= 8) color = '#595959'; // Excellent
          else if (d.grm <= 12) color = '#7F7F7F'; // Typical
          else if (d.grm <= 15) color = '#A5A5A5'; // Moderate
          else if (d.grm <= 20) color = '#EF4444'; // High
          
          return {
            value: d.grm,
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
              yAxis: 8,
              label: { formatter: '8× excellent', position: 'insideEndTop', color: '#595959', fontSize: 9 },
              lineStyle: { color: '#595959', type: 'dashed' }
            },
            {
              yAxis: 12,
              label: { formatter: '12× typical', position: 'insideEndTop', color: '#7F7F7F', fontSize: 9 },
              lineStyle: { color: '#7F7F7F', type: 'dashed' }
            },
            {
              yAxis: 15,
              label: { formatter: '15× moderate', position: 'insideEndTop', color: '#A5A5A5', fontSize: 9 },
              lineStyle: { color: '#A5A5A5', type: 'dashed' }
            }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={options} style={{ height, width: '100%' }} />;
}
