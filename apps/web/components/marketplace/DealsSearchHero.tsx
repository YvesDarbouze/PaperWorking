'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MagnifyingGlass, X, ClockCounterClockwise, Buildings, MapPin, House } from '@phosphor-icons/react';
import type { DealCardData } from '@/components/marketplace/DealCard';

export interface DealsSearchHeroProps {
  value: string;
  deals: DealCardData[];
  onSearchChange: (search: string) => void;
  placeholder?: string;
  className?: string;
}

interface SuggestionItem {
  id: string;
  type: 'address' | 'market' | 'deal' | 'recent';
  label: string;
  sublabel?: string;
  searchValue: string;
}

const RECENT_SEARCHES_KEY = 'paperworking_recent_deal_searches';

export default function DealsSearchHero({
  value,
  deals,
  onSearchChange,
  placeholder = 'Search any street address, city, or deal name…',
  className = '',
}: DealsSearchHeroProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // Ignore localStorage errors in private mode
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [placesPredictions, setPlacesPredictions] = useState<Array<{ placeId: string; description: string; mainText?: string; secondaryText?: string }>>([]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setPlacesPredictions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, sessionToken: `search-${Date.now()}` }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.predictions)) {
            setPlacesPredictions(data.predictions.slice(0, 5));
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Compute grouped suggestions
  const suggestions = useMemo<SuggestionItem[]>(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) {
      // Show recent searches if query is empty
      return recentSearches.map((s, idx) => ({
        id: `recent-${idx}`,
        type: 'recent' as const,
        label: s,
        searchValue: s,
      }));
    }

    const items: SuggestionItem[] = [];

    // 1. Google Places Predictions
    placesPredictions.forEach((p) => {
      items.push({
        id: `places-${p.placeId}`,
        type: 'address',
        label: p.description,
        sublabel: p.secondaryText || 'Google Places Verified Address',
        searchValue: p.description,
      });
    });

    // 2. Markets (Cities & States)
    const marketsSet = new Set<string>();
    deals.forEach((d) => {
      const city = d.city || '';
      const state = d.state || '';
      const market = [city, state].filter(Boolean).join(', ');
      if (market && (city.toLowerCase().includes(q) || state.toLowerCase().includes(q) || market.toLowerCase().includes(q))) {
        marketsSet.add(market);
      }
    });

    marketsSet.forEach((m, idx) => {
      if (items.length < 12) {
        items.push({
          id: `market-${idx}`,
          type: 'market',
          label: m,
          sublabel: 'Market / Metro',
          searchValue: m,
        });
      }
    });

    // 3. Deals (Property / Project Names)
    deals.forEach((d) => {
      const name = d.propertyName || d.name || '';
      if (name && name.toLowerCase().includes(q) && items.length < 12) {
        items.push({
          id: `deal-${d.id}`,
          type: 'deal',
          label: name,
          sublabel: `${d.city || ''}, ${d.state || ''} · ${d.assetClass || 'Commercial'}`,
          searchValue: name,
        });
      }
    });

    // 4. Addresses
    deals.forEach((d) => {
      const addr = d.address || '';
      if (addr && addr.toLowerCase().includes(q) && items.length < 12) {
        items.push({
          id: `addr-${d.id}`,
          type: 'address',
          label: addr,
          sublabel: d.propertyName || 'Property Address',
          searchValue: addr,
        });
      }
    });

    return items;
  }, [inputValue, deals, recentSearches, placesPredictions]);

  const handleSelect = (item: SuggestionItem) => {
    setInputValue(item.searchValue);
    saveRecentSearch(item.searchValue);
    onSearchChange(item.searchValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
        setSelectedIndex(0);
      } else if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else {
        // In-place submit: never navigate away (F-03)
        saveRecentSearch(inputValue);
        onSearchChange(inputValue);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onSearchChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Group items for rendering
  const markets = suggestions.filter((s) => s.type === 'market');
  const dealSuggestions = suggestions.filter((s) => s.type === 'deal');
  const addresses = suggestions.filter((s) => s.type === 'address');
  const recents = suggestions.filter((s) => s.type === 'recent');

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex h-12 w-full items-center rounded-none border border-neutral-800 bg-neutral-950 px-4 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500 transition-colors">
        <MagnifyingGlass className="h-5 w-5 text-neutral-400 select-none mr-3 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
            onSearchChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0 || recentSearches.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-base md:text-sm text-neutral-100 placeholder:text-neutral-500 outline-none"
          autoComplete="off"
          data-testid="marketplace-search-input"
        />
        {inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-7 w-7 items-center justify-center rounded-none text-neutral-400 hover:bg-neutral-800 hover:text-white transition focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          data-testid="search-suggestions-dropdown"
          className="absolute left-0 right-0 top-[50px] z-50 max-h-[380px] overflow-y-auto rounded-none border border-neutral-800 bg-neutral-950 p-2 shadow-2xl backdrop-blur-xl"
        >
          {recents.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Recent Searches
              </div>
              {recents.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center justify-between rounded-none px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ClockCounterClockwise className="h-4 w-4 text-neutral-400" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {markets.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Markets
              </div>
              {markets.map((item) => {
                const globalIndex = suggestions.indexOf(item);
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center justify-between rounded-none px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Buildings className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {dealSuggestions.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Deals
              </div>
              {dealSuggestions.map((item) => {
                const globalIndex = suggestions.indexOf(item);
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center justify-between rounded-none px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <House className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {addresses.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Addresses
              </div>
              {addresses.map((item) => {
                const globalIndex = suggestions.indexOf(item);
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center justify-between rounded-none px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
