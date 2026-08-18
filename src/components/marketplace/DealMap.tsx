'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { DealListingTeaser, SubscriberPropertyResult } from '@/types/listing';
import { GoogleAttribution } from '@/components/ui/GoogleAttribution';
import { resolveLocation, getDeterministicCoordinates } from '@/lib/utils/geoLookup';

declare global {
  interface Window {
    google?: any;
  }
}

declare const google: any;

export type EntityCategory = 'all' | 'deals' | 'vendors' | 'investors';

export interface VendorMapItem {
  id: string;
  name: string;
  category: string;
  location: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

export interface InvestorMapItem {
  id: string;
  name: string;
  role: string;
  location: string;
  followersCount?: number;
  latitude?: number;
  longitude?: number;
}

interface DealMapProps {
  deals?: DealListingTeaser[];
  properties?: SubscriberPropertyResult[];
  vendors?: VendorMapItem[];
  investors?: InvestorMapItem[];
  center?: { lat: number; lng: number };
  zoom?: number;
  customMarker?: { lat: number; lng: number; title: string };
  height?: string;
  enableControls?: boolean;
  onSelectPin?: (pin: MapPinData) => void;
}

export interface MapPinData {
  id: string;
  entityType: 'deal' | 'vendor' | 'investor';
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  price?: number | string;
  capRate?: number | string;
  rating?: number;
  category?: string;
  routeUrl?: string;
  isCustom?: boolean;
}

// Marker Color Map per PaperWorking Monochromatic Design System
const ENTITY_MARKER_STYLES = {
  deal: {
    fillColor: '#10B981', // Emerald / Mint Green for Deals
    strokeColor: '#34D399',
    label: 'Deal',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
  vendor: {
    fillColor: '#0EA5E9', // Sky Blue for Vendors
    strokeColor: '#38BDF8',
    label: 'Vendor',
    badgeClass: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  },
  investor: {
    fillColor: '#A855F7', // Violet / Purple for Investors
    strokeColor: '#C084FC',
    label: 'Investor',
    badgeClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  },
  custom: {
    fillColor: '#E11D48',
    strokeColor: '#FB7185',
    label: 'Search Target',
    badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  },
};

export default function DealMap({
  deals = [],
  properties = [],
  vendors = [],
  investors = [],
  center,
  zoom,
  customMarker,
  height = '520px',
  enableControls = true,
  onSelectPin,
}: DealMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Search & Filter state
  const [activeFilter, setActiveFilter] = useState<EntityCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPinData | null>(null);

  // Default sample vendors & investors if none passed in, ensuring map always pops with rich visual data
  const defaultVendors: VendorMapItem[] = useMemo(() => [
    { id: 'v-1', name: 'ProBuild Contractors', category: 'Contractor', location: 'Chicago, IL', rating: 4.8, latitude: 41.8781, longitude: -87.6298 },
    { id: 'v-2', name: 'Prime Structural Inspections', category: 'Inspector', location: 'Memphis, TN', rating: 4.9, latitude: 35.1495, longitude: -90.0490 },
    { id: 'v-3', name: 'Capital Bridge Lending', category: 'Lender', location: 'Atlanta, GA', rating: 4.7, latitude: 33.7490, longitude: -84.3880 },
    { id: 'v-4', name: 'Coastal Title & Escrow', category: 'Attorney', location: 'Indianapolis, IN', rating: 4.9, latitude: 39.7684, longitude: -86.1581 },
    { id: 'v-5', name: 'Premier Property Group', category: 'Property Manager', location: 'Dallas, TX', rating: 4.6, latitude: 32.7767, longitude: -96.7970 },
  ], []);

  const defaultInvestors: InvestorMapItem[] = useMemo(() => [
    { id: 'i-1', name: 'Deshawn Carter', role: 'Lead Investor', location: 'Miami, FL', followersCount: 14, latitude: 25.7617, longitude: -80.1918 },
    { id: 'i-2', name: 'Luminous Capital Group', role: 'Institutional Partner', location: 'New York, NY', followersCount: 42, latitude: 40.7128, longitude: -74.0060 },
    { id: 'i-3', name: 'Apex Real Estate Fund', role: 'Co-Investor', location: 'Los Angeles, CA', followersCount: 29, latitude: 34.0522, longitude: -118.2437 },
  ], []);

  const _effectiveVendors = vendors.length > 0 ? vendors : defaultVendors;
  const _effectiveInvestors = investors.length > 0 ? investors : defaultInvestors;

  // Combine deals, properties, vendors, and investors into unified mapPins
  const allMapPins: MapPinData[] = useMemo(() => {
    const pins: MapPinData[] = [];

    // 1. Add deal teasers strictly with valid lat & lng
    deals.forEach((d) => {
      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        const item = d as unknown as Record<string, unknown>;
        pins.push({
          id: `deal_${d.id}`,
          entityType: 'deal',
          lat: d.latitude,
          lng: d.longitude,
          title: d.propertyName || 'Deal Opportunity',
          subtitle: d.neighborhood || `${d.city || ''}, ${d.state || ''}`,
          price: (item.price || item.targetEquity) as number | string | undefined,
          capRate: (item.projectedIRR || item.capRate) as number | string | undefined,
          category: d.assetClass || 'Residential',
          routeUrl: `/dashboard/deals/${d.id.replace('project_listing_', '')}`,
        });
      }
    });

    // 2. Add subscriber grouped property results
    properties.forEach((p) => {
      if (p.coordinates && typeof p.coordinates.lat === 'number' && typeof p.coordinates.lng === 'number') {
        const bestDeal = p.deals[0];
        pins.push({
          id: `prop_${p.placeId || p.canonicalAddress}`,
          entityType: 'deal',
          lat: p.coordinates.lat,
          lng: p.coordinates.lng,
          title: p.canonicalAddress,
          subtitle: `${p.city}, ${p.state} ${p.zipCode}`,
          category: 'Subscriber Listing',
          routeUrl: bestDeal ? `/dashboard/deals/${bestDeal.listing.id}` : undefined,
        });
      }
    });

    // 3. Add Vendors (only if provided with coordinates or valid location)
    vendors.forEach((v) => {
      let lat = v.latitude;
      let lng = v.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        const resolved = resolveLocation(v.location);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
        }
      }

      if (typeof lat === 'number' && typeof lng === 'number') {
        pins.push({
          id: `vendor_${v.id}`,
          entityType: 'vendor',
          lat,
          lng,
          title: v.name,
          subtitle: `${v.category} · ${v.location}`,
          rating: v.rating,
          category: v.category,
          routeUrl: `/dashboard/marketplace?type=${encodeURIComponent(v.category)}`,
        });
      }
    });

    // 4. Add Investors / Accounts (only if provided with coordinates or valid location)
    investors.forEach((inv) => {
      let lat = inv.latitude;
      let lng = inv.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        const resolved = resolveLocation(inv.location);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
        }
      }

      if (typeof lat === 'number' && typeof lng === 'number') {
        pins.push({
          id: `investor_${inv.id}`,
          entityType: 'investor',
          lat,
          lng,
          title: inv.name,
          subtitle: `${inv.role} · ${inv.location}`,
          category: inv.role,
          routeUrl: `/dashboard/team`,
        });
      }
    });

    // 5. Add Custom target marker if provided
    if (customMarker && typeof customMarker.lat === 'number' && typeof customMarker.lng === 'number') {
      pins.push({
        id: 'custom_target_marker',
        entityType: 'deal',
        lat: customMarker.lat,
        lng: customMarker.lng,
        title: customMarker.title,
        subtitle: 'Resolved search area',
        isCustom: true,
      });
    }

    return pins;
  }, [deals, properties, vendors, investors, customMarker]);

  // Filter map pins based on selected entity tab
  const filteredMapPins = useMemo(() => {
    if (activeFilter === 'all') return allMapPins;
    if (activeFilter === 'deals') return allMapPins.filter((p) => p.entityType === 'deal');
    if (activeFilter === 'vendors') return allMapPins.filter((p) => p.entityType === 'vendor');
    if (activeFilter === 'investors') return allMapPins.filter((p) => p.entityType === 'investor');
    return allMapPins;
  }, [allMapPins, activeFilter]);

  // Google Maps SDK Initialization
  useEffect(() => {
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const timeout = setTimeout(() => {
      if (!window.google?.maps) {
        setLoadError(true);
      }
    }, 8000);

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
      setLoadError(true);
      clearTimeout(timeout);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
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

  // Google Maps Instance Setup
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
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4c6168' }] },
    ];

    // Initial center (defaults to United States)
    const initialCenter = searchCenter || center || { lat: 39.8283, lng: -98.5795 };
    const initialZoom = zoom !== undefined ? zoom : searchCenter ? 12 : center ? 10 : 4;

    const map = new google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      styles: monochromaticStyles,
      disableDefaultUI: true,
      zoomControl: true,
      maxZoom: 17,
      minZoom: 3,
    });

    // Create Markers for filtered pins
    const markers = filteredMapPins.map((p) => {
      const style = p.isCustom ? ENTITY_MARKER_STYLES.custom : ENTITY_MARKER_STYLES[p.entityType];

      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        title: `${p.title} (${p.subtitle})`,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: style.fillColor,
          fillOpacity: 0.95,
          strokeColor: style.strokeColor,
          strokeWeight: 2,
          scale: p.isCustom ? 11 : 9,
        },
      });

      marker.addListener('click', () => {
        setSelectedPin(p);
        if (onSelectPin) onSelectPin(p);
      });

      return marker;
    });

    // Auto-fit bounds if searching or multiple pins shown
    if (searchCenter) {
      map.setCenter(searchCenter);
      map.setZoom(12);
    } else if (filteredMapPins.length > 0 && !center) {
      const bounds = new google.maps.LatLngBounds();
      filteredMapPins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds);

      const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
        if (map.getZoom() > 13) map.setZoom(13);
        google.maps.event.removeListener(listener);
      });
    }

    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [mapLoaded, filteredMapPins, center, zoom, searchCenter, onSelectPin]);

  // Handle Zip Code or City Search
  const handleZipSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const resolved = resolveLocation(searchQuery);
    if (resolved) {
      setSearchCenter({ lat: resolved.lat, lng: resolved.lng });
    } else {
      // Fall back to deterministic US coordinates if lookup fails
      const coords = getDeterministicCoordinates(searchQuery);
      setSearchCenter({ lat: coords.lat, lng: coords.lng });
    }
  };

  // SVG Fallback Canvas renderer (when Google Maps API key is not present or offline)
  const renderFallbackMapCanvas = () => {
    return (
      <div className="relative w-full h-full bg-[#121014] flex flex-col justify-between overflow-hidden">
        {/* Monochromatic Grid Pattern Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #627c85 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Map Header Overlay: Entity Filters & Zip Code Search */}
        {enableControls && (
          <div className="relative z-10 p-3.5 flex flex-wrap items-center justify-between gap-3 bg-[#121014]/90 backdrop-blur-md border-b border-white/10">
            {/* Entity Filter Buttons */}
            <div className="flex items-center gap-1.5">
              {(['all', 'deals', 'vendors', 'investors'] as EntityCategory[]).map((cat) => {
                const isActive = activeFilter === cat;
                const label = cat === 'all' ? 'All Entities' : cat === 'deals' ? 'Project Deals' : cat === 'vendors' ? 'Vendors' : 'Investors';
                const badgeStyle = cat === 'deals' ? ENTITY_MARKER_STYLES.deal : cat === 'vendors' ? ENTITY_MARKER_STYLES.vendor : cat === 'investors' ? ENTITY_MARKER_STYLES.investor : null;

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    style={{
                      background: isActive ? (badgeStyle ? badgeStyle.fillColor + '20' : 'rgba(98,124,133,0.2)') : 'transparent',
                      color: isActive ? (badgeStyle ? badgeStyle.fillColor : '#FDFFFC') : '#627C85',
                      border: isActive ? `1px solid ${badgeStyle ? badgeStyle.fillColor : '#627C85'}` : '1px solid transparent',
                    }}
                  >
                    {badgeStyle && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: badgeStyle.fillColor }} />}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Zip Code / Location Search Input */}
            <form onSubmit={handleZipSearch} className="flex items-center gap-2 max-w-xs w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#627C85]" />
                <input
                  type="text"
                  placeholder="Enter Zip Code or City (e.g. 38103)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#627C85] focus:outline-none focus:border-[#627C85] transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#627C85]/20 border border-[#627C85]/40 text-[#FDFFFC] hover:bg-[#627C85]/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Interactive SVG Monochromatic Map Representation */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center p-6 min-h-[300px]">
          {/* Stylized US Outline & Regional Nodes */}
          <svg className="w-full h-full max-h-[360px] opacity-40 text-[#627c85]" viewBox="0 0 1000 600" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M150,150 L250,120 L350,140 L500,100 L700,120 L850,150 L900,250 L880,400 L800,480 L650,450 L500,500 L350,480 L200,400 L120,300 Z" strokeDasharray="4 4" fill="rgba(98,124,133,0.03)" />
            {/* Major State Line Dividers */}
            <line x1="350" y1="140" x2="350" y2="480" stroke="rgba(255,255,255,0.05)" />
            <line x1="650" y1="120" x2="650" y2="450" stroke="rgba(255,255,255,0.05)" />
            <line x1="200" y1="280" x2="880" y2="280" stroke="rgba(255,255,255,0.05)" />
          </svg>

          {/* Render Pin Elements on Monochromatic Canvas */}
          <div className="absolute inset-0 p-8 flex flex-wrap items-center justify-around overflow-hidden">
            {filteredMapPins.map((pin, _idx) => {
              const style = ENTITY_MARKER_STYLES[pin.entityType];
              const isSelected = selectedPin?.id === pin.id;

              return (
                <div
                  key={pin.id}
                  onClick={() => {
                    setSelectedPin(pin);
                    if (onSelectPin) onSelectPin(pin);
                  }}
                  className="group relative cursor-pointer transition-all duration-200 hover:scale-125 z-20 m-4"
                >
                  {/* Pin Dot */}
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shadow-lg transition-transform"
                    style={{
                      backgroundColor: style.fillColor,
                      boxShadow: `0 0 12px ${style.fillColor}80`,
                      border: `2px solid ${style.strokeColor}`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>

                  {/* Pin Hover/Selected Badge */}
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-[#121014] border text-[10px] whitespace-nowrap shadow-xl transition-all ${
                      isSelected ? 'opacity-100 scale-100 z-30' : 'opacity-80 group-hover:opacity-100'
                    }`}
                    style={{ borderColor: style.strokeColor }}
                  >
                    <p className="font-bold text-white leading-tight">{pin.title}</p>
                    <p className="text-[9px] text-[#627C85]">{pin.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Pin Drawer / Info Card */}
        {selectedPin && (
          <div className="absolute bottom-4 left-4 right-4 z-30 max-w-md mx-auto bg-[#161419]/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${ENTITY_MARKER_STYLES[selectedPin.entityType].badgeClass}`}>
                  {ENTITY_MARKER_STYLES[selectedPin.entityType].label}
                </span>
                <h4 className="text-sm font-bold text-white mt-1">{selectedPin.title}</h4>
                <p className="text-xs text-[#627C85]">{selectedPin.subtitle}</p>
              </div>
              <button onClick={() => setSelectedPin(null)} className="p-1 text-[#627C85] hover:text-white rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metadata */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              {selectedPin.price && (
                <div>
                  <span className="text-[10px] text-[#627C85]">Price: </span>
                  <span className="font-bold text-white">${selectedPin.price.toLocaleString()}</span>
                </div>
              )}
              {selectedPin.capRate && (
                <div>
                  <span className="text-[10px] text-[#627C85]">IRR/Cap: </span>
                  <span className="font-bold text-emerald-400">{selectedPin.capRate}%</span>
                </div>
              )}
              {selectedPin.rating && (
                <div>
                  <span className="text-[10px] text-[#627C85]">Rating: </span>
                  <span className="font-bold text-amber-400">★ {selectedPin.rating}</span>
                </div>
              )}
              {selectedPin.routeUrl && (
                <button
                  onClick={() => router.push(selectedPin.routeUrl!)}
                  className="px-3 py-1 bg-[#627C85] text-white hover:bg-[#627C85]/80 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ml-auto"
                >
                  View Details →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer info strip */}
        <div className="p-3 bg-[#121014] border-t border-white/5 flex items-center justify-between text-[10px] text-[#627C85]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Deals ({allMapPins.filter(p => p.entityType === 'deal').length})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" /> Vendors ({allMapPins.filter(p => p.entityType === 'vendor').length})</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Investors ({allMapPins.filter(p => p.entityType === 'investor').length})</span>
          </div>
          <GoogleAttribution variant="light" />
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#121014] shadow-2xl flex flex-col"
      style={{ height }}
    >
      {/* Search Header Overlay for Google Maps mode */}
      {enableControls && mapLoaded && !loadError && (
        <div className="absolute top-3 left-3 right-3 z-10 p-2.5 flex flex-wrap items-center justify-between gap-2.5 bg-[#121014]/85 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl">
          {/* Entity Filter Pills */}
          <div className="flex items-center gap-1.5">
            {(['all', 'deals', 'vendors', 'investors'] as EntityCategory[]).map((cat) => {
              const isActive = activeFilter === cat;
              const label = cat === 'all' ? 'All' : cat === 'deals' ? 'Deals' : cat === 'vendors' ? 'Vendors' : 'Investors';
              const style = cat === 'deals' ? ENTITY_MARKER_STYLES.deal : cat === 'vendors' ? ENTITY_MARKER_STYLES.vendor : cat === 'investors' ? ENTITY_MARKER_STYLES.investor : null;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  style={{
                    background: isActive ? (style ? style.fillColor + '25' : 'rgba(98,124,133,0.25)') : 'rgba(255,255,255,0.03)',
                    color: isActive ? (style ? style.fillColor : '#FDFFFC') : '#627C85',
                    border: isActive ? `1px solid ${style ? style.fillColor : '#627C85'}` : '1px solid border-white/5',
                  }}
                >
                  {style && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.fillColor }} />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Zip Code Search */}
          <form onSubmit={handleZipSearch} className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#627C85]" />
              <input
                type="text"
                placeholder="Zip Code / Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1 text-[11px] bg-white/5 border border-white/10 rounded-md text-white placeholder-[#627C85] focus:outline-none focus:border-[#627C85] w-40"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#627C85]/20 border border-[#627C85]/40 text-white rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-[#627C85]/40 transition-colors"
            >
              Zoom
            </button>
          </form>
        </div>
      )}

      {/* Main Google Maps Canvas or Monochromatic Fallback Canvas */}
      {!loadError && mapLoaded ? (
        <div ref={mapRef} className="w-full h-full" />
      ) : (
        renderFallbackMapCanvas()
      )}

      {/* Google Attribution if map loaded */}
      {mapLoaded && !loadError && (
        <div className="absolute bottom-3 left-3 z-10">
          <GoogleAttribution variant="light" />
        </div>
      )}
    </div>
  );
}
