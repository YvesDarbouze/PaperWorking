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
  Contacted: 'bg-blue-900/30 text-blue-400 border-blue-800',
  Booked: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  Completed: 'bg-white/10 text-white border-white/20',
  Cancelled: 'bg-red-900/30 text-red-400 border-red-800',
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
        <Star key={i} className={`${cls} ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
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
          toast.success(`${v.name} → ${next}`, { style: { background: '#1a1a1a', color: '#fff' } });
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
    <div className="bg-pw-black border border-gray-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-mono tracking-widest text-emerald-500 uppercase">Staging & Vendor Network</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{bookedCount}/{vendors.length} secured</span>
          <button
            onClick={handleAddVendor}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white/10 text-gray-300 rounded hover:bg-white/20 transition"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {vendors.map(vendor => (
          <div key={vendor.id} className="p-4 border border-gray-800 rounded-lg hover:border-gray-700 transition group bg-black/30">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-white">{vendor.name || 'New Vendor'}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{vendor.type}</p>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_STYLES[vendor.status]}`}>
                {vendor.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
              {vendor.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{vendor.phone}</span>
              )}
              {vendor.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.email}</span>
              )}
              {vendor.rate && (
                <span className="text-emerald-400 font-medium">{vendor.rate}</span>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
              <StarRating rating={vendor.rating} />
              {vendor.status !== 'Completed' && vendor.status !== 'Cancelled' && (
                <button
                  onClick={() => advanceStatus(vendor.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
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
