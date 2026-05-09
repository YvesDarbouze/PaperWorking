'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface OccupancyCardProps {
  occupiedUnits: number;
  totalUnits: number;
  monthlyRentPerUnit: number;
  className?: string;
  isLoading?: boolean;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

interface OccupancyZone {
  label: string;
  color: string;
  bg: string;
  benchmark: string;
}

function getOccupancyZone(vacancyRate: number): OccupancyZone {
  if (vacancyRate < 5) return { label: 'Strong', color: '#22c55e', bg: '#f0fdf4', benchmark: '< 5% vacancy is strong performance' };
  if (vacancyRate <= 10) return { label: 'Fair', color: '#f59e0b', bg: '#fffbeb', benchmark: '5–10% vacancy is market average' };
  return { label: 'High', color: '#ef4444', bg: '#fef2f2', benchmark: '> 10% vacancy needs attention' };
}

export default function OccupancyCard({ occupiedUnits, totalUnits, monthlyRentPerUnit, className = '', isLoading = false }: OccupancyCardProps) {
  const safeTotal = Math.max(totalUnits, 1);
  const occupancyRate = useMemo(() => (occupiedUnits / safeTotal) * 100, [occupiedUnits, safeTotal]);
  const vacancyRate = 100 - occupancyRate;
  const vacantUnits = safeTotal - occupiedUnits;
  const vacancyCostMonthly = vacantUnits * monthlyRentPerUnit;
  const zone = useMemo(() => getOccupancyZone(vacancyRate), [vacancyRate]);

  if (isLoading) {
    return (
      <div className={`rounded-lg p-6 ${className}`} style={{ background: 'var(--pw-surface)' }}>
        <div className="animate-shimmer h-4 w-28 rounded mb-4" />
        <div className="animate-shimmer h-16 w-24 rounded mx-auto mb-4" />
        <div className="animate-shimmer h-8 w-full rounded" />
      </div>
    );
  }

  const arcRadius = 50;
  const circumference = 2 * Math.PI * arcRadius;
  const dashOffset = circumference - (occupancyRate / 100) * circumference;

  return (
    <div
      className={`rounded-lg p-6 ${className}`}
      style={{ background: 'var(--pw-surface)', border: '1px solid var(--pw-border)' }}
    >
      <p className="ag-label mb-4" style={{ color: 'var(--pw-muted)' }}>Occupancy</p>

      <div className="flex items-center gap-6 mb-4">
        <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={arcRadius} fill="none" stroke="var(--pw-border)" strokeWidth="10" />
            <motion.circle
              cx="60"
              cy="60"
              r={arcRadius}
              fill="none"
              stroke={zone.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-semibold font-mono"
              style={{ color: zone.color }}
            >
              {occupancyRate.toFixed(0)}%
            </motion.p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--pw-muted)' }}>OCCUPIED</p>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--pw-fg)' }}>
              {occupiedUnits}/{safeTotal} Units Occupied
            </p>
            <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>
              {vacantUnits} vacant unit{vacantUnits !== 1 ? 's' : ''}
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold"
            style={{ background: zone.bg, color: zone.color }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: zone.color }}
            />
            {zone.label} — {vacancyRate.toFixed(1)}% vacancy
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid var(--pw-border)' }}>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: '#22c55e' }}>
            {fmt(occupiedUnits * monthlyRentPerUnit)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Monthly Revenue</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: '#ef4444' }}>
            {vacancyCostMonthly > 0 ? `−${fmt(vacancyCostMonthly)}` : fmt(0)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Vacancy Cost</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>
            {fmt(monthlyRentPerUnit)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Rent/Unit/mo</p>
        </div>
      </div>

      <div className="mt-3 px-3 py-2 rounded-md text-xs" style={{ background: 'var(--pw-bg)', color: 'var(--pw-subtle)' }}>
        {zone.benchmark}
      </div>
    </div>
  );
}
