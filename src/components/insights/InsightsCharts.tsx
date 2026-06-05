'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { PortfolioMetricSnapshot } from '@/hooks/usePortfolioMetricSnapshots';
import type { Project } from '@/types/schema';
import { deriveActualMetrics } from '@/lib/insights/engine';

interface ChartProps {
  snapshots: PortfolioMetricSnapshot[];
}

interface TooltipParam {
  axisValue: string;
  seriesName: string;
  value: number;
  color: string;
}

function getBreachPoints(
  periods: string[],
  data: number[],
  checkFn: (val: number) => boolean
) {
  const points: any[] = [];
  data.forEach((val, idx) => {
    if (checkFn(val)) {
      points.push({
        name: 'Breach',
        coord: [periods[idx], val],
        symbol: 'pin',
        symbolSize: 14,
        itemStyle: { color: '#f43f5e' },
        label: {
          show: true,
          formatter: '!',
          color: '#ffffff',
          fontSize: 8,
          fontWeight: 'bold',
          position: 'inside',
          offset: [0, -1]
        }
      });
    }
  });
  return points;
}

export function ShortTermTrendChart({ snapshots }: ChartProps) {
  const sorted = useMemo(() => {
    return [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [snapshots]);

  const periods = sorted.map((s) => s.period);
  const noiData = sorted.map((s) => s.noi ?? 0);
  const cfData = sorted.map((s) => s.monthlyCashFlow ?? 0);
  const vacancyData = sorted.map((s) => s.vacancyRate ?? 0);
  const oerData = sorted.map((s) => s.oer ?? 0);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11, fontFamily: 'var(--font-plus-jakarta)' },
      formatter: (params: unknown) => {
        const arr = params as TooltipParam[];
        if (!arr || arr.length === 0) return '';
        let res = `<div class="font-plus-jakarta text-xs font-light text-[#9E9DA0] mb-1">${arr[0].axisValue}</div>`;
        arr.forEach((p) => {
          let valStr = String(p.value);
          if (p.seriesName === 'NOI' || p.seriesName === 'Cash Flow') {
            valStr = '$' + Math.round(p.value).toLocaleString();
          } else if (p.seriesName === 'Vacancy' || p.seriesName === 'OER') {
            valStr = p.value.toFixed(1) + '%';
          }
          res += `
            <div class="flex items-center justify-between gap-4 text-xs font-plus-jakarta">
              <span class="flex items-center gap-1.5 font-light text-[#C0BEC2]">
                <span class="w-2 h-2 rounded-full" style="background:${p.color}"></span>
                ${p.seriesName}
              </span>
              <span class="font-mono font-semibold text-white">${valStr}</span>
            </div>
          `;
        });
        return res;
      }
    },
    legend: {
      data: ['NOI', 'Cash Flow', 'Vacancy', 'OER'],
      selected: {
        'NOI': true,
        'Cash Flow': true,
        'Vacancy': false,
        'OER': false,
      },
      textStyle: { color: '#9E9DA0', fontSize: 10, fontFamily: 'var(--font-plus-jakarta)' },
      bottom: 0,
    },
    grid: { top: 35, right: 45, bottom: 45, left: 65 },
    xAxis: {
      type: 'category',
      data: periods,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9E9DA0', fontSize: 9, fontFamily: 'var(--font-plus-jakarta)' },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Currency ($)',
        nameTextStyle: { color: '#859490', fontSize: 8, fontFamily: 'var(--font-plus-jakarta)' },
        axisLabel: {
          color: '#859490',
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          formatter: (v: number) => {
            if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
            return `$${v}`;
          }
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      {
        type: 'value',
        name: 'Percentage (%)',
        nameTextStyle: { color: '#859490', fontSize: 8, fontFamily: 'var(--font-plus-jakarta)' },
        axisLabel: { color: '#859490', fontSize: 9, fontFamily: 'var(--font-mono)', formatter: '{value}%' },
        splitLine: { show: false },
      }
    ],
    series: [
      {
        name: 'NOI',
        type: 'line',
        data: noiData,
        smooth: true,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: 'Cash Flow',
        type: 'line',
        data: cfData,
        smooth: true,
        lineStyle: { width: 2, color: '#454955' },
        itemStyle: { color: '#454955' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 73, 85, 0.15)' },
              { offset: 1, color: 'rgba(69, 73, 85, 0)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 6,
        markPoint: {
          data: getBreachPoints(periods, cfData, (v) => v < 0)
        }
      },
      {
        name: 'Vacancy',
        type: 'line',
        yAxisIndex: 1,
        data: vacancyData,
        smooth: true,
        lineStyle: { width: 2, color: '#F06543' },
        itemStyle: { color: '#F06543' },
        symbol: 'circle',
        symbolSize: 6,
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: 'rgba(239, 68, 68, 0.3)' },
          data: [
            { yAxis: 10, label: { formatter: 'Vacancy Threshold (10%)', position: 'end', color: '#F06543', fontSize: 8 } }
          ]
        },
        markPoint: {
          data: getBreachPoints(periods, vacancyData, (v) => v > 10)
        }
      },
      {
        name: 'OER',
        type: 'line',
        yAxisIndex: 1,
        data: oerData,
        smooth: true,
        lineStyle: { width: 2, color: '#f59e0b' },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 6,
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: 'rgba(245, 158, 11, 0.3)' },
          data: [
            { yAxis: 40, label: { formatter: 'OER Target (40%)', position: 'start', color: '#f59e0b', fontSize: 8 } }
          ]
        },
        markPoint: {
          data: getBreachPoints(periods, oerData, (v) => v > 40)
        }
      }
    ],
  };

  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export function LongTermTrendChart({ snapshots }: ChartProps) {
  const sorted = useMemo(() => {
    return [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [snapshots]);

  const periods = sorted.map((s) => s.period);
  const capRateData = sorted.map((s) => s.capRate ?? 0);
  const cocData = sorted.map((s) => s.cashOnCashReturn ?? 0);
  const appreciationData = sorted.map((s) => s.appreciation ?? 0);
  const dscrData = sorted.map((s) => s.dscr ?? 0);
  const grmData = sorted.map((s) => s.grossRentMultiplier ?? 0);
  const irrData = sorted.map((s) => s.irr ?? 0);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11, fontFamily: 'var(--font-plus-jakarta)' },
      formatter: (params: unknown) => {
        const arr = params as TooltipParam[];
        if (!arr || arr.length === 0) return '';
        let res = `<div class="font-plus-jakarta text-xs font-light text-[#9E9DA0] mb-1">${arr[0].axisValue}</div>`;
        arr.forEach((p) => {
          let valStr = String(p.value);
          if (p.seriesName === 'DSCR' || p.seriesName === 'GRM') {
            valStr = p.value.toFixed(2);
          } else {
            valStr = p.value.toFixed(2) + '%';
          }
          res += `
            <div class="flex items-center justify-between gap-4 text-xs font-plus-jakarta">
              <span class="flex items-center gap-1.5 font-light text-[#C0BEC2]">
                <span class="w-2 h-2 rounded-full" style="background:${p.color}"></span>
                ${p.seriesName}
              </span>
              <span class="font-mono font-semibold text-white">${valStr}</span>
            </div>
          `;
        });
        return res;
      }
    },
    legend: {
      data: ['Cap Rate', 'CoC Return', 'Appreciation', 'DSCR', 'GRM', 'IRR'],
      selected: {
        'Cap Rate': true,
        'CoC Return': true,
        'Appreciation': false,
        'DSCR': true,
        'GRM': false,
        'IRR': false,
      },
      textStyle: { color: '#9E9DA0', fontSize: 10, fontFamily: 'var(--font-plus-jakarta)' },
      bottom: 0,
    },
    grid: { top: 35, right: 45, bottom: 45, left: 55 },
    xAxis: {
      type: 'category',
      data: periods,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9E9DA0', fontSize: 9, fontFamily: 'var(--font-plus-jakarta)' },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Yield (%)',
        nameTextStyle: { color: '#859490', fontSize: 8, fontFamily: 'var(--font-plus-jakarta)' },
        axisLabel: { color: '#859490', fontSize: 9, fontFamily: 'var(--font-mono)', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      {
        type: 'value',
        name: 'Ratios / Multipliers',
        nameTextStyle: { color: '#859490', fontSize: 8, fontFamily: 'var(--font-plus-jakarta)' },
        axisLabel: { color: '#859490', fontSize: 9, fontFamily: 'var(--font-mono)' },
        splitLine: { show: false },
      }
    ],
    series: [
      {
        name: 'Cap Rate',
        type: 'line',
        data: capRateData,
        smooth: true,
        lineStyle: { width: 2, color: '#454955' },
        itemStyle: { color: '#454955' },
        symbol: 'circle',
        symbolSize: 6,
        markPoint: {
          data: getBreachPoints(periods, capRateData, (v) => v < 4 || v > 10)
        }
      },
      {
        name: 'CoC Return',
        type: 'line',
        data: cocData,
        smooth: true,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        symbol: 'circle',
        symbolSize: 6,
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: 'rgba(59, 130, 246, 0.3)' },
          data: [
            { yAxis: 8, label: { formatter: 'CoC Min (8%)', position: 'start', color: '#3b82f6', fontSize: 8 } }
          ]
        },
        markPoint: {
          data: getBreachPoints(periods, cocData, (v) => v < 8 || v > 12)
        }
      },
      {
        name: 'Appreciation',
        type: 'line',
        data: appreciationData,
        smooth: true,
        lineStyle: { width: 2, color: '#454955' },
        itemStyle: { color: '#454955' },
        symbol: 'circle',
        symbolSize: 6,
        markPoint: {
          data: getBreachPoints(periods, appreciationData, (v) => v < 3 || v > 5)
        }
      },
      {
        name: 'DSCR',
        type: 'line',
        yAxisIndex: 1,
        data: dscrData,
        smooth: true,
        lineStyle: { width: 2, color: '#f59e0b' },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 6,
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: 'rgba(245, 158, 11, 0.4)' },
          data: [
            { yAxis: 1.25, label: { formatter: 'DSCR 1.25x', position: 'end', color: '#f59e0b', fontSize: 8 } }
          ]
        },
        markPoint: {
          data: getBreachPoints(periods, dscrData, (v) => v < 1.25)
        }
      },
      {
        name: 'GRM',
        type: 'line',
        yAxisIndex: 1,
        data: grmData,
        smooth: true,
        lineStyle: { width: 2, color: '#f43f5e' },
        itemStyle: { color: '#f43f5e' },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: 'IRR',
        type: 'line',
        data: irrData,
        smooth: true,
        lineStyle: { width: 2, color: '#ec4899' },
        itemStyle: { color: '#ec4899' },
        symbol: 'circle',
        symbolSize: 6,
      }
    ],
  };

  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

// ── Risk-vs-Return Scatter Chart (Dynamic Selectable Metrics) ──────────────────
export function RiskReturnScatterChart({
  projects,
  xAxisMetric,
  yAxisMetric,
}: {
  projects: Project[];
  xAxisMetric: 'capRate' | 'dscr' | 'oer';
  yAxisMetric: 'cashOnCashReturn' | 'annualizedAppreciation' | 'irr';
}) {
  const data = useMemo(() => {
    return projects.map((p) => {
      const actuals = deriveActualMetrics(p);
      const xVal = actuals[xAxisMetric] === 999 ? 2.5 : actuals[xAxisMetric] ?? 0; // clampDSCR 999 to 2.5 for plotting
      const yVal = actuals[yAxisMetric] ?? 0;
      return {
        name: p.propertyName ?? p.name ?? 'Unnamed',
        value: [xVal, yVal],
        phase: p.currentPhase ?? 1,
      };
    });
  }, [projects, xAxisMetric, yAxisMetric]);

  const metricLabels: Record<string, string> = {
    capRate: 'Capitalization Rate (%)',
    dscr: 'Debt Service Coverage Ratio (x)',
    oer: 'Operating Expense Ratio (%)',
    cashOnCashReturn: 'Cash-on-Cash Return (%)',
    annualizedAppreciation: 'Annualized Appreciation (%)',
    irr: 'Internal Rate of Return (%)',
  };

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 35, right: 35, bottom: 45, left: 55 },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any) => {
        const item = params.data;
        const xVal = item.value[0];
        const yVal = item.value[1];
        return `
          <div class="font-plus-jakarta text-xs font-semibold text-white mb-1">${item.name}</div>
          <div class="flex flex-col gap-1 text-[10px] font-plus-jakarta font-light text-[#C0BEC2]">
            <div>${metricLabels[xAxisMetric]}: <span class="font-mono font-semibold text-[#6E7480]">${xVal.toFixed(2)}</span></div>
            <div>${metricLabels[yAxisMetric]}: <span class="font-mono font-semibold text-blue-400">${yVal.toFixed(2)}</span></div>
            <div>Phase: <span class="font-mono text-amber-400">Phase ${item.phase}</span></div>
          </div>
        `;
      }
    },
    xAxis: {
      type: 'value',
      name: metricLabels[xAxisMetric],
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: '#859490', fontSize: 9, fontFamily: 'var(--font-plus-jakarta)' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9E9DA0', fontSize: 9, fontFamily: 'var(--font-mono)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    yAxis: {
      type: 'value',
      name: metricLabels[yAxisMetric],
      nameTextStyle: { color: '#859490', fontSize: 9, fontFamily: 'var(--font-plus-jakarta)' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9E9DA0', fontSize: 9, fontFamily: 'var(--font-mono)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        type: 'scatter',
        data: data,
        symbolSize: 12,
        itemStyle: {
          color: '#454955',
          borderColor: 'rgba(69, 73, 85, 0.4)',
          borderWidth: 2,
          shadowBlur: 8,
          shadowColor: 'rgba(69, 73, 85, 0.3)',
        },
        label: {
          show: true,
          formatter: '{b}',
          position: 'top',
          color: '#9E9DA0',
          fontSize: 8,
          fontFamily: 'var(--font-plus-jakarta)',
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
