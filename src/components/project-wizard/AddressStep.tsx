import React, { useState, useCallback } from 'react';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { PlacesAutocompleteInput } from '@/components/maps/PlacesAutocompleteInput';
import { StreetViewHeader } from '@/components/deals/StreetViewHeader';
import type { GooglePlaceResult } from '@/types/google-maps';

interface AddressStepProps {
  onAddressSelect: (address: string, lat: number, lng: number, placeId: string) => void;
  initialAddress?: string;
}

export function AddressStep({ onAddressSelect, initialAddress = '' }: AddressStepProps) {
  const [address, setAddress] = useState(initialAddress);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceResult | null>(null);
  const [streetViewUrl, setStreetViewUrl] = useState<string | null>(null);
  const [_isFetchingStreetView, setIsFetchingStreetView] = useState(false);

  const handlePlaceSelect = useCallback(async (place: GooglePlaceResult) => {
    setSelectedPlace(place);

    const formattedAddress = place.formatted_address || '';
    setAddress(formattedAddress);

    const lat = place.geometry?.location.lat() || 0;
    const lng = place.geometry?.location.lng() || 0;
    const placeId = place.place_id || '';

    // Fetch Street View
    setIsFetchingStreetView(true);
    try {
      const response = await fetch('/api/street-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });

      const data = await response.json();
      setStreetViewUrl(data.imageUrl || null);
    } catch {
      setStreetViewUrl(null);
    } finally {
      setIsFetchingStreetView(false);
    }

    onAddressSelect(formattedAddress, lat, lng, placeId);
  }, [onAddressSelect]);

  const { inputRef, isReady, error } = usePlacesAutocomplete({
    onPlaceSelect: handlePlaceSelect,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Property Address</h2>
        <p className="text-sm text-slate-400">
          Start typing and select the property address. We&apos;ll fetch a street view image.
        </p>
      </div>

      <PlacesAutocompleteInput
        ref={inputRef}
        value={address}
        onChange={setAddress}
        placeholder="123 Main St, Austin, TX 78701"
        isLoading={!isReady}
        error={error}
      />

      {/* Street View Preview */}
      {selectedPlace && (
        <div className="mt-4">
          <StreetViewHeader
            address={selectedPlace.formatted_address || address}
            lat={selectedPlace.geometry?.location.lat()}
            lng={selectedPlace.geometry?.location.lng()}
            streetViewUrl={streetViewUrl}
            height={250}
          />
        </div>
      )}
    </div>
  );
}
