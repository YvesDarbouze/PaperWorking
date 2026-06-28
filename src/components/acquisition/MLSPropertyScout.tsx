'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, Home, MapPin, TrendingUp, ChevronDown, ExternalLink } from 'lucide-react';
import type { BridgeSearchResult } from '@/types/bridge';

interface MLSPropertyScoutProps {
  currentAddress?: string;
  currentListPrice?: number;
  onAddComparable?: (property: BridgeSearchResult) => void;
}

function formatPrice(price: number | null): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
}

/**
 * MLSPropertyScout — Embedded MLS search for Phase 1 Acquisition.
 * Lets the operator search live MLS listings, compare properties, and pull
 * comparable data directly into their deal analysis.
 */
export default function MLSPropertyScout({ currentAddress, currentListPrice, onAddComparable }: MLSPropertyScoutProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BridgeSearchResult[]>([]);
  const [savedComps, setSavedComps] = useState<BridgeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [credentialsMissing, setCredentialsMissing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [mlsSource, setMlsSource] = useState<string | null>(null);
  const [mlsFetchedAt, setMlsFetchedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/bridge/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCredentialsMissing(!!data.credentialsMissing);
      setResults(data.results ?? []);
      if (!data.credentialsMissing && data.source) {
        setMlsSource(data.source);
        setMlsFetchedAt(data.fetchedAt ?? null);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleAddComp = (property: BridgeSearchResult) => {
    // Prevent duplicates
    if (savedComps.some(c => c.listingKey === property.listingKey)) return;
    setSavedComps(prev => [...prev, property]);
    onAddComparable?.(property);
  };

  const handleRemoveComp = (listingKey: string) => {
    setSavedComps(prev => prev.filter(c => c.listingKey !== listingKey));
  };

  // Calculate comp stats
  const compPrices = savedComps.filter(c => c.listPrice != null).map(c => c.listPrice!);
  const avgCompPrice = compPrices.length > 0 ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length) : null;
  const compSqfts = savedComps.filter(c => c.sqft != null).map(c => c.sqft!);
  const avgPricePerSqft = compSqfts.length > 0 && compPrices.length > 0
    ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compSqfts.reduce((a, b) => a + b, 0))
    : null;

  return (
    <div className="bg-black/90 border border-gray-700 rounded-xl shadow-xl mb-8 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Search className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">MLS Property Scout</p>
            <p className="text-[10px] text-text-secondary opacity-50">Search live MLS listings for comparable properties</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
              placeholder="Search by address, city, or ZIP code..."
              autoComplete="off"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isLoading
                ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                : <Search className="w-4 h-4 text-gray-500" />
              }
            </div>
          </div>

          {/* Credential Warning */}
          {credentialsMissing && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mb-4">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.12em]">
                MLS live search inactive — Bridge credentials not configured
              </p>
              <p className="text-[9px] text-amber-400/60 mt-1">Contact your admin to enable live MLS data</p>
            </div>
          )}

          {/* Search Results */}
          {hasSearched && !isLoading && results.length === 0 && !credentialsMissing && (
            <div className="text-center py-8">
              <MapPin className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No MLS listings found for &ldquo;{query}&rdquo;</p>
              <p className="text-[10px] text-gray-600 mt-1">Try a different address, city, or ZIP code</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-50">
                  {results.length} MLS Listing{results.length !== 1 ? 's' : ''} Found
                </p>
                {mlsSource && (
                  <p className="text-[9px] text-text-secondary opacity-40 tabular-nums">
                    via {mlsSource}{mlsFetchedAt ? ` · ${new Date(mlsFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                )}
              </div>
              {results.map((property) => {
                const isAlreadyComp = savedComps.some(c => c.listingKey === property.listingKey);
                return (
                  <div
                    key={property.listingKey}
                    className="flex items-start gap-3 bg-gray-900/60 border border-gray-800 rounded-lg p-3 hover:border-gray-600 transition-colors group"
                  >
                    {/* Thumbnail */}
                    {property.thumbnailUrl ? (
                      <img
                        src={property.thumbnailUrl}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg border border-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5 text-gray-600" />
                      </div>
                    )}

                    {/* Property Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{property.address}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {property.listPrice != null && (
                          <span className="text-sm font-bold text-emerald-400 tabular-nums">
                            {formatPrice(property.listPrice)}
                          </span>
                        )}
                        {property.beds != null && (
                          <span className="text-[10px] text-gray-400">
                            {property.beds}bd / {property.baths ?? '—'}ba
                          </span>
                        )}
                        {property.sqft != null && (
                          <span className="text-[10px] text-gray-400 tabular-nums">
                            {property.sqft.toLocaleString()} sqft
                          </span>
                        )}
                        {property.standardStatus && (
                          <span className={`text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border ${
                            property.standardStatus === 'Active' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                            property.standardStatus === 'Pending' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                            property.standardStatus === 'Closed' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                            'text-gray-400 border-gray-600 bg-gray-800'
                          }`}>
                            {property.standardStatus}
                          </span>
                        )}
                      </div>
                      {/* Price delta vs. current deal */}
                      {property.listPrice != null && currentListPrice != null && currentListPrice > 0 && (
                        <div className="mt-1.5">
                          {(() => {
                            const delta = property.listPrice - currentListPrice;
                            const pct = Math.round((delta / currentListPrice) * 100);
                            return (
                              <span className={`text-[9px] font-bold tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {delta >= 0 ? '+' : ''}{formatPrice(delta)} ({pct >= 0 ? '+' : ''}{pct}%) vs. your deal
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => handleAddComp(property)}
                      disabled={isAlreadyComp}
                      className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg border transition-all ${
                        isAlreadyComp
                          ? 'text-gray-600 border-gray-800 bg-gray-900 cursor-not-allowed'
                          : 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400'
                      }`}
                    >
                      {isAlreadyComp ? '✓ Added' : '+ Comp'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Saved Comparables Strip */}
          {savedComps.length > 0 && (
            <div className="border-t border-gray-800 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">
                  Saved Comparables ({savedComps.length})
                </p>
                {avgCompPrice != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">Avg: <strong className="text-white tabular-nums">{formatPrice(avgCompPrice)}</strong></span>
                    {avgPricePerSqft != null && (
                      <span className="text-[10px] text-gray-400">$/sqft: <strong className="text-white tabular-nums">${avgPricePerSqft}</strong></span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {savedComps.map((comp) => (
                  <div
                    key={comp.listingKey}
                    className="flex items-center gap-3 bg-gray-900/40 border border-gray-800 rounded-lg p-3 group"
                  >
                    {comp.thumbnailUrl ? (
                      <img src={comp.thumbnailUrl} alt="" className="w-10 h-10 object-cover rounded border border-gray-700 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded flex items-center justify-center flex-shrink-0">
                        <Home className="w-3 h-3 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white truncate">{comp.address}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-emerald-400 tabular-nums font-bold">{formatPrice(comp.listPrice)}</span>
                        {comp.beds != null && <span className="text-[9px] text-gray-500">{comp.beds}bd/{comp.baths}ba</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveComp(comp.listingKey)}
                      className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                      title="Remove comparable"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* ARV Suggestion */}
              {avgCompPrice != null && (
                <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-3 flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-400 font-bold">Comparable Market Data</p>
                    <p className="text-[9px] text-blue-400/60 mt-0.5">
                      Based on {savedComps.length} comp{savedComps.length !== 1 ? 's' : ''}, the average list price is <strong className="text-blue-300">{formatPrice(avgCompPrice)}</strong>.
                      {currentListPrice != null && currentListPrice > 0 && avgCompPrice > 0 && (
                        <> Your deal at {formatPrice(currentListPrice)} is <strong className={avgCompPrice > currentListPrice ? 'text-emerald-400' : 'text-red-400'}>
                          {Math.abs(Math.round(((currentListPrice - avgCompPrice) / avgCompPrice) * 100))}% {avgCompPrice > currentListPrice ? 'below' : 'above'}
                        </strong> market.</>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!hasSearched && savedComps.length === 0 && !credentialsMissing && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-xs text-gray-400 font-bold">Search the MLS to find comparable properties</p>
              <p className="text-[10px] text-gray-600 mt-1 max-w-xs mx-auto">
                Pull live listing data to validate your ARV estimate and compare pricing against the local market.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
