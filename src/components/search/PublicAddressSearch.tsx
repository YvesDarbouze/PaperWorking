'use client';

/* ═══════════════════════════════════════════════════════
   PublicAddressSearch — DM-7

   The pre-paywall search hero. Full-width address input
   with debounced autocomplete from the public Places API.
   No account required.

   Design contract:
   • Placeholder signals scope: street addresses only
   • Input width accommodates a full US address
   • Debounced 300ms autocomplete
   • Keyboard navigation (↑↓ Enter Escape)
   • Google attribution below results (DM-3)
   ═══════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
import { searchDealByAddress } from '@/actions/listings';
import type { DealSearchResult } from '@/types/listing';
import { recordSearchTelemetry, recordConversionTelemetry } from '@/actions/telemetry';
import SearchResultCard from './SearchResultCard';
import dynamic from 'next/dynamic';

const DealMap = dynamic(() => import('@/components/marketplace/DealMap'), { ssr: false });

interface Prediction {
  placeId: string;
  description: string;
}

interface PublicAddressSearchProps {
  className?: string;
}

export default function PublicAddressSearch({ className = '' }: PublicAddressSearchProps) {
  // ── Input state ─────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [sessionToken, setSessionToken] = useState('');

  // ── Search state ────────────────────────────────────────
  const [searchResult, setSearchResult] = useState<DealSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const token = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setSessionToken(token);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('pw_public_search_view');
    if (saved === 'list' || saved === 'map') {
      setActiveView(saved);
    }
  }, []);

  const handleViewChange = (view: 'list' | 'map') => {
    setActiveView(view);
    localStorage.setItem('pw_public_search_view', view);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Autocomplete fetch ──────────────────────────────────
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/places/autocomplete-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });

      if (!res.ok) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }

      const data = await res.json();
      setPredictions(data.predictions || []);
      setIsOpen((data.predictions || []).length > 0);
      setSelectedIndex(-1);
    } catch {
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Debounced input handler ─────────────────────────────
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSearchResult(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  }, [fetchPredictions]);

  // ── Selection handler ───────────────────────────────────
  const handleSelect = useCallback(async (prediction: Prediction) => {
    setQuery(prediction.description);
    setSelectedAddress(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    setIsSearching(true);

    try {
      const result = await searchDealByAddress(prediction.description, prediction.placeId);
      setSearchResult(result);
      
      const resultCount = result.mode === 'public_solicited' ? 1 : (result.mode === 'marketplace' ? 1 : 0);
      const resolved = result.mode !== 'not_found';
      recordSearchTelemetry({
        query: prediction.description,
        placeId: prediction.placeId || null,
        resultCount,
        resolved,
        sessionToken,
      }).catch(console.error);
    } catch {
      setSearchResult({ mode: 'cold_start', address: prediction.description });
      recordSearchTelemetry({
        query: prediction.description,
        placeId: prediction.placeId || null,
        resultCount: 0,
        resolved: false,
        sessionToken,
      }).catch(console.error);
    } finally {
      setIsSearching(false);
    }
  }, [sessionToken]);

  // ── Keyboard navigation ─────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'Enter' && query.trim().length >= 5) {
        // Direct search on Enter without selecting a prediction
        e.preventDefault();
        setIsOpen(false);
        setIsSearching(true);
        setSelectedAddress(query);
        searchDealByAddress(query).then((result) => {
          setSearchResult(result);
          const resultCount = result.mode === 'public_solicited' ? 1 : (result.mode === 'marketplace' ? 1 : 0);
          const resolved = result.mode !== 'not_found';
          recordSearchTelemetry({
            query,
            placeId: result.mode === 'public_solicited' && result.teaser ? result.teaser.placeId || null : null,
            resultCount,
            resolved,
            sessionToken,
          }).catch(console.error);
        }).catch(() => {
          setSearchResult({ mode: 'cold_start', address: query });
          recordSearchTelemetry({
            query,
            placeId: null,
            resultCount: 0,
            resolved: false,
            sessionToken,
          }).catch(console.error);
        }).finally(() => setIsSearching(false));
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, predictions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, predictions, selectedIndex, handleSelect, query]);

  // ── Clear handler ───────────────────────────────────────
  const handleClear = useCallback(() => {
    setQuery('');
    setPredictions([]);
    setIsOpen(false);
    setSearchResult(null);
    setSelectedAddress('');
    inputRef.current?.focus();
  }, []);

  // ── Click outside ───────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Cleanup debounce ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={className}>
      {/* ── Search Input (Sticky on scroll) ── */}
      <div className="sticky top-0 z-40 bg-[var(--bg-canvas)]/95 backdrop-blur-md py-3.5 -mx-4 px-4 md:-mx-0 md:px-0 border-b border-pw-border/5 mb-6">
        <div ref={containerRef} className="relative w-full max-w-[640px] mx-auto">
          <div className="relative">
            {/* Leading icon */}
            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none z-10">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <MapPin className="w-5 h-5 text-on-surface-variant/40" />
              )}
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              id="public-address-search"
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => predictions.length > 0 && setIsOpen(true)}
              placeholder="Search by street address — e.g. 123 Main St, Miami FL"
              autoComplete="off"
              aria-label="Search property address"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls="search-predictions-list"
              className="
                w-full h-14 sm:h-16
                pl-12 sm:pl-14 pr-12
                bg-surface-container/80 backdrop-blur-sm
                border border-pw-border
                rounded-2xl
                text-[15px] sm:text-base text-on-surface
                placeholder:text-on-surface-variant/35
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                transition-all duration-200
              "
            />

            {/* Trailing clear / search icon */}
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              {query ? (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container-high/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-4.5 h-4.5 text-on-surface-variant/25" />
              )}
            </div>
          </div>

        {/* ── Predictions Dropdown ──────────────────── */}
        {isOpen && predictions.length > 0 && (
          <div
            id="search-predictions-list"
            role="listbox"
            className="
              absolute top-full left-0 right-0 mt-2 z-50
              bg-surface-container/95 backdrop-blur-lg
              border border-pw-border
              rounded-2xl shadow-2xl shadow-black/40
              overflow-hidden
            "
          >
            <ul className="py-1.5">
              {predictions.map((p, i) => (
                <li
                  key={p.placeId}
                  role="option"
                  aria-selected={i === selectedIndex}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`
                    flex items-center gap-3 px-4 py-3 cursor-pointer
                    text-[13px] text-on-surface/90
                    transition-colors duration-100
                    ${i === selectedIndex ? 'bg-primary/8 text-on-surface' : 'hover:bg-surface-container-high/40'}
                  `}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0 text-on-surface-variant/40" />
                  <span className="truncate">{p.description}</span>
                </li>
              ))}
            </ul>

            {/* Google attribution (DM-3 compliance) */}
            <div className="px-4 py-2 border-t border-white/5 flex items-center justify-end">
              <span className="text-xs text-on-surface-variant/30 tracking-wide">
                Powered by Google
              </span>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ── Search Result ────────────────────────────── */}
      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-3 text-sm text-on-surface-variant/50">Searching…</span>
        </div>
      )}

      {searchResult && !isSearching && (
        <div className="mt-8 w-full max-w-[640px] mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* View switcher switch */}
          <div className="flex justify-between items-center bg-surface-container/30 border border-pw-border rounded-xl p-2">
            <span className="text-xs font-bold text-on-surface-variant/70 pl-2">
              Result View
            </span>
            <div className="flex bg-surface-container-high/60 rounded-lg p-0.5 border border-pw-border h-9">
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                className={`px-3 flex items-center gap-1.5 rounded-md text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                  activeView === 'list'
                    ? 'bg-primary text-[#FDFFFC] shadow'
                    : 'text-on-surface-variant/60 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">list</span>
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('map')}
                className={`px-3 flex items-center gap-1.5 rounded-md text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                  activeView === 'map'
                    ? 'bg-primary text-[#FDFFFC] shadow'
                    : 'text-on-surface-variant/60 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                <span>Map</span>
              </button>
            </div>
          </div>

          {activeView === 'map' ? (
            <div className="space-y-4">
              {searchResult.mode === 'public_solicited' && searchResult.teaser && (
                <DealMap
                  deals={[searchResult.teaser]}
                  center={
                    searchResult.teaser.latitude && searchResult.teaser.longitude
                      ? { lat: searchResult.teaser.latitude, lng: searchResult.teaser.longitude }
                      : undefined
                  }
                  zoom={14}
                />
              )}
              {searchResult.mode === 'marketplace' && (
                /* No pins rendered for Marketplace deals anonymously */
                <DealMap deals={[]} />
              )}
              {searchResult.mode === 'cold_start' && searchResult.resolvedAddress && (
                <DealMap
                  customMarker={{
                    lat: searchResult.resolvedAddress.lat,
                    lng: searchResult.resolvedAddress.lng,
                    title: searchResult.resolvedAddress.formattedAddress,
                  }}
                  center={{
                    lat: searchResult.resolvedAddress.lat,
                    lng: searchResult.resolvedAddress.lng,
                  }}
                  zoom={14}
                />
              )}
              <SearchResultCard result={searchResult} />
            </div>
          ) : (
            <SearchResultCard result={searchResult} />
          )}
        </div>
      )}
    </div>
  );
}
