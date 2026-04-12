'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface FeatureTooltipProps {
  text: string;
}

/**
 * FeatureTooltip
 *
 * Clean info icon that shows a tooltip on hover (desktop) or tap (mobile).
 * Auto-positions above or below depending on viewport space.
 */
export default function FeatureTooltip({ text }: FeatureTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click (for mobile tap-to-open)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-phase-2 hover:text-phase-4 transition-colors focus:outline-none"
        aria-label="More info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip Bubble */}
      <div
        className={`
          absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
          bg-phase-4 text-white text-xs leading-relaxed
          px-3 py-2 w-52 shadow-lg
          transition-all duration-200 ease-out pointer-events-none
          ${open
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-1'
          }
        `}
      >
        {text}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
          <div className="w-2 h-2 bg-phase-4 rotate-45" />
        </div>
      </div>
    </div>
  );
}
