'use client';

import React, { useState } from 'react';
import { Building2, MapPin, Ruler, Calendar, DollarSign, CheckCircle2, Edit3, X, Loader2 } from 'lucide-react';
import AddressAutocomplete, { type ParsedAddress } from '@/components/projects/AddressAutocomplete';

/* ═══════════════════════════════════════════════════════════════
   TargetIdentification — Phase 1 Deal Sourcing Component
   
   Allows inline editing of the fundamental property details:
   - Address
   - Target Square Footage
   - Year Built
   - Current Listed Price
   ═══════════════════════════════════════════════════════════════ */

interface TargetIdentificationProps {
  projectId: string;
  phaseColor?: string;
  initialData: {
    propertyName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    squareFootage?: number;
    yearBuilt?: number;
    listedPrice?: number;
  };
  onSave: (updates: any) => Promise<void>;
}

export function TargetIdentification({
  projectId,
  phaseColor = '#595959',
  initialData,
  onSave,
}: TargetIdentificationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    address: initialData.address || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zip: initialData.zip || '',
    squareFootage: initialData.squareFootage || '',
    yearBuilt: initialData.yearBuilt || '',
    listedPrice: initialData.listedPrice ? (initialData.listedPrice / 100).toString() : '',
  });

  const handleAddressSelect = (parsed: ParsedAddress) => {
    setFormData((prev) => ({
      ...prev,
      address: parsed.formattedAddress,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.squareFootage) {
      const sqft = parseInt(formData.squareFootage as string, 10);
      if (isNaN(sqft) || sqft <= 0) newErrors.squareFootage = 'Must be a positive number';
    }
    if (formData.yearBuilt) {
      const year = parseInt(formData.yearBuilt as string, 10);
      if (isNaN(year) || year < 1800 || year > new Date().getFullYear() + 5) {
        newErrors.yearBuilt = 'Enter a valid year';
      }
    }
    if (formData.listedPrice) {
      const price = parseFloat(formData.listedPrice as string);
      if (isNaN(price) || price < 0) newErrors.listedPrice = 'Must be a valid positive number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setErrors({});
    try {
      const updates: any = {};
      
      if (formData.address !== initialData.address) {
        updates.address = formData.address;
        updates.city = formData.city;
        updates.state = formData.state;
        updates.zip = formData.zip;
      }
      
      if (formData.squareFootage) {
        updates.squareFootage = parseInt(formData.squareFootage as string, 10);
      } else {
        updates.squareFootage = null;
      }

      if (formData.yearBuilt) {
        updates.yearBuilt = parseInt(formData.yearBuilt as string, 10);
      } else {
        updates.yearBuilt = null;
      }

      if (formData.listedPrice) {
        const price = parseFloat(formData.listedPrice as string);
        updates['financials.listedPrice'] = Math.round(price * 100);
      } else {
        updates['financials.listedPrice'] = null;
      }

      await onSave(updates);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save target identity:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-US').format(amount);
  };

  return (
    <section className="rounded-lg overflow-hidden shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
      <div className="px-8 py-5 flex items-center justify-between gap-3" style={{ background: phaseColor }}>
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4" style={{ color: '#FFFFFF' }} aria-hidden="true" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#FFFFFF' }}>
            Target Identification
          </h2>
          {showSuccess && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/20 text-green-100 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] font-bold uppercase tracking-widest"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        ) : (
          <button 
            onClick={() => {
              setIsEditing(false);
              setErrors({});
              setFormData({
                address: initialData.address || '',
                city: initialData.city || '',
                state: initialData.state || '',
                zip: initialData.zip || '',
                squareFootage: initialData.squareFootage || '',
                yearBuilt: initialData.yearBuilt || '',
                listedPrice: initialData.listedPrice ? (initialData.listedPrice / 100).toString() : '',
              });
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] font-bold uppercase tracking-widest"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>

      <div className="p-8">
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-[auto_1fr] items-start gap-4">
              <MapPin className="w-5 h-5 mt-0.5" style={{ color: phaseColor, opacity: 0.7 }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Property Address</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formData.address || '—'}</p>
                {(formData.city || formData.state) && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {[formData.city, formData.state].filter(Boolean).join(', ')} {formData.zip}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6" style={{ borderTop: '1px solid var(--border-ui)' }}>
              <div className="flex items-center gap-3">
                <Ruler className="w-8 h-8 p-1.5 rounded-md" style={{ color: phaseColor, background: 'var(--bg-canvas)' }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>Target Sq. Ft.</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {initialData.squareFootage ? formatNumber(initialData.squareFootage) : '—'} 
                    {initialData.squareFootage && <span className="text-[10px] font-medium text-gray-400 ml-1">SQFT</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 p-1.5 rounded-md" style={{ color: phaseColor, background: 'var(--bg-canvas)' }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>Year Built</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{initialData.yearBuilt || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 p-1.5 rounded-md text-green-600 bg-green-50" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>Listed Price</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {initialData.listedPrice ? formatCurrency(initialData.listedPrice / 100) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Property Address</label>
              <AddressAutocomplete
                value={formData.address}
                onSelect={handleAddressSelect}
                variant="dashboard"
                placeholder="Search for an address..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Target Sq. Ft.</label>
                <input
                  type="number"
                  value={formData.squareFootage}
                  onChange={(e) => setFormData({ ...formData, squareFootage: e.target.value })}
                  className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${errors.squareFootage ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  style={{ background: 'var(--bg-canvas)', border: errors.squareFootage ? '1px solid #ef4444' : '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="e.g. 1500"
                />
                {errors.squareFootage && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.squareFootage}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Year Built</label>
                <input
                  type="number"
                  value={formData.yearBuilt}
                  onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                  className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${errors.yearBuilt ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  style={{ background: 'var(--bg-canvas)', border: errors.yearBuilt ? '1px solid #ef4444' : '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="e.g. 1995"
                />
                {errors.yearBuilt && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.yearBuilt}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Listed Price ($)</label>
                <input
                  type="number"
                  value={formData.listedPrice}
                  onChange={(e) => setFormData({ ...formData, listedPrice: e.target.value })}
                  className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${errors.listedPrice ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  style={{ background: 'var(--bg-canvas)', border: errors.listedPrice ? '1px solid #ef4444' : '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
                  placeholder="e.g. 250000"
                />
                {errors.listedPrice && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.listedPrice}</p>}
              </div>
            </div>

            <div className="pt-6 flex justify-end" style={{ borderTop: '1px solid var(--border-ui)' }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: phaseColor }}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Details
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
