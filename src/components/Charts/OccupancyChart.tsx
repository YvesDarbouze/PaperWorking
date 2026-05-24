import React from 'react';
import ReactECharts from 'echarts-for-react';

interface OccupancyData {
  name: string;
  occupancyRate: number;
}

interface OccupancyChartProps {
  data: OccupancyData[];
  height?: number | string;
}

export default function OccupancyChart({ data, height = 300 }: OccupancyChartProps) {
  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        const val = item.value;
        return `
          <div style="font-family: inherit; font-size: 12px;">
            <strong>${item.name}</strong><br/>
            <span style="color: #7F7F7F">Occupancy:</span> <strong style="color: #595959">${val.toFixed(1)}%</strong><br/>
            <span style="color: #EF4444">Vacancy:</span> <strong>${(100 - val).toFixed(1)}%</strong>
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
      max: 100,
      min: 0,
      interval: 20,
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
        type: 'bar',
        data: data.map(d => {
          let color = '#595959';
          if (d.occupancyRate < 80) color = '#DC2626';
          else if (d.occupancyRate < 90) color = '#EF4444';
          else if (d.occupancyRate >= 97) color = '#595959';
          else if (d.occupancyRate >= 93) color = '#7F7F7F';
          else color = '#A5A5A5';
          
          return {
            value: d.occupancyRate,
            itemStyle: {
              color,
              borderRadius: [4, 4, 0, 0]
            }
          };
        }),
        barMaxWidth: 40,
        markArea: {
          silent: true,
          data: [
            [
              {
                yAxis: 88,
                itemStyle: {
                  color: 'rgba(89,89,89,0.06)'
                },
                label: {
                  show: true,
                  formatter: 'U.S. Norm (88%-92%)',
                  position: 'insideLeft',
                  color: '#A5A5A5',
                  fontSize: 8
                }
              },
              {
                yAxis: 92
              }
            ]
          ]
        },
        markLine: {
          symbol: 'none',
          data: [
            {
              yAxis: 90,
              label: {
                formatter: '90% U.S. avg',
                position: 'insideEndTop',
                color: '#6B7280',
                fontSize: 9
              },
              lineStyle: {
                color: '#6B7280',
                type: 'dashed'
              }
            }
          ]
        }
      }
    ]
  };

  return <ReactECharts option={options} style={{ height, width: '100%' }} />;
}
