'use client';

import React from 'react';
import {
  X,
  ArrowSquareOut,
  DownloadSimple,
  Table,
  ChartLineUp,
  Check,
  TrendUp,
  TrendDown,
  Minus,
} from '@/components/icons/PhosphorIcons';
import { Button } from '@/components/ui/Button';
import {
  LiveTickerItem,
  LocalMarketScoreboard,
  ScoreboardPeriod,
  TimeSeriesPoint,
} from '@/lib/market/types';
import { useModalScrollLock } from '../useModalScrollLock';

export interface MarketVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickers: LiveTickerItem[];
  localMarket: LocalMarketScoreboard;
  initialSelectedId?: string;
}

interface EnrichedSeriesItem {
  id: string;
  code: string;
  name: string;
  label: string;
  unit: string;
  formatDecimals: number;
  currentValue: number;
  previousValue: number;
  delta: number;
  deltaPct: number;
  isPositiveGood: boolean;
  marketDate: string;
  realtimeDate?: string;
  referencePeriod?: string;
  source: string;
  frequency: string;
  description: string;
  benchmarkContext?: string;
  points: TimeSeriesPoint[];
  color: string;
}

function formatValueWithUnit(val: number, unit: string, decimals: number): string {
  if (unit === '$') return `$${val.toFixed(decimals)}`;
  return `${val.toFixed(decimals)}${unit}`;
}

function formatReadableMarketDate(isoDate: string): string {
  if (!isoDate) return 'Real-Time Feed';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const d = new Date(Date.UTC(year, month, day));
  if (isNaN(d.getTime())) return isoDate;
  const formatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatted} (${isoDate})`;
}

export default function MarketVisualizationModal({
  isOpen,
  onClose,
  tickers,
  localMarket,
  initialSelectedId,
}: MarketVisualizationModalProps) {
  const [period, setPeriod] = React.useState<ScoreboardPeriod>('1Y');
  const [viewMode, setViewMode] = React.useState<'chart' | 'table'>('chart');
  const [selectedSeriesIds, setSelectedSeriesIds] = React.useState<string[]>(['DGS10', 'MORTGAGE30US']);
  const [isExpanded, setIsExpanded] = React.useState(false);

  useModalScrollLock(isOpen);

  // Focus the clicked metric whenever the modal opens or initialSelectedId changes
  React.useEffect(() => {
    if (!isOpen) return;
    if (initialSelectedId) {
      setSelectedSeriesIds([initialSelectedId]);
    } else {
      setSelectedSeriesIds(['DGS10', 'MORTGAGE30US']);
    }
  }, [isOpen, initialSelectedId]);

  // Handle escape key
  React.useEffect(() => {
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

  // Gather all available series options with real-time metadata
  const allAvailableSeries = React.useMemo<EnrichedSeriesItem[]>(() => {
    const list: EnrichedSeriesItem[] = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];

    tickers.forEach((t, i) => {
      const points = t.historicalSeries?.[period] || [];
      const latestPtDate = points.length > 0 ? points[points.length - 1].date : '';
      const marketDate =
        t.marketDate ||
        (t.lastUpdated ? t.lastUpdated.split('T')[0] : '') ||
        latestPtDate;

      list.push({
        id: t.symbol,
        code: t.symbol,
        name: t.name,
        label: `${t.symbol} · ${t.name}`,
        unit: t.unit === 'usd' ? '$' : '%',
        formatDecimals: t.formatDecimals,
        currentValue: t.currentValue,
        previousValue: t.previousClose,
        delta: t.delta,
        deltaPct: t.deltaPct,
        isPositiveGood: Boolean(t.isPositiveGood),
        marketDate,
        realtimeDate: t.realtimeDate || marketDate,
        source: t.source,
        frequency: t.frequency,
        description: t.description || '',
        points,
        color: colors[i % colors.length],
      });
    });

    const localMetrics = [
      localMarket.monthsOfInventory,
      localMarket.daysOnMarket,
      localMarket.saleToListRatio,
    ];

    localMetrics.forEach((m, i) => {
      const points = m.historicalSeries?.[period] || [];
      const latestPtDate = points.length > 0 ? points[points.length - 1].date : '';
      const marketDate = m.asOfDate || localMarket.asOfDate || latestPtDate;
      const unitStr = m.unit === 'months' ? ' mo' : m.unit === 'days' ? ' days' : '%';
      const code = m.seriesSymbol || m.id.toUpperCase();

      list.push({
        id: m.id,
        code,
        name: m.label,
        label: `${m.id.toUpperCase()} · ${m.label}`,
        unit: unitStr,
        formatDecimals: m.formatDecimals,
        currentValue: m.value,
        previousValue: m.previousValue,
        delta: m.delta,
        deltaPct: m.deltaPct,
        isPositiveGood: m.id === 'sale_to_list',
        marketDate,
        realtimeDate: marketDate,
        referencePeriod: m.referencePeriod,
        source: m.source || 'FRED',
        frequency: m.frequency || 'Monthly',
        description: m.interpretation,
        benchmarkContext: `${m.benchmarkRange} · ${m.healthyThreshold}`,
        points,
        color: colors[(i + tickers.length) % colors.length],
      });
    });

    return list;
  }, [tickers, localMarket, period]);

  // Toggle series visibility
  const toggleSeries = (id: string) => {
    setSelectedSeriesIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one active series
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  // Active series for plotting (ordered with primary selection first)
  const activeSeries = React.useMemo(() => {
    const map = new Map(allAvailableSeries.map((s) => [s.id, s]));
    return selectedSeriesIds
      .map((id) => map.get(id))
      .filter((s): s is EnrichedSeriesItem => Boolean(s));
  }, [allAvailableSeries, selectedSeriesIds]);

  const primaryFocusedSeries = activeSeries[0] || allAvailableSeries[0];

  // SVG Chart calculation with real calendar date alignment
  const chartData = React.useMemo(() => {
    if (activeSeries.length === 0) {
      return { lines: [], datesAsc: [] as string[], datesDesc: [] as string[] };
    }

    const dateSet = new Set<string>();
    activeSeries.forEach((s) => {
      s.points.forEach((p) => {
        if (p.date) dateSet.add(p.date);
      });
    });

    const datesAsc = Array.from(dateSet).sort();
    const datesDesc = [...datesAsc].reverse();

    const minTime = datesAsc.length > 0 ? Date.parse(`${datesAsc[0]}T00:00:00Z`) : 0;
    const maxTime = datesAsc.length > 0 ? Date.parse(`${datesAsc[datesAsc.length - 1]}T00:00:00Z`) : 1;
    const timeRange = Math.max(maxTime - minTime, 1);

    const width = 800;
    const height = 260;
    const padding = 30;

    const lines = activeSeries.map((s) => {
      const pointByDate = new Map<string, number>();
      s.points.forEach((p) => pointByDate.set(p.date, p.value));

      if (s.points.length === 0) {
        return {
          ...s,
          path: '',
          min: s.currentValue,
          max: s.currentValue,
          latest: s.currentValue,
          points: [] as Array<{ x: number; y: number; date: string; value: number }>,
          pointByDate,
        };
      }

      const values = s.points.map((p) => p.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const pts = s.points.map((p, idx) => {
        const ptTime = Date.parse(`${p.date}T00:00:00Z`);
        const xRatio =
          datesAsc.length > 1 && !isNaN(ptTime) && timeRange > 1
            ? (ptTime - minTime) / timeRange
            : idx / Math.max(s.points.length - 1, 1);
        const x = padding + xRatio * (width - 2 * padding);
        const y = height - padding - ((p.value - min) / range) * (height - 2 * padding);
        return { x, y, date: p.date, value: p.value };
      });

      const path = pts.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }, '');

      return {
        ...s,
        path,
        min,
        max,
        latest: s.currentValue,
        points: pts,
        pointByDate,
      };
    });

    return { lines, datesAsc, datesDesc };
  }, [activeSeries]);

  // CSV export handler using aligned real market dates
  const handleExportCsv = () => {
    if (chartData.lines.length === 0) return;
    const dates = chartData.datesDesc;
    const headers = ['Market Date', ...chartData.lines.map((s) => `"${s.label} (${s.unit.trim()})"` )];
    const rows = dates.map((d) => {
      const vals = chartData.lines.map((s) => {
        const val = s.pointByDate.get(d);
        return val !== undefined ? val.toFixed(s.formatDecimals) : '';
      });
      return [d, ...vals].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paperworking_market_vitals_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="market-modal-title"
      data-testid="market-visualization-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overscroll-contain"
    >
      <div
        data-testid="market-visualization-modal"
        className={`w-full overflow-hidden rounded-none border border-border bg-card p-4 sm:p-6 text-card-foreground shadow-2xl transition-all duration-200 flex flex-col ${
          isExpanded ? 'max-w-6xl max-h-[94vh] h-full' : 'max-w-4xl max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-0.5">
                Live Market Terminal
              </span>
              {primaryFocusedSeries && (
                <span className="font-mono text-[11px] font-semibold text-foreground border border-border bg-muted/30 px-2 py-0.5">
                  Market Day: {formatReadableMarketDate(primaryFocusedSeries.marketDate)}
                </span>
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {primaryFocusedSeries
                  ? `${primaryFocusedSeries.source} · ${primaryFocusedSeries.frequency} Official Series (${primaryFocusedSeries.code})`
                  : 'Federal Reserve Economic Data (FRED) & Polygon.io'}
              </span>
            </div>
            <h2 id="market-modal-title" className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {activeSeries.length === 1 && primaryFocusedSeries
                ? `${primaryFocusedSeries.name} (${primaryFocusedSeries.code})`
                : 'Macroeconomic Benchmarks & Real Estate Scoreboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded((p) => !p)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title={isExpanded ? 'Collapse' : 'Expand full'}
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

        {/* Scrollable Modal Body */}
        <div
          data-testid="market-visualization-modal-body"
          className="mt-3 flex-1 overflow-y-auto overscroll-contain pr-1 space-y-3"
        >
          {/* Real-Time Market Day Snapshot Banner for Focused Metric */}
          {primaryFocusedSeries && (
            <div className="border border-border bg-muted/15 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span className="font-bold uppercase text-foreground">
                    {primaryFocusedSeries.code}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Latest Market Day:{' '}
                    <strong className="text-foreground">{primaryFocusedSeries.marketDate}</strong>
                  </span>
                  {primaryFocusedSeries.referencePeriod && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">
                        Reporting Period:{' '}
                        <strong className="text-foreground">{primaryFocusedSeries.referencePeriod}</strong>
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground">·</span>
                  <span className="uppercase text-muted-foreground">
                    Source: <strong className="text-foreground">{primaryFocusedSeries.source}</strong> ({primaryFocusedSeries.frequency})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {primaryFocusedSeries.description}
                  {primaryFocusedSeries.benchmarkContext ? ` (${primaryFocusedSeries.benchmarkContext})` : ''}
                </p>
              </div>

              <div className="flex items-baseline sm:flex-col sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-border/60 pt-2 sm:pt-0">
                <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                  {formatValueWithUnit(
                    primaryFocusedSeries.currentValue,
                    primaryFocusedSeries.unit,
                    primaryFocusedSeries.formatDecimals
                  )}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground tabular-nums flex items-center gap-1.5">
                  <span>
                    {primaryFocusedSeries.delta > 0 ? '+' : ''}
                    {primaryFocusedSeries.delta.toFixed(primaryFocusedSeries.formatDecimals)} (
                    {primaryFocusedSeries.delta > 0 ? '+' : ''}
                    {primaryFocusedSeries.deltaPct.toFixed(2)}%)
                  </span>
                  <span>
                    vs {formatValueWithUnit(
                      primaryFocusedSeries.previousValue,
                      primaryFocusedSeries.unit,
                      primaryFocusedSeries.formatDecimals
                    )} prior
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar: Timeframe selector + View Mode + CSV Export */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3">
            {/* Timeframe Buttons */}
            <div className="flex items-center gap-1 border border-border bg-muted/20 p-1">
              {(['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as ScoreboardPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1 text-xs font-mono font-semibold transition ${
                    period === p
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* View Mode & Export */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-border bg-muted/20 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('chart')}
                  className={`flex min-h-[36px] items-center gap-1.5 px-3 py-1 text-xs font-semibold transition ${
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
                  onClick={() => setViewMode('table')}
                  className={`flex min-h-[36px] items-center gap-1.5 px-3 py-1 text-xs font-semibold transition ${
                    viewMode === 'table'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Table className="h-4 w-4" />
                  <span>Ledger</span>
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5 min-h-[36px]">
                <DownloadSimple className="h-4 w-4" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Series Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap border-b border-border pb-2.5">
            <span className="text-[11px] font-mono text-muted-foreground uppercase mr-1 shrink-0">Overlay Series:</span>
            {allAvailableSeries.map((s) => {
              const isSelected = selectedSeriesIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSeries(s.id)}
                  className={`flex items-center gap-1.5 border px-2 py-1 text-[11px] font-mono transition shrink-0 ${
                    isSelected
                      ? 'border-foreground/40 bg-foreground/10 text-foreground font-semibold'
                      : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-none shrink-0"
                    style={{ backgroundColor: isSelected ? s.color : 'transparent', border: `1px solid ${s.color}` }}
                  />
                  <span>{s.label}</span>
                  {isSelected && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>

          {/* Chart or Ledger View */}
          <div>
          {viewMode === 'chart' ? (
            <div className="space-y-4">
              {/* SVG Chart */}
              <div className="relative w-full border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mb-3 font-mono">
                  <span>Historical Market Trajectory ({period})</span>
                  <span>
                    {chartData.datesAsc.length > 0
                      ? `Window: ${chartData.datesAsc[0]} to ${chartData.datesAsc[chartData.datesAsc.length - 1]}`
                      : 'Independent scale normalized per indicator'}
                  </span>
                </div>

                <div className="h-[240px] sm:h-[260px] w-full">
                  <svg viewBox="0 0 800 260" className="h-full w-full overflow-visible">
                    {/* Background grid lines */}
                    {[0, 1, 2, 3, 4].map((gridIdx) => {
                      const y = 30 + gridIdx * 50;
                      return (
                        <line
                          key={gridIdx}
                          x1={30}
                          y1={y}
                          x2={770}
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity={0.08}
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* Series Lines */}
                    {chartData.lines.map((l) => (
                      <g key={l.id}>
                        <path
                          d={l.path}
                          fill="none"
                          stroke={l.color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Final point marker */}
                        {l.points.length > 0 && (
                          <circle
                            cx={l.points[l.points.length - 1].x}
                            cy={l.points[l.points.length - 1].y}
                            r="4"
                            fill={l.color}
                          />
                        )}
                      </g>
                    ))}
                  </svg>
                </div>

                {/* Date axis */}
                <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1.5">
                  {chartData.datesAsc.length > 0 && (
                    <>
                      <span>{chartData.datesAsc[0]}</span>
                      {chartData.datesAsc.length > 4 && (
                        <span>{chartData.datesAsc[Math.floor(chartData.datesAsc.length / 2)]}</span>
                      )}
                      <span>{chartData.datesAsc[chartData.datesAsc.length - 1]}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Metrics Grid with Real Market Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {chartData.lines.map((l) => {
                  const isZero = l.delta === 0;
                  const isUp = l.delta > 0;
                  const isGood = l.isPositiveGood ? isUp : !isUp;
                  const deltaColor = isZero
                    ? 'text-muted-foreground'
                    : isGood
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-rose-500 dark:text-rose-400';
                  const deltaSign = l.delta > 0 ? '+' : '';

                  return (
                    <div key={l.id} className="border border-border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 shrink-0" style={{ backgroundColor: l.color }} />
                          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground truncate">
                            {l.label}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                          {l.source}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-base font-bold text-foreground tabular-nums">
                          {formatValueWithUnit(l.latest, l.unit, l.formatDecimals)}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold ${deltaColor}`}>
                          {isZero ? (
                            <Minus className="h-2.5 w-2.5" />
                          ) : isUp ? (
                            <TrendUp className="h-2.5 w-2.5" />
                          ) : (
                            <TrendDown className="h-2.5 w-2.5" />
                          )}
                          {deltaSign}{l.delta.toFixed(l.formatDecimals)} ({deltaSign}{l.deltaPct.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>
                          {period} Range: {l.min.toFixed(l.formatDecimals)} - {l.max.toFixed(l.formatDecimals)}
                        </span>
                        <span className="text-foreground/80">
                          {l.marketDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
                    <th className="p-2.5">Market Date</th>
                    {chartData.lines.map((s) => (
                      <th key={s.id} className="p-2.5 text-right">
                        {s.label} ({s.unit.trim()})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {chartData.datesDesc.map((date) => (
                    <tr key={date} className="hover:bg-muted/20 transition">
                      <td className="p-2.5 font-medium text-foreground tabular-nums">{date}</td>
                      {chartData.lines.map((s) => {
                        const val = s.pointByDate.get(date);
                        return (
                          <td key={s.id} className="p-2.5 text-right tabular-nums">
                            {val !== undefined
                              ? formatValueWithUnit(val, s.unit, s.formatDecimals)
                              : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5">
          <p className="text-[11px] text-muted-foreground font-mono">
            {chartData.datesAsc.length} real market observations loaded ·{' '}
            {primaryFocusedSeries
              ? `Latest Market Day: ${primaryFocusedSeries.marketDate} (${primaryFocusedSeries.source})`
              : 'Live Federal Reserve (FRED) & Polygon.io Feed'}
          </p>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}
