'use client';

import React, { useState } from 'react';
import { Search, Filter, ShieldCheck, Star, MapPin, Clock, Tag, ChevronRight, Calculator } from 'lucide-react';
import { VendorProfile, VendorType } from '@/types/schema';
import { motion } from 'framer-motion';
import { VendorRequestModal } from './VendorRequestModal';

const MOCK_VENDORS: VendorProfile[] = [
  {
    id: 'v1',
    uid: 'u_l1',
    type: 'Lawyer',
    companyName: 'Shield & Gavel Real Estate Law',
    licensingStates: ['TX', 'FL'],
    specialties: ['Title Resolution', 'Wholesale Assignments', 'Foreclosure Defense'],
    bio: 'Former Title Officer turned Attorney. We specialize in rapid wholesale contract review and clearing complex title clouds.',
    avgTurnaroundDays: 2,
    overallRating: 4.9,
    totalReviews: 124,
    availability: 'Available',
    feeRangeLabel: '$750 - $1,500',
    verified: true,
    insuranceVerified: true
  },
  {
    id: 'v2',
    uid: 'u_a1',
    type: 'Appraiser',
    companyName: 'Precision Value Partners',
    licensingStates: ['TX'],
    specialties: ['Residential Fix-and-Flip', 'Commercial Multi-family'],
    bio: 'Certified Residential Appraiser with 15 years Experience in the Austin Metro area.',
    avgTurnaroundDays: 5,
    overallRating: 4.7,
    totalReviews: 89,
    availability: 'Available in 1 week',
    feeRangeLabel: '$600 - $850',
    verified: true,
    insuranceVerified: true
  },
  {
    id: 'v3',
    uid: 'u_l2',
    type: 'Lawyer',
    companyName: 'Heritage Closing Group',
    licensingStates: ['FL', 'GA'],
    specialties: ['Probate Real Estate', '1031 Exchange Counsel'],
    bio: 'Specializing in complex estate-related real estate transactions.',
    avgTurnaroundDays: 3,
    overallRating: 4.2,
    totalReviews: 42,
    availability: 'Busy',
    feeRangeLabel: '$1,200 - $2,500',
    verified: true,
    insuranceVerified: false
  }
];

export default function VendorDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<VendorType | 'All'>('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRequestQuote = (vendor: VendorProfile) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  const filteredVendors = MOCK_VENDORS.filter(v => {
    const matchesSearch = v.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         v.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'All' || v.type === typeFilter;
    const matchesState = stateFilter === 'All' || v.licensingStates.includes(stateFilter);
    return matchesSearch && matchesType && matchesState;
  });

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Institutional Header */}
      <header className="bg-bg-surface border-b border-border-accent p-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
          <div className="max-w-xl">
            <h1 className="text-5xl font-black tracking-tight text-text-primary mb-4 uppercase">Marketplace</h1>
            <p className="text-text-secondary font-medium text-sm leading-relaxed">
              Standardized procurement for real estate legal counsel and certified appraisal reports. 
              Centralized for high-yield portfolio operations.
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest font-black text-text-secondary mb-1">Market Liquidity</p>
              <p className="text-2xl font-black text-text-primary">2.4 Days</p>
            </div>
            <div className="h-10 w-px bg-pw-border" />
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest font-black text-text-secondary mb-1">TX Avg Fee</p>
              <p className="text-2xl font-black text-text-primary">$840</p>
            </div>
          </div>
        </div>

        {/* Filters — Reverting to Minimalist Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="text"
              placeholder="Filter by specialty (e.g. Probate, Title...)"
              className="w-full pl-11 pr-4 py-4 bg-pw-dashboard border border-border-accent rounded-none text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-0 focus:border-pw-black transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-6 py-4 bg-pw-dashboard border border-border-accent rounded-none text-xs font-black uppercase tracking-widest focus:outline-none focus:border-pw-black"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="All">All Roles</option>
            <option value="Lawyer">Lawyers</option>
            <option value="Appraiser">Appraisers</option>
          </select>
          <select 
            className="px-6 py-4 bg-pw-dashboard border border-border-accent rounded-none text-xs font-black uppercase tracking-widest focus:outline-none focus:border-pw-black"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="All">All States</option>
            <option value="TX">TX</option>
            <option value="FL">FL</option>
            <option value="GA">GA</option>
          </select>
        </div>
      </header>

      {/* Directory Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-pw-dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-pw-border border border-border-accent">
          {filteredVendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} onRequestQuote={() => handleRequestQuote(vendor)} />
          ))}
        </div>
      </main>

      <VendorRequestModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVendor(null);
        }}
        vendor={selectedVendor}
      />
    </div>
  );
}

function VendorCard({ vendor, onRequestQuote }: { vendor: VendorProfile; onRequestQuote: () => void }) {
  return (
    <div className="bg-bg-surface p-8 flex flex-col group relative">
      <div className="flex justify-between items-start mb-8">
        <div>
           <p className="text-xs font-black text-text-secondary uppercase tracking-widest mb-1">{vendor.type}</p>
           {vendor.verified && (
             <p className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-1">
               <ShieldCheck className="w-3 h-3" /> Institutional Profile
             </p>
           )}
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-text-primary fill-pw-black" />
          <span className="text-xs font-black text-text-primary">{vendor.overallRating}</span>
        </div>
      </div>

      <h3 className="text-xl font-black text-text-primary mb-4 uppercase tracking-tighter group-hover:underline underline-offset-4 decoration-1">
        {vendor.companyName}
      </h3>
      <p className="text-xs text-text-secondary font-medium mb-8 leading-relaxed line-clamp-2">
        {vendor.bio}
      </p>

      <div className="mt-auto space-y-4 pt-8 border-t border-pw-dashboard">
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
          <span className="text-text-secondary">Jurisdiction</span>
          <span className="text-text-primary">{vendor.licensingStates.join(' / ')}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
          <span className="text-text-secondary">Latency</span>
          <span className="text-text-primary">{vendor.avgTurnaroundDays} Days</span>
        </div>
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
          <span className="text-text-secondary">Baseline Fee</span>
          <span className="text-text-primary">{vendor.feeRangeLabel}</span>
        </div>
      </div>

      <div className="mt-10">
        <button 
          onClick={onRequestQuote}
          className="w-full py-4 border border-pw-black text-text-primary text-xs font-black uppercase tracking-[0.2em] hover:bg-pw-black hover:text-white transition-all"
        >
          Request Quote
        </button>
      </div>
    </div>
  );
}
