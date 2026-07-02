'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Home, DollarSign, TrendingUp, ChevronRight, X, Ruler, Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PropertyDiscovery — MLS Search Hook + Property Card

   MLS typeahead via /api/mls/search → populates a "Property Card" with:
   • Property image placeholder
   • Bed/bath count, sqft
   • Owner's asking price (read-only from MLS or editable)
   • User's Target Purchase Price (MAO)
   • Estimated Rehab Budget
   ═══════════════════════════════════════════════════════ */

interface PropertyResult {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  askingPrice: number;
  yearBuilt: number;
  imageUrl?: string;
}

interface Props {
  onPropertySelected?: (data: {
    address: string;
    askingPrice: number;
    targetPrice: number;
    rehabBudget: number;
    sqft: number;
  }) => void;
}

export default function PropertyDiscovery({ onPropertySelected }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<PropertyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyResult | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [rehabBudget, setRehabBudget] = useState('');

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setNoResults(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      setNoResults(false);
      try {
        const res = await fetch(`/api/mls/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setResults(list);
          setNoResults(list.length === 0);
        } else {
          const body = await res.json().catch(() => ({}));
          setResults([]);
          setSearchError(body.error || 'MLS search unavailable — check back shortly.');
        }
      } catch (err) {
        console.error('Search failed', err);
        setResults([]);
        setSearchError('Could not reach MLS. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (property: PropertyResult) => {
    setSelectedProperty(property);
    setSearchQuery('');
    setShowResults(false);
    // Auto-fill MAO: 70% of asking = rough investor formula
    const mao = Math.round(property.askingPrice * 0.7);
    setTargetPrice(mao.toString());
  };

  const handleClear = () => {
    setSelectedProperty(null);
    setTargetPrice('');
    setRehabBudget('');
  };

  const handleApply = () => {
    if (!selectedProperty) return;
    onPropertySelected?.({
      address: `${selectedProperty.address}, ${selectedProperty.city}, ${selectedProperty.state} ${selectedProperty.zip}`,
      askingPrice: selectedProperty.askingPrice,
      targetPrice: parseFloat(targetPrice) || 0,
      rehabBudget: parseFloat(rehabBudget) || 0,
      sqft: selectedProperty.sqft,
    });
  };

  const totalCapitalNeeded = (parseFloat(targetPrice) || 0) + (parseFloat(rehabBudget) || 0);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder="Search MLS by address, city, or zip..."
          className="w-full pl-11 pr-4 py-3 bg-bg-primary border border-border-accent rounded-xl text-sm focus:border-[#454955] focus:ring-1 focus:ring-[#454955] transition placeholder:text-text-secondary"
        />

        {/* Dropdown Results / States */}
        {showResults && searchQuery.length >= 2 && (
          <div className="absolute z-20 top-full mt-2 w-full bg-bg-surface border border-border-accent rounded-xl shadow-lg overflow-hidden">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching MLS…
              </div>
            )}
            {!loading && searchError && (
              <div className="px-4 py-3 text-sm text-red-600">{searchError}</div>
            )}
            {!loading && !searchError && noResults && (
              <div className="px-4 py-3 text-sm text-text-secondary">
                No active listings found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
            {!loading && results.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0F1F4] transition text-left"
              >
                <MapPin className="w-4 h-4 text-[#3a3e4a] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{p.address}</p>
                  <p className="text-xs text-text-secondary">{p.city}, {p.state} {p.zip} · {p.beds}bd/{p.baths}ba · {p.sqft.toLocaleString()} sqft</p>
                </div>
                <span className="text-sm font-semibold text-text-primary">${p.askingPrice.toLocaleString()}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Property Card */}
      {selectedProperty && (
        <div className="bg-bg-surface border border-border-accent rounded-2xl overflow-hidden">
          {/* Property Header */}
          <div className="relative h-32 bg-gradient-to-br from-[#E8E9ED] to-[#F0F1F4] flex items-center justify-center">
            <Home className="w-12 h-12 text-[#8a8e9a]" />
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 p-1.5 bg-bg-surface/80 rounded-full hover:bg-bg-surface transition"
            >
              <X className="w-3.5 h-3.5 text-text-secondary" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Address & Details */}
            <div>
              <h3 className="text-base font-semibold text-text-primary">{selectedProperty.address}</h3>
              <p className="text-sm text-text-secondary">{selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                  <Home className="w-3 h-3" /> {selectedProperty.beds}bd / {selectedProperty.baths}ba
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                  <Ruler className="w-3 h-3" /> {selectedProperty.sqft.toLocaleString()} sqft
                </span>
                <span className="text-xs text-text-secondary">Built {selectedProperty.yearBuilt}</span>
              </div>
            </div>

            {/* Financial Inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="ag-label mb-1.5 block">Asking Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                  <input
                    type="text"
                    readOnly
                    value={selectedProperty.askingPrice.toLocaleString()}
                    className="w-full pl-8 pr-3 py-2.5 bg-bg-primary border border-border-accent rounded-lg text-sm text-text-secondary cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="ag-label mb-1.5 block">Target Price (MAO)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#454955]" />
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2.5 bg-bg-surface border border-border-accent rounded-lg text-sm focus:border-[#454955] focus:ring-1 focus:ring-[#454955] transition"
                  />
                </div>
              </div>
              <div>
                <label className="ag-label mb-1.5 block">Rehab Budget</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#454955]" />
                  <input
                    type="number"
                    value={rehabBudget}
                    onChange={(e) => setRehabBudget(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2.5 bg-bg-surface border border-border-accent rounded-lg text-sm focus:border-[#454955] focus:ring-1 focus:ring-[#454955] transition"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between bg-[#F0F1F4] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#3a3e4a]" />
                <span className="text-sm font-medium text-[#2E3140]">Total Capital Needed</span>
              </div>
              <span className="text-lg font-bold text-[#FDFFFC]">${totalCapitalNeeded.toLocaleString()}</span>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={!targetPrice}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-text-secondary disabled:cursor-not-allowed transition"
            >
              Set as Active Property
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedProperty && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 bg-[#F0F1F4] rounded-2xl flex items-center justify-center mb-3">
            <MapPin className="w-6 h-6 text-[#6E7480]" />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">No property selected</p>
          <p className="text-xs text-text-secondary">Search the MLS to find your next deal</p>
        </div>
      )}
    </div>
  );
}
