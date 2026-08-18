import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsApi, isGoogleMapsLoaded } from '@/lib/maps/google-maps-loader';
import type { GooglePlacesAutocompleteInstance, GooglePlaceResult } from '@/types/google-maps';

interface UsePlacesAutocompleteOptions {
  onPlaceSelect?: (place: GooglePlaceResult) => void;
  countryRestriction?: string | string[];
  types?: string[];
}

export function usePlacesAutocomplete(options: UsePlacesAutocompleteOptions = {}) {
  const { onPlaceSelect, countryRestriction = 'us', types = ['address'] } = options;

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GooglePlacesAutocompleteInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initAutocomplete = useCallback(async () => {
    if (!inputRef.current) return;

    try {
      await loadGoogleMapsApi();

      if (!window.google?.maps?.places?.Autocomplete) {
        throw new Error('Places library not available');
      }

      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types,
          componentRestrictions: { country: countryRestriction },
          fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          onPlaceSelect?.(place);
        }
      });

      autocompleteRef.current = autocomplete;
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize autocomplete');
    }
  }, [onPlaceSelect, countryRestriction, types]);

  useEffect(() => {
    initAutocomplete();

    return () => {
      // Clean up listeners if needed
      if (autocompleteRef.current && window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [initAutocomplete]);

  return { inputRef, isReady, error };
}
