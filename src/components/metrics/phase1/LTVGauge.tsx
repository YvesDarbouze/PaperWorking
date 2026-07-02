'use client';

import React, { useMemo } from 'react';

function formatCurrency(val: number) {
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
  return `${sign}$${absVal.toLocaleString()}`;
}

export interface LTVGaugeProps {
  loanAmount: number;
  propertyValue: number;
  className?: string;
  isLoading?: boolean;
}

interface ZoneConfig {
  label: string;
  color: string;
  textColor: string;
  bg: string;
}

function getZoneConfig(ltv: number): ZoneConfig {
  if (ltv <= 65) return { label: 'Conservative', color: '#16a34a', textColor: '#16a34a', bg: '#f0fdf4' };
  if (ltv <= 75) return { label: 'Acceptable', color: '#ca8a04', textColor: '#92400e', bg: '#fefce8' };
  if (ltv <= 80) return { label: 'Elevated', color: '#ea580c', textColor: '#7c2d12', bg: '#fff7ed' };
  return { label: 'High Risk', color: '#dc2626', textColor: '#7f1d1d', bg: '#fef2f2' };
}

export default function LTVGauge({
  loanAmount,
  propertyValue,
  className = '',
  isLoading = false,
}: LTVGaugeProps) {
  const ltv = useMemo(
    () => (propertyValue > 0 ? Math.min((loanAmount / propertyValue) * 100, 120) : 0),
    [loanAmount, propertyValue],
  );

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-[#CCCCCC] p-6 ${className}`} style={{ background: '#FFFFFF' }}>
        <div className="space-y-4">
          <div className="h-4 w-32 animate-shimmer rounded" />
          <div className="mx-auto h-40 w-40 animate-shimmer rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 animate-shimmer rounded" />
            <div className="h-14 animate-shimmer rounded" />
          </div>
        </div>
      </div>
    );
  }

  const zone = getZoneConfig(ltv);

  const RADIUS = 70;
  const CX = 90;
  const CY = 90;
  const START_ANGLE = 180;
  const END_ANGLE = 0;

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
    const s = polarToCartesian(cx, cy, r, startDeg);
    const e = polarToCartesian(cx, cy, r, endDeg);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const zones = [
    { from: 180, to: 180 - 65 * 1.8, color: '#86efac' },
    { from: 180 - 65 * 1.8, to: 180 - 75 * 1.8, color: '#fde047' },
    { from: 180 - 75 * 1.8, to: 180 - 80 * 1.8, color: '#fb923c' },
    { from: 180 - 80 * 1.8, to: 0, color: '#F06543' },
  ];

  const needleAngle = START_ANGLE - Math.min(ltv, 100) * 1.8;
  const needleTip = polarToCartesian(CX, CY, RADIUS - 8, needleAngle);

  const benchmarkAngle = START_ANGLE - 75 * 1.8;
  const benchmarkOuter = polarToCartesian(CX, CY, RADIUS + 6, benchmarkAngle);
  const benchmarkInner = polarToCartesian(CX, CY, RADIUS - 14, benchmarkAngle);

  return (
    <div
      className={`rounded-lg border border-[#CCCCCC] overflow-hidden ${className}`}
      style={{ background: '#FFFFFF' }}
    >
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F7F7F] mb-4">
          Loan-to-Value Ratio
        </p>

        <div className="flex flex-col items-center">
          <svg width="180" height="100" viewBox="0 0 180 100" aria-label={`LTV gauge: ${ltv.toFixed(1)}%`}>
            {zones.map((z, i) => (
              <path
                key={i}
                d={arcPath(CX, CY, RADIUS, z.from, z.to)}
                fill="none"
                stroke={z.color}
                strokeWidth={14}
                strokeLinecap="butt"
              />
            ))}

            <path
              d={arcPath(CX, CY, RADIUS, START_ANGLE, END_ANGLE)}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
            />

            <line
              x1={benchmarkInner.x}
              y1={benchmarkInner.y}
              x2={benchmarkOuter.x}
              y2={benchmarkOuter.y}
              stroke="#454955"
              strokeWidth={2}
              strokeDasharray="3 2"
            />
            <text
              x={benchmarkOuter.x}
              y={benchmarkOuter.y - 4}
              textAnchor="middle"
              fill="#454955"
              fontSize={7}
              fontWeight={800}
              fontFamily="monospace"
            >
              75%
            </text>

            <line
              x1={CX}
              y1={CY}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="#0D0D0D"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r={5} fill="#0D0D0D" />

            <text x={CX} y={CY - 20} textAnchor="middle" fill="#0D0D0D" fontSize={22} fontWeight={300} fontFamily="ui-monospace, monospace">
              {ltv.toFixed(1)}%
            </text>

            <text x={14} y={96} fill="#A5A5A5" fontSize={8} fontWeight={700} fontFamily="monospace">0%</text>
            <text x={146} y={96} fill="#A5A5A5" fontSize={8} fontWeight={700} fontFamily="monospace">100%</text>
          </svg>

          <div
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest -mt-1"
            style={{ background: zone.bg, color: zone.textColor }}
          >
            {zone.label}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#F2F2F2] rounded-lg overflow-hidden border border-[#F2F2F2] mt-5">
          <div className="bg-white p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A5A5A5]">Loan Amount</p>
            <p className="text-base font-bold tracking-tight text-[#1A1A1A] mt-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {formatCurrency(loanAmount)}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A5A5A5]">Property Value</p>
            <p className="text-base font-bold tracking-tight text-[#1A1A1A] mt-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {formatCurrency(propertyValue)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1">
          {[
            { label: '0–65%', desc: 'Green', color: '#86efac' },
            { label: '65–75%', desc: 'Yellow', color: '#fde047' },
            { label: '75–80%', desc: 'Orange', color: '#fb923c' },
            { label: '80%+', desc: 'Red', color: '#F06543' },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: z.color }} />
              <span className="text-[8px] font-bold text-[#A5A5A5] uppercase tracking-widest leading-tight">{z.label}</span>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-[#A5A5A5] font-medium mt-3">
          Lender comfort zone: ≤ 75% LTV
        </p>
      </div>
    </div>
  );
}
