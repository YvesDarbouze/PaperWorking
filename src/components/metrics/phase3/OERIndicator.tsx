'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface OERIndicatorProps {
  operatingExpenses: number;
  grossRentalIncome: number;
  className?: string;
  isLoading?: boolean;
}

interface ColorZone {
  label: string;
  color: string;
  bg: string;
  range: string;
}

function getZone(oer: number): ColorZone {
  if (oer < 35) return { label: 'Excellent', color: '#3f7d20', bg: '#f0fdf4', range: '< 35%' };
  if (oer <= 45) return { label: 'Good', color: '#1A73E8', bg: '#eff6ff', range: '35–45%' };
  if (oer <= 55) return { label: 'Watch', color: '#f59e0b', bg: '#fffbeb', range: '45–55%' };
  return { label: 'Poor', color: '#F06543', bg: '#fef2f2', range: '> 55%' };
}

function ArcGauge({ pct, color }: { pct: number; color: string }) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const startAngle = 210;
  const totalArc = 240;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const clamped = Math.min(Math.max(pct, 0), 100);
  const fillAngle = startAngle - (clamped / 100) * totalArc;

  const zones = [
    { from: 210, to: 210 - 240 * 0.292, color: '#3f7d20' },
    { from: 210 - 240 * 0.292, to: 210 - 240 * 0.458, color: '#1A73E8' },
    { from: 210 - 240 * 0.458, to: 210 - 240 * 0.625, color: '#f59e0b' },
    { from: 210 - 240 * 0.625, to: -30, color: '#F06543' },
  ];

  const needleTip = polarToCartesian(fillAngle);

  return (
    <svg viewBox="0 0 160 120" className="w-full max-w-[180px]">
      <path d={arcPath(210, -30)} stroke="var(--pw-border)" strokeWidth="10" fill="none" strokeLinecap="round" />
      {zones.map((z, i) => (
        <path key={i} d={arcPath(z.from, z.to)} stroke={z.color} strokeWidth="10" fill="none" strokeLinecap="butt" opacity={0.25} />
      ))}
      <path d={arcPath(startAngle, fillAngle)} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />
      <circle cx={needleTip.x} cy={needleTip.y} r="5" fill={color} />
      <circle cx={cx} cy={cy} r="4" fill="var(--pw-fg)" />
    </svg>
  );
}

export default function OERIndicator({ operatingExpenses, grossRentalIncome, className = '', isLoading = false }: OERIndicatorProps) {
  const oer = useMemo(() => {
    if (!grossRentalIncome || grossRentalIncome === 0) return 0;
    return (operatingExpenses / grossRentalIncome) * 100;
  }, [operatingExpenses, grossRentalIncome]);

  const zone = useMemo(() => getZone(oer), [oer]);

  if (isLoading) {
    return (
      <div className={`rounded-lg p-6 ${className}`} style={{ background: 'var(--pw-surface)' }}>
        <div className="animate-shimmer h-4 w-32 rounded mb-4" />
        <div className="animate-shimmer h-32 w-32 rounded-full mx-auto mb-4" />
        <div className="animate-shimmer h-8 w-24 rounded mx-auto" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-6 ${className}`}
      style={{ background: 'var(--pw-surface)', border: '1px solid var(--pw-border)' }}
    >
      <p className="ag-label mb-1" style={{ color: 'var(--pw-muted)' }}>Operating Expense Ratio</p>
      <p className="text-xs mb-4" style={{ color: 'var(--pw-subtle)' }}>
        OER = Operating Expenses ÷ Gross Rental Income
      </p>

      <div className="flex flex-col items-center">
        <div className="w-full max-w-[180px] mx-auto">
          <ArcGauge pct={oer} color={zone.color} />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-4xl font-semibold font-mono -mt-2"
          style={{ color: zone.color }}
        >
          {oer.toFixed(1)}%
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: zone.bg, color: zone.color }}
        >
          {zone.label} — Benchmark {zone.range}
        </motion.div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 pt-4" style={{ borderTop: '1px solid var(--pw-border)' }}>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(operatingExpenses)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Operating Expenses</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(grossRentalIncome)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Gross Rental Income</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1 text-center">
        {[
          { label: 'Excellent', range: '< 35%', color: '#3f7d20' },
          { label: 'Good', range: '35–45%', color: '#1A73E8' },
          { label: 'Watch', range: '45–55%', color: '#f59e0b' },
          { label: 'Poor', range: '> 55%', color: '#F06543' },
        ].map((z) => (
          <div key={z.label} className="text-center">
            <div className="h-1 w-full rounded-full mb-1" style={{ background: z.color, opacity: zone.label === z.label ? 1 : 0.25 }} />
            <p className="text-[9px] font-bold" style={{ color: z.color }}>{z.label}</p>
            <p className="text-[9px]" style={{ color: 'var(--pw-muted)' }}>{z.range}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
