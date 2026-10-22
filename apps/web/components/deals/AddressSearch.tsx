'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlass,
  CircleNotch,
  ArrowRight,
  MapPin,
  X,
} from '@phosphor-icons/react';
import CollisionModal, { type CollisionDeal } from '@/components/deals/CollisionModal';
import { bffFetch } from '@/lib/api/bff-fetch';
import { loadGoogleMaps } from '@/lib/maps/loader';
import { PlacesSessionManager } from '@/lib/maps/session-token';
import {
  extractPlaceDetailsFromAddressComponents,
  parseAddressComponents,
  type ParsedPlaceDetails,
} from '@/lib/maps/address-parser';

export interface AddressSearchProps {
  id?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  value?: string;
  mode?: 'navigate' | 'select';
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  onSearchChange?: (value: string) => void;
  onSelectAddress?: (address: string, details?: ParsedPlaceDetails) => void;
  onSelectPlaceDetails?: (details: ParsedPlaceDetails) => void;
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

function extractFormattableText(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (
    typeof val === 'object' &&
    'text' in val &&
    typeof (val as { text?: unknown }).text === 'string'
  ) {
    return (val as { text: string }).text;
  }
  const str = String(val);
  return str === '[object Object]' ? '' : str;
}

export default function AddressSearch({
  id,
  placeholder = 'Search any street address or deal name…',
  className = '',
  autoFocus = false,
  value,
  mode = 'navigate',
  ariaInvalid,
  ariaDescribedBy,
  onSearchChange,
  onSelectAddress,
  onSelectPlaceDetails,
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
  const [query, setQuery] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [collisionDeal, setCollisionDeal] = useState<CollisionDeal | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  // Autocomplete state
  const [predictions, setPredictions] = useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const spinnerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    const handleNativeSync = () => {
      const domVal = inputEl.value;
      if (domVal !== queryRef.current) {
        queryRef.current = domVal;
        setQuery(domVal);
        setActiveIndex(-1);
        onSearchChangeRef.current?.(domVal);
      }
    };
    inputEl.addEventListener('input', handleNativeSync);
    inputEl.addEventListener('change', handleNativeSync);
    inputEl.addEventListener('blur', handleNativeSync);
    return () => {
      inputEl.removeEventListener('input', handleNativeSync);
      inputEl.removeEventListener('change', handleNativeSync);
      inputEl.removeEventListener('blur', handleNativeSync);
    };
  }, []);

  // Google Maps Places references
  const sessionManagerRef = useRef<PlacesSessionManager>(new PlacesSessionManager());
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Initialize Places Autocomplete Service
  useEffect(() => {
    let active = true;
    loadGoogleMaps()
      .then((googleInstance) => {
        if (!active || !googleInstance?.places) return;
        // Warm up the library
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

    if (window.google?.maps?.places?.AutocompleteSuggestion) {
      try {
        const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: googleToken || undefined,
          includedRegionCodes: ['US'],
          includedPrimaryTypes: ['address'],
        });

        if (suggestions && suggestions.length > 0) {
          setPredictions(
            suggestions.slice(0, 5).map((r) => {
              const p = r.placePrediction;
              const mainText = extractFormattableText(p?.mainText);
              const secondaryText = extractFormattableText(p?.secondaryText);
              const fullText =
                extractFormattableText(p?.text) ||
                [mainText, secondaryText].filter(Boolean).join(', ');
              return {
                placeId: p?.placeId || '',
                description: fullText,
                mainText,
                secondaryText,
              };
            })
          );
          setIsOpen(true);
        } else {
          setPredictions([]);
          setIsOpen(false);
        }
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

  function syncInputValue(val: string, triggerPredictions = true) {
    setQuery(val);
    setActiveIndex(-1);
    if (onSearchChange) onSearchChange(val);

    if (triggerPredictions) {
      // 300ms debounce
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(val);
      }, 300);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    syncInputValue(event.target.value, true);
  }

  async function handleAddressSubmit(
    addressToSearch?: string,
    resolvedDetails?: ParsedPlaceDetails,
  ) {
    const targetAddress = (addressToSearch ?? query).trim();
    if (!targetAddress) return;

    setIsOpen(false);
    setActiveIndex(-1);
    // Reset session token on address submission (ends autocomplete gesture)
    sessionTokenRef.current = null;
    sessionManagerRef.current.resetToken();

    const finalDetails = parseAddressComponents(targetAddress, resolvedDetails);
    if (onSelectPlaceDetails) onSelectPlaceDetails(finalDetails);
    if (onSelectAddress) onSelectAddress(targetAddress, finalDetails);

    if (mode === 'select') {
      return;
    }

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

  async function handleSelectSuggestion(suggestion: AutocompleteSuggestion) {
    setIsOpen(false);
    setActiveIndex(-1);
    const selectedDescription =
      suggestion.description ||
      [suggestion.mainText, suggestion.secondaryText].filter(Boolean).join(', ');
    setQuery(selectedDescription);
    if (onSearchChange) onSearchChange(selectedDescription);

    const activeTokenId = sessionManagerRef.current.getToken();
    let extractedDetails = parseAddressComponents(selectedDescription);
    if (onSelectPlaceDetails) onSelectPlaceDetails(extractedDetails);

    // If Place is loaded, fetch details with strict minimal field mask to restrict billing
    if (window.google?.maps?.places?.Place && suggestion.placeId) {
      try {
        const place = new window.google.maps.places.Place({ id: suggestion.placeId });
        await place.fetchFields({
          fields: [...PLACES_DETAILS_FIELD_MASK],
        });
        const placeRecord = place as unknown as Record<string, unknown>;
        const rawComponents =
          placeRecord.addressComponents ?? placeRecord.address_components;
        const formattedAddr =
          (typeof placeRecord.formattedAddress === 'string'
            ? placeRecord.formattedAddress
            : undefined) ??
          (typeof placeRecord.formatted_address === 'string'
            ? placeRecord.formatted_address
            : undefined);
        const sdkDetails = extractPlaceDetailsFromAddressComponents(
          rawComponents,
          formattedAddr,
        );
        extractedDetails = parseAddressComponents(selectedDescription, sdkDetails);
        // Session token consumed on fetchFields per Google billing rules
        sessionTokenRef.current = null;
        sessionManagerRef.current.resetToken();
      } catch {
        // Silent degradation
      }
    } else if (
      suggestion.placeId &&
      !suggestion.placeId.startsWith('custom-')
    ) {
      try {
        const res = await fetch('/api/places/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId: suggestion.placeId,
            sessionToken: activeTokenId,
            description: selectedDescription,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>;
          const apiDetails = extractPlaceDetailsFromAddressComponents(
            data.address_components ?? data.addressComponents,
            typeof data.formatted_address === 'string'
              ? data.formatted_address
              : typeof data.formattedAddress === 'string'
                ? data.formattedAddress
                : undefined,
          );
          extractedDetails = parseAddressComponents(
            selectedDescription,
            apiDetails,
          );
        }
      } catch {
        // Silent degradation
      } finally {
        sessionTokenRef.current = null;
        sessionManagerRef.current.resetToken();
      }
    } else {
      sessionTokenRef.current = null;
      sessionManagerRef.current.resetToken();
    }

    handleAddressSubmit(selectedDescription, extractedDetails);
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
      if (isOpen) {
        setIsOpen(false);
        setActiveIndex(-1);
      } else if (query) {
        setQuery('');
        setPredictions([]);
        setIsOpen(false);
        setActiveIndex(-1);
        onSearchChange?.('');
      }
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
        <MagnifyingGlass
          data-testid="address-search-icon"
          className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400"
        />
        <input
          id={id}
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
          onInput={(e) => {
            const domVal = e.currentTarget.value;
            if (domVal !== query) {
              syncInputValue(domVal, true);
            }
          }}
          onBlur={(e) => {
            const domVal = e.currentTarget.value;
            if (domVal !== query) {
              syncInputValue(domVal, false);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={`w-full min-h-[44px] rounded-none border bg-neutral-900 py-2.5 pl-10 pr-20 text-base md:text-sm text-white outline-none placeholder:text-neutral-500 transition ${
            ariaInvalid
              ? 'border-destructive focus:border-destructive'
              : 'border-neutral-800 focus:border-ring'
          }`}
        />

        <div className="absolute right-0 top-0 bottom-0 flex items-center">
          {showSpinner && loading ? (
            <span className="flex min-h-[44px] min-w-[44px] items-center justify-center">
              <CircleNotch
                data-testid="address-search-spinner"
                className="h-4 w-4 animate-spin text-white"
              />
            </span>
          ) : null}
          {query ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setPredictions([]);
                  setIsOpen(false);
                  setActiveIndex(-1);
                  onSearchChange?.('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                data-testid="clear-address-search-btn"
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-none text-neutral-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
              >
                <X className="h-3.5 w-3.5" weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => handleAddressSubmit(query)}
                aria-label="Submit address search"
                className="flex min-h-[44px] min-w-[36px] cursor-pointer items-center justify-center pr-2 text-neutral-400 transition hover:text-white"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <ul
          id="address-predictions-list"
          role="listbox"
          aria-label="Address suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-none border border-neutral-800 bg-neutral-900 p-1 shadow-xl"
        >
          {predictions.map((pred, index) => {
            const isSelected = index === activeIndex;
            return (
              <li
                key={pred.placeId || index}
                id={`address-prediction-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelectSuggestion(pred)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-none px-3 py-2 text-xs transition ${
                  isSelected
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                }`}
              >
                <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-white truncate">
                    {pred.mainText || pred.description}
                  </span>
                  {pred.secondaryText && (
                    <span className="text-[11px] text-neutral-400 truncate">
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
