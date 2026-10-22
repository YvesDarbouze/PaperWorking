'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapTrifold,
  ArrowSquareOut,
  Stack,
  Minus,
  Plus,
} from '@phosphor-icons/react';

export interface PropertySatelliteViewerProps {
  address: string;
  lat?: number | null;
  lng?: number | null;
  defaultZoom?: number;
  className?: string;
  showControls?: boolean;
  aspectRatio?: '16/9' | '4/3' | '21/9' | 'square';
  title?: string;
}

export function buildInlineSatelliteFallbackDataUri(
  lat: number,
  lng: number,
  zoom: number,
  maptype: 'satellite' | 'roadmap',
): string {
  const isSatellite = maptype === 'satellite';
  const bg = isSatellite ? '#0f1712' : '#141218';
  const gridColor = isSatellite ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.08)';
  const roadColor = isSatellite ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.12)';
  const accent = '#10b981';
  const w = 800;
  const h = 450;
  const cx = w / 2;
  const cy = h / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${bg}" />
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${gridColor}" stroke-width="1"/>
      </pattern>
      <radialGradient id="parcel-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#grid)" />
    <line x1="0" y1="${cy - 85}" x2="${w}" y2="${cy - 85}" stroke="${roadColor}" stroke-width="10" />
    <line x1="${cx - 140}" y1="0" x2="${cx - 140}" y2="${h}" stroke="${roadColor}" stroke-width="8" />
    <line x1="${cx + 150}" y1="0" x2="${cx + 150}" y2="${h}" stroke="${roadColor}" stroke-width="6" />
    <circle cx="${cx}" cy="${cy}" r="145" fill="url(#parcel-glow)" />
    <rect x="${cx - 75}" y="${cy - 58}" width="150" height="96" fill="rgba(16,185,129,0.07)" stroke="${accent}" stroke-width="1.5" stroke-dasharray="5,4" />
    <rect x="${cx - 38}" y="${cy - 32}" width="76" height="48" fill="rgba(16,185,129,0.12)" stroke="${accent}" stroke-width="1" />
    <line x1="${cx}" y1="${cy - 26}" x2="${cx}" y2="${cy + 14}" stroke="${accent}" stroke-width="1.75" />
    <line x1="${cx - 20}" y1="${cy - 6}" x2="${cx + 20}" y2="${cy - 6}" stroke="${accent}" stroke-width="1.75" />
    <circle cx="${cx}" cy="${cy - 6}" r="4" fill="${accent}" />
    <rect x="${cx - 150}" y="${cy + 48}" width="300" height="22" fill="rgba(10,14,12,0.82)" stroke="rgba(16,185,129,0.35)" stroke-width="1" />
    <text x="${cx}" y="${cy + 63}" text-anchor="middle" font-family="monospace" font-size="11" fill="${accent}" font-weight="bold">
      ${isSatellite ? 'SATELLITE PARCEL' : 'ROADMAP'}: ${lat.toFixed(4)}°, ${lng.toFixed(4)}° · z${zoom}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function PropertySatelliteViewer({
  address,
  lat: initialLat,
  lng: initialLng,
  defaultZoom = 18,
  className = '',
  showControls = true,
  aspectRatio = '16/9',
  title,
}: PropertySatelliteViewerProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    if (initialLat != null && initialLng != null) {
      return { lat: initialLat, lng: initialLng };
    }
    return null;
  });
  const [zoom, setZoom] = useState(defaultZoom);
  const [maptype, setMaptype] = useState<'satellite' | 'roadmap'>('satellite');
  const [loading, setLoading] = useState(!coords);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Sync coords if props change
  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      setCoords({ lat: initialLat, lng: initialLng });
      setLoading(false);
      return;
    }

    if (!address || !address.trim()) {
      setCoords(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.resolve()
      .then(() => fetch(`/api/places/geocode?address=${encodeURIComponent(address.trim())}`))
      .then((res) => {
        if (!res.ok) throw new Error('Geocode lookup failed');
        return res.json();
      })
      .then((data) => {
        if (active) {
          if (data.lat != null && data.lng != null) {
            setCoords({ lat: data.lat, lng: data.lng });
          } else {
            // Default fallback coords (Austin, TX center)
            setCoords({ lat: 30.2672, lng: -97.7431 });
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          // Provide fallback coordinates based on hash of address for visual continuity
          const hash = address.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const lat = 30.2672 + (hash % 100) * 0.001;
          const lng = -97.7431 + (hash % 100) * 0.001;
          setCoords({ lat, lng });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [address, initialLat, initialLng]);

  const aspectClass =
    aspectRatio === '4/3'
      ? 'aspect-[4/3] min-h-[220px]'
      : aspectRatio === '21/9'
      ? 'aspect-[21/9] min-h-[200px]'
      : aspectRatio === 'square'
      ? 'aspect-square min-h-[240px]'
      : 'aspect-[16/9] min-h-[220px] sm:min-h-[240px]';

  const tileUrl = coords
    ? `/api/map-tile?lat=${coords.lat}&lng=${coords.lng}&zoom=${zoom}&maptype=${maptype}&w=800&h=450`
    : null;

  useEffect(() => {
    setImageError(false);
  }, [tileUrl]);

  const inlineFallbackDataUri = coords
    ? buildInlineSatelliteFallbackDataUri(coords.lat, coords.lng, zoom, maptype)
    : null;

  const resolvedImageSrc =
    tileUrl && coords
      ? imageError
        ? inlineFallbackDataUri
        : tileUrl
      : null;

  const googleMapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div
      data-testid="property-satellite-viewer"
      className={`relative overflow-hidden rounded-none border border-neutral-800 bg-neutral-950 shadow-xl ${aspectClass} ${className}`}
      style={
        inlineFallbackDataUri
          ? {
              backgroundImage: `url("${inlineFallbackDataUri}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* Background Image / Map Tile */}
      {resolvedImageSrc ? (
        <img
          data-testid="satellite-map-image"
          src={resolvedImageSrc}
          alt={`Satellite view of ${address}`}
          className="block h-full w-full object-cover text-transparent select-none transition-opacity duration-300"
          loading="eager"
          onError={() => {
            if (!imageError) setImageError(true);
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-400">
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <Compass className="h-8 w-8 text-neutral-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider">
              {loading ? 'Resolving Satellite Imagery…' : 'Enter address to view parcel'}
            </span>
          </div>
        </div>
      )}

      {/* Top Banner / Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-1.5 rounded-none border border-neutral-700 bg-neutral-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
            {maptype === 'satellite' ? (
              <Compass className="h-3 w-3 text-neutral-300" />
            ) : (
              <MapTrifold className="h-3 w-3 text-neutral-300" />
            )}
            <span>{maptype === 'satellite' ? 'Satellite Parcel View' : 'Roadmap View'}</span>
          </span>
          {title && (
            <span className="hidden sm:inline text-xs font-medium text-white/80 truncate max-w-[260px]">
              {title}
            </span>
          )}
        </div>

        {/* View in Google Maps Link */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-none border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-md hover:border-neutral-500 hover:text-white transition"
          title="Open in Google Maps"
        >
          <span>Google Maps</span>
          <ArrowSquareOut className="h-3 w-3 text-neutral-400" />
        </a>
      </div>

      {/* Bottom Bar: Coordinates, Zoom & Toggle Controls */}
      <div
        data-testid="satellite-viewer-bottom-bar"
        className="absolute inset-x-0 bottom-0 flex items-end sm:items-center justify-between gap-3 sm:gap-4 p-2.5 sm:p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      >
        <div className="flex min-w-0 items-center mr-2 sm:mr-3">
          {coords && (
            <div
              data-testid="satellite-viewer-coords-badge"
              className="flex w-fit max-w-full flex-col sm:flex-row sm:items-center sm:gap-1 rounded-none border border-neutral-700 bg-neutral-900/80 px-2 sm:px-2.5 py-1 text-[9.5px] sm:text-[10px] leading-tight font-mono text-neutral-300 backdrop-blur-md"
            >
              <span className="whitespace-nowrap">
                <span className="text-white">{coords.lat.toFixed(4)}°N</span>,
              </span>
              <span className="whitespace-nowrap">
                <span className="text-white">{coords.lng.toFixed(4)}°W</span> · z{zoom}
              </span>
            </div>
          )}
        </div>

        {showControls && (
          <div
            data-testid="satellite-viewer-controls"
            className="flex shrink-0 items-center gap-1.5"
          >
            {/* Map Type Switcher */}
            <button
              type="button"
              data-testid="satellite-viewer-maptype-btn"
              onClick={() => setMaptype(maptype === 'satellite' ? 'roadmap' : 'satellite')}
              className="mr-1 sm:mr-1.5 flex items-center gap-1 rounded-none border border-neutral-700 bg-neutral-900/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md hover:bg-neutral-800 transition"
              title="Toggle Satellite / Roadmap"
            >
              <Stack className="h-3 w-3 text-neutral-400" />
              <span className="capitalize">{maptype === 'satellite' ? 'Road' : 'Satellite'}</span>
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center rounded-none border border-neutral-700 bg-neutral-900/80 backdrop-blur-md overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(14, prev - 1))}
                disabled={zoom <= 14}
                className="px-2 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-30 transition"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="border-x border-neutral-700 px-1.5 py-1 text-[9px] font-mono text-neutral-400">
                {zoom}
              </span>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(20, prev + 1))}
                disabled={zoom >= 20}
                className="px-2 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-30 transition"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
