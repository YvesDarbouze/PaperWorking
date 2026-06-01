'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Home,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  CheckCircle2,
  Circle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   HeroDashboard

   High-fidelity animated dashboard mock for the landing
   hero. Shows:
     • 4-KPI metric strip (count-up on mount)
     • Live burn rate ticker (ticks every second)
     • 4-phase deal pipeline strip
     • Monthly disbursements bar chart
   Uses only PaperWorking design tokens — no arbitrary values.
   ═══════════════════════════════════════════════════════ */

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - (1 - progress) * (1 - progress);
        setValue(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return value;
}

/* ── KPI Card ── */
interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  delay: number;
}

function MetricCard({ label, value, change, positive, icon, delay }: MetricCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`bg-bg-surface border border-phase-1 p-4 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-phase-2">{label}</span>
        <div className="w-6 h-6 bg-dashboard flex items-center justify-center">{icon}</div>
      </div>
      <div className="text-xl font-medium text-text-primary tracking-tight tabular-nums">{value}</div>
      <div
        className={`flex items-center mt-1 text-xs font-medium ${
          positive ? 'text-phase-4' : 'text-phase-2'
        }`}
      >
        {positive ? (
          <ArrowUpRight className="w-3 h-3 mr-0.5" />
        ) : (
          <ArrowDownRight className="w-3 h-3 mr-0.5" />
        )}
        {change}
      </div>
    </div>
  );
}

/* ── Live Burn Rate Ticker ── */
function BurnRateTicker() {
  const DAILY_RATE = 187.5; // $187.50/day for a $150K deal at 1.5% monthly hold cost
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const costThisSession = ((secondsElapsed / 86400) * DAILY_RATE).toFixed(4);

  return (
    <div className="px-5 py-4 border-t border-dashboard bg-black/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-red-400">
            Burn Rate — Live
          </span>
        </div>
        <span className="text-xs text-phase-2 font-medium tabular-nums">
          ${DAILY_RATE.toFixed(2)}/day
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs text-phase-2 uppercase tracking-widest">This session</span>
          <div className="text-lg font-medium tabular-nums text-red-300 mt-0.5">
            ${costThisSession}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-phase-2 uppercase tracking-widest">Rehab started</span>
          <div className="text-xs font-medium text-phase-3 mt-0.5">Day 47 of 60</div>
        </div>
      </div>
      {/* Progress bar showing days into rehab period */}
      <div className="mt-3 h-1.5 w-full bg-dashboard overflow-hidden">
        <div className="h-full bg-red-400/80 transition-all" style={{ width: '78%' }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-phase-2">Start</span>
        <span className="text-xs text-red-400 font-bold">78% rehab elapsed</span>
        <span className="text-xs text-phase-2">Target completion</span>
      </div>
    </div>
  );
}

/* ── Phase Pipeline Strip ── */
const PHASES = [
  { label: 'Acquisition', short: '01', done: true },
  { label: 'Transaction', short: '02', done: true },
  { label: 'Rehab',       short: '03', done: false, active: true },
  { label: 'Hold/Exit',   short: '04', done: false },
];

function PipelineStrip() {
  return (
    <div className="px-5 py-3 border-t border-dashboard">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-phase-2">Deal Pipeline</span>
        <span className="text-xs text-phase-3 font-medium">421 Oak St, Brooklyn</span>
      </div>
      <div className="flex items-center gap-1">
        {PHASES.map((phase, i) => (
          <React.Fragment key={phase.label}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 flex-1 transition-all ${
                phase.done
                  ? 'bg-phase-4/20 border border-phase-4/40'
                  : phase.active
                  ? 'bg-primary/20 border border-primary/60'
                  : 'bg-dashboard border border-phase-1'
              }`}
            >
              {phase.done ? (
                <CheckCircle2 className="w-3 h-3 text-phase-4 flex-shrink-0" />
              ) : phase.active ? (
                <div className="w-3 h-3 rounded-full border-2 border-primary bg-primary/20 flex-shrink-0 animate-pulse" />
              ) : (
                <Circle className="w-3 h-3 text-phase-1 flex-shrink-0" />
              )}
              <span
                className={`text-xs font-bold uppercase tracking-widest truncate ${
                  phase.done ? 'text-phase-4' : phase.active ? 'text-primary' : 'text-phase-2'
                }`}
              >
                {phase.short}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div className={`w-2 h-px flex-shrink-0 ${phase.done ? 'bg-phase-4/40' : 'bg-phase-1'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function HeroDashboard() {
  const roiValue      = useCountUp(34,  1400, 300);
  const capitalValue  = useCountUp(847, 1200, 500);
  const activeDeals   = useCountUp(12,   800, 200);
  const holdingDays   = useCountUp(47,  1000, 400);

  const bars = [42, 58, 35, 72, 88, 64, 91, 76, 83, 95, 68, 79];

  return (
    <div className="w-full bg-bg-surface overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-dashboard bg-dashboard">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-phase-4" />
          <span className="text-xs font-bold uppercase tracking-widest text-phase-3">
            Portfolio Overview
          </span>
        </div>
        <span className="text-xs text-phase-2 font-medium tabular-nums">Live · Q2 2026</span>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-px bg-dashboard p-px">
        <MetricCard
          label="Projected ROI"
          value={`${roiValue}%`}
          change="+8.2% vs Q1"
          positive={true}
          icon={<TrendingUp className="w-3.5 h-3.5 text-phase-3" />}
          delay={100}
        />
        <MetricCard
          label="Capital Deployed"
          value={`$${capitalValue}K`}
          change="+$124K this month"
          positive={true}
          icon={<DollarSign className="w-3.5 h-3.5 text-phase-3" />}
          delay={200}
        />
        <MetricCard
          label="Active Deals"
          value={String(activeDeals)}
          change="3 closing this week"
          positive={true}
          icon={<Home className="w-3.5 h-3.5 text-phase-3" />}
          delay={300}
        />
        <MetricCard
          label="Days on Hold"
          value={`${holdingDays}d`}
          change="-12d vs target"
          positive={false}
          icon={<Clock className="w-3.5 h-3.5 text-red-400" />}
          delay={400}
        />
      </div>

      {/* Live Burn Rate Ticker */}
      <BurnRateTicker />

      {/* 4-Phase Pipeline Strip */}
      <PipelineStrip />

      {/* Monthly Disbursements Bar Chart */}
      <div className="px-5 py-4 border-t border-dashboard">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-phase-2">
            Monthly Disbursements
          </span>
          <span className="text-xs text-phase-3 font-medium">Last 12 months</span>
        </div>
        <div className="flex items-end gap-1 h-10">
          {bars.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-phase-4 transition-all duration-700 ease-out hover:bg-black"
              style={{ height: `${height}%`, transitionDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-phase-2">May '25</span>
          <span className="text-xs text-phase-2">Apr '26</span>
        </div>
      </div>

      {/* Team strip */}
      <div className="px-5 py-3 border-t border-dashboard bg-dashboard">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-5 h-5 bg-phase-1 border border-white flex items-center justify-center text-xs font-bold text-phase-3"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span className="text-xs text-phase-3 font-medium">3 team members active</span>
          </div>
          <span className="text-xs text-phase-4 font-bold cursor-pointer hover:text-text-primary transition-colors">
            View All →
          </span>
        </div>
      </div>
    </div>
  );
}
