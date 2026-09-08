'use client';

import { useState, useEffect } from 'react';
import { getCachedGeocode } from './geocode-cache';

export type PropertyImageTier = 'curated' | 'street-view' | 'map-tile' | 'placeholder';

export interface PropertyImageInput {
  id?: string;
  imageUrl?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PropertyImageResult {
  url: string | null;
  tier: PropertyImageTier;
}

// In-memory cache for resolved property images
const resolvedImageCache = new Map<string, PropertyImageResult>();

export function clearPropertyImageCache(): void {
  resolvedImageCache.clear();
}

/**
 * Computes great-circle distance between two coordinates in meters using Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function buildStreetViewUrl(lat: number, lng: number, w = 800, h = 450): string {
  return `/api/street-view?lat=${lat}&lng=${lng}&w=${w}&h=${h}`;
}

export function buildMapTileUrl(lat: number, lng: number, zoom = 17, w = 800, h = 450): string {
  return `/api/map-tile?lat=${lat}&lng=${lng}&zoom=${zoom}&w=${w}&h=${h}`;
}

/**
 * Checks Street View availability via metadata endpoint.
 * Returns true only if status === 'OK' and nearest panorama is within maxDistanceMeters (default 50m).
 */
export async function checkStreetViewAvailable(
  lat: number,
  lng: number,
  maxDistanceMeters = 50,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/street-view?lat=${lat}&lng=${lng}&metadata=true`);
    if (!res.ok) return false;
    const meta = (await res.json()) as {
      status?: string;
      location?: { lat?: number; lng?: number };
    };

    if (meta.status !== 'OK') return false;

    if (meta.location?.lat != null && meta.location?.lng != null) {
      const distance = calculateHaversineDistance(lat, lng, meta.location.lat, meta.location.lng);
      return distance <= maxDistanceMeters;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the 4-tier property imagery fallback chain:
 * Tier 1: Curated listing photo
 * Tier 2: Google Street View Static (with metadata check)
 * Tier 3: Google Maps Static tile
 * Tier 4: Placeholder (null)
 */
export async function resolvePropertyImage(
  input: PropertyImageInput,
  options?: { skipCurated?: boolean; skipStreetView?: boolean; skipMapTile?: boolean },
): Promise<PropertyImageResult> {
  const cacheKey = `${input.id || ''}:${input.imageUrl || ''}:${input.address || ''}:${input.lat || ''}:${input.lng || ''}`;
  if (resolvedImageCache.has(cacheKey) && !options?.skipCurated && !options?.skipStreetView) {
    return resolvedImageCache.get(cacheKey)!;
  }

  // Tier 1: Curated listing photo
  if (!options?.skipCurated && input.imageUrl && input.imageUrl.trim()) {
    const result: PropertyImageResult = { url: input.imageUrl.trim(), tier: 'curated' };
    resolvedImageCache.set(cacheKey, result);
    return result;
  }

  // Determine coordinates
  let lat = input.lat ?? null;
  let lng = input.lng ?? null;

  if ((lat == null || lng == null) && input.address) {
    const cached = await getCachedGeocode(input.address);
    if (cached) {
      lat = cached.lat;
      lng = cached.lng;
    } else {
      try {
        const res = await fetch(`/api/places/geocode?address=${encodeURIComponent(input.address)}`);
        if (res.ok) {
          const geo = (await res.json()) as { lat?: number | null; lng?: number | null };
          if (geo.lat != null && geo.lng != null) {
            lat = geo.lat;
            lng = geo.lng;
          }
        }
      } catch {
        // Geocode network error, fall through to placeholder
      }
    }
  }

  // If coordinates are valid, try Tier 2 and Tier 3
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    // Tier 2: Street View Static
    if (!options?.skipStreetView) {
      const isAvailable = await checkStreetViewAvailable(lat, lng);
      if (isAvailable) {
        const result: PropertyImageResult = {
          url: buildStreetViewUrl(lat, lng),
          tier: 'street-view',
        };
        resolvedImageCache.set(cacheKey, result);
        return result;
      }
    }

    // Tier 3: Maps Static tile
    if (!options?.skipMapTile) {
      const result: PropertyImageResult = {
        url: buildMapTileUrl(lat, lng),
        tier: 'map-tile',
      };
      resolvedImageCache.set(cacheKey, result);
      return result;
    }
  }

  // Tier 4: Placeholder
  const result: PropertyImageResult = { url: null, tier: 'placeholder' };
  resolvedImageCache.set(cacheKey, result);
  return result;
}

/**
 * Hook for consuming the 4-tier property imagery fallback chain in components.
 */
export function usePropertyImage(input: PropertyImageInput) {
  const [currentResult, setCurrentResult] = useState<PropertyImageResult>(() => {
    if (input.imageUrl && input.imageUrl.trim()) {
      return { url: input.imageUrl.trim(), tier: 'curated' };
    }
    return { url: null, tier: 'placeholder' };
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (input.imageUrl && input.imageUrl.trim()) {
      setCurrentResult({ url: input.imageUrl.trim(), tier: 'curated' });
      return;
    }

    setLoading(true);
    resolvePropertyImage(input)
      .then((res) => {
        if (active) {
          setCurrentResult(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setCurrentResult({ url: null, tier: 'placeholder' });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [input.id, input.imageUrl, input.address, input.lat, input.lng]);

  const handleImageError = () => {
    if (currentResult.tier === 'curated') {
      // Step down to Tier 2 (or 3)
      resolvePropertyImage(input, { skipCurated: true }).then((res) => {
        setCurrentResult(res);
      });
    } else if (currentResult.tier === 'street-view') {
      // Step down to Tier 3 (Maps Static)
      resolvePropertyImage(input, { skipCurated: true, skipStreetView: true }).then((res) => {
        setCurrentResult(res);
      });
    } else if (currentResult.tier === 'map-tile') {
      // Step down to Tier 4 placeholder
      setCurrentResult({ url: null, tier: 'placeholder' });
    }
  };

  return {
    imageUrl: currentResult.url,
    tier: currentResult.tier,
    loading,
    handleImageError,
  };
}
