'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Plus, Eye, ShieldAlert } from 'lucide-react';
import DealCard from '@/components/deals/DealCard';

interface AddressPrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullAddress: string;
}

export interface CollisionDealItem {
  id: string;
  slug: string;
  address: string;
  propertyName?: string;
  assetClass?: string;
  subStrategy?: string;
  status?: string;
  purchasePrice: number;
  arv?: number;
  projectedRoi: number;
  committedAmount?: number;
  fundingTarget?: number;
  createdAt?: string;
}

interface AddressSearchProps {
  onSearchSubmit?: (address: string) => void;
  onListDealClick?: () => void;
  placeholder?: string;
  className?: string;
}

const MOCK_PREDICTIONS: AddressPrediction[] = [
  {
    placeId: 'place_1',
    mainText: '123 Main St',
    secondaryText: 'Austin, TX 78701',
    fullAddress: '123 Main St, Austin, TX 78701',
  },
  {
    placeId: 'place_2',
    mainText: '456 Oak Ave',
    secondaryText: 'Dallas, TX 75201',
    fullAddress: '456 Oak Ave, Dallas, TX 75201',
  },
  {
    placeId: 'place_3',
    mainText: '789 Pine St',
    secondaryText: 'Houston, TX 77002',
    fullAddress: '789 Pine St, Houston, TX 77002',
  },
];

export default function AddressSearch({
  onSearchSubmit,
  onListDealClick,
  placeholder = 'Search any property address to find or create a deal...',
  className = '',
}: AddressSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Collision Modal State
  const [collisionDeal, setCollisionDeal] = useState<CollisionDealItem | null>(null);
  const [collisionSlug, setCollisionSlug] = useState<string>('');
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search logic (300ms)
  useEffect(() => {
    if (!query.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      const filtered = MOCK_PREDICTIONS.filter(
        (p) =>
          p.fullAddress.toLowerCase().includes(query.toLowerCase()) ||
          p.mainText.toLowerCase().includes(query.toLowerCase())
      );

      setPredictions(
        filtered.length > 0
          ? filtered
          : [
              {
                placeId: `custom_${Date.now()}`,
                mainText: query,
                secondaryText: 'Custom Address Search',
                fullAddress: query,
              },
            ]
      );
      setIsLoading(false);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAddress = async (fullAddress: string) => {
    setIsOpen(false);
    setQuery(fullAddress);

    const slug = fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      const res = await fetch(`/api/deals/exists?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (data.exists && data.deal && (data.deal.status === 'published' || data.deal.status === 'funding')) {
        const previewItem: CollisionDealItem = {
          id: data.deal.id,
          slug: data.deal.slug,
          propertyName: data.deal.name,
          address: data.deal.address,
          assetClass: data.deal.assetClass || 'Multi-family',
          subStrategy: data.deal.subStrategy || 'FLIP',
          status: data.deal.status,
          purchasePrice: data.deal.price,
          arv: data.deal.price * 1.3,
          projectedRoi: data.deal.roi,
          committedAmount: data.deal.committed,
          fundingTarget: data.deal.target,
          createdAt: new Date().toISOString(),
        };

        setCollisionDeal(previewItem);
        setCollisionSlug(slug);
        setIsCollisionModalOpen(true);
        return;
      }
    } catch {
      // Direct navigation on fetch failure
    }

    if (onSearchSubmit) onSearchSubmit(fullAddress);
    router.push(`/deals/${slug}`);
  };

  const handleNavigateToDetail = () => {
    setIsCollisionModalOpen(false);
    if (collisionSlug) {
      router.push(`/deals/${collisionSlug}/detail`);
    }
  };

  const handleCreateAnyway = () => {
    setIsCollisionModalOpen(false);
    if (collisionSlug) {
      router.push(`/deals/${collisionSlug}?warning=collision`);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* ── Search Input Container ── */}
      <div className="relative flex items-center w-full rounded-[12px] bg-[#0a0a0f]/80 backdrop-blur-[12px] border border-white/10 shadow-2xl transition-all focus-within:border-[#34d399]/40">
        <div className="absolute left-1.5 top-1 bottom-1 w-10 h-10 rounded-[10px] bg-white/5 border border-white/10 flex items-center justify-center text-[#34d399] shrink-0">
          <Search className="w-5 h-5 text-[#34d399]" />
        </div>

        <input
          type="text"
          data-testid="deals-address-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-14 pr-32 py-3.5 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none min-h-[44px]"
        />

        <div className="absolute right-2 flex items-center gap-2">
          <button
            type="button"
            data-testid="list-a-deal-hero-cta"
            onClick={() => {
              if (onListDealClick) onListDealClick();
              handleSelectAddress(query || '123 Main St Austin TX');
            }}
            className="h-9 px-4 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer min-h-[36px]"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span className="hidden sm:inline">+ List a deal</span>
            <span className="sm:hidden">List</span>
          </button>
        </div>
      </div>

      {/* ── Predictive Dropdown ── */}
      {isOpen && predictions.length > 0 && (
        <div
          data-testid="address-prediction-dropdown"
          className="absolute top-full left-0 right-0 mt-2 z-40 rounded-[12px] bg-[#0a0a0f]/95 backdrop-blur-[14px] border border-white/10 shadow-2xl overflow-hidden divide-y divide-white/5 animate-fade-in"
        >
          {predictions.map((p, idx) => (
            <button
              key={p.placeId}
              type="button"
              data-testid={`prediction-item-${idx}`}
              onClick={() => handleSelectAddress(p.fullAddress)}
              className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-[8px] bg-white/5 flex items-center justify-center text-[#34d399] shrink-0 border border-white/5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-100 block truncate">{p.mainText}</span>
                <span className="text-[10px] text-slate-400 block truncate">{p.secondaryText}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Glass Collision Modal ── */}
      {isCollisionModalOpen && (
        <div
          data-testid="search-collision-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[20px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-[16px] border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-[20px] p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[12px] bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  A deal already exists at this address
                </h3>
                <p className="text-xs text-slate-400">
                  Another investor has already published an active listing for this property.
                </p>
              </div>
            </div>

            {/* Compact DealCard Preview */}
            {collisionDeal && (
              <div className="border border-white/10 rounded-[14px] overflow-hidden bg-white/[0.02]">
                <DealCard deal={collisionDeal as any} />
              </div>
            )}

            {/* Two Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="create-deal-anyway-btn"
                onClick={handleCreateAnyway}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] text-xs font-bold transition-all min-h-[44px] cursor-pointer"
              >
                Create new deal anyway
              </button>

              <button
                type="button"
                data-testid="view-existing-deal-btn"
                onClick={handleNavigateToDetail}
                className="w-full sm:w-auto px-5 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg min-h-[44px] cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-950" />
                <span>View Deal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
