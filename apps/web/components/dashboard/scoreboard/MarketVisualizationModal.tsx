'use client';

import React from 'react';
import {
  X,
  ArrowSquareOut,
  DownloadSimple,
  Table,
  ChartLineUp,
  Check,
} from '@/components/icons/PhosphorIcons';
import { Button } from '@/components/ui/Button';
import {
  LiveTickerItem,
  LocalMarketScoreboard,
  ScoreboardPeriod,
  TimeSeriesPoint,
} from '@/lib/market/types';

export interface MarketVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickers: LiveTickerItem[];
  localMarket: LocalMarketScoreboard;
  initialSelectedId?: string;
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

  // Sync initial selection
  React.useEffect(() => {
    if (initialSelectedId && !selectedSeriesIds.includes(initialSelectedId)) {
      setSelectedSeriesIds((prev) => [initialSelectedId, ...prev.slice(0, 2)]);
    }
  }, [initialSelectedId]);

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

  // Gather all available series options
  const allAvailableSeries = React.useMemo(() => {
    const list: Array<{ id: string; label: string; unit: string; points: TimeSeriesPoint[]; color: string }> = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    tickers.forEach((t, i) => {
      const points = t.historicalSeries?.[period] || [];
      list.push({
        id: t.symbol,
        label: `${t.symbol} - ${t.name}`,
        unit: t.unit === 'usd' ? '$' : '%',
        points,
        color: colors[i % colors.length],
      });
    });

    // Add local indicators
    const localMetrics = [
      localMarket.monthsOfInventory,
      localMarket.daysOnMarket,
      localMarket.saleToListRatio,
    ];

    localMetrics.forEach((m, i) => {
      const points = m.historicalSeries?.[period] || [];
      list.push({
        id: m.id,
        label: `${m.label}`,
        unit: m.unit,
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
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  // Active series for plotting
  const activeSeries = React.useMemo(() => {
    return allAvailableSeries.filter((s) => selectedSeriesIds.includes(s.id));
  }, [allAvailableSeries, selectedSeriesIds]);

  // SVG Chart calculation with dual-axis / normalized calculation
  const chartData = React.useMemo(() => {
    if (activeSeries.length === 0) return { lines: [], dates: [] };

    // Find date labels from the first series with data
    const primarySeries = activeSeries[0];
    const dates = primarySeries?.points.map((p) => p.date) || [];

    const width = 800;
    const height = 260;
    const padding = 30;

    const lines = activeSeries.map((s) => {
      if (s.points.length === 0) return { id: s.id, label: s.label, color: s.color, path: '', unit: s.unit, points: [] };
      const values = s.points.map((p) => p.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const pts = s.points.map((p, idx) => {
        const x = padding + (idx / Math.max(s.points.length - 1, 1)) * (width - 2 * padding);
        const y = height - padding - ((p.value - min) / range) * (height - 2 * padding);
        return { x, y, date: p.date, value: p.value };
      });

      const path = pts.reduce((acc, pt, idx) => {
        return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
      }, '');

      return {
        id: s.id,
        label: s.label,
        color: s.color,
        path,
        unit: s.unit,
        min,
        max,
        latest: values[values.length - 1],
        points: pts,
      };
    });

    return { lines, dates };
  }, [activeSeries]);

  // CSV export handler
  const handleExportCsv = () => {
    if (activeSeries.length === 0) return;
    const dates = chartData.dates;
    const headers = ['Date', ...activeSeries.map((s) => `"${s.label} (${s.unit})"` )];
    const rows = dates.map((d, idx) => {
      const vals = activeSeries.map((s) => {
        const pt = s.points[idx];
        return pt ? pt.value : '';
      });
      return [d, ...vals].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paperworking_market_indicators_${period}.csv`);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        data-testid="market-visualization-modal"
        className={`w-full overflow-hidden rounded-none border border-border bg-card p-6 text-card-foreground shadow-2xl transition-all duration-200 flex flex-col ${
          isExpanded ? 'max-w-6xl max-h-[94vh] h-full' : 'max-w-4xl max-h-[88vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-0.5">
                Market Terminal
              </span>
              <span className="text-xs text-muted-foreground">
                Federal Reserve Economic Data (FRED) &amp; Public Benchmark Observables
              </span>
            </div>
            <h2 id="market-modal-title" className="mt-1 text-xl font-bold tracking-tight text-foreground">
              Macroeconomic Benchmarks &amp; Real Estate Scoreboard
            </h2>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Toolbar: Timeframe selector + View Mode + CSV Export */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 border border-border bg-muted/20 p-1">
            {(['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as ScoreboardPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`min-h-[36px] px-3 py-1 text-xs font-mono font-semibold transition ${
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
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
          <span className="text-[11px] font-mono text-muted-foreground uppercase mr-1">Overlay Series:</span>
          {allAvailableSeries.map((s) => {
            const isSelected = selectedSeriesIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSeries(s.id)}
                className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs font-mono transition ${
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

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {viewMode === 'chart' ? (
            <div className="space-y-4">
              {/* SVG Chart */}
              <div className="relative w-full border border-border bg-card/60 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 font-mono">
                  <span>Comparative Trajectory ({period})</span>
                  <span>Independent scale normalized per indicator</span>
                </div>

                <div className="h-[260px] w-full">
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
                  {chartData.dates.length > 0 && (
                    <>
                      <span>{chartData.dates[0]}</span>
                      {chartData.dates.length > 4 && <span>{chartData.dates[Math.floor(chartData.dates.length / 2)]}</span>}
                      <span>{chartData.dates[chartData.dates.length - 1]}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Spread & Summary Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {chartData.lines.map((l) => (
                  <div key={l.id} className="border border-border bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="h-2 w-2" style={{ backgroundColor: l.color }} />
                      <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground truncate">
                        {l.label}
                      </span>
                    </div>
                    <div className="font-mono text-base font-bold text-foreground">
                      {l.unit === '$' ? `$${l.latest?.toFixed(2)}` : `${l.latest?.toFixed(2)}${l.unit}`}
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                      Range: {l.min?.toFixed(2)} - {l.max?.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
                    <th className="p-2.5">Date</th>
                    {activeSeries.map((s) => (
                      <th key={s.id} className="p-2.5 text-right">
                        {s.label} ({s.unit})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {chartData.dates.map((date, idx) => (
                    <tr key={date} className="hover:bg-muted/20 transition">
                      <td className="p-2.5 font-medium text-foreground">{date}</td>
                      {activeSeries.map((s) => {
                        const pt = s.points[idx];
                        return (
                          <td key={s.id} className="p-2.5 text-right tabular-nums">
                            {pt ? (s.unit === '$' ? `$${pt.value.toFixed(2)}` : `${pt.value.toFixed(2)}`) : '—'}
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

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground font-mono">
            {chartData.dates.length} observation periods loaded · Verified economic series
          </p>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}
