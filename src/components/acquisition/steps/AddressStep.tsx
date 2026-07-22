"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import { defaultAddressProvider, type AddressSuggestion } from "@/lib/providers/address";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function AddressStep({ onNext }: { onNext: () => void }) {
  const { address, setAddress } = useAcquisitionWizard();

  const [query,       setQuery]       = useState(address.formattedAddress ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [selected,    setSelected]    = useState<AddressSuggestion | null>(
    address.placeId ? (address as AddressSuggestion) : null,
  );
  
  // Target details states
  const [displayName, setDisplayName] = useState(address.displayName ?? "");
  const [apn,         setApn]         = useState(address.apn ?? "");
  const [propertyType, setPropertyType] = useState(address.propertyType || "Single Family");
  const [units,       setUnits]       = useState(address.units ? address.units.toString() : "1");
  const [sqft,        setSqft]        = useState(address.sqft ? address.sqft.toString() : "");
  const [lotSqft,     setLotSqft]     = useState(address.lotSqft ? address.lotSqft.toString() : "");
  const [yearBuilt,   setYearBuilt]   = useState(address.yearBuilt ? address.yearBuilt.toString() : "");
  const [condition,   setCondition]   = useState(address.condition || "turnkey");

  // Manual entry toggle states
  const [useManual,   setUseManual]   = useState(false);
  const [manualAddressLine, setManualAddressLine] = useState("");
  const [manualCity,        setManualCity]        = useState("");
  const [manualState,       setManualState]       = useState("");
  const [manualZip,         setManualZip]         = useState("");

  const [open,        setOpen]        = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 280);

  // Fetch suggestions whenever the debounced query changes
  useEffect(() => {
    if (selected) return; // already selected — don't re-query
    if (debouncedQuery.trim().length < 2) { setSuggestions([]); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);

    defaultAddressProvider
      .autocomplete(debouncedQuery)
      .then((results) => {
        if (cancelled) return;
        setSuggestions(results);
        setOpen(results.length > 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Address lookup failed. Try again.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, selected]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(async (s: AddressSuggestion) => {
    setSelected(s);
    setQuery(s.formattedAddress);
    setDisplayName(s.components.addressLine);
    setOpen(false);
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
      propertyType:     address.propertyType || "Single Family",
      units:            address.units || 1,
      condition:        address.condition || "turnkey",
    });

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
  }, [setAddress]);

  const handleClear = useCallback(() => {
    setSelected(null);
    setQuery("");
    setDisplayName("");
    setApn("");
    setPropertyType("");
    setUnits("");
    setSqft("");
    setLotSqft("");
    setYearBuilt("");
    setCondition("");
    setSuggestions([]);
    setAddress({});
  }, [setAddress]);

  const handleDisplayNameChange = useCallback((val: string) => {
    setDisplayName(val);
    setAddress({ displayName: val });
  }, [setAddress]);

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
    setDisplayName(manualAddressLine.trim());
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
      propertyType: address.propertyType || "Single Family",
      units: address.units || 1,
      condition: address.condition || "turnkey",
    });
  }, [manualAddressLine, manualCity, manualState, manualZip, setAddress]);

  // canAdvance logic: Address resolved & required details filled
  const canAdvance = !!selected && !!displayName.trim() && !!propertyType && !!units.trim() && !!condition;

  return (
    <div className="flex flex-col gap-8 max-w-[560px] w-full mx-auto">
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
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5"
                  style={{
                    background: "rgba(22,19,24,0.8)",
                    border: `1px solid ${selected ? "#45495540" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: selected ? "0 0 0 3px rgba(69,73,85,0.06)" : "none",
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[20px] flex-shrink-0"
                    style={{ color: selected ? "#454955" : "rgba(253,255,252,0.3)", fontVariationSettings: "'FILL' 0" }}
                  >
                    location_on
                  </span>
                  <input
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-[rgba(253,255,252,0.3)]"
                    style={{ color: "rgba(253,255,252,0.95)" }}
                    placeholder="123 Main St, City, State"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (selected) { setSelected(null); setAddress({}); }
                    }}
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {loading && (
                    <span
                      className="w-4 h-4 border-2 rounded-full animate-spin flex-shrink-0"
                      style={{ borderColor: "rgba(253,255,252,0.2)", borderTopColor: "#454955" }}
                    />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {open && suggestions.length > 0 && (
                  <div
                    className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden animate-in fade-in duration-100"
                    style={{
                      background: "rgba(18,27,34,0.98)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      backdropFilter: "blur(24px)",
                      boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.placeId}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(69,73,85,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        onClick={() => handleSelect(s)}
                      >
                        <span
                          className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0"
                          style={{ color: "#454955", fontVariationSettings: "'FILL' 0" }}
                        >
                          location_on
                        </span>
                        <span className="text-[13px]" style={{ color: "rgba(253,255,252,0.85)" }}>
                          {s.formattedAddress}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {!loading && !open && query.trim().length >= 2 && !selected && suggestions.length === 0 && (
                  <p className="mt-2 text-[12px]" style={{ color: "rgba(253,255,252,0.35)" }}>
                    No addresses found. Try a different search.
                  </p>
                )}

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

          {/* Target Details Secondary Form (AQ-4) */}
          <div className="space-y-4 p-5 rounded-xl border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
              <span className="material-symbols-outlined text-[18px] text-[#454955]">info</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Target Details</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Project Name *</label>
              <input
                id="deal-name-input"
                className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                value={displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="e.g. Brooklyn Heights Victorian"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">APN (Assessor's Parcel Number)</label>
                <input
                  type="text"
                  value={apn}
                  onChange={(e) => {
                    setApn(e.target.value);
                    setAddress({ apn: e.target.value });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                  placeholder="e.g. 123-45-678"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">Property Type *</label>
                <select
                  value={propertyType}
                  onChange={(e) => {
                    setPropertyType(e.target.value);
                    setAddress({ propertyType: e.target.value });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                >
                  <option value="">Select type...</option>
                  <option value="Single Family">Single Family</option>
                  <option value="Multi Family">Multi Family</option>
                  <option value="Condo">Condo</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Multi-Family 2-4 Units">Multi-Family 2-4 Units</option>
                  <option value="Multi-Family 5+ Units">Multi-Family 5+ Units</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Land">Land</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">Units *</label>
                <input
                  type="number"
                  value={units}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setUnits(e.target.value);
                    setAddress({ units: val });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">Sqft</label>
                <input
                  type="number"
                  value={sqft}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setSqft(e.target.value);
                    setAddress({ sqft: val });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                  placeholder="e.g. 1500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">Lot Size (Sqft)</label>
                <input
                  type="number"
                  value={lotSqft}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setLotSqft(e.target.value);
                    setAddress({ lotSqft: val });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                  placeholder="e.g. 5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">Year Built</label>
                <input
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setYearBuilt(e.target.value);
                    setAddress({ yearBuilt: val });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                  placeholder="e.g. 1950"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">Condition *</label>
                <select
                  value={condition}
                  onChange={(e) => {
                    setCondition(e.target.value);
                    setAddress({ condition: e.target.value });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#241e26] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                >
                  <option value="">Select condition...</option>
                  <option value="turnkey">Turnkey</option>
                  <option value="rehab">Rehab</option>
                  <option value="gut">Gut</option>
                  <option value="rehab-light">Rehab Light</option>
                  <option value="rehab-heavy">Rehab Heavy</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next */}
      <div className="flex justify-end pt-2">
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
    </div>
  );
}
