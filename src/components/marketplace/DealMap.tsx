'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DealListingTeaser } from '@/types/listing';

declare global {
  interface Window {
    google?: any;
  }
}

declare const google: any;

interface DealMapProps {
  deals: DealListingTeaser[];
}

export default function DealMap({ deals }: DealMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  const validDeals = deals.filter(
    (d) => typeof d.latitude === 'number' && typeof d.longitude === 'number'
  );

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

    // Initial center is geographic center of continental US, zoom level 4 (national view)
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      styles: monochromaticStyles,
      disableDefaultUI: true,
      zoomControl: true,
      maxZoom: 16,
      minZoom: 3,
    });

    // Create Density Circles (simulating heatmap/density visually without deprecated visualization lib)
    const circles = validDeals.map((d) => {
      return new google.maps.Circle({
        strokeColor: '#627C85',
        strokeOpacity: 0.15,
        strokeWeight: 1,
        fillColor: '#627C85',
        fillOpacity: 0.35,
        center: { lat: d.latitude!, lng: d.longitude! },
        radius: 160000, // 160km radius overlays beautifully at zoom <= 4
      });
    });

    // Create Marker objects
    const markers = validDeals.map((d) => {
      const marker = new google.maps.Marker({
        position: { lat: d.latitude!, lng: d.longitude! },
        title: `${d.propertyName} (${d.neighborhood})`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#627C85', // Brand accent slate-grey
          fillOpacity: 0.95,
          strokeColor: '#FFFFFF',
          strokeWeight: 1.5,
          scale: 9,
        },
      });

      marker.addListener('click', () => {
        router.push(`/deals/${d.id}`);
      });

      return marker;
    });

    // Visibility sync based on zoom thresholds
    const syncViewMode = (currentZoom: number) => {
      if (currentZoom <= 4) {
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

    // Trigger initial state sync
    syncViewMode(map.getZoom() || 4);

    return () => {
      circles.forEach((c) => c.setMap(null));
      markers.forEach((m) => m.setMap(null));
    };
  }, [mapLoaded, validDeals, router]);

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
      <div className="absolute top-4 right-4 z-10 glass-card px-3 py-1.5 rounded-lg border border-pw-border text-[11px] font-bold tracking-wider text-[var(--color-primary)] bg-[#121014]/80 backdrop-blur-md shadow-md">
        {validDeals.length} {validDeals.length === 1 ? 'DEAL' : 'DEALS'} SHOWN
      </div>
    </div>
  );
}
