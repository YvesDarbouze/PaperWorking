'use client';

import React, { useState } from 'react';
import { Users, Phone, Mail, Star, Plus, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Staging Vendor Manager — Phase 4 Module
   Manages staging vendors, photographers, and
   pre-listing service providers.
   ═══════════════════════════════════════════════════════ */

type VendorType = 'Staging Company' | 'Photographer' | 'Videographer' | 'Cleaning Service' | 'Landscaper';

interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  phone: string;
  email: string;
  rate: string;
  rating: number; // 1-5
  status: 'Contacted' | 'Booked' | 'Completed' | 'Cancelled';
}

const STATUS_STYLES: Record<Vendor['status'], string> = {
  Contacted: 'bg-pw-glass-bg border-pw-border text-text-secondary',
  Booked: 'bg-pw-accent/10 border-pw-accent/30 text-pw-accent',
  Completed: 'bg-pw-black text-pw-white border-pw-black',
  Cancelled: 'bg-color-error/10 border-color-error/30 text-color-error',
};

const INITIAL_VENDORS: Vendor[] = [
  { id: '1', name: 'Meridian Staging Co.', type: 'Staging Company', phone: '(305) 555-0142', email: 'info@meridionstaging.com', rate: '$2,500 / mo', rating: 5, status: 'Booked' },
  { id: '2', name: 'Lens & Light Photography', type: 'Photographer', phone: '(305) 555-0198', email: 'book@lenslight.com', rate: '$450 / session', rating: 4, status: 'Contacted' },
  { id: '3', name: 'Drone Visions LLC', type: 'Videographer', phone: '(786) 555-0267', email: 'fly@dronevisions.io', rate: '$350 / session', rating: 5, status: 'Contacted' },
];

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'xs' }) {
  const cls = size === 'sm' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${cls} ${i < rating ? 'text-pw-accent fill-pw-accent' : 'text-pw-border'}`} />
      ))}
    </div>
  );
}

export default function StagingVendorManager() {
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [showAdd, setShowAdd] = useState(false);

  const advanceStatus = (id: string) => {
    const order: Vendor['status'][] = ['Contacted', 'Booked', 'Completed'];
    setVendors(vendors.map(v => {
      if (v.id === id) {
        const idx = order.indexOf(v.status);
        if (idx >= 0 && idx < order.length - 1) {
          const next = order[idx + 1];
          toast.success(`${v.name} → ${next}`, { style: { background: 'var(--pw-black)', color: 'var(--pw-white)' } });
          return { ...v, status: next };
        }
      }
      return v;
    }));
  };

  const handleAddVendor = () => {
    setVendors([
      ...vendors,
      {
        id: Math.random().toString(36).slice(2, 8),
        name: '',
        type: 'Staging Company',
        phone: '',
        email: '',
        rate: '',
        rating: 3,
        status: 'Contacted',
      },
    ]);
    setShowAdd(false);
  };

  const bookedCount = vendors.filter(v => v.status === 'Booked' || v.status === 'Completed').length;

  return (
    <div className="glass-card border border-pw-border rounded-none p-6 shadow-none">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-pw-accent" />
          <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">Staging & Vendor Network</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{bookedCount}/{vendors.length} secured</span>
          <button
            onClick={handleAddVendor}
            className="flex items-center gap-1 pw-btn pw-btn--secondary pw-btn--sm rounded-none text-[9px] font-black uppercase tracking-wider py-1 px-3"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {vendors.map(vendor => (
          <div key={vendor.id} className="p-4 border border-pw-border rounded-none hover:border-pw-accent transition group bg-pw-glass-bg/30">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">{vendor.name || 'New Vendor'}</p>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-0.5">{vendor.type}</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-none border ${STATUS_STYLES[vendor.status]}`}>
                {vendor.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-text-secondary mt-2">
              {vendor.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-pw-accent" />{vendor.phone}</span>
              )}
              {vendor.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-pw-accent" />{vendor.email}</span>
              )}
              {vendor.rate && (
                <span className="text-pw-accent font-semibold font-mono">{vendor.rate}</span>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-pw-border">
              <StarRating rating={vendor.rating} />
              {vendor.status !== 'Completed' && vendor.status !== 'Cancelled' && (
                <button
                  onClick={() => advanceStatus(vendor.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-pw-accent hover:text-pw-accent/80 font-black uppercase tracking-wider transition"
                >
                  Advance →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
