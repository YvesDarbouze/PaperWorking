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

  // Preview pins: real deal pins when available, otherwise seeded US markets
  const previewPins = React.useMemo(() => {
    const real = mapPins.filter((p) => !p.isCustom);
    if (real.length > 0) return real;
    return MOCK_PREVIEW_PINS;
  }, [mapPins]);

  if (loadError) {
    return (
      <MockMapPreview
        pins={previewPins}
        usingSeedData={mapPins.filter((p) => !p.isCustom).length === 0}
      />
    );
  }

  if (!mapLoaded) {
    return (
      <div className="w-full h-full min-h-[200px] rounded-[2px] flex flex-col items-center justify-center gap-3 bg-[#121014] border border-white/5">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#C4A574]" />
        <p className="text-xs text-[var(--color-muted)]">Loading map…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[200px] rounded-[2px] overflow-hidden border border-white/5 bg-[#121014]">
      <div ref={mapRef} className="w-full h-full min-h-[200px]" />

      {mapPins.filter(p => !p.isCustom).length > 0 && (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-[2px] border border-white/10 text-[10px] font-semibold tracking-wider text-[#C4A574] bg-[#121014]/85 backdrop-blur-md">
          {mapPins.filter(p => !p.isCustom).length} {mapPins.filter(p => !p.isCustom).length === 1 ? 'DEAL' : 'DEALS'} SHOWN
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10">
        <GoogleAttribution variant="light" />
      </div>
    </div>
  );
}

/** Rough continental US projection for static preview (lng −125…−66, lat 24…50). */
function toPreviewXY(lat: number, lng: number) {
  const x = ((lng + 125) / (125 - 66)) * 100;
  const y = ((50 - lat) / (50 - 24)) * 100;
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(88, Math.max(12, y)),
  };
}

const MOCK_PREVIEW_PINS: MapPinData[] = [
  { id: 'mock-mem', lat: 35.15, lng: -90.05, title: 'Memphis Core', subtitle: 'Memphis, TN', count: 2 },
  { id: 'mock-chi', lat: 41.85, lng: -87.65, title: 'Chicago South', subtitle: 'Chicago, IL', count: 1 },
  { id: 'mock-atl', lat: 33.75, lng: -84.39, title: 'Atlanta Metro', subtitle: 'Atlanta, GA', count: 1 },
  { id: 'mock-ind', lat: 39.77, lng: -86.16, title: 'Indy Suburbs', subtitle: 'Indianapolis, IN', count: 1 },
  { id: 'mock-dal', lat: 32.78, lng: -96.80, title: 'Dallas North', subtitle: 'Dallas, TX', count: 1 },
];

function MockMapPreview({
  pins,
  usingSeedData,
}: {
  pins: MapPinData[];
  usingSeedData: boolean;
}) {
  return (
    <div
      className="relative w-full h-full min-h-[200px] overflow-hidden rounded-[2px] border border-white/8"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, #1a1c24 0%, #101117 70%, #0a0b0e 100%)',
      }}
      aria-label="Deal map preview"
    >
      {/* Subtle land silhouette */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern id="cc-map-grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(196,165,116,0.08)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#cc-map-grid)" />
        <path
          d="M12,62 C18,48 28,38 38,42 C48,28 58,30 68,36 C78,32 86,40 90,52 C88,68 78,78 62,80 C48,86 32,78 22,72 C16,68 12,66 12,62 Z"
          fill="rgba(196,165,116,0.06)"
          stroke="rgba(196,165,116,0.18)"
          strokeWidth="0.4"
        />
      </svg>

      {pins.map((p) => {
        const { x, y } = toPreviewXY(p.lat, p.lng);
        return (
          <div
            key={p.id}
            className="absolute z-[1] -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={`${p.title} · ${p.subtitle}`}
          >
            <span
              className="block w-2.5 h-2.5 rounded-full border border-[#F3F1EC]/80 shadow-[0_0_0_4px_rgba(196,165,116,0.2)]"
              style={{ background: '#C4A574' }}
            />
            <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-[#0A0B0E]/90 px-1.5 py-0.5 text-[9px] text-[#F3F1EC]/85 opacity-0 transition-opacity group-hover:opacity-100 border border-white/10">
              {p.title}
            </span>
          </div>
        );
      })}

      <div className="absolute top-3 left-3 z-[2] flex flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-[2px] border border-[#C4A574]/25 bg-[#0A0B0E]/75 px-2 py-1 text-[10px] font-medium tracking-wide text-[#C4A574]">
          Preview map
        </span>
        <span className="text-[10px] text-[#9C9890] max-w-[180px] leading-snug">
          {usingSeedData
            ? 'Sample markets — real pins appear when deals have coordinates.'
            : 'Showing your deals. Add a Maps API key for the live Google map.'}
        </span>
      </div>

      <div className="absolute top-3 right-3 z-[2] rounded-[2px] border border-white/10 bg-[#0A0B0E]/75 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#C4A574]">
        {pins.length} {pins.length === 1 ? 'MARKET' : 'MARKETS'}
      </div>
    </div>
  );
}
