'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

function formatCurrency(val: number) {
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
  return `${sign}$${absVal.toLocaleString()}`;
}

export interface ARVSpreadChartProps {
  purchasePrice: number;
  projectedRehabCost: number;
  estimatedARV: number;
  fixedAcquisitionCosts?: number;
  className?: string;
  isLoading?: boolean;
}

export default function ARVSpreadChart({
  purchasePrice,
  projectedRehabCost,
  estimatedARV,
  fixedAcquisitionCosts = 0,
  className = '',
  isLoading = false,
}: ARVSpreadChartProps) {
  if (isLoading) {
    return (
      <div className={`rounded-lg overflow-hidden border border-[#CCCCCC] ${className}`} style={{ background: '#FFFFFF' }}>
        <div className="p-6 space-y-4">
          <div className="h-4 w-40 animate-shimmer rounded" />
          <div className="h-48 animate-shimmer rounded" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 animate-shimmer rounded" />
            <div className="h-16 animate-shimmer rounded" />
            <div className="h-16 animate-shimmer rounded" />
          </div>
        </div>
      </div>
    );
  }

  const allInCost = purchasePrice + projectedRehabCost + fixedAcquisitionCosts;
  const spread = estimatedARV - allInCost;
  const spreadPct = estimatedARV > 0 ? (spread / estimatedARV) * 100 : 0;
  const allInToARVRatio = estimatedARV > 0 ? allInCost / estimatedARV : 0;
  const isWarning = allInToARVRatio > 0.8;

  const mao = estimatedARV * 0.7 - projectedRehabCost;
  const maoPass = purchasePrice <= mao;

  const chartData = [
    {
      name: 'Cost Breakdown',
      purchasePrice,
      rehabBudget: projectedRehabCost,
      otherCosts: fixedAcquisitionCosts,
    },
  ];

  const tooltipStyle = {
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
    padding: '16px',
  };

  return (
    <div
      className={`rounded-lg overflow-hidden border ${isWarning ? 'border-[#CCCCCC]' : 'border-[#CCCCCC]'} transition-colors ${className}`}
      style={{ background: '#FFFFFF' }}
    >
      {isWarning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#F2F2F2] border-b border-[#CCCCCC]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#595959] shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#595959]">
            All-In Cost exceeds 80% of ARV — deal compression risk
          </span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F7F7F]">ARV Spread Analysis</p>
            <p className="text-2xl font-normal tracking-tighter text-[#1A1A1A] mt-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {formatCurrency(spread)}
            </p>
            <p className="text-[11px] text-[#A5A5A5] font-medium mt-0.5">
              {spreadPct.toFixed(1)}% of ARV
            </p>
          </div>
          <div
            className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: maoPass ? '#f0fdf4' : '#fef2f2',
              color: maoPass ? '#16a34a' : '#dc2626',
            }}
          >
            70% Rule: {maoPass ? 'PASS' : 'FAIL'}
          </div>
        </div>

        <div className="h-48 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#F2F2F2" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#7F7F7F', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
                domain={[0, Math.max(allInCost, estimatedARV) * 1.08]}
              />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                labelStyle={{ fontSize: '9px', fontWeight: 900, color: '#7F7F7F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.15em' }}
                formatter={(value: any, name: any) => {
                  const labels: Record<string, string> = {
                    purchasePrice: 'Purchase Price',
                    rehabBudget: 'Rehab Budget',
                    otherCosts: 'Acquisition Costs',
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
              />
              <Bar dataKey="purchasePrice" stackId="costs" fill="#595959" maxBarSize={32} />
              <Bar dataKey="rehabBudget" stackId="costs" fill="#7F7F7F" maxBarSize={32} />
              <Bar dataKey="otherCosts" stackId="costs" fill="#A5A5A5" radius={[0, 4, 4, 0]} maxBarSize={32} />
              <ReferenceLine
                x={estimatedARV}
                stroke="#454955"
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{
                  value: `ARV ${formatCurrency(estimatedARV)}`,
                  position: 'right',
                  fill: '#454955',
                  fontSize: 9,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                x={mao > 0 ? mao : 0}
                stroke="#A5A5A5"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{
                  value: `MAO ${formatCurrency(mao)}`,
                  position: 'right',
                  fill: '#A5A5A5',
                  fontSize: 8,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-4 gap-px bg-[#F2F2F2] rounded-lg overflow-hidden border border-[#F2F2F2]">
          {[
            { label: 'Purchase', value: formatCurrency(purchasePrice), color: '#595959' },
            { label: 'Rehab', value: formatCurrency(projectedRehabCost), color: '#7F7F7F' },
            { label: 'Acq. Costs', value: formatCurrency(fixedAcquisitionCosts), color: '#A5A5A5' },
            { label: 'All-In', value: formatCurrency(allInCost), color: '#0D0D0D' },
          ].map((item) => (
            <div key={item.label} className="bg-white p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#A5A5A5]">{item.label}</p>
              <p
                className="text-sm font-bold tracking-tight mt-1"
                style={{ color: item.color, fontFamily: 'ui-monospace, monospace' }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-[9px] text-[#A5A5A5] font-medium">
            MAO = ARV × 70% − Rehab ={' '}
            <span className="font-bold text-[#7F7F7F]">{formatCurrency(mao)}</span>
          </p>
          <p className="text-[9px] text-[#A5A5A5] font-medium">
            All-In / ARV ={' '}
            <span className={`font-bold ${isWarning ? 'text-[#595959]' : 'text-[#7F7F7F]'}`}>
              {(allInToARVRatio * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
