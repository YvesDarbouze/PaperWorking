'use client';

import React, { useMemo } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  BarChart3,
  Info,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CAP RATE INTELLIGENCE CARD
   Visualizes cap rate as a semi-circle gauge with color zones:
     Poor (0-3%) → Fair (3-5%) → Good (5-8%) → Excellent (8%+)
   Formula: Cap Rate = (NOI / Purchase Price) × 100
   ═══════════════════════════════════════════════════════════════ */

interface CapRateIntelligenceCardProps {
  noi: number;
  purchasePrice: number;
  marketAvgCapRate?: number;
  className?: string;
}

/* ── Formatting ── */
const fmtUSD = (v: number): string =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtCompact = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const formatted = `$${(abs / 1000).toFixed(1)}k`;
    return v < 0 ? `-${formatted}` : formatted;
  }
  return fmtUSD(v);
};

/* ── Cap Rate Health Zones ── */
const CAP_ZONES = [
  { min: 0, max: 3, label: 'Poor', color: '#F06543' },
  { min: 3, max: 5, label: 'Fair', color: '#EAB308' },
  { min: 5, max: 8, label: 'Good', color: '#14B8A6' },
  { min: 8, max: 12, label: 'Excellent', color: '#3B82F6' },
] as const;

function getCapRateZone(capRate: number) {
  for (const zone of CAP_ZONES) {
    if (capRate >= zone.min && capRate < zone.max) return zone;
  }
  // 12%+ is still excellent
  if (capRate >= 12) return CAP_ZONES[3];
  // Negative cap rate
  return CAP_ZONES[0];
}

/* ═══════════════════════════════════════════════════════════════
   SVG SEMI-CIRCLE GAUGE
   Pure SVG arc with color zones and needle indicator.
   ═══════════════════════════════════════════════════════════════ */

interface GaugeProps {
  value: number; // Cap rate percentage
  maxValue: number; // Max scale (12)
  marketAvg?: number; // Optional market average marker
}

function SemiCircleGauge({ value, maxValue, marketAvg }: GaugeProps) {
  const width = 280;
  const height = 160;
  const cx = width / 2;
  const cy = 140;
  const radius = 110;
  const strokeWidth = 18;

  // Arc from 180° (left) to 0° (right) = semi-circle
  const startAngle = Math.PI; // 180°
  const endAngle = 0; // 0°
  const totalAngle = startAngle - endAngle; // π radians

  // Convert a value to an angle on the arc
  const valueToAngle = (v: number) => {
    const clamped = Math.max(0, Math.min(v, maxValue));
    const fraction = clamped / maxValue;
    return startAngle - fraction * totalAngle;
  };

  // Convert angle to cartesian
  const polarToCartesian = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });

  // Build arc path for a zone
  const arcPath = (fromVal: number, toVal: number) => {
    const a1 = valueToAngle(fromVal);
    const a2 = valueToAngle(toVal);
    const r = radius;
    const start = polarToCartesian(a1, r);
    const end = polarToCartesian(a2, r);
    const largeArc = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Needle angle
  const needleAngle = valueToAngle(value);
  const needleLength = radius - strokeWidth / 2 - 8;
  const needleTip = polarToCartesian(needleAngle, needleLength);
  const needleBase1 = polarToCartesian(needleAngle + 0.08, 8);
  const needleBase2 = polarToCartesian(needleAngle - 0.08, 8);

  // Market average marker
  const marketAngle = marketAvg != null ? valueToAngle(marketAvg) : null;
  const marketMarkerOuter = marketAngle != null ? polarToCartesian(marketAngle, radius + 6) : null;
  const marketMarkerInner = marketAngle != null ? polarToCartesian(marketAngle, radius - strokeWidth - 6) : null;

  const zone = getCapRateZone(value);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxWidth: '320px' }}
    >
      {/* Zone arcs */}
      {CAP_ZONES.map((z) => (
        <path
          key={z.label}
          d={arcPath(z.min, Math.min(z.max, maxValue))}
          fill="none"
          stroke={z.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.25}
        />
      ))}

      {/* Active arc up to current value */}
      {value > 0 && (
        <path
          d={arcPath(0, Math.min(value, maxValue))}
          fill="none"
          stroke={zone.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.9}
          style={{
            filter: `drop-shadow(0 0 6px ${zone.color}40)`,
          }}
        />
      )}

      {/* Market average marker line */}
      {marketMarkerOuter && marketMarkerInner && (
        <line
          x1={marketMarkerInner.x}
          y1={marketMarkerInner.y}
          x2={marketMarkerOuter.x}
          y2={marketMarkerOuter.y}
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeDasharray="3 2"
          opacity={0.6}
        />
      )}

      {/* Needle */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={zone.color}
        opacity={0.9}
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={6} fill={zone.color} />
      <circle cx={cx} cy={cy} r={3} fill="var(--color-surface, #091015)" />

      {/* Value text */}
      <text
        x={cx}
        y={cy - 25}
        textAnchor="middle"
        fill={zone.color}
        fontSize="28"
        fontWeight="700"
        fontFamily="var(--font-hanken, system-ui)"
        className="tabular-nums"
      >
        {value.toFixed(1)}%
      </text>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="var(--color-on-surface-variant, #bacac5)"
        fontSize="10"
        fontWeight="600"
        letterSpacing="0.1em"
      >
        CAP RATE
      </text>

      {/* Scale labels */}
      <text
        x={cx - radius - 4}
        y={cy + 16}
        textAnchor="middle"
        fill="var(--color-on-surface-variant, #bacac5)"
        fontSize="9"
        fontWeight="500"
      >
        0%
      </text>
      <text
        x={cx + radius + 4}
        y={cy + 16}
        textAnchor="middle"
        fill="var(--color-on-surface-variant, #bacac5)"
        fontSize="9"
        fontWeight="500"
      >
        {maxValue}%
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function CapRateIntelligenceCard({
  noi,
  purchasePrice,
  marketAvgCapRate,
  className,
}: CapRateIntelligenceCardProps) {
  // Division by zero guard
  const capRate = useMemo(() => {
    if (purchasePrice <= 0) return 0;
    return Math.round((noi / purchasePrice) * 100 * 100) / 100;
  }, [noi, purchasePrice]);

  const zone = useMemo(() => getCapRateZone(capRate), [capRate]);

  const marketAvg = marketAvgCapRate ?? 5.2;

  const capRateDelta = capRate - marketAvg;
  const isAboveMarket = capRateDelta >= 0;

  // Guard: no data
  if (purchasePrice <= 0 && noi === 0) {
    return (
      <div
        className={`rounded-xl p-8 text-center backdrop-blur-xl ${className ?? ''}`}
        style={{
          background: 'var(--color-glass-bg)',
          border: '1px solid var(--color-glass-border)',
        }}
      >
        <Target
          className="mx-auto mb-3 h-6 w-6 opacity-30"
          style={{ color: 'var(--color-on-surface-variant)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
          Add purchase price and NOI data to see cap rate analysis.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl backdrop-blur-xl overflow-hidden ${className ?? ''}`}
      style={{
        background: 'var(--color-glass-bg)',
        border: '1px solid var(--color-glass-border)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between p-5 pb-3"
        style={{ borderBottom: '1px solid var(--color-glass-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: `${zone.color}15`,
              border: `1px solid ${zone.color}30`,
            }}
          >
            <Target className="h-5 w-5" style={{ color: zone.color }} />
          </div>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              Capitalization Rate
            </p>
            <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>
              NOI ÷ Purchase Price
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{
            background: `${zone.color}15`,
            color: zone.color,
            border: `1px solid ${zone.color}30`,
          }}
        >
          {zone.label}
        </span>
      </div>

      {/* ── Gauge Section ── */}
      <div className="flex flex-col items-center px-5 py-6">
        <SemiCircleGauge value={capRate} maxValue={12} marketAvg={marketAvg} />

        {/* Zone legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {CAP_ZONES.map((z) => (
            <div key={z.label} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: z.color }} />
              <span style={{ color: 'var(--color-on-surface-variant)' }}>
                {z.label} ({z.min}-{z.max === 12 ? '12+' : z.max}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Formula Breakdown ── */}
      <div className="px-5 pb-4" style={{ borderTop: '1px solid var(--color-glass-border)' }}>
        <h4
          className="mb-3 mt-4 text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Formula Breakdown
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {/* NOI */}
          <div
            className="flex flex-col items-center rounded-lg px-4 py-2.5"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-glass-border)',
              minWidth: '90px',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
            >
              NOI
            </span>
            <span
              className="text-base font-bold font-mono tabular-nums"
              style={{ color: '#57f1db' }}
            >
              {fmtCompact(noi)}
            </span>
          </div>

          {/* Divide */}
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: 'var(--color-surface-container)',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            ÷
          </span>

          {/* Purchase Price */}
          <div
            className="flex flex-col items-center rounded-lg px-4 py-2.5"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-glass-border)',
              minWidth: '90px',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
            >
              Price
            </span>
            <span
              className="text-base font-bold font-mono tabular-nums"
              style={{ color: 'var(--color-on-surface)' }}
            >
              {fmtCompact(purchasePrice)}
            </span>
          </div>

          {/* Equals */}
          <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--color-on-surface-variant)' }} />

          {/* Cap Rate */}
          <div
            className="flex flex-col items-center rounded-lg px-4 py-2.5"
            style={{
              background: `${zone.color}10`,
              border: `1px solid ${zone.color}25`,
              minWidth: '90px',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
            >
              Cap Rate
            </span>
            <span
              className="text-base font-bold font-mono tabular-nums"
              style={{ color: zone.color }}
            >
              {capRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Market Benchmark Comparison ── */}
      <div
        className="px-5 py-4"
        style={{
          borderTop: '1px solid var(--color-glass-border)',
          background: 'var(--color-surface-container-lowest)',
        }}
      >
        <h4
          className="mb-3 text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Market Benchmark
        </h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Market Average */}
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-glass-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" style={{ color: 'var(--color-on-surface-variant)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                Market Avg
              </span>
            </div>
            <span
              className="text-sm font-bold font-mono tabular-nums"
              style={{ color: 'var(--color-on-surface)' }}
            >
              {marketAvg.toFixed(1)}%
            </span>
          </div>

          {/* Your Deal */}
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{
              background: `${zone.color}08`,
              border: `1px solid ${zone.color}20`,
            }}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" style={{ color: zone.color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                Your Deal
              </span>
            </div>
            <span
              className="text-sm font-bold font-mono tabular-nums"
              style={{ color: zone.color }}
            >
              {capRate.toFixed(1)}%
            </span>
          </div>

          {/* Delta */}
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{
              background: isAboveMarket ? 'rgba(20, 184, 166, 0.06)' : 'rgba(239, 68, 68, 0.06)',
              border: `1px solid ${isAboveMarket ? 'rgba(20, 184, 166, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
            }}
          >
            <div className="flex items-center gap-2">
              {isAboveMarket ? (
                <TrendingUp className="h-3.5 w-3.5" style={{ color: '#14B8A6' }} />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" style={{ color: '#F06543' }} />
              )}
              <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                vs Market
              </span>
            </div>
            <span
              className="text-sm font-bold font-mono tabular-nums"
              style={{ color: isAboveMarket ? '#14B8A6' : '#F06543' }}
            >
              {isAboveMarket ? '+' : ''}{capRateDelta.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Contextual note */}
        <div
          className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed"
          style={{
            background: 'var(--color-surface-container)',
            border: '1px solid var(--color-glass-border)',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          <Info className="mt-0.5 h-3 w-3 shrink-0" style={{ opacity: 0.6 }} />
          <span>
            <strong style={{ color: 'var(--color-on-surface)' }}>Cap Rate</strong> = NOI ÷ Purchase
            Price. Higher rates indicate higher returns but may carry higher risk. Market averages
            vary by property type and location.
          </span>
        </div>
      </div>
    </div>
  );
}
