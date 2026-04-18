'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Map, Database, Home, Info, Edit3, Share2, Globe } from 'lucide-react';
import PropertyMediaGallery from './PropertyMediaGallery';
import ComparableSalesWidget, { CompSale } from './ComparableSalesWidget';
import { fetchMLSDataAction as fetchMLSData } from '@/lib/services/mlsActions';
import { NormalizedProperty } from '@/lib/services/mlsShared';
import { fetchNeighborhoodHighlights, NeighborhoodData } from '@/lib/services/neighborhoodService';
import { generatePropertyDescription } from '@/lib/ai/listingAgent';
import { Project } from '@/types/schema';
import toast from 'react-hot-toast';

interface ProfessionalListingDashboardProps {
  deal: Project;
}

const ProfessionalListingDashboard: React.FC<ProfessionalListingDashboardProps> = ({ deal }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [listingData, setListingData] = useState<NormalizedProperty | null>(null);
  const [neighborhood, setNeighborhood] = useState<NeighborhoodData | null>(null);
  const [aiDescription, setAiDescription] = useState<string>('');

  // Mock Comps Data
  const [comps] = useState<CompSale[]>([
    { id: '1', address: '452 Main St', price: 52500000, saleDate: '2026-03-12', distanceMiles: 0.2, sqft: 1900, beds: 3, baths: 2 },
    { id: '2', address: '12 Echo Lane', price: 49500000, saleDate: '2026-04-01', distanceMiles: 0.5, sqft: 1750, beds: 3, baths: 2.5 },
    { id: '3', address: '891 River Rd', price: 55000000, saleDate: '2026-02-28', distanceMiles: 0.8, sqft: 2100, beds: 4, baths: 3 },
  ]);

  // Initial Data Ingestion
  const ingestMLSData = async () => {
    setLoading(true);
    try {
      const data = await fetchMLSData(deal.id);
      setListingData(data);
      
      const nbhd = await fetchNeighborhoodHighlights(deal.address);
      setNeighborhood(nbhd);
      
      toast.success('MLS & Neighborhood Data Synchronized');
    } catch (error) {
      toast.error('Data Sync Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!listingData) {
      toast.error('Synchronize MLS data first to provide AI context.');
      return;
    }
    setGenerating(true);
    try {
      const desc = await generatePropertyDescription({
        address: deal.address,
        beds: listingData.beds,
        baths: listingData.baths,
        sqft: listingData.sqft,
        renovations: ['Gourmet Kitchen', 'Wide-plank Oak Flooring', 'Smart Home Integration'],
        arv: deal.financials.estimatedARV || 0,
        neighborhood: 'Brooklyn Heights'
      });
      setAiDescription(desc);
      toast.success('Professional AI Description Generated');
    } catch (error) {
      toast.error('AI Generation Failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-16 animate-in fade-in duration-700 pb-32">
      
      {/* ── Antigravity Workbench Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-pw-border pb-16 gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-pw-black flex items-center justify-center border border-pw-black">
              <Sparkles className="w-4 h-4 text-pw-accent" />
            </div>
            <span className="text-sm font-black text-pw-black uppercase tracking-[0.4em]">SYSTEM PHASE: AUDIT_PROTOCOL_v04</span>
          </div>
          <h1 className="text-6xl sm:text-7xl font-black text-pw-black tracking-tighter uppercase leading-none">{deal.propertyName}</h1>
          <p className="text-pw-muted font-black uppercase tracking-[0.2em] flex items-center mt-4 group cursor-pointer text-sm">
            <Map className="w-4 h-4 mr-4 text-pw-accent group-hover:scale-125 transition-transform" />
            {deal.address}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={ingestMLSData}
            disabled={loading}
            className="flex items-center gap-4 px-10 py-5 bg-pw-black text-pw-white text-sm font-black uppercase tracking-[0.3em] hover:bg-pw-accent transition-all disabled:opacity-20 border border-pw-black"
          >
            <Database className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'SYNCHRONIZING...' : 'SYNC_MLS_CORE'}</span>
          </button>
          <button className="p-5 border border-pw-border text-pw-muted hover:text-pw-black hover:border-pw-black transition-all bg-pw-bg">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-pw-border border-l border-t border-pw-border">
        
        {/* ── Asset Content (Media & Specification) ── */}
        <div className="lg:col-span-2 space-y-px bg-pw-border border-r">
          
          {/* Media Engine Panel */}
          <div className="bg-pw-bg p-8 border-b border-pw-border">
            <div className="border border-pw-border p-3 bg-pw-white shadow-inner">
              <PropertyMediaGallery 
                photos={listingData?.photos || [
                  'https://images.unsplash.com/photo-1600585154340-be6199f7d209?auto=format&fit=crop&w=1200',
                  'https://images.unsplash.com/photo-1600607687940-c52af096999c?auto=format&fit=crop&w=1200'
                ]}
                matterportUrl="https://my.matterport.com/show/?m=sxUdubtkePJ" 
              />
            </div>
          </div>

          {/* AI Briefing Segment */}
          <div className="bg-pw-white p-14 space-y-12 h-full min-h-[500px]">
            <div className="flex justify-between items-center bg-pw-bg border border-pw-border p-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 bg-pw-black flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-pw-accent" />
                </div>
                <h3 className="text-sm font-black text-pw-black uppercase tracking-[0.3em]">EXECUTIVE SUMMARY AUDIT</h3>
              </div>
              <button 
                onClick={handleGenerateAI}
                className="text-xs font-black bg-pw-white hover:bg-pw-black hover:text-pw-white px-6 py-3 border border-pw-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95"
              >
                {generating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-pw-accent" />}
                <span>{generating ? 'COMPILING...' : 'RE-INDEX AI'}</span>
              </button>
            </div>
            
            <div className="relative">
              {aiDescription ? (
                <div className="prose prose-invert max-w-none">
                  <p className="text-pw-black leading-loose font-medium text-base whitespace-pre-wrap uppercase tracking-tight selection:bg-pw-accent selection:text-white">
                    {aiDescription}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-pw-border bg-pw-bg p-24 text-center grayscale opacity-60">
                  <Database className="w-12 h-12 mx-auto mb-8 text-pw-muted opacity-20" />
                  <p className="text-sm text-pw-muted font-black uppercase tracking-widest leading-relaxed">
                    AWAITING CONTEXTUAL INGESTION. <br/>
                    OPERATE [RE-INDEX AI] TO GENERATE INSTITUTIONAL BRIEF.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Intelligence Sidebar ── */}
        <div className="space-y-px bg-pw-border border-r border-b">
          
          {/* Geolocation Intelligence Protocol */}
          <div className="bg-pw-black p-12 text-pw-white h-full">
            <div className="flex items-center gap-5 mb-14">
              <Globe className="w-5 h-5 text-pw-accent" />
              <h3 className="text-sm font-black uppercase tracking-[0.4em] leading-none">GEOLOCATION_METRICS</h3>
            </div>
            
            <div className="grid grid-cols-3 border border-pw-white/10 mb-16 bg-pw-white/5">
              <div className="text-center p-8 border-r border-pw-white/10 group hover:bg-pw-accent/20 transition-all">
                <p className="text-4xl font-black tracking-tighter mb-2 font-mono">{neighborhood?.walkScore || '??'}</p>
                <p className="text-xs font-black text-pw-white/30 uppercase tracking-[0.3em]">WALK</p>
              </div>
              <div className="text-center p-8 border-r border-pw-white/10 group hover:bg-pw-accent/20 transition-all">
                <p className="text-4xl font-black tracking-tighter mb-2 font-mono">{neighborhood?.transitScore || '??'}</p>
                <p className="text-xs font-black text-pw-white/30 uppercase tracking-[0.3em]">TRANSIT</p>
              </div>
              <div className="text-center p-8 group hover:bg-pw-accent/20 transition-all">
                <p className="text-4xl font-black tracking-tighter mb-2 font-mono">{neighborhood?.bikeScore || '??'}</p>
                <p className="text-xs font-black text-pw-white/30 uppercase tracking-[0.3em]">BIKE</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs font-black text-pw-white/20 uppercase tracking-[0.3em] border-b border-pw-white/10 pb-4 mb-8">
                <span>DISTRICT_NODES</span>
                <span>INDEX</span>
              </div>
              {(neighborhood?.schools || []).map((school, i) => (
                <div key={i} className="flex justify-between items-center group p-4 hover:bg-pw-white/5 border border-transparent hover:border-pw-white/10 transition-all">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-pw-white uppercase tracking-tighter">{school.name}</span>
                    <span className="text-xs text-pw-white/30 font-black uppercase tracking-widest mt-2">{school.type}</span>
                  </div>
                  <div className="text-xl font-black text-pw-accent font-mono">
                    {school.rating}<span className="text-xs text-pw-white/20">/10</span>
                  </div>
                </div>
              ))}
              {(!neighborhood || neighborhood.schools.length === 0) && (
                <p className="text-xs text-pw-white/20 font-black uppercase tracking-[0.4em] text-center py-10 italic">PENDING SENSOR AUDIT.</p>
              )}
            </div>

            <div className="mt-24 pt-12 border-t border-pw-white/10">
               <ComparableSalesWidget 
                 currentAddress={deal.address} 
                 comps={comps} 
               />
            </div>

            <div className="mt-16 p-10 bg-pw-white text-pw-black border border-pw-white shadow-2xl relative overflow-hidden">
               <div className="absolute -right-8 -bottom-8 opacity-5">
                  <Home className="w-32 h-32" />
               </div>
               <p className="text-xs font-black text-pw-muted uppercase tracking-[0.4em] mb-4">ESTIMATED ASSET_CEILING</p>
               <p className="text-5xl font-black text-pw-black tracking-tighter mb-10 font-mono">
                 <span className="text-2xl text-pw-accent">$</span>
                 {((deal.financials.estimatedARV || 0) / 100).toLocaleString()}
               </p>
               <button className="w-full bg-pw-black text-pw-white text-sm font-black py-5 uppercase tracking-[0.3em] hover:bg-pw-accent border border-pw-black transition-all shadow-xl">
                 COMMIT_ARV_LOG
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalListingDashboard;

// Utility Icon - Local Antigravity Variant
const RefreshCw = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);
