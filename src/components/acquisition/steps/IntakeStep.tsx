"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import { defaultAddressProvider, type AddressSuggestion } from "@/lib/providers/address";
import { AnimatePresence, motion } from "framer-motion";

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function IntakeStep({ onNext }: { onNext: () => void }) {
  const { intake, setIntake, address, setAddress } = useAcquisitionWizard();

  // Local step state (Card 1 to 4)
  const [cardIndex, setCardIndex] = useState(1);

  // Card 1: Address States
  const [query, setQuery] = useState(address.formattedAddress ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(
    address.placeId ? (address as any) : null
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  // Autocomplete fetch
  useEffect(() => {
    if (selectedAddress) return;
    if (debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

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

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedAddress]);

  // Close dropdown on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAddressSelect = useCallback(async (s: AddressSuggestion) => {
    setSelectedAddress(s);
    setQuery(s.formattedAddress);
    setOpen(false);
    setSuggestions([]);

    const basicAddress = {
      placeId: s.placeId,
      formattedAddress: s.formattedAddress,
      displayName: s.components.addressLine,
      addressLine: s.components.addressLine,
      city: s.components.city,
      state: s.components.state,
      zip: s.components.zip,
      lat: s.lat,
      lng: s.lng,
    };
    setAddress(basicAddress);

    if (defaultAddressProvider.getDetails) {
      try {
        const details = await defaultAddressProvider.getDetails(s.placeId);
        setAddress({
          addressLine: details.components.addressLine || s.components.addressLine,
          city: details.components.city || s.components.city,
          state: details.components.state || s.components.state,
          zip: details.components.zip || s.components.zip,
          lat: details.lat,
          lng: details.lng,
        });
      } catch {
        // non-fatal
      }
    }
    // Auto-advance to Card 2
    setTimeout(() => setCardIndex(2), 300);
  }, [setAddress]);

  const handleClearAddress = useCallback(() => {
    setSelectedAddress(null);
    setQuery("");
    setSuggestions([]);
    setAddress({});
  }, [setAddress]);

  // Card 2: Current Stage Options
  const stageOptions = [
    {
      key: "targeting",
      label: "Targeting it (not yet purchased)",
      subtitle: "Not yet purchased",
      description: "Researching, analyzing underwriting, or preparing initial offers.",
      icon: "search",
    },
    {
      key: "under_contract",
      label: "Under contract / purchasing now",
      subtitle: "Purchasing now",
      description: "Purchase agreement signed, currently in due diligence.",
      icon: "handshake",
    },
    {
      key: "renovating_marketing",
      label: "I own it — renovating or preparing it",
      subtitle: "Renovating or preparing",
      description: "Rehab construction is active, or preparing for lease/sale.",
      icon: "construction",
    },
    {
      key: "rented_leased_sold",
      label: "It's already earning (rented, leased, or sold)",
      subtitle: "Rented, leased, or sold",
      description: "Historic deal performance tracking and exit returns (Retrospective Mode).",
      icon: "assignment_turned_in",
    },
  ] as const;

  const handleStageSelect = (key: typeof stageOptions[number]["key"]) => {
    setIntake({ journey: key });
    // Reset dispositionType if changing away from rented_leased_sold
    if (key !== "rented_leased_sold" && intake.dispositionType) {
      setIntake({ dispositionType: "" });
    }
    // Auto-advance to Card 3
    setTimeout(() => setCardIndex(3), 300);
  };

  // Card 3: Property Type Options
  const propertyTypeOptions = [
    { key: "Single Family", label: "Single-Family", icon: "home" },
    { key: "Multi Family", label: "Multi-Family", icon: "domain" },
    { key: "Condo", label: "Condo/HOA", icon: "corporate_fare" },
    { key: "Commercial", label: "Commercial", icon: "store" },
    { key: "Land", label: "Land", icon: "landscape" },
    { key: "Mixed-Use", label: "Mixed-Use", icon: "layers" },
  ] as const;

  const handlePropertyTypeSelect = (type: typeof propertyTypeOptions[number]["key"]) => {
    setAddress({ propertyType: type });
    if (type !== "Multi Family") {
      setAddress({ units: 1 });
      advanceFromPropertyType();
    }
  };

  const advanceFromPropertyType = () => {
    // If retrospective entry, advance to Card 4. Otherwise, we are done with intake step.
    if (intake.journey === "rented_leased_sold") {
      setTimeout(() => setCardIndex(4), 300);
    } else {
      onNext();
    }
  };

  // Card 4: Disposition Type Options
  const dispositionOptions = [
    { key: "SALE", label: "Sold", description: "Completed flip or property liquidation.", icon: "sell" },
    { key: "LEASE", label: "Leased", description: "Stabilized commercial triple-net or corporate lease.", icon: "vpn_key" },
    { key: "RENT", label: "Rented", description: "Standard tenant rental operations.", icon: "real_estate_agent" },
  ] as const;

  const handleDispositionSelect = (key: typeof dispositionOptions[number]["key"]) => {
    setIntake({ dispositionType: key });
    setTimeout(() => onNext(), 300);
  };

  // Validation checks per card
  const isCard1Valid = !!address.placeId;
  const isCard2Valid = !!intake.journey;
  const isCard3Valid = !!address.propertyType && (address.propertyType !== "Multi Family" || (!!address.units && address.units > 1));
  const isCard4Valid = !!intake.dispositionType;

  const isCurrentCardValid = 
    cardIndex === 1 ? isCard1Valid :
    cardIndex === 2 ? isCard2Valid :
    cardIndex === 3 ? isCard3Valid :
    isCard4Valid;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 min-h-[460px] justify-between pb-8">
      {/* Header and Step Indicators */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "#F59E0B" }}>
              explore
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">
              Intake Router
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, ...(intake.journey === "rented_leased_sold" ? [4] : [])].map((num) => (
              <button
                key={num}
                onClick={() => {
                  // Allow clicking back or to valid completed steps
                  if (num < cardIndex || (num === 2 && isCard1Valid) || (num === 3 && isCard1Valid && isCard2Valid) || (num === 4 && isCard1Valid && isCard2Valid && isCard3Valid)) {
                    setCardIndex(num);
                  }
                }}
                className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                style={{
                  background: cardIndex === num ? "#F59E0B" : num < cardIndex ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)",
                  transform: cardIndex === num ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Card View Area */}
        <div className="relative overflow-hidden min-h-[320px] flex items-center">
          <AnimatePresence mode="wait">
            {cardIndex === 1 && (
              <motion.div
                key="card1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">What's the property's address?</h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    The address names your Deal—the public face investors see; you command the Project it lives in.
                  </p>
                </div>

                <div ref={containerRef} className="relative w-full">
                  {!selectedAddress ? (
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-[20px]">
                        search
                      </span>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search property address..."
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "white",
                        }}
                      />
                      {loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between p-4 rounded-xl transition-all duration-200"
                      style={{
                        background: "rgba(69,73,85,0.12)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        boxShadow: "0 0 10px rgba(245,158,11,0.05)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px]" style={{ color: "#F59E0B" }}>
                          location_on
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white/90">
                            {selectedAddress.components.addressLine}
                          </span>
                          <span className="text-xs text-white/40">
                            {selectedAddress.formattedAddress}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleClearAddress}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  )}

                  {open && suggestions.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl overflow-hidden max-h-60 overflow-y-auto"
                      style={{
                        background: "rgba(18,16,20,0.98)",
                        border: "1px solid rgba(253,255,252,0.1)",
                        backdropFilter: "blur(24px)",
                      }}
                    >
                      {suggestions.map((s) => (
                        <button
                          key={s.placeId}
                          onClick={() => handleAddressSelect(s)}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 flex flex-col gap-0.5 border-b border-white/5 last:border-0 transition-colors"
                        >
                          <span className="text-xs font-bold text-white/90">
                            {s.components.addressLine}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {s.formattedAddress}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                </div>
              </motion.div>
            )}

            {cardIndex === 2 && (
              <motion.div
                key="card2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Where does this property stand today?</h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    We start you exactly where the work is, and skip everything behind you.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {stageOptions.map((opt) => {
                    const isSelected = intake.journey === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleStageSelect(opt.key)}
                        className="flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                          border: isSelected ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isSelected ? "0 0 12px rgba(245,158,11,0.15)" : "none",
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0"
                          style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.3)" }}
                        >
                          {opt.icon}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-white/90">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-white/40 leading-normal">
                            {opt.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {cardIndex === 3 && (
              <motion.div
                key="card3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">What kind of property is this?</h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Property type decides which questions, documents, and vendors ever appear.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {propertyTypeOptions.map((opt) => {
                    const isSelected = address.propertyType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handlePropertyTypeSelect(opt.key)}
                        className="flex flex-col items-center justify-center p-4 rounded-xl text-center transition-all duration-200 min-h-[90px]"
                        style={{
                          background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                          border: isSelected ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isSelected ? "0 0 12px rgba(245,158,11,0.15)" : "none",
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-[24px] mb-2"
                          style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.3)" }}
                        >
                          {opt.icon}
                        </span>
                        <span className="text-xs font-semibold text-white/90">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {address.propertyType === "Multi Family" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 mt-2 p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wide">
                      How many units does this Multi-Family property have?
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="2"
                        value={address.units || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setAddress({ units: isNaN(val) ? undefined : val });
                        }}
                        placeholder="e.g. 4"
                        className="w-32 px-3 py-2 rounded-lg text-sm transition-all"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "white",
                        }}
                      />
                      {address.units && address.units > 1 && (
                        <button
                          onClick={advanceFromPropertyType}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors"
                        >
                          Confirm & Continue
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {cardIndex === 4 && (
              <motion.div
                key="card4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col gap-4"
              >
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">How is it earning — or how did it conclude?</h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    This sets the strategy field the whole system keys on (Retrospective Mode).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {dispositionOptions.map((opt) => {
                    const isSelected = intake.dispositionType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleDispositionSelect(opt.key)}
                        className="flex flex-col items-start gap-3 p-4 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: isSelected ? "rgba(69,73,85,0.12)" : "rgba(255,255,255,0.02)",
                          border: isSelected ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isSelected ? "0 0 12px rgba(245,158,11,0.15)" : "none",
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-[22px] flex-shrink-0"
                          style={{ color: isSelected ? "#F59E0B" : "rgba(253,255,252,0.3)" }}
                        >
                          {opt.icon}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-white/90">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-white/40 leading-normal">
                            {opt.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div>
          {cardIndex > 1 && (
            <button
              onClick={() => setCardIndex(cardIndex - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </button>
          )}
        </div>

        <button
          disabled={!isCurrentCardValid}
          onClick={() => {
            if (cardIndex === 1) setCardIndex(2);
            else if (cardIndex === 2) setCardIndex(3);
            else if (cardIndex === 3) advanceFromPropertyType();
            else onNext();
          }}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{
            background: isCurrentCardValid ? "#454955" : "rgba(255,255,255,0.04)",
            color: isCurrentCardValid ? "#ffffff" : "rgba(253,255,252,0.2)",
            cursor: isCurrentCardValid ? "pointer" : "not-allowed",
          }}
        >
          Next
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
