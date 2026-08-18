import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, ImageOff } from 'lucide-react';

interface StreetViewHeaderProps {
  address: string;
  lat?: number;
  lng?: number;
  streetViewUrl?: string | null;
  fallbackImage?: string;
  height?: number;
}

export function StreetViewHeader({
  address,
  lat,
  lng,
  streetViewUrl,
  fallbackImage = '/images/deal-placeholder.jpg',
  height = 300,
}: StreetViewHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const displayUrl = streetViewUrl && !imageError ? streetViewUrl : fallbackImage;
  const hasStreetView = !!streetViewUrl && !imageError;

  return (
    <div 
      className="relative w-full overflow-hidden rounded-t-xl bg-slate-800"
      style={{ height }}
    >
      {/* Image */}
      <Image
        src={displayUrl}
        alt={`Street view of ${address}`}
        fill
        className={`
          object-cover transition-opacity duration-500
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        priority
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-slate-700" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />

      {/* Address badge */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4 text-[#34d399]" />
          <span className="text-sm font-medium truncate">{address}</span>
        </div>
        {hasStreetView && (
          <span className="mt-1 inline-flex items-center text-xs text-slate-400">
            <ImageOff className="w-3 h-3 mr-1" />
            Street View
          </span>
        )}
      </div>

      {/* No street view indicator */}
      {!hasStreetView && !isLoading && (
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 text-xs bg-slate-900/80 text-slate-400 rounded-full">
            No Street View Available
          </span>
        </div>
      )}
    </div>
  );
}
