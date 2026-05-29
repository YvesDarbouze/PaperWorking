import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface CashFlowData {
  period: string;
  gpr: number;
  opEx: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
  isLoading?: boolean;
}

export function CashFlowChart({ data, isLoading }: CashFlowChartProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (isLoading || !isMounted) {
    return (
      <div className="w-full h-[250px] flex flex-col justify-between p-4 bg-slate-900/10 rounded-xl border border-white/5 animate-pulse">
        {/* Y Axis lines */}
        <div className="flex-1 flex flex-col justify-between gap-6 pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full border-t border-dashed border-white/5"></div>
          ))}
        </div>
        {/* Bars */}
        <div className="flex items-end justify-around gap-4 h-[120px] px-8">
          {[60, 80, 70, 100, 90].map((h, i) => (
            <div key={i} className="flex gap-1.5 items-end w-full max-w-[50px]">
              <div style={{ height: `${h}px` }} className="w-1/2 bg-teal-500/20 rounded-t-sm"></div>
              <div style={{ height: `${h * 0.6}px` }} className="w-1/2 bg-teal-500/5 rounded-t-sm"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[250px] flex flex-col items-center justify-center bg-slate-900/10 rounded-xl border border-white/5 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-300 font-sans">No Data Available</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px] font-sans">Rent and expense projections will display here once property values are configured.</p>
      </div>
    );
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: (params: Array<{ name: string; seriesName: string; marker: string; value: number }>) => {
        let result = `<div class="font-semibold mb-1">${params[0].name}</div>`;
        params.forEach(param => {
          result += `<div>${param.marker} ${param.seriesName}: $${param.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>`;
        });
        return result;
      }
    },
    legend: {
      data: ['Gross Potential Rent', 'Operating Expenses'],
      bottom: 0,
      textStyle: { color: '#94a3b8' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.period),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      axisLabel: {
        color: '#94a3b8',
        formatter: (value: number) => `$${(value / 1000)}k`
      }
    },
    series: [
      {
        name: 'Gross Potential Rent',
        type: 'bar',
        itemStyle: { color: '#14b8a6', borderRadius: [2, 2, 0, 0] },
        data: data.map(d => d.gpr)
      },
      {
        name: 'Operating Expenses',
        type: 'bar',
        itemStyle: { color: 'rgba(20, 184, 166, 0.3)', borderRadius: [2, 2, 0, 0] },
        data: data.map(d => d.opEx)
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 250, width: '100%' }} />;
}
