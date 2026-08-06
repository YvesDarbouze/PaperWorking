"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import { defaultAddressProvider, type AddressSuggestion } from "@/lib/providers/address";
import { SearchDropdown } from "@/components/search/SearchDropdown";
import type { SearchItem } from "@/lib/search/searchDropdown";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// Debouncing and the 3-character trigger now live inside <SearchDropdown />,
// which is the single source of truth for predictive-search timing across the
// dashboard header and this wizard step.

export function AddressStep({ onNext }: { onNext: () => void }) {
  const { address, setAddress, setProjectName } = useAcquisitionWizard();

  const [query,       setQuery]       = useState(address.formattedAddress ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [selected,    setSelected]    = useState<AddressSuggestion | null>(
    address.placeId ? (address as AddressSuggestion) : null,
  );
  
  // Manual entry toggle states
  const [useManual,   setUseManual]   = useState(false);
  const [manualAddressLine, setManualAddressLine] = useState("");
  const [manualCity,        setManualCity]        = useState("");
  const [manualState,       setManualState]       = useState("");
  const [manualZip,         setManualZip]         = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against an out-of-order response overwriting a newer one.
  const requestSeq = useRef(0);

  /** Called by <SearchDropdown /> once debounced and past the 3-char trigger. */
  const runAddressSearch = useCallback((q: string) => {
    if (!q) { setSuggestions([]); setLoading(false); return; }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    defaultAddressProvider
      .autocomplete(q)
      .then((results) => {
        if (seq !== requestSeq.current) return;
        setSuggestions(results);
        setLoading(false);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setError("Address lookup failed. Try again.");
        setSuggestions([]);
        setLoading(false);
      });
  }, []);

  /** Provider results -> dropdown items. Addresses are the "Properties" group. */
  const searchItems = useMemo<SearchItem[]>(
    () => suggestions.map((s) => ({
      id: s.placeId,
      label: s.formattedAddress,
      group: 'properties' as const,
      raw: s,
    })),
    [suggestions],
  );

  const handleSelect = useCallback(async (s: AddressSuggestion) => {
    setSelected(s);
    setQuery(s.formattedAddress);
    // Open/closed state is owned by <SearchDropdown />; clearing the results
    // is what collapses the panel here.
    setSuggestions([]);
    
    setAddress({
      placeId:          s.placeId,
      formattedAddress: s.formattedAddress,
      displayName:      s.components.addressLine,
      addressLine:      s.components.addressLine,
      city:             s.components.city,
      state:            s.components.state,
      zip:              s.components.zip,
      lat:              s.lat,
      lng:              s.lng,
    });
    setProjectName(s.components.addressLine);

    // Hydrate lat/lng and precise components from the details endpoint
    if (defaultAddressProvider.getDetails) {
      try {
        const details = await defaultAddressProvider.getDetails(s.placeId);
        setAddress({
          addressLine: details.components.addressLine || s.components.addressLine,
          city:        details.components.city        || s.components.city,
          state:       details.components.state       || s.components.state,
          zip:         details.components.zip         || s.components.zip,
          lat:         details.lat,
          lng:         details.lng,
        });
      } catch {
        // Non-fatal — optimistic values from autocomplete text remain
      }
    }
  }, [setAddress, setProjectName]);

  const handleClear = useCallback(() => {
    setSelected(null);
    setQuery("");
    setSuggestions([]);
    setAddress({});
    setProjectName("");
  }, [setAddress, setProjectName]);

  const handleConfirmManualAddress = useCallback(() => {
    if (!manualAddressLine.trim() || !manualCity.trim() || !manualState || !manualZip.trim()) return;
    const formatted = `${manualAddressLine.trim()}, ${manualCity.trim()}, ${manualState} ${manualZip.trim()}`;
    const mockId = `manual_${Date.now()}`;
    const s: AddressSuggestion = {
      placeId: mockId,
      formattedAddress: formatted,
      lat: 34.0522, // default lat/lng
      lng: -118.2437,
      components: {
        addressLine: manualAddressLine.trim(),
        city: manualCity.trim(),
        state: manualState,
        zip: manualZip.trim(),
      }
    };
    setSelected(s);
    setAddress({
      placeId: s.placeId,
      formattedAddress: s.formattedAddress,
      displayName: manualAddressLine.trim(),
      addressLine: s.components.addressLine,
      city: s.components.city,
      state: s.components.state,
      zip: s.components.zip,
      lat: s.lat,
      lng: s.lng,
    });
    setProjectName(manualAddressLine.trim());
  }, [manualAddressLine, manualCity, manualState, manualZip, setAddress, setProjectName]);

  // canAdvance logic: Address resolved
  const canAdvance = !!selected;

  return (
    <div className="flex flex-col gap-8 max-w-[560px] w-full mx-auto animate-fade-in">
      {/* Heading */}
      <div>
        <h2
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.02em" }}
        >
          Let's start your Project. What's the property you're targeting?
        </h2>
        <p className="text-sm" style={{ color: "rgba(253,255,252,0.4)" }}>
          Search by address or enter details manually to resolve the target identity.
        </p>
      </div>

      {/* Address search or manual form */}
      {!selected && (
        <div className="space-y-4">
          {!useManual ? (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.4)" }}>
                Property Address *
              </label>
              <div ref={containerRef} className="relative">
                {/* Shared predictive-search component — same dropdown as the
                    dashboard header. Replaces the bespoke input + suggestion
                    list that used to live here. */}
                <SearchDropdown
                  testId="address-search"
                  query={query}
                  onQueryChange={(q) => {
                    setQuery(q);
                    if (selected) { setSelected(null); setAddress({}); }
                  }}
                  onDebouncedQueryChange={runAddressSearch}
                  items={searchItems}
                  loading={loading}
                  onSelect={(item) => handleSelect(item.raw as AddressSuggestion)}
                  placeholder="123 Main St, City, State"
                  autoFocus
                />

                {/* Error */}
                {error && (
                  <p className="mt-2 text-[12px]" style={{ color: "#F06543" }}>
                    {error}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#9E9DA0]">Manual Address Entry</span>
                <button
                  type="button"
                  onClick={() => setUseManual(false)}
                  className="text-[10px] text-text-secondary hover:text-white transition-colors underline"
                >
                  Search address instead
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">Street Address *</label>
                  <input
                    type="text"
                    value={manualAddressLine}
                    onChange={(e) => setManualAddressLine(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    placeholder="e.g. 123 Main St"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">City *</label>
                    <input
                      type="text"
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                      placeholder="e.g. New York"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">State *</label>
                    <select
                      value={manualState}
                      onChange={(e) => setManualState(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                    >
                      <option value="">ST</option>
                      {US_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">ZIP *</label>
                  <input
                    type="text"
                    value={manualZip}
                    onChange={(e) => setManualZip(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                    placeholder="e.g. 10011"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConfirmManualAddress}
                  disabled={!manualAddressLine || !manualCity || !manualState || !manualZip}
                  className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Address &amp; Proceed
                </button>
              </div>
            </div>
          )}

          {!useManual && (
            <button
              type="button"
              onClick={() => setUseManual(true)}
              className="text-xs text-[#9E9DA0] hover:text-white transition-colors underline text-left mt-2 block"
            >
              Enter address manually instead
            </button>
          )}
        </div>
      )}

      {/* Selected confirmation */}
      {selected && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3 border"
            style={{ background: "rgba(69,73,85,0.06)", borderColor: "rgba(69,73,85,0.15)" }}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]" style={{ color: "#454955", fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              <div>
                <p className="text-[13px] font-semibold text-white">
                  {selected.formattedAddress}
                </p>
                <p className="text-[11px]" style={{ color: "rgba(253,255,252,0.4)" }}>
                  {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                </p>
              </div>
            </div>
            <button onClick={handleClear} className="hover:opacity-75 p-1">
              <span className="material-symbols-outlined text-[18px]" style={{ color: "rgba(253,255,252,0.4)" }}>
                close
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Continue */}
      <div className="flex justify-end pt-2 border-t border-white/5">
        <button
          disabled={!canAdvance}
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: canAdvance ? "#454955" : "rgba(255,255,255,0.06)",
            color: canAdvance ? "#0d0a0b" : "rgba(253,255,252,0.25)",
            cursor: canAdvance ? "pointer" : "not-allowed",
          }}
        >
          Continue
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>

      {/* Why We Ask Rationale */}
      <div className="mt-8 p-4 rounded-xl bg-surface-container-low border border-pw-border/50">
        <p className="text-xs font-semibold text-amber-500 mb-1 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">help</span> Why we ask
        </p>
        <p className="text-xs text-[var(--color-muted)] leading-relaxed">
          We need the exact address to resolve property details, check local zoning, and cache geographic coordinates for map alignment.
        </p>
      </div>
    </div>
  );
}
