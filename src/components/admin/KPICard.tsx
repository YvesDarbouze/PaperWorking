'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   KPICard — Metric summary widget with sparkline
   
   Antigravity dashboard-context styling.
   ═══════════════════════════════════════════════════════ */

interface KPICardProps {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  sparkline?: number[];
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#595959"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function KPICard({ label, value, change, changeLabel, sparkline }: KPICardProps) {
  const isPositive = change >= 0;
  // For churn-type metrics, a negative change is good
  const isGood = label.toLowerCase().includes('churn') || label.toLowerCase().includes('resolution')
    ? change <= 0
    : change >= 0;

  return (
    <div
      className="flex flex-col justify-between p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        minHeight: 140,
      }}
    >
      {/* Label */}
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </p>

      {/* Value + Sparkline */}
      <div className="flex items-end justify-between gap-4">
        <p
          className="text-3xl font-extralight tracking-tight"
          style={{ color: 'var(--text-primary)', lineHeight: 1 }}
        >
          {value}
        </p>
        {sparkline && <MiniSparkline data={sparkline} />}
      </div>

      {/* Change indicator */}
      <div className="flex items-center gap-1.5 mt-3">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5" style={{ color: isGood ? '#3f7d20' : '#F06543' }} />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" style={{ color: isGood ? '#3f7d20' : '#F06543' }} />
        )}
        <span
          className="text-xs font-semibold"
          style={{ color: isGood ? '#3f7d20' : '#F06543' }}
        >
          {isPositive ? '+' : ''}{change}%
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {changeLabel}
        </span>
      </div>
    </div>
  );
}
