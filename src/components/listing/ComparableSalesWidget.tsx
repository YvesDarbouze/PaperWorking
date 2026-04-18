'use client';

import React from 'react';
import { Ruler, DollarSign, Calendar, MapPin } from 'lucide-react';
import { formatCentsToDollars } from '@/lib/calculations/financials';

export interface CompSale {
  id: string;
  address: string;
  price: number;
  saleDate: string;
  distanceMiles: number;
  sqft: number;
  beds: number;
  baths: number;
}

interface ComparableSalesWidgetProps {
  currentAddress: string;
  comps: CompSale[];
}

/**
 * Comparable Sales (Comps) Widget
 * Displays the top comparable sales in the radius to justify ARV.
 */
const ComparableSalesWidget: React.FC<ComparableSalesWidgetProps> = ({ 
  currentAddress, 
  comps 
}) => {
  return (
    <div className="bg-pw-white border border-pw-border">
      <div className="bg-pw-black px-10 py-8 border-b border-pw-border flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-pw-white uppercase tracking-[0.4em] leading-none mb-2">COMPARABLE_SALES_INDEX</h3>
          <p className="text-xs text-pw-white/40 font-black uppercase tracking-[0.2em]">RADIUS_BASELINE: {currentAddress}</p>
        </div>
        <div className="bg-pw-accent text-pw-white px-4 py-2 text-xs font-black uppercase tracking-widest border border-pw-accent shadow-[0_0_20px_rgba(66,133,244,0.3)] animate-pulse">
          AUDIT_STABLE
        </div>
      </div>

      <div className="divide-y divide-pw-border">
        {comps.map((comp) => (
          <div key={comp.id} className="p-10 hover:bg-pw-bg transition-all flex justify-between items-center group cursor-crosshair">
            <div className="flex items-center gap-8">
              <div className="w-14 h-14 bg-pw-bg border border-pw-border flex items-center justify-center group-hover:bg-pw-black group-hover:border-pw-black group-hover:text-pw-white transition-all">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-black text-pw-black uppercase tracking-tighter mb-2 group-hover:text-pw-accent transition-colors">{comp.address}</p>
                <div className="flex items-center gap-8 text-xs font-black text-pw-muted uppercase tracking-[0.2em] font-mono">
                  <span className="flex items-center gap-3"><Calendar className="w-4 h-4 text-pw-accent" /> {comp.saleDate}</span>
                  <span className="flex items-center gap-3"><Ruler className="w-4 h-4 text-pw-accent" /> {comp.distanceMiles} MI_RADIAL</span>
                </div>
              </div>
            </div>

            <div className="text-right flex items-center gap-16">
              <div className="hidden lg:block">
                <p className="text-xs text-pw-muted font-black uppercase mb-2 tracking-[0.3em]">SPECIFICATION</p>
                <p className="text-sm font-black text-pw-black uppercase tracking-tighter font-mono">
                  {comp.beds}B / {comp.baths}BA / {comp.sqft} SQFT
                </p>
              </div>
              <div>
                <p className="text-xs text-pw-muted font-black uppercase mb-2 tracking-[0.3em]">SETTLEMENT</p>
                <p className="text-2xl font-black text-pw-black tracking-tighter font-mono">
                  <span className="text-sm text-pw-accent mr-1">$</span>
                  {formatCentsToDollars(comp.price).replace('$', '')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-10 bg-pw-bg border-t border-pw-border flex justify-center">
        <button className="flex items-center gap-4 text-xs font-black text-pw-muted hover:text-pw-accent transition-all uppercase tracking-[0.4em] border border-transparent hover:border-pw-accent px-8 py-4">
          <DollarSign className="w-4 h-4" />
          <span>REQUEST_FULL_APPRAISAL_LEDGER</span>
        </button>
      </div>
    </div>
  );
};

export default ComparableSalesWidget;
