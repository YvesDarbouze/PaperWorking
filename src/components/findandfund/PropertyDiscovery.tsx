'use client';

import React, { useState, useMemo } from 'react';
import { Search, MapPin, Home, DollarSign, TrendingUp, ChevronRight, X, Ruler } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PropertyDiscovery — MLS Search Hook + Property Card

   Mock MLS typeahead → populates a "Property Card" with:
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

// Mock MLS dataset
const MOCK_PROPERTIES: PropertyResult[] = [
  { id: 'mls_001', address: '1422 N Oak St', city: 'Atlanta', state: 'GA', zip: '30306', beds: 3, baths: 2, sqft: 1850, askingPrice: 285000, yearBuilt: 1962 },
  { id: 'mls_002', address: '887 Peachtree Ln', city: 'Atlanta', state: 'GA', zip: '30308', beds: 4, baths: 3, sqft: 2400, askingPrice: 425000, yearBuilt: 1978 },
  { id: 'mls_003', address: '2200 Broad Ave', city: 'Decatur', state: 'GA', zip: '30030', beds: 2, baths: 1, sqft: 1100, askingPrice: 175000, yearBuilt: 1955 },
  { id: 'mls_004', address: '340 Vine St', city: 'Marietta', state: 'GA', zip: '30060', beds: 5, baths: 3, sqft: 3200, askingPrice: 520000, yearBuilt: 1985 },
  { id: 'mls_005', address: '755 Elm Dr', city: 'Sandy Springs', state: 'GA', zip: '30328', beds: 3, baths: 2, sqft: 2000, askingPrice: 345000, yearBuilt: 1970 },
];

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
  const [selectedProperty, setSelectedProperty] = useState<PropertyResult | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [rehabBudget, setRehabBudget] = useState('');

  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return MOCK_PROPERTIES.filter(
      p => p.address.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.zip.includes(q)
    );
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder="Search MLS by address, city, or zip..."
          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition placeholder:text-gray-400"
        />

        {/* Dropdown Results */}
        {showResults && results.length > 0 && (
          <div className="absolute z-20 top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition text-left"
              >
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.address}</p>
                  <p className="text-xs text-gray-500">{p.city}, {p.state} {p.zip} · {p.beds}bd/{p.baths}ba · {p.sqft.toLocaleString()} sqft</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">${p.askingPrice.toLocaleString()}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Property Card */}
      {selectedProperty && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Property Header */}
          <div className="relative h-32 bg-gradient-to-br from-teal-100 to-cyan-50 flex items-center justify-center">
            <Home className="w-12 h-12 text-teal-300" />
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 p-1.5 bg-white/80 rounded-full hover:bg-white transition"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Address & Details */}
            <div>
              <h3 className="text-base font-semibold text-gray-900">{selectedProperty.address}</h3>
              <p className="text-sm text-gray-500">{selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Home className="w-3 h-3" /> {selectedProperty.beds}bd / {selectedProperty.baths}ba
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Ruler className="w-3 h-3" /> {selectedProperty.sqft.toLocaleString()} sqft
                </span>
                <span className="text-xs text-gray-400">Built {selectedProperty.yearBuilt}</span>
              </div>
            </div>

            {/* Financial Inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="ag-label mb-1.5 block">Asking Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    readOnly
                    value={selectedProperty.askingPrice.toLocaleString()}
                    className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="ag-label mb-1.5 block">Target Price (MAO)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500" />
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="ag-label mb-1.5 block">Rehab Budget</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500" />
                  <input
                    type="number"
                    value={rehabBudget}
                    onChange={(e) => setRehabBudget(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between bg-teal-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-800">Total Capital Needed</span>
              </div>
              <span className="text-lg font-bold text-teal-900">${totalCapitalNeeded.toLocaleString()}</span>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={!targetPrice}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition"
            >
              Set as Active Property
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedProperty && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-3">
            <MapPin className="w-6 h-6 text-teal-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">No property selected</p>
          <p className="text-xs text-gray-400">Search the MLS to find your next deal</p>
        </div>
      )}
    </div>
  );
}
