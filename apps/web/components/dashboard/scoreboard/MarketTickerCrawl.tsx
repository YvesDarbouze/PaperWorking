'use client';

import React from 'react';
import { ArrowsOut, X, TrendUp, TrendDown, Minus } from '@/components/icons/PhosphorIcons';
import { LiveTickerItem, LocalMarketScoreboard } from '@/lib/market/types';

export interface MarketTickerCrawlProps {
  tickers: LiveTickerItem[];
  localMarket: LocalMarketScoreboard;
  onExpandToPanel: () => void;
  onCloseTicker: () => void;
  onSelectMetric: (metricId: string) => void;
}

export default function MarketTickerCrawl({
  tickers,
  localMarket,
  onExpandToPanel,
  onCloseTicker,
  onSelectMetric,
}: MarketTickerCrawlProps) {
  // Combine all items into a ticker stream
  const tickerItems = React.useMemo(() => {
    const list: Array<{
      id: string;
      symbol: string;
      value: string;
      deltaText: string;
      isUp: boolean;
      isZero: boolean;
      isGood: boolean;
    }> = [];

    tickers.forEach((t) => {
      const isZero = t.delta === 0;
      const isUp = t.delta > 0;
      const isGood = t.isPositiveGood ? isUp : !isUp;
      const valStr = t.unit === 'usd' ? `$${t.currentValue.toFixed(2)}` : `${t.currentValue.toFixed(2)}%`;
      const deltaSign = t.delta > 0 ? '+' : '';
      const deltaStr = `${deltaSign}${t.delta.toFixed(2)} (${deltaSign}${t.deltaPct.toFixed(1)}%)`;

      list.push({
        id: t.symbol,
        symbol: t.symbol,
        value: valStr,
        deltaText: deltaStr,
        isUp,
        isZero,
        isGood,
      });
    });

    // Add local scoreboard
    const localMetrics = [
      { id: 'MOI', m: localMarket.monthsOfInventory, suffix: 'mo' },
      { id: 'DOM', m: localMarket.daysOnMarket, suffix: 'd' },
      { id: 'S/L', m: localMarket.saleToListRatio, suffix: '%' },
    ];

    localMetrics.forEach(({ id, m, suffix }) => {
      const isZero = m.delta === 0;
      const isUp = m.delta > 0;
      const valStr = `${m.value.toFixed(m.formatDecimals)}${suffix}`;
      const deltaSign = m.delta > 0 ? '+' : '';
      const deltaStr = `${deltaSign}${m.delta.toFixed(m.formatDecimals)}`;

      list.push({
        id: m.id,
        symbol: id,
        value: valStr,
        deltaText: deltaStr,
        isUp,
        isZero,
        isGood: isZero ? true : !isUp,
      });
    });

    return list;
  }, [tickers, localMarket]);

  return (
    <aside
      aria-label="Real-time Market Ticker"
      className="fixed bottom-[calc(60px+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-40 flex h-10 w-full items-center border-t border-border bg-card/95 backdrop-blur-md px-3 text-xs font-mono shadow-md select-none rounded-none"
    >
      {/* Left Static Dock */}
      <div className="flex shrink-0 items-center gap-2 border-r border-border pr-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-none bg-[var(--status-live)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-none bg-[var(--status-live)]" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
          MACRO TICKER
        </span>
        <button
          type="button"
          onClick={onExpandToPanel}
          className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
          title="Restore full dashboard panel"
        >
          <ArrowsOut className="h-4 w-4" />
        </button>
      </div>

      {/* Scrolling Marquee Stream */}
      <div className="flex-1 overflow-hidden relative group">
        <div className="flex items-center gap-6 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
          {/* Double array for seamless loop */}
          {[...tickerItems, ...tickerItems].map((item, idx) => {
            const colorClass = item.isZero
              ? 'text-muted-foreground'
              : item.isGood
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-rose-500 dark:text-rose-400';

            return (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => onSelectMetric(item.id)}
                className="inline-flex items-center gap-2 hover:bg-muted/40 px-2 py-1 transition cursor-pointer"
              >
                <span className="font-bold text-foreground">{item.symbol}</span>
                <span className="font-semibold text-foreground/90">{item.value}</span>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${colorClass}`}>
                  {item.isZero ? (
                    <Minus className="h-2.5 w-2.5" />
                  ) : item.isUp ? (
                    <TrendUp className="h-2.5 w-2.5" />
                  ) : (
                    <TrendDown className="h-2.5 w-2.5" />
                  )}
                  {item.deltaText}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Static Dock: Close / Dismiss button */}
      <div className="flex shrink-0 items-center pl-3 border-l border-border">
        <button
          type="button"
          onClick={onCloseTicker}
          className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
          title="Close ticker and restore dashboard panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
