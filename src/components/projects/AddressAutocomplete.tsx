'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X, PenLine, Search } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AddressAutocomplete — Google Places + Manual Entry Fallback

   Mode A (default): Predictive autocomplete via /api/places/*
   Mode B (manual):  Standard Street / City / State / ZIP fields

   Toggle between modes via "Enter Address Manually" / 
   "Search Address" links.
   ═══════════════════════════════════════════════════════════════ */

export interface ParsedAddress {
  formattedAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  value: string;
  /** Structured address fields for manual mode pre-population */
  structuredValue?: { street: string; city: string; state: string; zip: string };
  onSelect: (parsed: ParsedAddress) => void;
  onInputChange?: (raw: string) => void;
  placeholder?: string;
  className?: string;
  /** Visual variant: 'protocol' = angular/bold (default), 'dashboard' = soft/rounded */
  variant?: 'protocol' | 'dashboard';
}

// US states for the manual dropdown
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const INPUT_PROTOCOL =
  'w-full border border-border-accent bg-bg-primary px-6 py-5 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all placeholder:text-text-secondary/30';

const INPUT_DASHBOARD =
  'w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20';

const INPUT_DASHBOARD_STYLE = {
  background: 'var(--bg-canvas)',
  border: '1px solid var(--border-ui)',
  color: 'var(--text-primary)',
};

export default function AddressAutocomplete({
  value,
  structuredValue,
  onSelect,
  onInputChange,
  placeholder = '123 MAIN ST, MIAMI, FL 33101',
  className = '',
  variant = 'protocol',
}: AddressAutocompleteProps) {
  const isDashboard = variant === 'dashboard';
  const INPUT_CLASS = isDashboard ? INPUT_DASHBOARD : INPUT_PROTOCOL;
  const inputStyle = isDashboard ? INPUT_DASHBOARD_STYLE : undefined;
  const resolvedPlaceholder = isDashboard ? 'Start typing an address…' : placeholder;
  // ─── Mode Toggle ────────────────────────────────────
  const [isManual, setIsManual] = useState(false);

  // ─── Autocomplete State ─────────────────────────────
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // ─── Manual State ───────────────────────────────────
  const [manualStreet, setManualStreet] = useState(structuredValue?.street || '');
  const [manualCity, setManualCity] = useState(structuredValue?.city || '');
  const [manualState, setManualState] = useState(structuredValue?.state || '');
  const [manualZip, setManualZip] = useState(structuredValue?.zip || '');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value (autocomplete mode)
  useEffect(() => {
    if (value !== query && !isManual) setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Sync structured values only when the actual string values change (not on every
  // parent render that produces a new object reference). Using primitive deps avoids
  // the feedback loop: parent setState → new object → effect → setState → re-render.
  useEffect(() => {
    if (!structuredValue) return;
    setManualStreet(structuredValue.street || '');
    setManualCity(structuredValue.city || '');
    setManualState(structuredValue.state || '');
    setManualZip(structuredValue.zip || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuredValue?.street, structuredValue?.city, structuredValue?.state, structuredValue?.zip]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Autocomplete Handlers ──────────────────────────
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      setPredictions(data.predictions || []);
      setIsOpen((data.predictions || []).length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('[AddressAutocomplete] Fetch error:', err);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onInputChange?.(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = async (prediction: Prediction) => {
    setQuery(prediction.description);
    setIsOpen(false);
    setPredictions([]);
    setIsFetching(true);

    try {
      const res = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: prediction.placeId }),
      });
      const parsed: ParsedAddress = await res.json();
      setQuery(parsed.formattedAddress || prediction.description);
      onSelect(parsed);
    } catch (err) {
      console.error('[AddressAutocomplete] Details error:', err);
      onSelect({
        formattedAddress: prediction.description,
        street: prediction.mainText,
        city: '',
        state: '',
        zip: '',
        lat: null,
        lng: null,
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setIsOpen(false);
    onInputChange?.('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i < predictions.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i > 0 ? i - 1 : predictions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // ─── Manual Mode Handlers ───────────────────────────
  const commitManualAddress = useCallback(() => {
    const formatted = [
      manualStreet,
      [manualCity, manualState].filter(Boolean).join(', '),
      manualZip,
    ].filter(Boolean).join(', ');

    onSelect({
      formattedAddress: formatted,
      street: manualStreet.trim(),
      city: manualCity.trim(),
      state: manualState.trim(),
      zip: manualZip.trim(),
      lat: null,
      lng: null,
    });
  }, [manualStreet, manualCity, manualState, manualZip, onSelect]);

  // Auto-commit manual fields on blur of any field (debounced)
  const manualCommitRef = useRef<ReturnType<typeof setTimeout>>();
  const scheduleManualCommit = useCallback(() => {
    if (manualCommitRef.current) clearTimeout(manualCommitRef.current);
    manualCommitRef.current = setTimeout(commitManualAddress, 150);
  }, [commitManualAddress]);

  // Auto-commit whenever manual fields change (debounced).
  // This keeps the parent form state in sync without firing on every keystroke.
  useEffect(() => {
    if (!isManual) return;
    const timeoutId = setTimeout(() => {
      commitManualAddress();
    }, 400); // 400ms debounce
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManual, manualStreet, manualCity, manualState, manualZip]);

  // ─── Mode Switch ────────────────────────────────────
  const switchToManual = () => {
    setIsManual(true);
    setPredictions([]);
    setIsOpen(false);
  };

  const switchToSearch = () => {
    setIsManual(false);
    // Preserve the manual data by compositing into query
    if (manualStreet) {
      const composed = [manualStreet, manualCity, manualState, manualZip].filter(Boolean).join(', ');
      setQuery(composed);
    }
  };

  // ═══════════════════════════════════════════════════
  // RENDER: Manual Entry Mode
  // ═══════════════════════════════════════════════════
  if (isManual) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="space-y-2">
          <label className={`block text-[10px] uppercase tracking-[0.3em] ${isDashboard ? 'font-bold' : 'font-black text-text-secondary'}`} style={isDashboard ? { color: 'var(--text-secondary)' } : undefined}>
            Street Address
          </label>
          <div className="relative">
            <MapPin
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDashboard ? 'left-3' : 'left-6'}`}
              style={{ color: 'var(--text-secondary)' }}
              aria-hidden="true"
            />
            <input
              type="text"
              value={manualStreet}
              onChange={(e) => { setManualStreet(e.target.value); }}
              onBlur={scheduleManualCommit}
              className={`${INPUT_CLASS} ${isDashboard ? 'pl-10' : 'pl-14'}`}
              style={inputStyle}
              placeholder={isDashboard ? '123 Main St' : '123 MAIN ST'}
              autoFocus
            />
          </div>
        </div>

        {/* City + State row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <label className={`block text-[10px] uppercase tracking-[0.3em] ${isDashboard ? 'font-bold' : 'font-black text-text-secondary'}`} style={isDashboard ? { color: 'var(--text-secondary)' } : undefined}>
              City
            </label>
            <input
              type="text"
              value={manualCity}
              onChange={(e) => { setManualCity(e.target.value); }}
              onBlur={scheduleManualCommit}
              className={INPUT_CLASS}
              style={inputStyle}
              placeholder={isDashboard ? 'Miami' : 'MIAMI'}
            />
          </div>

          <div className="space-y-2">
            <label className={`block text-[10px] uppercase tracking-[0.3em] ${isDashboard ? 'font-bold' : 'font-black text-text-secondary'}`} style={isDashboard ? { color: 'var(--text-secondary)' } : undefined}>
              State
            </label>
            <select
              value={manualState}
              onChange={(e) => { setManualState(e.target.value); scheduleManualCommit(); }}
              className={`${INPUT_CLASS} appearance-none cursor-pointer`}
              style={inputStyle}
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ZIP Code */}
        <div className="space-y-2">
          <label className={`block text-[10px] uppercase tracking-[0.3em] ${isDashboard ? 'font-bold' : 'font-black text-text-secondary'}`} style={isDashboard ? { color: 'var(--text-secondary)' } : undefined}>
            ZIP Code
          </label>
          <input
            type="text"
            value={manualZip}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^\d-]/g, '').slice(0, 10);
              setManualZip(cleaned);
            }}
            onBlur={scheduleManualCommit}
            className={INPUT_CLASS}
            style={inputStyle}
            placeholder="33101"
            inputMode="numeric"
            maxLength={10}
          />
        </div>

        {/* Switch back to search */}
        <button
          type="button"
          onClick={switchToSearch}
          className={`group flex items-center gap-2.5 pt-2 text-[11px] font-bold uppercase tracking-[0.25em] transition-colors ${
            isDashboard ? '' : 'text-text-secondary hover:text-text-primary'
          }`}
          style={isDashboard ? { color: 'var(--text-secondary)' } : undefined}
          onMouseEnter={(e) => { if (isDashboard) e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { if (isDashboard) e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <Search className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-px" aria-hidden="true" />
          Search Address Instead
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER: Autocomplete Search Mode (default)
  // ═══════════════════════════════════════════════════
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <MapPin
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDashboard ? 'left-3' : 'left-6'}`}
            style={{ color: 'var(--text-secondary)' }}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="address-listbox"
            aria-activedescendant={selectedIndex >= 0 ? `address-option-${selectedIndex}` : undefined}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => predictions.length > 0 && setIsOpen(true)}
            className={`${INPUT_CLASS} ${isDashboard ? 'pl-10 pr-10' : 'pl-14 pr-14'}`}
            style={inputStyle}
            placeholder={resolvedPlaceholder}
            autoComplete="off"
          />

          {/* Loading / Clear indicator */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {(isLoading || isFetching) && (
              <Loader2 className="w-4 h-4 text-text-secondary animate-spin" aria-label="Loading" />
            )}
            {query && !isLoading && !isFetching && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-bg-primary rounded transition-colors"
                aria-label="Clear address"
              >
                <X className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Predictions */}
        {isOpen && predictions.length > 0 && (
          <div
            ref={dropdownRef}
            id="address-listbox"
            role="listbox"
            className={`absolute z-50 mt-1 w-full shadow-lg max-h-64 overflow-y-auto ${isDashboard ? 'rounded-lg' : ''}`}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            {predictions.map((p, idx) => (
              <button
                key={p.placeId}
                id={`address-option-${idx}`}
                role="option"
                aria-selected={idx === selectedIndex}
                onClick={() => handleSelect(p)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-6 py-4 flex items-start gap-4 transition-all border-b border-border-accent/30 last:border-b-0 ${
                  idx === selectedIndex
                    ? 'bg-bg-primary'
                    : 'hover:bg-bg-primary/50'
                }`}
              >
                <MapPin className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className={`text-xs truncate ${isDashboard ? 'font-semibold' : 'font-black uppercase tracking-widest'}`} style={{ color: 'var(--text-primary)' }}>
                    {p.mainText}
                  </p>
                  <p className={`text-xs mt-0.5 truncate ${isDashboard ? 'font-normal' : 'font-bold tracking-wider'}`} style={{ color: 'var(--text-secondary)' }}>
                    {p.secondaryText}
                  </p>
                </div>
              </button>
            ))}

            {/* Google attribution */}
            <div className="px-6 py-2 border-t border-border-accent/30 flex justify-end">
              <span className="text-[10px] font-bold text-text-secondary/40 uppercase tracking-widest">
                Powered by Google
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Manual entry toggle */}
      <button
        type="button"
        onClick={switchToManual}
        className={`group flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-colors ${
          isDashboard ? '' : 'text-text-secondary hover:text-text-primary'
        }`}
        style={isDashboard ? { color: 'var(--text-secondary)' } : undefined}
        onMouseEnter={(e) => { if (isDashboard) e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { if (isDashboard) e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <PenLine className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-px" aria-hidden="true" />
        Enter Address Manually
      </button>
    </div>
  );
}
