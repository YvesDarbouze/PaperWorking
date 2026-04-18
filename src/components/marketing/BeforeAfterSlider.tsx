'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export default function BeforeAfterSlider({ beforeImage, afterImage }: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = x - rect.left;
    const percentage = (relativeX / rect.width) * 100;
    
    setSliderPos(Math.min(Math.max(percentage, 0), 100));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden cursor-ew-resize group shadow-2xl"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      {/* Before Image (Background) */}
      <img 
        src={beforeImage} 
        alt="Before"
        className="absolute inset-0 w-full h-full object-cover grayscale"
      />
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-widest z-10">
        Before: Distressed
      </div>

      {/* After Image (Top Layer) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
          src={afterImage} 
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPos / 100)}%` }} // Maintain aspect ratio when clipped
        />
        <div className="absolute top-4 left-4 bg-emerald-500/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-widest whitespace-nowrap z-10">
          After: Institutional Exit
        </div>
      </div>

      {/* Slider Bar */}
      <div 
        className="absolute top-0 bottom-0 w-[2px] bg-white z-20 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
          <div className="flex space-x-0.5">
            <div className="w-[1.5px] h-3 bg-gray-400" />
            <div className="w-[1.5px] h-3 bg-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
