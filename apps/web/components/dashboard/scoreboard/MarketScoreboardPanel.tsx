'use client';

import React from 'react';
import {
  ArrowsIn,
  ChartLineUp,
  MapPin,
} from '@/components/icons/PhosphorIcons';
import { Button } from '@/components/ui/Button';
import MarketMetricCard from './MarketMetricCard';
import LocalScoreboardCard from './LocalScoreboardCard';
import MarketTickerCrawl from './MarketTickerCrawl';
import MarketVisualizationModal from './MarketVisualizationModal';
import {
  LiveTickerItem,
  LocalMarketScoreboard,
  MarketScoreboardApiResponse,
} from '@/lib/market/types';
import {
  BENCHMARK_TICKERS,
  BENCHMARK_LOCAL_MARKET,
} from '@/lib/market/market-service';

export default function MarketScoreboardPanel() {
  const [data, setData] = React.useState<{
    tickers: LiveTickerItem[];
    localMarket: LocalMarketScoreboard;
    liveFeedConfigured: { fred: boolean; alphaVantage: boolean; polygon: boolean };
  }>({
    tickers: BENCHMARK_TICKERS,
    localMarket: BENCHMARK_LOCAL_MARKET,
    liveFeedConfigured: { fred: false, alphaVantage: false, polygon: false },
  });

  const [isCollapsedToTicker, setIsCollapsedToTicker] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedMetricId, setSelectedMetricId] = React.useState<string | undefined>(undefined);

  // Fetch live market data on mount
  React.useEffect(() => {
    let cancelled = false;
    async function loadScoreboard() {
      try {
        const res = await fetch('/api/market/tickers', { cache: 'no-store' });
        if (res.ok) {
          const body: MarketScoreboardApiResponse = await res.json();
          if (!cancelled && body.tickers && body.localMarket) {
            setData({
              tickers: body.tickers,
              localMarket: body.localMarket,
              liveFeedConfigured: body.liveFeedConfigured,
            });
          }
        }
      } catch {
        // Retain verified benchmark fallback on network failure
      }
    }

    loadScoreboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenModal = (id?: string) => {
    setSelectedMetricId(id);
    setIsModalOpen(true);
  };

  const tenYear = data.tickers.find((t) => t.symbol === 'DGS10');
  const mortgage30 = data.tickers.find((t) => t.symbol === 'MORTGAGE30US');
  const spreadBps =
    tenYear && mortgage30
      ? Math.round((mortgage30.currentValue - tenYear.currentValue) * 100)
      : null;

  return (
    <>
      {/* Above-the-fold Dashboard Scoreboard Panel (rendered when not collapsed) */}
      {!isCollapsedToTicker ? (
        <section
          aria-label="Macroeconomic and Market Scoreboard"
          className="border border-border bg-card p-4 sm:p-5 shadow-sm ring-1 ring-foreground/10 space-y-4 rounded-none"
        >
          {/* Header Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-0.5">
                  Macro &amp; Local Scoreboard
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-none bg-[var(--status-live)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-none bg-[var(--status-live)]" />
                </span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {data.liveFeedConfigured.fred ? 'Live FRED Feed' : 'Benchmark Observables'}
                </span>
              </div>
              <h2 className="mt-1 text-base sm:text-lg font-bold tracking-tight text-foreground">
                Real Estate Investor Market Vitals
              </h2>
              <p className="text-xs text-muted-foreground">
                Daily cost of leverage benchmarks, commercial floating indices, and local market absorption scoreboard.
              </p>
            </div>

            {/* Actions: Full Visualization & Dock to Ticker */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenModal()}
                className="gap-1.5 min-h-[44px] md:min-h-0 text-xs"
              >
                <ChartLineUp className="h-4 w-4" />
                <span>Historical Analytics</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCollapsedToTicker(true)}
                className="gap-1.5 min-h-[44px] md:min-h-0 text-xs"
                title="Collapse into bottom ticker bar"
              >
                <ArrowsIn className="h-4 w-4" />
                <span>Collapse to Ticker</span>
              </Button>
            </div>
          </div>

          {/* Cards Grid: Macro Tickers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Core Macro &amp; Debt Benchmarks
              </span>
              {spreadBps !== null && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  30Y MTG vs 10Y Yield Spread:{' '}
                  <span className="font-bold text-foreground">{spreadBps} bps</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {data.tickers.map((ticker) => (
                <MarketMetricCard
                  key={ticker.symbol}
                  item={ticker}
                  onClick={() => handleOpenModal(ticker.symbol)}
                />
              ))}
            </div>
          </div>

          {/* Cards Grid: Local Real Estate Market Scoreboard */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Local Real Estate Liquidity Scoreboard ({data.localMarket.marketName})
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Absorption Rate: <span className="font-bold text-foreground">{data.localMarket.absorptionRatePct}%/mo</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LocalScoreboardCard
                metric={data.localMarket.monthsOfInventory}
                onClick={() => handleOpenModal('moi')}
              />
              <LocalScoreboardCard
                metric={data.localMarket.daysOnMarket}
                onClick={() => handleOpenModal('dom')}
              />
              <LocalScoreboardCard
                metric={data.localMarket.saleToListRatio}
                onClick={() => handleOpenModal('sale_to_list')}
              />
            </div>
          </div>
        </section>
      ) : (
        /* Floating Bottom Stock Ticker Crawl */
        <MarketTickerCrawl
          tickers={data.tickers}
          localMarket={data.localMarket}
          onExpandToPanel={() => setIsCollapsedToTicker(false)}
          onCloseTicker={() => setIsCollapsedToTicker(false)}
          onSelectMetric={(id) => handleOpenModal(id)}
        />
      )}

      {/* Multi-Timeframe Visualization Modal */}
      <MarketVisualizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tickers={data.tickers}
        localMarket={data.localMarket}
        initialSelectedId={selectedMetricId}
      />
    </>
  );
}
