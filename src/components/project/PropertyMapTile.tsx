'use client';

/**
 * PropertyMapTile
 *
 * Renders the project's real map location (from Postgres via /api/reil/projects/:id),
 * displayed as a Google Static Maps image proxied through /api/map-tile.
 *
 * Fallback hierarchy:
 *   1. Coordinates available → real static map image with a brand-coloured pin
 *   2. Coordinates absent → honest state: address text + link to complete the address step
 *   3. No address at all → prompt to complete the address step
 *
 * The animated SVG grid placeholder is intentionally NOT rendered here.
 * Design token: PHASE_COLOR is passed as a prop so this component is reusable
 * across phases.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface PropertyMapTileProps {
  projectId:   string;
  address?:    string;
  phaseColor?: string;
}

interface CoordState {
  status: 'loading' | 'ready' | 'no-coords' | 'error';
  lat?:   number;
  lng?:   number;
}

export function PropertyMapTile({
  projectId,
  address,
  phaseColor = '#7A9EAA',
}: PropertyMapTileProps) {
  const { user } = useAuth();
  const [coords, setCoords] = useState<CoordState>({ status: 'loading' });

  useEffect(() => {
    if (!projectId || !user) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await user.getIdToken();
        const res   = await fetch(`/api/reil/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache:   'no-store',
        });

        if (cancelled) return;

        if (!res.ok) {
          setCoords({ status: 'error' });
          return;
        }

        const data = await res.json();
        const lat  = typeof data.lat === 'number' ? data.lat : null;
        const lng  = typeof data.lng === 'number' ? data.lng : null;

        if (lat != null && lng != null) {
          setCoords({ status: 'ready', lat, lng });
        } else {
          setCoords({ status: 'no-coords' });
        }
      } catch {
        if (!cancelled) setCoords({ status: 'error' });
      }
    })();

    return () => { cancelled = true; };
  }, [projectId, user]);

  /* ── Loading skeleton ── */
  if (coords.status === 'loading') {
    return (
      <div
        className="relative h-32 overflow-hidden rounded-2xl border border-white/10 shadow-lg flex items-center justify-center"
        style={{ background: 'rgba(13,10,11,0.6)' }}
      >
        <span
          className="material-symbols-outlined text-[20px] animate-spin"
          style={{ color: `${phaseColor}80`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  /* ── Real map ── */
  if (coords.status === 'ready' && coords.lat != null && coords.lng != null) {
    const src = `/api/map-tile?lat=${coords.lat}&lng=${coords.lng}&zoom=15&w=640&h=256`;

    return (
      <div
        className="relative h-32 overflow-hidden rounded-2xl border shadow-lg group"
        style={{ borderColor: `${phaseColor}30` }}
      >
        {/* Static map image — fills the tile */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Map showing ${address ?? 'property location'}`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Gradient overlay — keeps bottom text readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Address callout */}
        <div className="absolute bottom-3 left-4 right-4 flex flex-col gap-0.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">
            Property Location
          </span>
          {address && (
            <span className="text-xs font-semibold text-white truncate" title={address}>
              {address}
            </span>
          )}
        </div>

        {/* Coordinates pill — top-right corner */}
        <div
          className="absolute top-2.5 right-3 px-2 py-0.5 rounded text-[9px] font-mono tabular-nums text-white/70"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </div>
      </div>
    );
  }

  /* ── No coordinates / honest fallback ── */
  const hasAddress = Boolean(address?.trim());

  return (
    <div
      className="relative h-32 overflow-hidden rounded-2xl border border-white/10 shadow-lg flex flex-col items-center justify-center gap-2 px-4 text-center"
      style={{ background: 'rgba(13,10,11,0.6)' }}
    >
      <span
        className="material-symbols-outlined text-[28px]"
        style={{ color: `${phaseColor}60`, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
      >
        location_off
      </span>

      {hasAddress ? (
        <>
          <p className="text-xs font-semibold text-white/70">{address}</p>
          <p className="text-[10px] text-white/40 leading-snug max-w-[200px]">
            location not geocoded. Map coordinates not yet captured. Complete details to pin property.
          </p>
        </>
      ) : (
        <p className="text-[10px] text-white/40 leading-snug max-w-[200px]">
          location not geocoded. No address on record. Enter an address in Phase 1 to activate mapping.
        </p>
      )}
    </div>
  );
}
