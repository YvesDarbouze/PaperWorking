'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DealListingTeaser, SubscriberPropertyResult } from '@/types/listing';
import { GoogleAttribution } from '@/components/ui/GoogleAttribution';

declare global {
  interface Window {
    google?: any;
  }
}

declare const google: any;

interface DealMapProps {
  deals?: DealListingTeaser[];
  properties?: SubscriberPropertyResult[];
  center?: { lat: number; lng: number };
  zoom?: number;
  customMarker?: { lat: number; lng: number; title: string };
}

interface MapPinData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  count: number;
  routeUrl?: string;
  isCustom?: boolean;
}

export default function DealMap({
  deals = [],
  properties = [],
  center,
  zoom,
  customMarker,
}: DealMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Unify deals and properties into a single internal mapPins list
  const mapPins: MapPinData[] = React.useMemo(() => {
    const pins: MapPinData[] = [];

    // 1. Add normal deal teasers (e.g. from browse state)
    deals.forEach((d) => {
      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        pins.push({
          id: d.id,
          lat: d.latitude,
          lng: d.longitude,
          title: d.propertyName,
          subtitle: d.neighborhood,
          count: 1,
          routeUrl: `/deals/${d.id}`,
        });
      }
    });

    // 2. Add subscriber grouped search results
    properties.forEach((p) => {
      if (p.coordinates && typeof p.coordinates.lat === 'number' && typeof p.coordinates.lng === 'number') {
        const bestDeal = p.deals[0];
        pins.push({
          id: p.placeId || p.canonicalAddress,
          lat: p.coordinates.lat,
          lng: p.coordinates.lng,
          title: p.canonicalAddress,
          subtitle: `${p.city}, ${p.state} ${p.zipCode}`,
          count: p.deals.length,
          routeUrl: bestDeal ? `/deals/${bestDeal.listing.id}` : undefined,
        });
      }
    });

    // 3. Add custom target marker if present
    if (customMarker && typeof customMarker.lat === 'number' && typeof customMarker.lng === 'number') {
      pins.push({
        id: 'custom_marker',
        lat: customMarker.lat,
        lng: customMarker.lng,
        title: customMarker.title,
        subtitle: 'Resolved search location',
        count: 0,
        isCustom: true,
      });
    }

    return pins;
  }, [deals, properties, customMarker]);

  useEffect(() => {
    // 1. Script Loading logic
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const timeout = setTimeout(() => {
      if (!window.google?.maps) {
        setLoadError(true);
      }
    }, 10000); // 10s load timeout

    const existingScript = document.getElementById('google-maps-sdk-script');
    if (existingScript) {
      const handleLoad = () => {
        clearTimeout(timeout);
        setMapLoaded(true);
      };
      existingScript.addEventListener('load', handleLoad);
      return () => {
        existingScript.removeEventListener('load', handleLoad);
        clearTimeout(timeout);
      };
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.error('[DealMap] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined!');
      setLoadError(true);
      clearTimeout(timeout);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      clearTimeout(timeout);
      setMapLoaded(true);
    };
    script.onerror = () => {
      clearTimeout(timeout);
      setLoadError(true);
    };
    
    document.head.appendChild(script);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google?.maps) return;

    // Custom monochromatic night theme map style
    const monochromaticStyles = [
      { elementType: 'geometry', stylers: [{ color: '#121014' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#121014' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#627c85' }] },
      { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#627c85' }] },
      { featureType: 'landscape', stylers: [{ color: '#161419' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232026' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#627c85' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0b0f' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4c6168' }] }
    ];

    // Initial center and zoom
    const initialCenter = center || { lat: 39.8283, lng: -98.5795 };
    const initialZoom = zoom !== undefined ? zoom : (center ? 12 : 4);

    const map = new google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      styles: monochromaticStyles,
      disableDefaultUI: true,
      zoomControl: true,
      maxZoom: 16,
      minZoom: 3,
    });

    // Create Density Circles (clustering at low zoom <= 4)
    const circles = mapPins
      .filter((p) => !p.isCustom)
      .map((p) => {
        return new google.maps.Circle({
          strokeColor: '#627C85',
          strokeOpacity: 0.15,
          strokeWeight: 1,
          fillColor: '#627C85',
          fillOpacity: 0.35,
          center: { lat: p.lat, lng: p.lng },
          radius: 160000, // 160km radius overlays beautifully at zoom <= 4
        });
      });

    // Create Marker objects
    const markers = mapPins.map((p) => {
      const isTargetOnly = p.isCustom;
      const markerColor = isTargetOnly ? '#E11D48' : '#627C85'; // Red for target, Slate for active deals
      const markerScale = isTargetOnly ? 11 : (p.count > 1 ? 12 : 9); // Larger for multi-deal / target

      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        title: `${p.title} (${p.subtitle})`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 0.95,
          strokeColor: '#FFFFFF',
          strokeWeight: isTargetOnly ? 2 : 1.5,
          scale: markerScale,
        },
      });

      if (p.routeUrl) {
        marker.addListener('click', () => {
          router.push(p.routeUrl!);
        });
      }

      return marker;
    });

    // Visibility sync based on zoom thresholds
    const syncViewMode = (currentZoom: number) => {
      if (currentZoom <= 4 && mapPins.length > 1) {
        circles.forEach((c) => c.setMap(map));
        markers.forEach((m) => m.setMap(null));
      } else {
        circles.forEach((c) => c.setMap(null));
        markers.forEach((m) => m.setMap(map));
      }
    };

    map.addListener('zoom_changed', () => {
      const z = map.getZoom();
      if (typeof z === 'number') {
        syncViewMode(z);
      }
    });

    // Auto-fit bounds if multiple pins are shown and no custom center is provided
    if (mapPins.length > 0 && !center) {
      const bounds = new google.maps.LatLngBounds();
      mapPins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds);

      // Prevent zooming in too close automatically on bounds fit
      const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
        if (map.getZoom() > 14) {
          map.setZoom(14);
        }
        google.maps.event.removeListener(listener);
      });
    }

    // Trigger initial state sync
    syncViewMode(map.getZoom() || initialZoom);

    return () => {
      circles.forEach((c) => c.setMap(null));
      markers.forEach((m) => m.setMap(null));
    };
  }, [mapLoaded, mapPins, center, zoom, router]);

  if (loadError) {
    return (
      <div className="w-full h-[500px] glass-card border border-red-500/20 rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-4">
        <span className="material-symbols-outlined text-3xl text-red-400">error</span>
        <p className="text-sm font-bold text-[var(--color-on-surface)]">Map Loading Failed</p>
        <p className="text-xs text-[var(--color-muted)] max-w-sm">
          Unable to load the Google Maps API. Please check your network connection and verify key restrictions.
        </p>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="w-full h-[500px] glass-card border border-pw-border rounded-2xl flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        <p className="text-xs text-[var(--color-muted)]">Loading Marketplace Map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-pw-border bg-[#121014]">
      {/* Google Map Canvas */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Floating Honest Count Badge */}
      {mapPins.filter(p => !p.isCustom).length > 0 && (
        <div className="absolute top-4 right-4 z-10 glass-card px-3 py-1.5 rounded-lg border border-pw-border text-[11px] font-bold tracking-wider text-[var(--color-primary)] bg-[#121014]/80 backdrop-blur-md shadow-md">
          {mapPins.filter(p => !p.isCustom).length} {mapPins.filter(p => !p.isCustom).length === 1 ? 'DEAL' : 'DEALS'} SHOWN
        </div>
      )}

      {/* Google attribution — ToS Section 3.2.3 */}
      <div className="absolute bottom-3 left-4 z-10">
        <GoogleAttribution variant="light" />
      </div>
    </div>
  );
}
