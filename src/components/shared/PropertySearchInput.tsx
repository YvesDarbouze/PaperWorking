'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, Home, DollarSign } from 'lucide-react';
import type { BridgeSearchResult } from '@/types/bridge';

interface PropertySearchInputProps {
  value: string;
  onSelect: (property: BridgeSearchResult) => void;
  onManualChange: (address: string) => void;
  placeholder?: string;
}

function formatPrice(cents: number | null): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents);
}

export default function PropertySearchInput({
  value,
  onSelect,
  onManualChange,
  placeholder = '123 MAIN ST, MIAMI, FL 33101',
}: PropertySearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<BridgeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [credentialsMissing, setCredentialsMissing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. reset)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bridge/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCredentialsMissing(!!data.credentialsMissing);
      setResults(data.results ?? []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onManualChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (property: BridgeSearchResult) => {
    setQuery(property.address);
    setIsOpen(false);
    setResults([]);
    onSelect(property);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="w-full border border-border-accent bg-bg-primary pl-12 pr-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-text-secondary/30"
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading
            ? <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
            : <Search className="w-4 h-4 text-text-secondary" />
          }
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 border border-border-accent border-t-0 bg-bg-surface shadow-lg max-h-80 overflow-y-auto">
          {credentialsMissing && (
            <div className="px-6 py-3 bg-amber-50 border-b border-border-accent">
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">
                MLS live search inactive — BRIDGE_* credentials not yet configured. Type a full address manually.
              </p>
            </div>
          )}

          {results.length === 0 && !credentialsMissing && !isLoading && (
            <div className="px-6 py-5 text-xs font-black text-text-secondary uppercase tracking-widest">
              No MLS matches found. Enter address manually.
            </div>
          )}

          {results.map((property) => (
            <button
              key={property.listingKey}
              type="button"
              onPointerDown={() => handleSelect(property)}
              className="w-full text-left px-6 py-4 hover:bg-bg-primary transition-all border-b border-border-accent last:border-b-0 group"
            >
              <div className="flex items-start gap-4">
                {property.thumbnailUrl ? (
                  <img
                    src={property.thumbnailUrl}
                    alt=""
                    className="w-12 h-12 object-cover border border-border-accent flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-bg-primary border border-border-accent flex items-center justify-center flex-shrink-0">
                    <Home className="w-4 h-4 text-text-secondary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-text-primary uppercase tracking-widest truncate group-hover:text-pw-accent transition-colors">
                    {property.address}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    {property.listPrice != null && (
                      <span className="text-xs font-black text-text-secondary font-mono">
                        {formatPrice(property.listPrice)}
                      </span>
                    )}
                    {property.beds != null && (
                      <span className="text-xs font-black text-text-secondary uppercase tracking-widest">
                        {property.beds}bd {property.baths ?? '—'}ba
                      </span>
                    )}
                    {property.sqft != null && (
                      <span className="text-xs font-black text-text-secondary font-mono">
                        {property.sqft.toLocaleString()} sqft
                      </span>
                    )}
                    {property.standardStatus && (
                      <span className="text-xs font-black text-text-secondary uppercase tracking-widest border border-border-accent px-2 py-0.5">
                        {property.standardStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
