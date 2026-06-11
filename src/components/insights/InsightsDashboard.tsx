'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import {
  Info,
  HelpCircle,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  DollarSign,
  Calendar,
  Landmark
} from 'lucide-react';
import { InsightsEngineResult } from '@/lib/services/insightsEngine';
import { REQUIRED_INSIGHTS_FIELDS } from '@/lib/projections/projectionEngine';

interface InsightsDashboardProps {
  data?: InsightsEngineResult;
  missingFields?: string[];
}

// ── Donut Gauge Sub-component ──
interface DonutGaugeProps {
  value: number;
  max: number;
  label: string;
  color: string;
  format?: (v: number) => string;
}

function DonutGauge({ value, max, label, color, format = (v) => `${v}%` }: DonutGaugeProps) {
  const displayValue = Math.max(0, Math.min(value, max));
  const remainder = Math.max(0, max - displayValue);
  
  const pieData = [
    { value: displayValue, color },
    { value: remainder, color: 'rgba(255, 255, 255, 0.08)' }
  ];

  return (
    <div className="flex flex-col items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-white/10 transition-all duration-300">
      <div className="h-28 w-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={44}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
            >
              <Cell fill={color} stroke="none" />
              <Cell fill="rgba(255, 255, 255, 0.06)" stroke="none" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-mono font-semibold text-white tracking-tight">
            {format(value)}
          </span>
        </div>
      </div>
      <span className="text-xs text-[#9E9DA0] font-semibold mt-3 text-center tracking-wide group-hover:text-white transition-colors">
        {label}
      </span>
    </div>
  );
}

// ── Custom Tooltip for Recharts ──
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valueFormatter?: (v: number) => string;
}

function CustomTooltip({ active, payload, label, valueFormatter }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-[#121014] border border-white/10 rounded-xl shadow-xl backdrop-blur-md">
        <p className="text-[11px] font-semibold text-[#9E9DA0] mb-1.5 font-mono">Year {label}</p>
        <div className="space-y-1">
          {payload.map((p, idx) => {
            const formatted = valueFormatter ? valueFormatter(p.value) : p.value;
            return (
              <div key={idx} className="flex items-center justify-between gap-6 text-xs">
                <span className="flex items-center gap-1.5 font-light text-[#C0BEC2]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                  {p.name}
                </span>
                <span className="font-mono font-semibold text-white">{formatted}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

export default function InsightsDashboard({ data, missingFields }: InsightsDashboardProps) {
  if (!data) {
    const fields = missingFields ?? REQUIRED_INSIGHTS_FIELDS;
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[#9E9DA0]" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-white">Projections unavailable</p>
          <p className="text-xs text-[#9E9DA0] font-light max-w-xs">
            Enter the following inputs to generate a 10-year pro-forma:
          </p>
        </div>
        <ul className="space-y-1">
          {fields.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-[#9E9DA0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9E9DA0]/50 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const { shortTerm, longTerm, marketInsights } = data;

  // ── Short-Term color thresholds ──
  
  // Cap Rate: target 5% to 8% standard
  const capRateColor = shortTerm.capRate >= 5 && shortTerm.capRate <= 8
    ? '#10b981' // emerald
    : '#f59e0b'; // amber

  // Cash-on-Cash: target 8%+ (visual warning/crimson if negative)
  const cocColor = shortTerm.cashOnCash < 0
    ? '#f43f5e' // crimson
    : shortTerm.cashOnCash >= 8
      ? '#10b981' // emerald
      : '#f59e0b'; // amber

  // OER: below 35% green, 35%-50% amber, 50%+ red
  const oerColor = shortTerm.oer < 35
    ? '#10b981' // emerald
    : shortTerm.oer <= 50
      ? '#f59e0b' // amber
      : '#f43f5e'; // crimson

  // Vacancy Rate: below 5% green, 5%-10% amber, 10%+ red
  const vacancyRate = shortTerm.vacancyRate ?? 0;
  const displayVacancy = vacancyRate;
  const vacancyColor = displayVacancy < 5
    ? '#10b981' // emerald
    : displayVacancy <= 10
      ? '#f59e0b' // amber
      : '#f43f5e'; // crimson

  // ── Chart data transformation ──
  const projectionData = longTerm.years.map((y, idx) => ({
    year: y,
    noi: longTerm.noi[idx],
    cashFlow: longTerm.cashFlow[idx],
    cumulativeRoi: longTerm.cumulativeRoi[idx],
    dscr: longTerm.dscr[idx]
  }));

  return (
    <div className="w-full space-y-8 p-1 font-sans">
      
      {/* ── SECTION 1: Short-Term Health Gauges ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <TrendingUp className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-lg font-light text-white tracking-wide">
            Short-Term Health Gauges <span className="text-xs text-[#9E9DA0] font-light font-mono">(Year 1 Baseline)</span>
          </h2>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DonutGauge
            value={shortTerm.capRate}
            max={15}
            label="Capitalization Rate"
            color={capRateColor}
          />
          <DonutGauge
            value={shortTerm.cashOnCash}
            max={15}
            label="Cash-on-Cash Return"
            color={cocColor}
          />
          <DonutGauge
            value={shortTerm.oer}
            max={100}
            label="Operating Expense Ratio"
            color={oerColor}
          />
          <DonutGauge
            value={displayVacancy}
            max={25}
            label="Vacancy Rate"
            color={vacancyColor}
          />
        </div>
      </div>

      {/* ── SECTION 2: Long-Term Growth Trajectories ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-light text-white tracking-wide">
            Long-Term Growth Trajectories <span className="text-xs text-[#9E9DA0] font-light font-mono">(10-Year Underwriting)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* NOI vs. Cash Flow Composed Chart */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-light text-white">NOI vs. Cash Flow Before Taxes</h3>
                <p className="text-[11px] text-[#9E9DA0] font-extralight mt-0.5">Projected operational cash margins vs. asset net yields</p>
              </div>
              <DollarSign className="w-4 h-4 text-[#10b981]" />
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projectionData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                  <XAxis dataKey="year" stroke="#6B6870" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#6B6870"
                    fontSize={9}
                    tickLine={false}
                    tickFormatter={(v) => {
                      if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
                      return `$${v}`;
                    }}
                  />
                  <RechartsTooltip
                    content={<CustomTooltip valueFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', color: '#9E9DA0' }} />
                  <Bar dataKey="cashFlow" name="Cash Flow" fill="rgba(59, 130, 246, 0.25)" stroke="#3b82f6" strokeWidth={1} radius={[4, 4, 0, 0]} />
                  <Line dataKey="noi" name="NOI" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative ROI Line Chart */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-light text-white">Cumulative ROI over time</h3>
                <p className="text-[11px] text-[#9E9DA0] font-extralight mt-0.5">Return incorporating appreciation & debt principal paydown</p>
              </div>
              <TrendingUp className="w-4 h-4 text-[#10b981]" />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                  <XAxis dataKey="year" stroke="#6B6870" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#6B6870"
                    fontSize={9}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    content={<CustomTooltip valueFormatter={(v) => `${v.toFixed(2)}%`} />}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', color: '#9E9DA0' }} />
                  <Line dataKey="cumulativeRoi" name="Cumulative ROI" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DSCR Area Chart */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-light text-white">Debt Service Coverage Ratio</h3>
                <p className="text-[11px] text-[#9E9DA0] font-extralight mt-0.5">Asset capacity to service leverage debt requirements</p>
              </div>
              <Landmark className="w-4 h-4 text-amber-500" />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dscrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                  <XAxis dataKey="year" stroke="#6B6870" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#6B6870"
                    fontSize={9}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(2)}x`}
                  />
                  <RechartsTooltip
                    content={<CustomTooltip valueFormatter={(v) => `${v.toFixed(3)}x`} />}
                  />
                  <ReferenceLine y={1.25} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Lender Min (1.25x)', position: 'insideTopRight', fill: '#f43f5e', fontSize: 8 }} />
                  <Area dataKey="dscr" name="DSCR" stroke="#f59e0b" fillOpacity={1} fill="url(#dscrGradient)" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* ── SECTION 3: Market Context Cards ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Landmark className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-light text-white tracking-wide">
            Market Context Indicators <span className="text-xs text-[#9E9DA0] font-light font-mono">(Local Zip Code Insights)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Gross Rent Multiplier Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-[#9E9DA0] font-semibold tracking-widest uppercase">
                Gross Rent Multiplier
              </span>
              <div className="relative group/tooltip">
                <Info className="w-4 h-4 text-[#6B6870] hover:text-white cursor-help transition-colors" />
                <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-[#121014] border border-white/10 text-[10px] text-[#C0BEC2] rounded-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 leading-normal z-50">
                  Gross Rent Multiplier (GRM) = Property Price / Gross Annual Rent. Used for high-level asset cost screening. Lower multiplier indicates better yield.
                </div>
              </div>
            </div>
            
            <div className="text-3xl font-light font-mono text-white tracking-tight mt-3">
              {shortTerm.grm.toFixed(2)}
            </div>
            <p className="text-[11px] text-[#6E7480] font-extralight mt-2 leading-relaxed">
              Price requires <span className="font-semibold text-white">{shortTerm.grm.toFixed(1)} years</span> of gross income to cover acquisition cost.
            </p>
          </div>

          {/* Days on Market Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-[#9E9DA0] font-semibold tracking-widest uppercase">
                Days on Market (DOM)
              </span>
              <HelpCircle className="w-4 h-4 text-[#6B6870]" />
            </div>

            <div className="text-3xl font-light font-mono text-white tracking-tight mt-3">
              {marketInsights.daysOnMarket} <span className="text-sm font-sans text-[#6E7480]">days</span>
            </div>
            <p className="text-[11px] text-[#6E7480] font-extralight mt-2 leading-relaxed flex items-center gap-1.5">
              {marketInsights.daysOnMarket > 60 ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Slow market velocity: elevated liquidity risk.</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                  <span>Healthy market velocity: low liquidity holding risk.</span>
                </>
              )}
            </p>
            {(marketInsights as any).source && (
              <p className="text-[9px] text-[#6E7480]/80 mt-2 font-mono tracking-wider uppercase">
                Source: {(marketInsights as any).source}
                {(marketInsights as any).asOf ? ` · As of ${new Date((marketInsights as any).asOf).toLocaleDateString()}` : ""}
              </p>
            )}
          </div>

          {/* Price-to-Rent Ratio Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative group hover:border-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-[#9E9DA0] font-semibold tracking-widest uppercase">
                Price-to-Rent Ratio
              </span>
              <div className="flex items-center gap-1.5">
                <div className="relative group/tooltip">
                  <Info className="w-4 h-4 text-[#6B6870] hover:text-white cursor-help transition-colors" />
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-[#121014] border border-white/10 text-[10px] text-[#C0BEC2] rounded-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 leading-normal z-50">
                    Price-to-Rent Ratio = Median Home Price ÷ Average Annual Rent. Why it matters: A high ratio indicates a better environment for renting out properties, as people are priced out of buying.
                  </div>
                </div>
                <Landmark className="w-4 h-4 text-[#6B6870]" />
              </div>
            </div>

            <div className="text-3xl font-light font-mono text-white tracking-tight mt-3">
              {marketInsights.priceToRentRatio.toFixed(1)}
            </div>

            <p className="text-[11px] font-extralight mt-2 leading-relaxed">
              {marketInsights.priceToRentRatio > 20 ? (
                <span className="text-amber-400 font-semibold">Rent-favorable market: Buying is highly expensive locally.</span>
              ) : marketInsights.priceToRentRatio < 15 ? (
                <span className="text-[#10b981] font-semibold">Buy-favorable market: Low price basis relative to rents.</span>
              ) : (
                <span className="text-[#9E9DA0]">Balanced market: Renting and buying are equally priced.</span>
              )}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
