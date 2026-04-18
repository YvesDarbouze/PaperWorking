'use client';

import React, { useState } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';

interface PropertyMediaGalleryProps {
  photos: string[];
  matterportUrl?: string; // e.g. https://my.matterport.com/show/?m=XXXXXXXX
}

/**
 * 4K Property Media Gallery
 * Supports immersive full-screen photography and Matterport 3D embeds.
 */
const PropertyMediaGallery: React.FC<PropertyMediaGalleryProps> = ({ 
  photos, 
  matterportUrl 
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [show3D, setShow3D] = useState(false);

  const next = () => setActiveIndex((prev) => (prev + 1) % photos.length);
  const prev = () => setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-[100] bg-black' : 'rounded-2xl overflow-hidden shadow-2xl bg-gray-900 aspect-video'}`}>
      
      {/* ── Main Media Display ── */}
      <div className="relative w-full h-full flex items-center justify-center">
        {show3D && matterportUrl ? (
          <iframe 
            src={matterportUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="xr-spatial-tracking"
          />
        ) : (
          <img 
            src={photos[activeIndex]} 
            alt={`Property view ${activeIndex + 1}`}
            className="w-full h-full object-cover select-none"
          />
        )}

        {/* ── Overlays ── */}
        <div className="absolute top-6 right-6 flex items-center space-x-3">
          {matterportUrl && (
            <button 
              onClick={() => setShow3D(!show3D)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs tracking-widest uppercase transition-all shadow-lg ${
                show3D ? 'bg-indigo-600 text-white' : 'bg-white/90 text-gray-900 hover:bg-white'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>{show3D ? 'View Photos' : '3D Matterport Walkthrough'}</span>
            </button>
          )}
          
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-md border border-white/20"
          >
            {isFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>

        {!show3D && (
          <>
            <button 
              onClick={prev}
              className="absolute left-6 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all backdrop-blur-sm group"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button 
              onClick={next}
              className="absolute right-6 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all backdrop-blur-sm group"
            >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        )}
      </div>

      {/* ── Lower HUD (Thumbnails & Counter) ── */}
      {!isFullscreen && !show3D && (
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-[70%] no-scrollbar">
            {photos.map((url, i) => (
              <button 
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  activeIndex === i ? 'border-indigo-500 scale-105 shadow-lg' : 'border-transparent opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                }`}
              >
                <img src={url} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <span className="text-white text-xs font-bold tracking-[0.2em]">
              {activeIndex + 1} <span className="text-white/40">/</span> {photos.length} 4K ASSETS
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyMediaGallery;
