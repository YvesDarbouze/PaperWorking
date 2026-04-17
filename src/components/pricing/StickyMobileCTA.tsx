'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface StickyMobileCTAProps {
  visible: boolean;
  planName: string;
  price: string;
  onSelect: () => void;
}

/**
 * StickyMobileCTA
 *
 * Fixed footer bar visible only on mobile (md:hidden) once user
 * scrolls past the main pricing cards. Triggers the checkout overlay
 * for the recommended (anchored) plan.
 */
export default function StickyMobileCTA({ visible, planName, price, onSelect }: StickyMobileCTAProps) {
  return (
    <div
      className={`
        fixed bottom-0 inset-x-0 z-50 md:hidden
        bg-white/95 backdrop-blur-md border-t border-phase-1 shadow-2xl
        transition-all duration-300 ease-out
        ${visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none'
        }
      `}
    >
      <div className="flex items-center justify-between px-5 py-3.5 max-w-lg mx-auto">
        {/* Plan Info */}
        <div className="min-w-0 mr-4">
          <p className="text-xs font-bold uppercase tracking-widest text-phase-2 truncate">
            Recommended
          </p>
          <p className="text-sm font-semibold text-phase-4 truncate">
            {planName} · <span className="font-light">{price}</span>
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onSelect}
          className="flex-shrink-0 flex items-center bg-black text-white text-sm font-medium px-5 py-2.5 hover:bg-phase-4 transition active:scale-95"
        >
          Sign Up <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </button>
      </div>
    </div>
  );
}
