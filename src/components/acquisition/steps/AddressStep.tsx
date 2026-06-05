"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import { defaultAddressProvider, type AddressSuggestion } from "@/lib/providers/address";

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
  const [displayName, setDisplayName] = useState(address.displayName ?? "");
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

  const handleSelect = useCallback((s: AddressSuggestion) => {
    setSelected(s);
    setQuery(s.formattedAddress);
    setDisplayName(s.formattedAddress);
    setOpen(false);
    setSuggestions([]);
    setAddress({
      placeId:          s.placeId,
      formattedAddress: s.formattedAddress,
      displayName:      s.formattedAddress,
      addressLine:      s.components.addressLine,
      city:             s.components.city,
      state:            s.components.state,
      zip:              s.components.zip,
      lat:              s.lat,
      lng:              s.lng,
    });
  }, [setAddress]);

  const handleClear = useCallback(() => {
    setSelected(null);
    setQuery("");
    setDisplayName("");
    setSuggestions([]);
    setAddress({});
  }, [setAddress]);

  const handleDisplayNameChange = useCallback((val: string) => {
    setDisplayName(val);
    setAddress({ displayName: val });
  }, [setAddress]);

  const canAdvance = !!selected;

  return (
    <div className="flex flex-col gap-8 max-w-[560px] w-full mx-auto">
      {/* Heading */}
      <div>
        <h2
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.02em" }}
        >
          Where is the property?
        </h2>
        <p className="text-sm" style={{ color: "rgba(253,255,252,0.4)" }}>
          Search by address. The address becomes the deal name — you can rename it below.
        </p>
      </div>

      {/* Address search */}
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
            {selected && (
              <button onClick={handleClear} className="flex-shrink-0 hover:opacity-70">
                <span className="material-symbols-outlined text-[18px]" style={{ color: "rgba(253,255,252,0.4)" }}>
                  close
                </span>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {open && suggestions.length > 0 && (
            <div
              className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
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

      {/* Deal name override */}
      {selected && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.4)" }}>
            Deal Name
          </label>
          <p className="text-[12px]" style={{ color: "rgba(253,255,252,0.3)" }}>
            Defaults to the address — rename it to something memorable.
          </p>
          <input
            className="w-full rounded-xl px-4 py-3.5 text-sm bg-transparent outline-none"
            style={{
              background: "rgba(22,19,24,0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(253,255,252,0.95)",
            }}
            value={displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="e.g. Brooklyn Heights Victorian"
          />
        </div>
      )}

      {/* Selected confirmation */}
      {selected && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(69,73,85,0.06)", border: "1px solid rgba(69,73,85,0.15)" }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: "#454955", fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <div>
            <p className="text-[13px] font-medium" style={{ color: "rgba(253,255,252,0.9)" }}>
              {selected.formattedAddress}
            </p>
            <p className="text-[11px]" style={{ color: "rgba(253,255,252,0.4)" }}>
              {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
            </p>
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
