'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, ShieldCheck, Briefcase, DollarSign, Award, MapPin, ArrowLeft, Send } from 'lucide-react';
import RequestBidModal from '@/components/marketplace/RequestBidModal';

export default function VendorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const vendorId = resolvedParams.id;
  const router = useRouter();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const vendorData = {
    vendorId,
    companyName: 'Apex Legal & Title Group',
    roleBadge: 'Verified Real Estate Attorney',
    rating: 4.9,
    reviewsCount: 38,
    completedProjects: 42,
    averageBidAmount: 1850,
    location: 'Austin, TX',
    bio: 'Premier full-service real estate legal team specializing in commercial titles, PSAs, 1031 exchanges, and closing representation.',
    services: [
      'Real Estate Attorney',
      'Title Company',
      'Loan Processor',
    ],
  };

  return (
    <div data-testid="vendor-profile-page" className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/marketplace')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Vendor Marketplace
      </button>

      {/* Header Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-white/10 space-y-4 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {vendorData.roleBadge}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vendorData.location}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white">{vendorData.companyName}</h1>
            <p className="text-xs text-slate-300 max-w-2xl">{vendorData.bio}</p>
          </div>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            data-testid="profile-request-bid-btn"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg self-start md:self-center"
          >
            <Send className="w-4 h-4" />
            <span>Request Bid</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10 text-center">
          <div>
            <span className="text-xs text-slate-400 block">Rating</span>
            <div className="flex items-center justify-center gap-1 font-bold text-amber-400 text-sm">
              <Star className="w-4 h-4 fill-amber-400" /> {vendorData.rating} ({vendorData.reviewsCount})
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Completed Projects</span>
            <span className="font-bold text-white text-sm">{vendorData.completedProjects}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Average Bid Amount</span>
            <span className="font-bold text-emerald-400 text-sm">${vendorData.averageBidAmount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Verified Status</span>
            <span className="font-bold text-emerald-300 text-sm">Active Network</span>
          </div>
        </div>
      </div>

      {/* Services Offered */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Services Provided
        </h2>
        <div className="flex flex-wrap gap-2">
          {vendorData.services.map((svc, i) => (
            <span key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-200">
              {svc}
            </span>
          ))}
        </div>
      </div>

      <RequestBidModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        vendorId={vendorId}
        vendorName={vendorData.companyName}
        serviceType="Real Estate Attorney"
      />
    </div>
  );
}
