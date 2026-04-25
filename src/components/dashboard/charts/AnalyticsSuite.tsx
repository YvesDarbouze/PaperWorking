'use client';

import React, { lazy, Suspense, useState } from 'react';
import { Project } from '@/types/schema';
import {
  TrendingUp, BarChart3, Crosshair, Flame,
  ChevronDown,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Analytics Suite — 4-Chart Visual Reports Grid

   Container component that lazy-loads all 4 Recharts visuals
   in a responsive 2×2 grid. Each chart gets a titled card with
   clean, minimalist styling matching the PaperWorking aesthetic.

   Charts:
   1. Projected vs. Actual Spend (Line)
   2. Profitability by Project (Bar)
   3. Time-to-Sale vs. Profit (Scatter)
   4. Monthly Burn Rate (Stacked Bar)
   ═══════════════════════════════════════════════════════════════ */

const ProjectedVsActualSpend = lazy(() => import('./ProjectedVsActualSpend'));
const ProfitabilityByProject = lazy(() => import('./ProfitabilityByProject'));
const TimeToSaleVsProfit = lazy(() => import('./TimeToSaleVsProfit'));
const MonthlyBurnRate = lazy(() => import('./MonthlyBurnRate'));

/* ─── Skeleton ─── */
function ChartSkeleton() {
  return (
    <div className="h-[320px] rounded-2xl border border-border-accent bg-bg-surface animate-pulse">
      <div className="px-5 pt-4 pb-3 border-b border-border-accent">
        <div className="h-3 bg-bg-primary rounded w-1/3" />
      </div>
      <div className="p-5">
        <div className="h-[230px] bg-bg-primary rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Chart Card Wrapper ─── */
function ChartCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-pw-black bg-bg-surface shadow-md overflow-hidden transition-all hover:bg-bg-primary group relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-pw-black/5 group-hover:bg-pw-accent transition-colors"></div>
      <div className="px-6 py-5 border-b border-border-accent bg-bg-primary/30">
        <div className="flex items-center gap-3">
          <div className="text-text-primary group-hover:text-pw-accent transition-colors">
            {icon}
          </div>
          <div>
            <h4 className="text-[10px] font-black text-text-primary uppercase tracking-[0.3em] leading-tight ag-label">
              {title}
            </h4>
            <p className="text-[9px] text-text-secondary font-bold mt-1 uppercase tracking-widest opacity-60">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6 min-h-[280px]">
        {children}
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-pw-black/10 group-hover:border-pw-accent/40 transition-colors"></div>
    </div>
  );
}

/* ─── Year Selector ─── */
function YearSelector({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="relative inline-flex items-center">
      <select
        value={year}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="appearance-none bg-bg-primary text-text-primary text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-gray-300 cursor-pointer"
      >
        {years.map((y: number) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 w-3 h-3 text-text-secondary pointer-events-none" />
    </div>
  );
}

/* ─── Main Component ─── */

interface AnalyticsSuiteProps {
  projects: Project[];
}

export default function AnalyticsSuite({ projects }: AnalyticsSuiteProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-pw-black pb-4">
        <div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.4em]">
            Visual_Analytics_Suite
          </h3>
          <p className="text-[10px] text-text-secondary mt-1 uppercase font-bold tracking-widest">
            Cross-Portfolio Performance Intelligence Stream
          </p>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[9px] font-black text-pw-accent uppercase tracking-widest animate-pulse">STREAM_ACTIVE</span>
           <YearSelector year={selectedYear} onChange={setSelectedYear} />
        </div>
      </div>

      {/* 2×2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. Projected vs. Actual Spend */}
        <ChartCard
          icon={<TrendingUp className="w-3.5 h-3.5 text-text-secondary" />}
          title="Budget vs. Actual Spend"
          subtitle="Cumulative renovation cost tracking by week"
        >
          <Suspense fallback={<div className="h-[260px] bg-bg-primary rounded-xl animate-pulse" />}>
            <ProjectedVsActualSpend projects={projects} />
          </Suspense>
        </ChartCard>

        {/* 2. Profitability by Project */}
        <ChartCard
          icon={<BarChart3 className="w-3.5 h-3.5 text-text-secondary" />}
          title="Profitability by Project"
          subtitle={`Net profit per completed flip — ${selectedYear}`}
        >
          <Suspense fallback={<div className="h-[260px] bg-bg-primary rounded-xl animate-pulse" />}>
            <ProfitabilityByProject projects={projects} year={selectedYear} />
          </Suspense>
        </ChartCard>

        {/* 3. Time-to-Sale vs. Profit */}
        <ChartCard
          icon={<Crosshair className="w-3.5 h-3.5 text-text-secondary" />}
          title="Time-to-Sale vs. Profit"
          subtitle="Correlation between holding time and profit decay"
        >
          <Suspense fallback={<div className="h-[260px] bg-bg-primary rounded-xl animate-pulse" />}>
            <TimeToSaleVsProfit projects={projects} />
          </Suspense>
        </ChartCard>

        {/* 4. Monthly Burn Rate */}
        <ChartCard
          icon={<Flame className="w-3.5 h-3.5 text-text-secondary" />}
          title="Monthly Burn Rate"
          subtitle={`Fixed expenses vs. profit — ${selectedYear}`}
        >
          <Suspense fallback={<div className="h-[260px] bg-bg-primary rounded-xl animate-pulse" />}>
            <MonthlyBurnRate projects={projects} year={selectedYear} />
          </Suspense>
        </ChartCard>

      </div>
    </div>
  );
}
