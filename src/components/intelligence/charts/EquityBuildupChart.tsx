import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface EquityBuildupData {
  period: string;
  loanBalance: number;
  equity: number;
}

interface EquityBuildupChartProps {
  data: EquityBuildupData[];
  isLoading?: boolean;
}

export function EquityBuildupChart({ data, isLoading }: EquityBuildupChartProps) {
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
        {/* Area lines represented as an SVG path skeleton */}
        <div className="h-[120px] w-full relative overflow-hidden flex items-end">
          <svg className="w-full h-full text-slate-800/30" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 80 Q 25 70, 50 60 T 100 40 L 100 100 L 0 100 Z" fill="currentColor" opacity="0.4" className="text-slate-700/40" />
            <path d="M0 60 Q 25 50, 50 35 T 100 10 L 100 80 Q 50 60, 0 80 Z" fill="currentColor" opacity="0.2" className="text-teal-500/20" />
          </svg>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[250px] flex flex-col items-center justify-center bg-slate-900/10 rounded-xl border border-white/5 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-300 font-sans">No Equity Data</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px] font-sans">Equity buildup and loan amortization timeline will show here.</p>
      </div>
    );
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: (params: Array<{ name: string; seriesName: string; marker: string; value: number }>) => {
        let result = `<div class="font-semibold mb-1">${params[0].name}</div>`;
        let total = 0;
        params.forEach(param => {
          total += param.value;
          result += `<div>${param.marker} ${param.seriesName}: $${param.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>`;
        });
        result += `<div class="mt-1 pt-1 border-t border-slate-600">Total Value: $${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>`;
        return result;
      }
    },
    legend: {
      data: ['Loan Balance', 'Equity'],
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
      boundaryGap: false,
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
        name: 'Loan Balance',
        type: 'line',
        stack: 'total',
        areaStyle: {},
        emphasis: { focus: 'series' },
        itemStyle: { color: '#64748b' }, // slate-500
        lineStyle: { width: 2 },
        data: data.map(d => d.loanBalance)
      },
      {
        name: 'Equity',
        type: 'line',
        stack: 'total',
        areaStyle: {},
        emphasis: { focus: 'series' },
        itemStyle: { color: '#14b8a6' }, // teal-500
        lineStyle: { width: 2 },
        data: data.map(d => d.equity)
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 250, width: '100%' }} />;
}
