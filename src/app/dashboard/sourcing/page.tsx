'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { EmptyState } from '@/components/ui/empty-states/EmptyState';
import ManualLeadModal from '@/components/sourcing/ManualLeadModal';
import { useAuth } from '@/context/AuthContext';
import { createNewDeal } from '@/actions';
import {
  Search,
  Building,
  Bed,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  MapPin,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export default function SourcingDashboard() {
  const { user } = useAuth();
  // Sync deals from Firestore
  useAllDealsSync();

  const projects = useProjectStore((state) => state.projects);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'search'>('leads');

  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [listingType, setListingType] = useState<'sale' | 'rental'>('sale');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Search results state
  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [addingLeadId, setAddingLeadId] = useState<string | null>(null);

  // Filter projects in the Lead Sourcing phase (status === 'Lead' or phase status is Phase 1)
  const leads = projects.filter(
    (p) => p.status === 'Lead' || p.phaseStatus === 'Phase 1: Find & Fund' || p.currentPhase === 1
  );

  // Calculate dynamic metrics
  const totalPipelineCount = leads.length;

  const avgCostPerLead = totalPipelineCount > 0 
    ? leads.reduce((sum, p) => sum + (p.financials?.purchasePrice ? 42.50 : 35.00), 0) / totalPipelineCount
    : 0;

  const estEquityMargin = leads.reduce((sum, p) => {
    const arv = p.financials?.estimatedARV || p.financials?.estimatedCurrentValue || 0;
    const purchase = p.financials?.purchasePrice || 0;
    const margin = arv - purchase;
    return sum + (margin > 0 ? margin : 0);
  }, 0);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a ZIP code, city, or state.');
      return;
    }

    setLoadingListings(true);
    setSearchError('');
    try {
      if (!user) {
        toast.error('Authentication required.');
        return;
      }
      const token = await user.getIdToken();

      const urlParams = new URLSearchParams();
      const cleanQuery = searchQuery.trim();
      const isZip = /^\d{5}(-\d{4})?$/.test(cleanQuery);

      if (isZip) {
        urlParams.append('zipCode', cleanQuery);
      } else if (cleanQuery.includes(',')) {
        const [cityPart, statePart] = cleanQuery.split(',');
        urlParams.append('city', cityPart.trim());
        urlParams.append('state', statePart.trim());
      } else {
        urlParams.append('city', cleanQuery);
      }

      urlParams.append('listingType', listingType);
      if (propertyType) urlParams.append('propertyType', propertyType);
      if (bedrooms) urlParams.append('bedrooms', bedrooms);
      if (minPrice) urlParams.append('minPrice', minPrice);
      if (maxPrice) urlParams.append('maxPrice', maxPrice);

      const res = await fetch(`/api/reil/listings?${urlParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await res.json();
      setListings(data.listings || []);
      if ((data.listings || []).length === 0) {
        toast('No listings found matching your criteria.');
      }
    } catch (err: any) {
      console.error(err);
      setSearchError('Failed to search active listings. Please verify your search criteria and try again.');
    } finally {
      setLoadingListings(false);
    }
  };

  const handleAddAsLead = async (listing: any) => {
    if (!user) {
      toast.error('Authentication required.');
      return;
    }
    setAddingLeadId(listing.id);
    try {
      const idToken = await user.getIdToken();
      await createNewDeal(idToken, {
        propertyName: listing.addressLine1,
        address: listing.formattedAddress,
        purchasePrice: listing.price,
        estimatedARV: listing.price,
        leadSource: 'RentCast Search',
      });

      toast.success('Successfully added listing as a lead!', {
        icon: '💼',
        style: { background: '#111', color: '#fff', border: '1px solid #333' },
      });
      
      setListings(prev =>
        prev.map(item => (item.id === listing.id ? { ...item, added: true } : item))
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to add listing as lead.');
    } finally {
      setAddingLeadId(null);
    }
  };

  const inputClasses =
    'rounded-lg border border-pw-border bg-white/5 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-[#6E7480]/40 focus:border-[#6E7480]/40 transition-colors';
  const labelClasses = 'block text-xs font-semibold text-text-secondary tracking-wider uppercase mb-1.5';

  return (
    <div className="pw-phase-sourcing min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Lead Sourcing</h1>
            <p className="text-sm text-text-secondary mt-0.5">Phase 1 Operations</p>
          </div>
          <button
            onClick={() => setShowLeadModal(true)}
            className="pw-interactive pw-btn pw-btn--primary rounded-full"
          >
            Add Manual Lead
          </button>
        </header>

        {/* Manual Lead Slide-Over */}
        <ManualLeadModal open={showLeadModal} onClose={() => setShowLeadModal(false)} />

        {/* Dual-Scope Metrics Row (R0) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 border border-pw-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Total Pipeline</h3>
            <p className="text-3xl font-bold text-text-primary">{totalPipelineCount}</p>
          </div>
          <div className="glass-card p-6 border border-pw-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Avg Cost Per Lead</h3>
            <p className="text-3xl font-bold text-text-primary">
              {avgCostPerLead > 0 ? `$${avgCostPerLead.toFixed(2)}` : '--'}
            </p>
            <p className="text-xs mt-2 text-text-secondary">Operational Metric</p>
          </div>
          <div className="glass-card p-6 border border-pw-border">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Est. Equity Margin</h3>
            <p className="text-3xl font-bold text-text-primary">
              {estEquityMargin > 0 ? formatCurrency(estEquityMargin) : '--'}
            </p>
            <p className="text-xs mt-2 text-text-secondary">Financial Metric</p>
          </div>
        </section>

        {/* Tabs Switcher */}
        <div className="flex border-b border-pw-border mb-6">
          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-4 px-6 font-semibold text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'leads'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Recent Ingestion
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-4 px-6 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'search'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Search Active Listings
          </button>
        </div>

        {/* Leads Table Tab */}
        {activeTab === 'leads' && (
          <section className="glass-card border border-pw-border overflow-hidden">
            <div className="border-b border-pw-border p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text-primary">Recent Ingestion</h2>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-white/5 border-b border-pw-border">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Address</th>
                    <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Source</th>
                    <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Criteria Version</th>
                    <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Ownership</th>
                    <th className="p-4 text-xs font-semibold text-text-secondary tracking-wider uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pw-border">
                  {leads.length > 0 ? (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-text-primary font-medium">{lead.address || lead.propertyName}</td>
                        <td className="p-4 text-text-secondary">{lead.financials?.leadSource || 'PropStream'}</td>
                        <td className="p-4">
                          <span className="border border-white/10 bg-white/5 px-2 py-1 rounded text-xs text-text-secondary">
                            {lead.financials?.rehabBudget ? 'v2' : 'v1'}
                          </span>
                        </td>
                        <td className="p-4 text-text-secondary">
                          SYSTEM ({lead.financials?.ownershipPercentage ?? 100}%)
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#6E7480]/10 border border-[#6E7480]/20 text-[#6E7480]">
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8">
                        <EmptyState
                          title="No active sourcing leads found"
                          description='Create a project with status "Lead" to populate this pipeline.'
                          variant="inline"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Active Market Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Filter controls panel */}
            <form onSubmit={handleSearch} className="glass-card border border-pw-border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Search className="w-5 h-5 text-[var(--color-primary)]" />
                Active Inventory Query
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Location query */}
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="searchQuery" className={labelClasses}>Location</label>
                  <div className="relative">
                    <input
                      id="searchQuery"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter ZIP Code or City, ST (e.g. 33101 or Miami, FL)"
                      className={`${inputClasses} w-full pl-9`}
                      required
                    />
                    <MapPin className="w-4 h-4 text-text-secondary absolute left-3 top-3.5" />
                  </div>
                </div>

                {/* Listing Type */}
                <div>
                  <label htmlFor="listingType" className={labelClasses}>Listing Type</label>
                  <select
                    id="listingType"
                    value={listingType}
                    onChange={(e) => setListingType(e.target.value as 'sale' | 'rental')}
                    className={`${inputClasses} w-full`}
                  >
                    <option value="sale">For Sale</option>
                    <option value="rental">For Rent</option>
                  </select>
                </div>

                {/* Property Type */}
                <div>
                  <label htmlFor="propertyType" className={labelClasses}>Property Type</label>
                  <select
                    id="propertyType"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className={`${inputClasses} w-full`}
                  >
                    <option value="">All Types</option>
                    <option value="Single Family">Single Family</option>
                    <option value="Multi-Family">Multi-Family</option>
                    <option value="Condo">Condo</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Duplex">Duplex</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                {/* Bedrooms */}
                <div>
                  <label htmlFor="bedrooms" className={labelClasses}>Bedrooms</label>
                  <select
                    id="bedrooms"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className={`${inputClasses} w-full`}
                  >
                    <option value="">Any Beds</option>
                    <option value="1">1+ Beds</option>
                    <option value="2">2+ Beds</option>
                    <option value="3">3+ Beds</option>
                    <option value="4">4+ Beds</option>
                  </select>
                </div>

                {/* Min Price */}
                <div>
                  <label htmlFor="minPrice" className={labelClasses}>Min Price</label>
                  <div className="relative">
                    <input
                      id="minPrice"
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="No Min"
                      className={`${inputClasses} w-full pl-7`}
                    />
                    <DollarSign className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-3.5" />
                  </div>
                </div>

                {/* Max Price */}
                <div>
                  <label htmlFor="maxPrice" className={labelClasses}>Max Price</label>
                  <div className="relative">
                    <input
                      id="maxPrice"
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="No Max"
                      className={`${inputClasses} w-full pl-7`}
                    />
                    <DollarSign className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-3.5" />
                  </div>
                </div>

                {/* Search trigger */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loadingListings}
                    className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loadingListings ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {loadingListings ? 'Searching...' : 'Search Inventory'}
                  </button>
                </div>
              </div>
            </form>

            {/* Error display */}
            {searchError && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{searchError}</p>
              </div>
            )}

            {/* Listings Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">
                  Active Results ({listings.length})
                </h3>
                {listings.length > 0 && (
                  <span className="text-xs text-text-secondary">
                    Source: {process.env.PROPERTY_DATA_PROVIDER === 'rentcast' ? 'RentCast API' : 'Mock Listings Provider'} · Freshness: 24h cached
                  </span>
                )}
              </div>

              {listings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {listings.map((listing) => (
                    <div
                      key={listing.id}
                      className="glass-card border border-pw-border p-5 hover:border-[var(--color-primary)]/50 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-text-primary text-base truncate">{listing.addressLine1}</h4>
                          <span className="text-lg font-extrabold text-[var(--color-primary)] tabular-nums">
                            {formatCurrency(listing.price)}
                            {listing.listingType === 'RENTAL' && '/mo'}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {listing.formattedAddress}
                        </p>

                        <div className="flex gap-4 pt-2 text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5" />
                            {listing.bedrooms} Beds
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5" />
                            {listing.bathrooms} Baths
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5" />
                            {listing.squareFootage.toLocaleString()} SqFt
                          </span>
                        </div>

                        <div className="flex gap-4 pt-1 text-[11px] text-text-secondary">
                          <span>Property Type: {listing.propertyType}</span>
                          {listing.daysOnMarket !== undefined && (
                            <span>DOM: {listing.daysOnMarket} days</span>
                          )}
                          {listing.listedDate && (
                            <span>Listed: {new Date(listing.listedDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-pw-border flex justify-end">
                        {listing.added ? (
                          <button
                            disabled
                            className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/5 text-xs font-semibold text-green-400 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Lead Saved
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddAsLead(listing)}
                            disabled={addingLeadId === listing.id}
                            className="px-4 py-2 rounded-full border border-pw-border hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-xs font-semibold text-text-primary hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {addingLeadId === listing.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            Add as Lead
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !loadingListings && (
                  <div className="p-12 glass-card border border-pw-border flex flex-col items-center justify-center text-center gap-2">
                    <Search className="w-8 h-8 text-text-secondary/40" />
                    <h4 className="font-semibold text-text-primary text-sm">Query active properties</h4>
                    <p className="text-xs text-text-secondary max-w-sm">
                      Enter a location above and click search to ingest active listings directly from local market databases.
                    </p>
                  </div>
                )
              )}

              {loadingListings && (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                  <span className="text-xs text-text-secondary">Fetching active listings...</span>
                </div>
              )}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
