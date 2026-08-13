'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import CreateDealSheet from '@/components/deals/CreateDealSheet';
import { Plus, SlidersHorizontal, ArrowRight, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import MyDealsHistoryTab from '@/components/deals/MyDealsHistoryTab';
import { MarketplaceSubnav } from '@/components/marketplace/MarketplaceSubnav';

import AddressSearch from '@/components/deals/AddressSearch';
import FilterPanel, { FilterState } from '@/components/deals/FilterPanel';
import MarketplaceTabs, { MarketplaceTab } from '@/components/deals/MarketplaceTabs';
import ViewToggle, { ViewMode } from '@/components/deals/ViewToggle';
import SortControl, { SortOption } from '@/components/deals/SortControl';
import DealCard from '@/components/deals/DealCard';
import EmptyState from '@/components/deals/EmptyState';

const DealMap = dynamic(() => import('@/components/marketplace/DealMap'), { ssr: false });

function SkeletonCard() {
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-[8px] p-5 animate-pulse min-h-[320px]">
      <div className="h-40 w-full rounded-[10px] bg-white/5 mb-4" />
      <div className="h-5 w-3/4 rounded bg-white/10 mb-2" />
      <div className="h-4 w-1/2 rounded bg-white/5 mb-4" />
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="h-12 rounded-lg bg-white/5" />
        <div className="h-12 rounded-lg bg-white/5" />
      </div>
    </div>
  );
}

const DEFAULT_SAMPLE_DEALS = [
  {
    id: 'deal_123mainst',
    slug: '123mainstaustintx78701',
    address: '123 Main St, Austin, TX 78701',
    propertyName: 'Austin Core Multifamily Project',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    assetClass: 'Multi-family',
    subStrategy: 'FLIP',
    status: 'published',
    purchasePrice: 350000,
    rehabCost: 50000,
    arv: 480000,
    holdingCosts: 12000,
    projectedRoi: 18.5,
    fundingTarget: 200000,
    committedAmount: 130000,
    investorCount: 5,
    bookmarkCount: 18,
    viewCount: 245,
  },
  {
    id: 'deal_456congress',
    slug: '456congressaveaustintx78701',
    address: '456 Congress Ave, Austin, TX 78701',
    propertyName: 'Congress Ave Commercial Mixed-Use',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    assetClass: 'Commercial',
    subStrategy: 'BRRRR',
    status: 'published',
    purchasePrice: 1250000,
    rehabCost: 150000,
    arv: 1750000,
    holdingCosts: 35000,
    projectedRoi: 22.4,
    fundingTarget: 500000,
    committedAmount: 420000,
    investorCount: 12,
    bookmarkCount: 42,
    viewCount: 580,
  },
  {
    id: 'deal_789oak',
    slug: '789oaklandrddallastx75201',
    address: '789 Oakland Rd, Dallas, TX 75201',
    propertyName: 'Dallas Residential Value-Add Flip',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75201',
    assetClass: 'Residential',
    subStrategy: 'FLIP',
    status: 'published',
    purchasePrice: 280000,
    rehabCost: 45000,
    arv: 395000,
    holdingCosts: 9500,
    projectedRoi: 20.1,
    fundingTarget: 150000,
    committedAmount: 150000,
    investorCount: 4,
    bookmarkCount: 9,
    viewCount: 190,
  },
];

export default function DealsMarketplacePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<MarketplaceTab>('discover');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  // Compare Mode State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    propertyType: 'All',
    strategy: 'All',
    status: 'All',
    priceRange: 'All',
  });

  const [deals, setDeals] = useState<any[]>(DEFAULT_SAMPLE_DEALS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filters.propertyType !== 'All') queryParams.set('propertyType', filters.propertyType);
        if (filters.strategy !== 'All') queryParams.set('strategy', filters.strategy);
        if (filters.status !== 'All') queryParams.set('status', filters.status);
        if (filters.priceRange !== 'All') queryParams.set('priceRange', filters.priceRange);
        if (sortOption) queryParams.set('sort', sortOption);
        queryParams.set('tab', activeTab);

        const res = await fetch(`/api/deals?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDeals(data.deals ?? []);
        }
      } catch (err) {
        console.error('Failed to load deals from API:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, [filters, sortOption, activeTab]);

  const toggleSelectDealForCompare = (dealId: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(dealId)) {
        return prev.filter((id) => id !== dealId);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, dealId];
    });
  };

  const filteredDeals = deals.filter((deal) => {
    if (filters.propertyType !== 'All' && deal.assetClass?.toLowerCase() !== filters.propertyType.toLowerCase()) {
      return false;
    }
    if (filters.strategy !== 'All' && deal.subStrategy?.toLowerCase() !== filters.strategy.toLowerCase()) {
      return false;
    }
    if (filters.status !== 'All' && deal.status?.toLowerCase() !== filters.status.toLowerCase()) {
      return false;
    }
    return true;
  });

  const handleResetFilters = () => {
    setFilters({
      propertyType: 'All',
      strategy: 'All',
      status: 'All',
      priceRange: 'All',
    });
  };

  return (
    <div className="bg-[#0a0a0f] min-h-screen space-y-8 pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 text-slate-100">
      {/* Top Header Subnav */}
      <MarketplaceSubnav />

      {/* Sticky Hero Address Search Bar (Luminous Glass: backdrop-blur-md) */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-[12px] pt-2 pb-4">
        <AddressSearch onListDealClick={() => setIsCreateSheetOpen(true)} />
      </div>

      {/* Progressive Filter Panel */}
      <FilterPanel filters={filters} onFilterChange={setFilters} />

      {/* Marketplace Tabs & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        {/* Discover vs My Activity Glass Pill Tabs */}
        <MarketplaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Controls: Compare Toggle, View Toggle (List/Map) & Sort Control */}
        {activeTab === 'discover' && (
          <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
            <button
              type="button"
              data-testid="compare-mode-toggle"
              onClick={() => {
                setIsCompareMode(!isCompareMode);
                if (isCompareMode) setSelectedCompareIds([]);
              }}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-all min-h-[36px] cursor-pointer flex items-center gap-1.5 ${
                isCompareMode
                  ? 'bg-[#34d399] text-slate-950 shadow-md font-extrabold'
                  : 'bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isCompareMode ? 'Exit Compare' : 'Compare'}</span>
            </button>

            <ViewToggle view={viewMode} onViewChange={setViewMode} />
            <SortControl sort={sortOption} onSortChange={setSortOption} />
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'my-activity' ? (
        <MyDealsHistoryTab allDeals={deals} />
      ) : (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : viewMode === 'map' ? (
            <div className="rounded-[14px] border border-white/10 p-4 bg-[#0a0a0f]/90 backdrop-blur-[14px] h-[550px] relative overflow-hidden shadow-2xl">
              <DealMap deals={filteredDeals} />
            </div>
          ) : filteredDeals.length > 0 ? (
            <div data-testid="discover-deals-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isCompareMode={isCompareMode}
                  isSelected={selectedCompareIds.includes(deal.id)}
                  onToggleSelect={toggleSelectDealForCompare}
                />
              ))}
            </div>
          ) : (
            <EmptyState onResetFilters={handleResetFilters} />
          )}
        </>
      )}

      {/* Sticky Glass Bottom Bar for Compare Mode (when >= 2 deals selected) */}
      {isCompareMode && selectedCompareIds.length >= 2 && (
        <div
          data-testid="sticky-compare-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-[16px] bg-[#0a0a0f]/95 border border-[#34d399]/40 backdrop-blur-[20px] shadow-2xl flex items-center gap-4 animate-fade-in"
        >
          <span className="text-xs font-bold text-white">
            <strong className="text-[#34d399] font-mono text-sm">{selectedCompareIds.length}</strong> deals selected for comparison
          </span>

          <button
            type="button"
            data-testid="compare-deals-btn"
            onClick={() => router.push(`/deals/compare?ids=${selectedCompareIds.join(',')}`)}
            className="px-5 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg min-h-[40px] cursor-pointer"
          >
            <span>Compare {selectedCompareIds.length} Deals</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      )}

      {/* Mobile Sticky Glass Bottom Bar CTA (<640px, backdrop-blur: 20px) */}
      <div className="sm:hidden fixed bottom-18 left-0 right-0 p-4 bg-[#0a0a0f]/90 backdrop-blur-[20px] border-t border-white/10 z-40 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsCreateSheetOpen(true)}
          className="w-full h-12 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl min-h-[48px] cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>List a Deal</span>
        </button>
      </div>

      {/* Compliance Disclaimer Bar */}
      <div className="pt-8 border-t border-white/[0.04]">
        <p className="text-xs text-slate-500 leading-relaxed font-mono">
          PaperWorking facilitates introductions and interest tracking only. No funds, securities, or ownership interests are offered, sold, or transferred through the platform. All transactions occur outside PaperWorking, directly between the parties.
        </p>
      </div>

      {/* Deal Creation Sheet */}
      <CreateDealSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        initialAddress={null}
        existingDeals={deals}
        onDealCreated={(newDeal) => setDeals((prev) => [newDeal, ...prev])}
      />
    </div>
  );
}
