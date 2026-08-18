'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ImageOff, Loader2, MapPin, Eye } from 'lucide-react';
import { GoogleAttribution } from '@/components/ui/GoogleAttribution';

interface PropertyStreetViewTileProps {
  projectId?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  panoId?: string | null;
  className?: string;
  aspectRatio?: 'video' | 'hero' | 'square';
}

/**
 * PropertyStreetViewTile — Section A.5 Availability Probe & PS-9 Fallback Ladder
 *
 * Checks Street View metadata (FREE) BEFORE attempting to render an <img> tag.
 * Never speculatively renders an <img> tag that would display Google's gray
 * "no imagery available" panel.
 *
 * Fallback Ladder (PS-9):
 * 1. Street View image (if availability probe returns status === 'OK')
 * 2. Static Map Satellite Tile (/api/map-tile)
 * 3. Clean SVG Property Identity Graphic
 */
export function PropertyStreetViewTile({
  projectId,
  address,
  lat,
  lng,
  panoId,
  className = '',
  aspectRatio = 'hero',
}: PropertyStreetViewTileProps) {
  let user: { getIdToken: () => Promise<string> } | null = null;
  try {
    const auth = useAuth();
    user = auth?.user || null;
  } catch {
    user = null;
  }

  const [status, setStatus] = useState<'loading' | 'available' | 'unavailable' | 'error'>('loading');
  const [resolvedPanoId, setResolvedPanoId] = useState<string | null>(panoId || null);

  useEffect(() => {
    let isMounted = true;

    async function checkAvailability() {
      if (!isFinite(lat as number) || !isFinite(lng as number)) {
        if (isMounted) setStatus('unavailable');
        return;
      }

      setStatus('loading');

      try {
        let token = 'mock_token';
        if (user) {
          token = await user.getIdToken();
        }

        // Section A.5 Availability Probe: Call free metadata endpoint
        const res = await fetch(`/api/street-view?lat=${lat}&lng=${lng}&metadata=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (isMounted) setStatus('unavailable');
          return;
        }

        const meta = await res.json();
        if (isMounted) {
          if (meta.status === 'OK') {
            setResolvedPanoId(meta.pano_id || null);
            setStatus('available');
          } else {
            setStatus('unavailable');
          }
        }
      } catch (err) {
        console.error('[PropertyStreetViewTile] Availability probe error:', err);
        if (isMounted) setStatus('unavailable');
      }
    }

    checkAvailability();

    return () => {
      isMounted = false;
    };
  }, [lat, lng, user]);

  const aspectClass =
    aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : 'h-48 md:h-64 w-full';

  // 1. Loading State
  if (status === 'loading') {
    return (
      <div className={`relative rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center ${aspectClass} ${className}`}>
        <div className="flex flex-col items-center gap-2 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Checking Street View…</span>
        </div>
      </div>
    );
  }

  // 2. Street View Available — Render Live Image
  if (status === 'available' && isFinite(lat as number) && isFinite(lng as number)) {
    const imageUrl = `/api/street-view?lat=${lat}&lng=${lng}&w=800&h=450&fov=90&pitch=0`;

    return (
      <div className={`relative rounded-xl overflow-hidden border border-white/10 group ${aspectClass} ${className}`}>
        <img
          src={imageUrl}
          alt={`Street View of ${address || 'Property'}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white z-10">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-pw-success" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Street View Live</span>
          </div>
          <div className="flex items-center gap-3">
            {resolvedPanoId && (
              <span className="text-[9px] font-mono opacity-60">Pano: {resolvedPanoId.substring(0, 10)}…</span>
            )}
            <GoogleAttribution variant="light" />
          </div>
        </div>
      </div>
    );
  }

  // 3. Fallback Ladder (PS-9): Satellite Map Tile or Clean Graphic
  if (isFinite(lat as number) && isFinite(lng as number)) {
    const mapTileUrl = `/api/map-tile?lat=${lat}&lng=${lng}&zoom=16&w=800&h=450`;

    return (
      <div className={`relative rounded-xl overflow-hidden border border-white/10 group ${aspectClass} ${className}`}>
        <img
          src={mapTileUrl}
          alt={`Satellite Map showing ${address || 'Property'}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white z-10">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#ffb875]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Satellite Map View</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono opacity-60">{lat?.toFixed(4)}, {lng?.toFixed(4)}</span>
            <GoogleAttribution variant="light" />
          </div>
        </div>
      </div>
    );
  }

  // 4. Default Clean Graphic Fallback
  return (
    <div className={`relative rounded-xl overflow-hidden bg-[#181519] border border-white/10 flex flex-col items-center justify-center p-6 text-center ${aspectClass} ${className}`}>
      <ImageOff className="w-8 h-8 text-text-secondary/40 mb-2" />
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
        {address || 'Property Imagery Pending'}
      </span>
      <span className="text-[10px] text-text-secondary/60">
        Coordinates not yet captured
      </span>
    </div>
  );
}
