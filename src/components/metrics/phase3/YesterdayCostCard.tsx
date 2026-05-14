'use client';

import { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Yesterday's Cost Card — Hold Phase (Phase 3)

   Answers the question: "What did yesterday cost me?"
   Combines per-diem interest, prorated holding costs,
   and average daily rehab spend into one number.
   Includes a 30-day sparkline and 7-day average delta.
   ═══════════════════════════════════════════════════════ */

interface DailyCost {
  day: number;
  total: number;
  interest: number;
  holding: number;
  rehab: number;
}

function fmt(n: number, decimals = 2): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export default function YesterdayCostCard() {
  const currentProject = useProjectStore(s => s.currentProject);
  const financials = currentProject?.financials;

  const { yesterday, sevenDayAvg, sparkline, breakdown } = useMemo(() => {
    const empty = {
      yesterday: 0,
      sevenDayAvg: 0,
      sparkline: [] as DailyCost[],
      breakdown: { interest: 0, holding: 0, rehab: 0 },
    };

    if (!financials) return empty;

    // Per-diem interest
    const loanAmount = financials.loanAmount || 0;
    const interestRate = financials.loanInterestRate || 0;
    const dailyInterest = loanAmount > 0 && interestRate > 0
      ? (loanAmount * (interestRate / 100)) / 365
      : 0;

    // Daily holding costs (non-interest)
    const holdingCosts = currentProject?.holdingCosts ?? [];
    const monthlyNonInterest = holdingCosts
      .filter(c => c.type !== 'Loan Interest')
      .reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);
    const dailyHolding = monthlyNonInterest / 30.44;

    // Daily rehab spend (average of approved costs over elapsed days)
    const acquisitionDate = financials.acquisitionDate
      ? new Date(financials.acquisitionDate)
      : currentProject?.holdingCostClockStart
        ? new Date(currentProject.holdingCostClockStart)
        : null;

    const elapsedDays = acquisitionDate
      ? Math.max(1, Math.floor((Date.now() - acquisitionDate.getTime()) / 86_400_000))
      : 1;

    const totalApprovedRehab = (financials.costs || [])
      .filter(c => c.approved)
      .reduce((sum, c) => sum + c.amount, 0);
    const dailyRehab = elapsedDays > 0 ? totalApprovedRehab / elapsedDays : 0;

    // Yesterday's total
    const yesterdayTotal = dailyInterest + dailyHolding + dailyRehab;

    // Build sparkline data for last 30 days (or fewer if project is younger)
    const sparkDays = Math.min(30, elapsedDays);
    const points: DailyCost[] = [];
    for (let i = sparkDays; i >= 1; i--) {
      const dayTotal = dailyInterest + dailyHolding + dailyRehab;

      points.push({
        day: dayIndex + 1,
        total: Math.round(dayTotal * 100) / 100,
        interest: Math.round(dailyInterest * 100) / 100,
        holding: Math.round(dailyHolding * 100) / 100,
        rehab: Math.round(dailyRehab * 100) / 100,
      });
    }

    // 7-day average
    const last7 = points.slice(-7);
    const avg7 = last7.length > 0
      ? last7.reduce((s, p) => s + p.total, 0) / last7.length
      : 0;

    return {
      yesterday: yesterdayTotal,
      sevenDayAvg: avg7,
      sparkline: points,
      breakdown: {
        interest: dailyInterest,
        holding: dailyHolding,
        rehab: dailyRehab,
      },
    };
  }, [financials, currentProject]);

  const delta = sevenDayAvg > 0
    ? ((yesterday - sevenDayAvg) / sevenDayAvg) * 100
    : 0;
  const deltaAbs = Math.abs(delta);
  const isUp = delta > 1;
  const isDown = delta < -1;

  if (!currentProject) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-pw-black overflow-hidden"
    >
      {/* Main content */}
      <div className="p-6 pb-2">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-3">
          Yesterday&apos;s Cost
        </p>

        {/* Big number */}
        <p className="text-4xl font-black text-white tabular-nums font-mono leading-none">
          {fmt(yesterday)}
        </p>

        {/* Breakdown line */}
        <p className="text-[10px] text-white/50 font-bold mt-2 tracking-wide">
          Interest {fmt(breakdown.interest, 0)}
          {' + '}Holding {fmt(breakdown.holding, 0)}
          {' + '}Rehab {fmt(breakdown.rehab, 0)}
        </p>
      </div>

      {/* Sparkline */}
      {sparkline.length > 2 && (
        <div className="h-16 w-full px-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="yesterdayFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D97706" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="total"
                stroke="#D97706"
                strokeWidth={1.5}
                fill="url(#yesterdayFill)"
                isAnimationActive={true}
                animationDuration={800}
              />
              {sevenDayAvg > 0 && (
                <ReferenceLine
                  y={sevenDayAvg}
                  stroke="#FFFFFF"
                  strokeOpacity={0.15}
                  strokeDasharray="3 3"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 7-day comparison footer */}
      <div className="px-6 pb-4 pt-1 flex items-center justify-end gap-1.5">
        {isUp && <TrendingUp className="w-3 h-3 text-amber-400" />}
        {isDown && <TrendingDown className="w-3 h-3 text-green-400" />}
        {!isUp && !isDown && <Minus className="w-3 h-3 text-white/30" />}
        <span className={`text-[9px] font-black tracking-wide ${
          isUp ? 'text-amber-400' : isDown ? 'text-green-400' : 'text-white/30'
        }`}>
          vs 7-day avg: {fmt(sevenDayAvg, 0)}
          {deltaAbs > 1 && ` ${isUp ? '↑' : '↓'}${deltaAbs.toFixed(0)}%`}
        </span>
      </div>
    </motion.div>
  );
}
