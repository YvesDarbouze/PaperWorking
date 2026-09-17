'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CollisionModal, { type CollisionDeal } from '@/components/deals/CollisionModal';
import { bffFetch } from '@/lib/api/bff-fetch';
import { loadGoogleMaps } from '@/lib/maps/loader';
import { PlacesSessionManager } from '@/lib/maps/session-token';

export interface AddressSearchProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSearchChange?: (value: string) => void;
  onSelectAddress?: (address: string) => void;
  collisionVariant?: 'deal-collision' | 'project-link';
  onExistingDealFound?: (deal: CollisionDeal) => void;
  onNoDealFound?: (address: string, slug: string) => void;
  onLinkDeal?: (deal: CollisionDeal) => void;
  onCreateNewDeal?: (deal: CollisionDeal) => void;
}

export interface AutocompleteSuggestion {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
}

/**
 * Cost Guardrail: Minimal field mask restricting Google Places billing to Basic Data tier.
 */
export const PLACES_DETAILS_FIELD_MASK = [
  'place_id',
  'formatted_address',
  'geometry',
  'address_components',
] as const;

export default function AddressSearch({
  placeholder = 'Search any street address or deal name…',
  className = '',
  autoFocus = false,
  onSearchChange,
  onSelectAddress,
  collisionVariant = 'deal-collision',
  onExistingDealFound,
  onNoDealFound,
  onLinkDeal,
  onCreateNewDeal,
}: AddressSearchProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    router = null;
  }
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [collisionDeal, setCollisionDeal] = useState<CollisionDeal | null>(null);

  // Autocomplete state
  const [predictions, setPredictions] = useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const spinnerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Google Maps Places references
  const sessionManagerRef = useRef<PlacesSessionManager>(new PlacesSessionManager());
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  // Initialize Places Autocomplete Service
  useEffect(() => {
    let active = true;
    loadGoogleMaps()
      .then((googleInstance) => {
        if (!active || !googleInstance?.places) return;
        try {
          autocompleteServiceRef.current = new googleInstance.places.AutocompleteService();
          const dummyDiv = document.createElement('div');
          placesServiceRef.current = new googleInstance.places.PlacesService(dummyDiv);
        } catch {
          // Graceful degradation if Places library isn't available
        }
      })
      .catch(() => {
        // Silent degradation
      });

    return () => {
      active = false;
    };
  }, []);

  // Ensure an active session token exists for the current address-entry gesture
  function ensureSessionToken(): { googleToken: google.maps.places.AutocompleteSessionToken | null; tokenId: string } {
    const tokenId = sessionManagerRef.current.getToken();
    if (!sessionTokenRef.current && typeof window !== 'undefined' && window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
    return { googleToken: sessionTokenRef.current, tokenId };
  }

  // Handle click outside to close predictions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Fetch predictions (Google JS SDK or fallback proxy)
  const fetchPredictions = useCallback(async (inputVal: string) => {
    const trimmed = inputVal.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    // Ensure session token exists for this address-entry gesture
    const { googleToken, tokenId } = ensureSessionToken();

    if (autocompleteServiceRef.current && window.google?.maps?.places) {
      try {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: trimmed,
            sessionToken: googleToken || undefined,
            componentRestrictions: { country: 'us' },
            types: ['address'],
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              setPredictions(
                results.slice(0, 5).map((r) => ({
                  placeId: r.place_id,
                  description: r.description,
                  mainText: r.structured_formatting?.main_text,
                  secondaryText: r.structured_formatting?.secondary_text,
                })),
              );
              setIsOpen(true);
            } else {
              setPredictions([]);
              setIsOpen(false);
            }
          },
        );
        return;
      } catch {
        // Fall through to backend proxy
      }
    }

    // Backend proxy fallback
    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          sessionToken: tokenId,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { predictions?: AutocompleteSuggestion[] };
        const preds = data.predictions || [];
        setPredictions(preds.slice(0, 5));
        setIsOpen(preds.length > 0);
      } else {
        setPredictions([]);
        setIsOpen(false);
      }
    } catch {
      setPredictions([]);
      setIsOpen(false);
    }
  }, []);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const val = event.target.value;
    setQuery(val);
    setActiveIndex(-1);
    if (onSearchChange) onSearchChange(val);

    // 300ms debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(val);
    }, 300);
  }

  async function handleAddressSubmit(addressToSearch?: string) {
    const targetAddress = (addressToSearch ?? query).trim();
    if (!targetAddress) return;

    setIsOpen(false);
    setActiveIndex(-1);
    // Reset session token on address submission (ends autocomplete gesture)
    sessionTokenRef.current = null;
    sessionManagerRef.current.resetToken();

    if (onSelectAddress) onSelectAddress(targetAddress);

    const slug = targetAddress.replace(/\s+/g, '').toLowerCase();

    // Start loading spinner after 200ms delay to prevent visual flicker
    setLoading(true);
    spinnerTimerRef.current = setTimeout(() => {
      setShowSpinner(true);
    }, 200);

    try {
      const response = await bffFetch(`/api/deals/exists?slug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });

      const body = (await response.json()) as {
        exists: boolean;
        deal: CollisionDeal | null;
        error?: string;
      };

      if (response.ok && body.exists && body.deal) {
        // Collision found: show modal
        setCollisionDeal(body.deal);
        if (onExistingDealFound) onExistingDealFound(body.deal);
      } else {
        // No collision found
        if (onNoDealFound) {
          onNoDealFound(targetAddress, slug);
        } else {
          // Default deal marketplace behavior: navigate to /deals/[slug]
          if (typeof window !== 'undefined') {
            window.location.href = `/deals/${slug}`;
          } else if (router) {
            router.push(`/deals/${slug}`);
          }
        }
      }
    } catch (error) {
      console.error('[AddressSearch] Existence check error (failing open):', error);
      if (onNoDealFound) {
        onNoDealFound(targetAddress, slug);
      } else {
        if (typeof window !== 'undefined') {
          window.location.href = `/deals/${slug}`;
        } else if (router) {
          router.push(`/deals/${slug}`);
        }
      }
    } finally {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      setLoading(false);
      setShowSpinner(false);
    }
  }

  function handleSelectSuggestion(suggestion: AutocompleteSuggestion) {
    setQuery(suggestion.description);

    // If PlacesService is loaded, fetch details with strict minimal field mask to restrict billing
    if (placesServiceRef.current && suggestion.placeId) {
      try {
        placesServiceRef.current.getDetails(
          {
            placeId: suggestion.placeId,
            sessionToken: sessionTokenRef.current || undefined,
            fields: [...PLACES_DETAILS_FIELD_MASK],
          },
          () => {
            // Session token consumed on getDetails per Google billing rules
            sessionTokenRef.current = null;
            sessionManagerRef.current.resetToken();
          },
        );
      } catch {
        // Silent degradation
      }
    } else {
      sessionTokenRef.current = null;
      sessionManagerRef.current.resetToken();
    }

    handleAddressSubmit(suggestion.description);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen && predictions.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
      } else if (predictions.length > 0) {
        setActiveIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (isOpen && predictions.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && activeIndex >= 0 && predictions[activeIndex]) {
        handleSelectSuggestion(predictions[activeIndex]);
      } else {
        handleAddressSubmit(query);
      }
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 text-[18px] text-white/40">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="address-predictions-list"
          aria-activedescendant={activeIndex >= 0 ? `address-prediction-${activeIndex}` : undefined}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#00DD94]"
        />

        {/* 16px Spinner (delayed 200ms) or submit icon */}
        <div className="absolute right-3 flex items-center">
          {showSpinner && loading ? (
            <span
              data-testid="address-search-spinner"
              className="material-symbols-outlined animate-spin text-[16px] text-[#00DD94]"
            >
              progress_activity
            </span>
          ) : query ? (
            <button
              type="button"
              onClick={() => handleAddressSubmit(query)}
              aria-label="Submit address search"
              className="text-white/40 hover:text-white transition"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <ul
          id="address-predictions-list"
          role="listbox"
          aria-label="Address suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-white/10 bg-[#161318] p-1 shadow-xl backdrop-blur-md"
        >
          {predictions.map((pred, index) => {
            const isSelected = index === activeIndex;
            return (
              <li
                key={pred.placeId || index}
                id={`address-prediction-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelectSuggestion(pred)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition ${
                  isSelected
                    ? 'bg-[var(--accent)]/15 text-white border border-[var(--accent)]/30'
                    : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-white/40 flex-shrink-0">
                  location_on
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-white truncate">
                    {pred.mainText || pred.description}
                  </span>
                  {pred.secondaryText && (
                    <span className="text-[11px] text-white/40 truncate">
                      {pred.secondaryText}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {/* Powered by Google Attribution (Review C2.4 TOS Requirement & W2-13 Provenance) */}
          <li
            data-testid="powered-by-google-attribution"
            className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 text-[10px] text-white/40 select-none pointer-events-none"
            aria-hidden="true"
          >
            <span data-testid="places-provenance" className="font-mono text-[9px] text-white/35">
              Source: Google Places · as of {new Date().toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span>Powered by</span>
              <span className="font-bold text-white/70 tracking-tight">Google</span>
            </span>
          </li>
        </ul>
      )}

      {collisionDeal ? (
        <CollisionModal
          deal={collisionDeal}
          variant={collisionVariant}
          onClose={() => setCollisionDeal(null)}
          onLinkDeal={(d) => {
            setCollisionDeal(null);
            if (onLinkDeal) onLinkDeal(d);
          }}
          onCreateNewDeal={(d) => {
            setCollisionDeal(null);
            if (onCreateNewDeal) onCreateNewDeal(d);
          }}
        />
      ) : null}
    </div>
  );
}
