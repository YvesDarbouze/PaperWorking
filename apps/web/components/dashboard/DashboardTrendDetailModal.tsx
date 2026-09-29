'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ChartLineUp, ArrowSquareOut, X, Table } from '@/components/icons/PhosphorIcons';

export type TimePeriod = '30D' | '90D' | '1Y' | 'ALL';
export type PhaseFilter = 'all' | 'acquisition' | 'fund' | 'hold' | 'exit';
export type ViewMode = 'chart' | 'table';

export interface DashboardTrendDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPeriod?: TimePeriod;
  portfolioValue?: string;
  growthPct?: string;
  totalNoi?: string;
}

interface TrendDataPoint {
  date: string;
  label: string;
  value: number;
  noi: number;
  asset: string;
  phase: 'acquisition' | 'fund' | 'hold' | 'exit';
  assetClass: 'residential' | 'multifamily' | 'commercial';
}

const RAW_LEDGER_POINTS: TrendDataPoint[] = [
  {
    date: '2026-03-20',
    label: 'Mar 20',
    value: 2840000,
    noi: 174000,
    asset: '1247 Elm Street',
    phase: 'acquisition',
    assetClass: 'residential',
  },
  {
    date: '2026-03-05',
    label: 'Mar 05',
    value: 2790000,
    noi: 171000,
    asset: '4402 Congress Ave',
    phase: 'fund',
    assetClass: 'multifamily',
  },
  {
    date: '2026-02-18',
    label: 'Feb 18',
    value: 2720000,
    noi: 168000,
    asset: '810 E 7th Street',
    phase: 'hold',
    assetClass: 'commercial',
  },
  {
    date: '2026-02-01',
    label: 'Feb 01',
    value: 2650000,
    noi: 165000,
    asset: '1904 Barton Springs',
    phase: 'hold',
    assetClass: 'multifamily',
  },
  {
    date: '2026-01-15',
    label: 'Jan 15',
    value: 2580000,
    noi: 160000,
    asset: '1247 Elm Street',
    phase: 'acquisition',
    assetClass: 'residential',
  },
  {
    date: '2026-01-01',
    label: 'Jan 01',
    value: 2510000,
    noi: 156000,
    asset: '302 Colorado St',
    phase: 'exit',
    assetClass: 'commercial',
  },
  {
    date: '2025-11-15',
    label: 'Nov 15',
    value: 2420000,
    noi: 151000,
    asset: '4402 Congress Ave',
    phase: 'fund',
    assetClass: 'multifamily',
  },
  {
    date: '2025-09-01',
    label: 'Sep 01',
    value: 2310000,
    noi: 144000,
    asset: '810 E 7th Street',
    phase: 'hold',
    assetClass: 'commercial',
  },
  {
    date: '2025-06-01',
    label: 'Jun 01',
    value: 2180000,
    noi: 136000,
    asset: '1904 Barton Springs',
    phase: 'hold',
    assetClass: 'multifamily',
  },
  {
    date: '2025-01-01',
    label: 'Jan 01',
    value: 1950000,
    noi: 122000,
    asset: 'Initial Portfolio Acquisition',
    phase: 'acquisition',
    assetClass: 'residential',
  },
];

export default function DashboardTrendDetailModal({
  isOpen,
  onClose,
  initialPeriod = '90D',
  portfolioValue = '$2,840,000',
  growthPct = '+8.4%',
  totalNoi = '$174,000',
}: DashboardTrendDetailModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter ledger points based on selected period and REIL phase
  const filteredData = useMemo(() => {
    let pts = [...RAW_LEDGER_POINTS];

    if (timePeriod === '30D') {
      pts = pts.slice(0, 3);
    } else if (timePeriod === '90D') {
      pts = pts.slice(0, 6);
    } else if (timePeriod === '1Y') {
      pts = pts.slice(0, 8);
    }

    if (phaseFilter !== 'all') {
      pts = pts.filter((p) => p.phase === phaseFilter);
    }

    return pts;
  }, [timePeriod, phaseFilter]);

  // Compute SVG chart coordinates dynamically from filtered data
  const chartCoordinates = useMemo(() => {
    if (filteredData.length === 0) return { path: '', areaPath: '', points: [] };

    // Reverse so chronologically left to right
    const chronological = [...filteredData].reverse();
    const values = chronological.map((p) => p.value);
    const minVal = Math.min(...values) * 0.98;
    const maxVal = Math.max(...values) * 1.02;
    const range = maxVal - minVal || 1;

    const width = 600;
    const height = 200;
    const padding = 20;

    const pts = chronological.map((p, idx) => {
      const x = padding + (idx / Math.max(chronological.length - 1, 1)) * (width - 2 * padding);
      const y = height - padding - ((p.value - minVal) / range) * (height - 2 * padding);
      return { x, y, ...p };
    });

    const path = pts.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x},${pt.y}`;
      return `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const areaPath = `${path} L ${pts[pts.length - 1].x},${height} L ${pts[0].x},${height} Z`;

    return { path, areaPath, points: pts };
  }, [filteredData]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trend-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        ref={modalRef}
        data-testid="dashboard-trend-detail-modal"
        className={`w-full overflow-hidden rounded-none border border-border bg-card p-6 text-card-foreground shadow-2xl transition-all duration-200 flex flex-col ${
          isExpanded ? 'max-w-6xl max-h-[92vh] h-full' : 'max-w-3xl max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ChartLineUp className="h-4 w-4 text-emerald-400" />
              <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Portfolio Analytics
              </span>
            </div>
            <h2 id="trend-modal-title" className="mt-2 text-xl font-bold tracking-tight text-foreground">
              Portfolio Value Trend &amp; Performance Ledger
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Interactive historical trajectory, capital growth rate, and REIL phase-level attribution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="trend-modal-expand-button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title={isExpanded ? 'Collapse view' : 'Expand full view'}
            >
              <ArrowSquareOut className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Controls Bar: Time Period + Phase Filter + View Switch */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          {/* Time Period Selector */}
          <div className="flex items-center gap-1 rounded-none border border-border bg-muted/20 p-1">
            {(['30D', '90D', '1Y', 'ALL'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                type="button"
                data-testid={`time-period-${period}`}
                onClick={() => setTimePeriod(period)}
                className={`min-h-[36px] rounded-none px-3 py-1 text-xs font-semibold transition ${
                  timePeriod === period
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* REIL Phase Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Phase:</span>
            <select
              data-testid="trend-phase-filter"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
              className="min-h-[44px] rounded-none border border-border bg-background px-3 py-1 text-base text-foreground focus:border-ring focus:outline-none sm:text-xs"
            >
              <option value="all">All REIL Phases</option>
              <option value="acquisition">Acquisition</option>
              <option value="fund">Fund</option>
              <option value="hold">Hold</option>
              <option value="exit">Exit</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-none border border-border bg-muted/20 p-1">
            <button
              type="button"
              data-testid="view-mode-chart"
              onClick={() => setViewMode('chart')}
              className={`flex min-h-[36px] items-center gap-1.5 rounded-none px-3 py-1 text-xs font-semibold transition ${
                viewMode === 'chart'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ChartLineUp className="h-4 w-4" />
              <span>Chart</span>
            </button>
            <button
              type="button"
              data-testid="view-mode-table"
              onClick={() => setViewMode('table')}
              className={`flex min-h-[36px] items-center gap-1.5 rounded-none px-3 py-1 text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="h-4 w-4" />
              <span>Ledger Table</span>
            </button>
          </div>
        </div>

        {/* Highlight Metrics Header */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-none border border-border bg-muted/20 p-3">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Current Portfolio Value</span>
            <span className="font-mono text-lg font-bold text-foreground sm:text-xl">{portfolioValue}</span>
          </div>
          <div className="rounded-none border border-border bg-muted/20 p-3">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Capital Growth</span>
            <span className="font-mono text-lg font-bold text-emerald-400 sm:text-xl">{growthPct}</span>
          </div>
          <div className="rounded-none border border-border bg-muted/20 p-3">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Annual NOI Run-Rate</span>
            <span className="font-mono text-lg font-bold text-foreground sm:text-xl">{totalNoi}</span>
          </div>
        </div>

        {/* Modal Body: Chart or Table */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {viewMode === 'chart' ? (
            <div data-testid="trend-chart-container" className="space-y-4">
              <div className="relative w-full rounded-none border border-border bg-card/60 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Valuation Trajectory ({timePeriod})</span>
                  <span>Normalized in USD</span>
                </div>
                <div className="h-[220px] w-full">
                  <svg viewBox="0 0 600 200" className="h-full w-full overflow-visible">
                    <defs>
                      <linearGradient id="trend-modal-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Shaded Area */}
                    {chartCoordinates.areaPath && (
                      <path d={chartCoordinates.areaPath} fill="url(#trend-modal-gradient)" />
                    )}

                    {/* Line Path */}
                    {chartCoordinates.path && (
                      <path
                        d={chartCoordinates.path}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points */}
                    {chartCoordinates.points.map((pt, idx) => (
                      <g key={pt.date + idx} className="group">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill="#121014"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          className="cursor-pointer hover:r-6 transition-all"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontFamily="monospace"
                          className="opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                        >
                          ${(pt.value / 1000000).toFixed(2)}M
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
                  {chartCoordinates.points.map((p, idx) => (
                    <span key={p.date + idx}>{p.label}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div data-testid="trend-table-container" className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Project / Asset</th>
                    <th className="pb-2.5">REIL Phase</th>
                    <th className="pb-2.5 text-right">Valuation</th>
                    <th className="pb-2.5 text-right">NOI Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-foreground/80">
                  {filteredData.map((item, idx) => (
                    <tr key={item.date + idx} className="hover:bg-muted/30 transition">
                      <td className="py-2.5">{item.date}</td>
                      <td className="py-2.5 font-sans font-medium text-foreground">{item.asset}</td>
                      <td className="py-2.5 font-sans">
                        <span className="rounded-none border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {item.phase}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-foreground">
                        ${item.value.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-emerald-400">
                        +${item.noi.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">
            Showing {filteredData.length} ledger events · REIL accounting verified
          </p>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
