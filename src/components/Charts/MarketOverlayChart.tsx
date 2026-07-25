'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface MarketOverlayChartProps {
  quarters: string[];
  projectSeries: (number | null)[];
  marketSeries: (number | null)[];
  metricId: string;
  height?: number | string;
}

export function MarketOverlayChart({
  quarters,
  projectSeries,
  marketSeries,
  metricId,
  height = 300
}: MarketOverlayChartProps) {

  const lowerIsBetter = [
    'grm',
    'ltv',
    'oer',
    'tenant_turnover',
    'days_on_market',
    'maintenance_per_unit',
    'risk_score'
  ].includes(metricId.toLowerCase());

  // Determine outperformance (latest non-null values)
  let isOutperforming = true;
  let latestProjectVal: number | null = null;
  let latestMarketVal: number | null = null;

  for (let i = projectSeries.length - 1; i >= 0; i--) {
    if (projectSeries[i] !== null && projectSeries[i] !== undefined) {
      latestProjectVal = projectSeries[i]!;
      break;
    }
  }
  for (let i = marketSeries.length - 1; i >= 0; i--) {
    if (marketSeries[i] !== null && marketSeries[i] !== undefined) {
      latestMarketVal = marketSeries[i]!;
      break;
    }
  }

  if (latestProjectVal !== null && latestMarketVal !== null) {
    if (lowerIsBetter) {
      isOutperforming = latestProjectVal <= latestMarketVal;
    } else {
      isOutperforming = latestProjectVal >= latestMarketVal;
    }
  }

  const primaryColor = isOutperforming ? '#10b981' : '#ef4444'; // Green if outperforming, Red if underperforming
  const marketColor = '#94a3b8'; // Slate grey for market

  const formatVal = (v: number) => {
    const mId = metricId.toLowerCase();
    if (mId.includes('rate') || mId === 'coc' || mId === 'oer' || mId === 'ltv' || mId === 'tenant_turnover' || mId === 'lease_renewal' || mId === 'roi') {
      return `${v.toFixed(1)}%`;
    }
    if (mId === 'dscr' || mId === 'grm' || mId === 'equity_multiple' || mId === 'listing_to_meeting' || mId === 'interest_coverage') {
      return `${v.toFixed(2)}`;
    }
    if (mId === 'days_on_market' || mId === 'payback_period') {
      return `${Math.round(v)} days`;
    }
    if (mId.includes('price') || mId === 'noi' || mId === 'cash_flow' || mId === 'capex' || mId === 'goi' || mId === 'maintenance_per_unit' || mId === 'construction_per_sqft' || mId === 'avg_commission') {
      return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    return `${v}`;
  };

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 27, 32, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#E2E8F0',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif'
      },
      formatter: (params: any[]) => {
        const itemProj = params.find(p => p.seriesName === 'Your Property');
        const itemMarket = params.find(p => p.seriesName === 'Market Average');
        const q = params[0]?.name ?? '';
        
        let projStr = 'N/A';
        if (itemProj && itemProj.value !== null && itemProj.value !== undefined) {
          projStr = formatVal(Number(itemProj.value));
        }

        let marketStr = 'N/A';
        if (itemMarket && itemMarket.value !== null && itemMarket.value !== undefined) {
          marketStr = formatVal(Number(itemMarket.value));
        }

        return `
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #94A3B8; display: block; margin-bottom: 4px;">${q}</strong>
            <span style="color: #E2E8F0">Your Property:</span> 
            <strong style="color: ${primaryColor}">${projStr}</strong><br/>
            <span style="color: #E2E8F0">Market Average:</span> 
            <strong style="color: ${marketColor}">${marketStr}</strong>
          </div>
        `;
      }
    },
    legend: {
      show: true,
      top: '0%',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        color: '#94A3B8',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif'
      }
    },
    grid: {
      top: 40,
      right: 20,
      bottom: 40,
      left: 15,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: quarters,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif'
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif'
      }
    },
    series: [
      {
        name: 'Your Property',
        type: 'line',
        data: projectSeries,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        itemStyle: { color: primaryColor },
        lineStyle: { width: 2.5, color: primaryColor },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${primaryColor}22` }, // soft fill
              { offset: 1, color: `${primaryColor}00` }
            ]
          }
        }
      },
      {
        name: 'Market Average',
        type: 'line',
        data: marketSeries,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        itemStyle: { color: marketColor },
        lineStyle: { width: 2, type: 'dashed', color: marketColor }
      }
    ]
  };

  const hasData = projectSeries.some(s => s !== null) || marketSeries.some(s => s !== null);

  if (!hasData) {
    return (
      <div 
        style={{ height }} 
        className="flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#121014]/40 text-center"
      >
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No Market Data Available</p>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
