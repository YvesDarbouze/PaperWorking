'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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

    // 1. Markets (Cities & States)
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

    // 2. Deals (Property / Project Names)
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

    // 3. Addresses
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
  }, [inputValue, deals, recentSearches]);

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
      <div className="relative flex h-12 w-full items-center rounded-xl border border-white/10 bg-[#121014] px-4 shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all duration-200 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[#0a0a0f]">
        <span className="material-symbols-outlined text-[20px] text-[#9E9DA0] select-none mr-3">
          search
        </span>
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
          className="h-full w-full bg-transparent text-[14px] text-[#fdfffc] placeholder:text-[#9E9DA0]/80 outline-none"
          autoComplete="off"
          data-testid="marketplace-search-input"
        />
        {inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9E9DA0] hover:bg-white/10 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown with Scale+Fade Motion Token */}
      {isOpen && suggestions.length > 0 && (
        <div
          data-testid="search-suggestions-dropdown"
          className="absolute left-0 right-0 top-[52px] z-50 max-h-[380px] overflow-y-auto rounded-xl border border-white/10 bg-[#161318] p-2 shadow-2xl backdrop-blur-xl dropdown-entrance"
        >
          {recents.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
                Recent Searches
              </div>
              {recents.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-white/10 text-[var(--accent)]' : 'text-[#fdfffc]/85 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#9E9DA0]">history</span>
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {markets.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
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
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-white/10 text-[var(--accent)]' : 'text-[#fdfffc]/85 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">location_city</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-[#9E9DA0]">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {dealSuggestions.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
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
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-white/10 text-[var(--accent)]' : 'text-[#fdfffc]/85 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-400">domain</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-[#9E9DA0]">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {addresses.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
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
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      isSelected ? 'bg-white/10 text-[var(--accent)]' : 'text-[#fdfffc]/85 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#7A9EAA]">pin_drop</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-[#9E9DA0]">{item.sublabel}</span>
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
