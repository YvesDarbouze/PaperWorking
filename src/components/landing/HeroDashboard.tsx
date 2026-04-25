'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Home, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * HeroDashboard
 * 
 * An interactive, high-fidelity dashboard mock that lives in the Hero's right pane.
 * Uses the strict PaperWorking palette (#595959, #7f7f7f, #a5a5a5, #cccccc, #f2f2f2).
 * Animates numbers on mount to create a "live data" impression.
 */

function useCountUp(target: number, duration: number = 1200, delay: number = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out quad
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
        <div className="w-6 h-6 bg-dashboard flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-xl font-medium text-text-primary tracking-tight tabular-nums">{value}</div>
      <div className={`flex items-center mt-1 text-xs font-medium ${positive ? 'text-phase-4' : 'text-phase-2'}`}>
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

export default function HeroDashboard() {
  const roiValue = useCountUp(34, 1400, 300);
  const capitalValue = useCountUp(847, 1200, 500);
  const activeDeals = useCountUp(12, 800, 200);
  const holdingDays = useCountUp(67, 1000, 400);

  // Simulated mini-barchart data
  const bars = [42, 58, 35, 72, 88, 64, 91, 76, 83, 95, 68, 79];

  return (
    <div className="w-full bg-bg-surface border border-phase-1 shadow-lg overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-dashboard bg-dashboard">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-phase-4"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-phase-3">Portfolio Overview</span>
        </div>
        <span className="text-xs text-phase-2 font-medium">Live · Q2 2026</span>
      </div>

      {/* Metrics Grid */}
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
          change="3 in closing"
          positive={true}
          icon={<Home className="w-3.5 h-3.5 text-phase-3" />}
          delay={300}
        />
        <MetricCard
          label="Avg Hold Time"
          value={`${holdingDays}d`}
          change="-12d vs target"
          positive={false}
          icon={<Clock className="w-3.5 h-3.5 text-phase-3" />}
          delay={400}
        />
      </div>

      {/* Mini Bar Chart */}
      <div className="px-5 py-4 border-t border-dashboard">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-phase-2">Monthly Disbursements</span>
          <span className="text-xs text-phase-3 font-medium">Last 12 months</span>
        </div>
        <div className="flex items-end gap-1.5 h-12">
          {bars.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-phase-4 transition-all duration-700 ease-out hover:bg-black"
              style={{
                height: `${height}%`,
                transitionDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-phase-2">May</span>
          <span className="text-xs text-phase-2">Apr</span>
        </div>
      </div>

      {/* Deal Pipeline Snippet */}
      <div className="px-5 py-3 border-t border-dashboard bg-dashboard">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-1.5">
              {[1,2,3].map(i => (
                <div key={i} className="w-5 h-5 bg-phase-1 border border-white flex items-center justify-center text-xs font-bold text-phase-3">
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
