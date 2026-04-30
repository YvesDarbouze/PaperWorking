'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  ChevronDown,
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/data — Portfolio Analytics Shell

   Aggregates portfolio-wide REI metrics in a modular grid.
   Currently renders placeholder containers for future charts:
     • Historical CapEx
     • ROI Trend Line
     • Portfolio Allocation
     • Cash-on-Cash Performance
     • Deal Velocity
     • Revenue Waterfall

   Palette: --bg-canvas, --bg-surface, --border-ui,
            --text-primary, --text-secondary
   ═══════════════════════════════════════════════════════════════ */

/* ── Date range options ── */
const DATE_RANGES = [
  { id: 'ytd',  label: 'Year to Date' },
  { id: '6m',   label: 'Last 6 Months' },
  { id: '3m',   label: 'Last 3 Months' },
  { id: '30d',  label: 'Last 30 Days' },
  { id: '12m',  label: 'Last 12 Months' },
  { id: 'all',  label: 'All Time' },
] as const;

/* ── Chart container descriptors ── */
interface ChartPlaceholder {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  /** Grid span: 'full' = 12 cols, 'half' = 6, 'third' = 4 */
  span: 'full' | 'half' | 'third';
  /** Minimum height */
  minHeight: string;
}

const CHART_CONTAINERS: ChartPlaceholder[] = [
  {
    id: 'capex',
    title: 'Historical CapEx',
    subtitle: 'Capital expenditure trend across all active deals',
    icon: <DollarSign className="w-4 h-4" />,
    span: 'half',
    minHeight: '320px',
  },
  {
    id: 'roi-trend',
    title: 'ROI Trend Line',
    subtitle: 'Portfolio-wide return on investment over time',
    icon: <TrendingUp className="w-4 h-4" />,
    span: 'half',
    minHeight: '320px',
  },
  {
    id: 'allocation',
    title: 'Portfolio Allocation',
    subtitle: 'Asset class distribution by deployed capital',
    icon: <PieChart className="w-4 h-4" />,
    span: 'third',
    minHeight: '280px',
  },
  {
    id: 'coc',
    title: 'Cash-on-Cash Performance',
    subtitle: 'Annual cash yield relative to total equity invested',
    icon: <ArrowUpRight className="w-4 h-4" />,
    span: 'third',
    minHeight: '280px',
  },
  {
    id: 'velocity',
    title: 'Deal Velocity',
    subtitle: 'Average days from acquisition to disposition',
    icon: <Activity className="w-4 h-4" />,
    span: 'third',
    minHeight: '280px',
  },
  {
    id: 'waterfall',
    title: 'Revenue Waterfall',
    subtitle: 'Gross revenue breakdown: rental income, sales proceeds, other',
    icon: <BarChart3 className="w-4 h-4" />,
    span: 'full',
    minHeight: '360px',
  },
];

/* ── Span → Tailwind grid class ── */
function spanClass(span: ChartPlaceholder['span']): string {
  switch (span) {
    case 'full':  return 'col-span-12';
    case 'half':  return 'col-span-12 lg:col-span-6';
    case 'third': return 'col-span-12 md:col-span-6 lg:col-span-4';
  }
}

/* ── Date Range Dropdown ── */
function DateRangeDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = DATE_RANGES.find((r) => r.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 hover:shadow-sm"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-ui)',
          color: 'var(--text-primary)',
        }}
      >
        <CalendarRange className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
        {current?.label ?? 'Select range'}
        <ChevronDown
          className="w-3 h-3 transition-transform duration-200"
          style={{
            color: 'var(--text-secondary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          {/* Menu */}
          <div
            className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-20"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-ui)',
            }}
          >
            {DATE_RANGES.map((range) => (
              <button
                key={range.id}
                onClick={() => { onChange(range.id); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors duration-150"
                style={{
                  color: range.id === value ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: range.id === value ? 'var(--bg-canvas)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (range.id !== value) (e.target as HTMLElement).style.background = 'var(--bg-canvas)'; }}
                onMouseLeave={(e) => { if (range.id !== value) (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Chart Placeholder Card ── */
function ChartCard({ chart }: { chart: ChartPlaceholder }) {
  return (
    <div
      className={`${spanClass(chart.span)} rounded-xl transition-all duration-200 hover:shadow-sm`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        minHeight: chart.minHeight,
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border-ui)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)' }}
          >
            {chart.icon}
          </div>
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-[0.15em]"
              style={{ color: 'var(--text-primary)' }}
            >
              {chart.title}
            </h3>
            <p
              className="text-[10px] mt-0.5 leading-snug"
              style={{ color: 'var(--text-secondary)' }}
            >
              {chart.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder body */}
      <div className="flex flex-col items-center justify-center px-6 py-12 gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--bg-canvas)' }}
        >
          <BarChart3 className="w-5 h-5" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} aria-hidden="true" />
        </div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
        >
          {chart.title} Chart Placeholder
        </p>
        <p
          className="text-[10px] max-w-[220px] text-center leading-relaxed"
          style={{ color: 'var(--text-secondary)', opacity: 0.35 }}
        >
          Connect portfolio data to populate this visualization
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DataPage (default export)
   ══════════════════════════════════════════ */

export default function DataPage() {
  const [dateRange, setDateRange] = useState('ytd');

  return (
    <div
      className="min-h-full px-8 py-8 overflow-y-auto"
      style={{ background: 'var(--bg-canvas)' }}
    >
      {/* ── Page Header ── */}
      <header className="flex items-end justify-between mb-10 flex-wrap gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: '#1A1A1A' }}
            >
              <BarChart3 className="w-5 h-5" style={{ color: '#FFFFFF' }} aria-hidden="true" />
            </div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
            >
              Portfolio Analytics
            </p>
          </div>
          <h1
            className="text-4xl font-extralight tracking-tight leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            Data Room
          </h1>
          <p
            className="text-sm mt-3 font-normal tracking-tight"
            style={{ color: 'var(--text-secondary)' }}
          >
            Aggregate metrics and performance analytics across your entire portfolio
          </p>
        </div>

        {/* Date-range filter */}
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
      </header>

      {/* ── Chart Grid ── */}
      <div className="grid grid-cols-12 gap-5">
        {CHART_CONTAINERS.map((chart) => (
          <ChartCard key={chart.id} chart={chart} />
        ))}
      </div>
    </div>
  );
}
