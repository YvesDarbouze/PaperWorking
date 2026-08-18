'use client';

import React, { useState } from 'react';
import { X, Compass } from 'lucide-react';
import DealMap, { EntityCategory, MapPinData } from './DealMap';
import type { DealListingTeaser } from '@/types/listing';

interface MarketplaceMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals?: DealListingTeaser[];
  initialCategory?: EntityCategory;
  initialZip?: string;
}

export function MarketplaceMapModal({
  isOpen,
  onClose,
  deals = [],
  initialCategory: _initialCategory = 'all',
  initialZip: _initialZip = '',
}: MarketplaceMapModalProps) {
  const [_selectedPin, setSelectedPin] = useState<MapPinData | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[85vh] bg-[#121014] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161419]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Marketplace Live Visual Search
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                  Global Map
                </span>
              </h2>
              <p className="text-xs text-[#627C85]">
                Locate project deals, active local vendors, and co-investors worldwide.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#627C85] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Map Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Live Map Canvas */}
        <div className="flex-1 w-full relative overflow-hidden">
          <DealMap
            deals={deals}
            height="100%"
            enableControls={true}
            onSelectPin={(pin) => setSelectedPin(pin)}
          />
        </div>
      </div>
    </div>
  );
}
