import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import type { PropertyFacts } from '@/lib/providers/property';

interface AVMRangeDisplayProps {
  facts?: PropertyFacts | null;
}

export function AVMRangeDisplay({ facts }: AVMRangeDisplayProps) {
  if (!facts) return null;

  const isMock = facts.sourceProvider?.toLowerCase().includes('mock');
  const hasAvm = facts.avmPriceCents !== undefined && facts.avmPriceCents !== null;
  const avmPrice = facts.avmPriceCents ? facts.avmPriceCents / 100 : 0;
  const avmPriceLow = facts.avmPriceLowCents ? facts.avmPriceLowCents / 100 : null;
  const avmPriceHigh = facts.avmPriceHighCents ? facts.avmPriceHighCents / 100 : null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Calculate percentage position of the AVM estimate relative to the low-high range
  let percentagePosition = 50;
  if (avmPriceLow !== null && avmPriceHigh !== null && avmPriceHigh > avmPriceLow) {
    percentagePosition = Math.min(
      100,
      Math.max(0, ((avmPrice - avmPriceLow) / (avmPriceHigh - avmPriceLow)) * 100)
    );
  }

  return (
    <div className="space-y-4">
      {/* Sandbox warning banner if using mock data */}
      {isMock && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 animate-in fade-in duration-200">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Demo / Sandbox Mode</h4>
            <p className="text-[11px] text-amber-400/80 leading-relaxed font-medium">
              Serving simulated mock property data. To activate real live records, configure PROPERTY_DATA_PROVIDER along with RentCast, ATTOM, or Mashvisor API credentials in your environment.
            </p>
          </div>
        </div>
      )}

      {/* AVM Range Display */}
      {hasAvm && (
        <div className="glass-card border border-pw-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-[#6B6870] tracking-widest">Valuation Estimate</p>
              <h3 className="text-2xl font-black text-white mt-1">
                {formatCurrency(avmPrice)}
              </h3>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/5 bg-white/[0.02] text-[10px] font-bold text-[#9E9DA0]">
                <Info className="w-3 h-3 text-[#6B6870]" />
                AVM Estimate
              </span>
            </div>
          </div>

          {avmPriceLow !== null && avmPriceHigh !== null && (
            <div className="space-y-2">
              {/* Range bar */}
              <div className="relative h-2 w-full bg-white/5 rounded-full overflow-visible">
                {/* Visual marker for AVM price estimate */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#454955] border-2 border-black shadow-[0_0_8px_rgba(69,73,85,0.4)]"
                  style={{ left: `${percentagePosition}%` }}
                />
              </div>

              {/* Low / High Labels */}
              <div className="flex justify-between text-[11px] font-bold tracking-wider uppercase text-[#6B6870]">
                <span>Low: {formatCurrency(avmPriceLow)}</span>
                <span>High: {formatCurrency(avmPriceHigh)}</span>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[10px] text-[#6B6870] font-medium leading-relaxed">
            <span>Sourced via {facts.sourceProvider || 'Property Data API'}</span>
            <span>Fetched: {new Date(facts.fetchedAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
