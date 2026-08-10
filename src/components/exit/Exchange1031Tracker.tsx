'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Plus, Trash2, Building2 } from 'lucide-react';
import { compute1031Deadlines } from '@/lib/utils/exchange1031';
import { ReplacementProperty } from '@/types/schema';

export interface Exchange1031TrackerProps {
  initialSaleDate?: string;
  initialProperties?: ReplacementProperty[];
  onSaleDateChange?: (date: string) => void;
  onPropertiesChange?: (properties: ReplacementProperty[]) => void;
}

export function Exchange1031Tracker({
  initialSaleDate = '2026-06-01',
  initialProperties = [],
  onSaleDateChange,
  onPropertiesChange,
}: Exchange1031TrackerProps) {
  const [saleDate, setSaleDate] = useState<string>(initialSaleDate);
  const [properties, setProperties] = useState<ReplacementProperty[]>(initialProperties);

  useEffect(() => {
    if (initialSaleDate) {
      setSaleDate(initialSaleDate);
    }
  }, [initialSaleDate]);

  useEffect(() => {
    if (initialProperties) {
      setProperties(initialProperties);
    }
  }, [initialProperties]);
  const [newAddress, setNewAddress] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('');

  const deadlines = useMemo(() => {
    return compute1031Deadlines(saleDate);
  }, [saleDate]);

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;

    const newProp: ReplacementProperty = {
      id: `prop_${Date.now()}`,
      address: newAddress.trim(),
      targetPrice: parseFloat(newTargetPrice) || 0,
      status: 'identified',
      identifiedDate: new Date().toISOString().split('T')[0],
    };

    const next = [...properties, newProp];
    setProperties(next);
    if (onPropertiesChange) onPropertiesChange(next);
    setNewAddress('');
    setNewTargetPrice('');
  };

  const handleRemoveProperty = (id: string) => {
    const next = properties.filter((p) => p.id !== id);
    setProperties(next);
    if (onPropertiesChange) onPropertiesChange(next);
  };

  const fmtCurrency = (val: number) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div data-testid="1031-exchange-tracker" className="glass-card rounded-2xl p-6 space-y-6 border border-white/10 bg-[#121014]/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white font-outfit flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7A9EAA]" />
            1031 Like-Kind Exchange Tracker
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict IRC §1031 statutory timeline and replacement property identification log.
          </p>
        </div>

        {/* Sale Date Input */}
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Sale Date:</label>
          <input
            type="date"
            data-testid="1031-sale-date-input"
            value={saleDate}
            onChange={(e) => {
              setSaleDate(e.target.value);
              if (onSaleDateChange) onSaleDateChange(e.target.value);
            }}
            className="bg-transparent text-xs text-white font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* Auto-Computed Statutory Deadlines Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 45-Day Identification Deadline */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              45-Day Identification Deadline
            </span>
            <span
              data-testid="ident-deadline-badge"
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                deadlines.isIdentificationExpired
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {deadlines.isIdentificationExpired
                ? 'Expired'
                : `${deadlines.daysRemainingIdentification} days remaining`}
            </span>
          </div>

          <p className="text-xl font-bold font-mono text-white tabular-nums" data-testid="ident-deadline-date">
            {deadlines.identificationDeadline}
          </p>
          <p className="text-[11px] text-slate-400">
            Must formally identify replacement property candidates in writing by midnight of Day 45.
          </p>
        </div>

        {/* 180-Day Exchange Deadline */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              180-Day Exchange Closing Deadline
            </span>
            <span
              data-testid="exchange-deadline-badge"
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                deadlines.isExchangeExpired
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {deadlines.isExchangeExpired
                ? 'Expired'
                : `${deadlines.daysRemainingExchange} days remaining`}
            </span>
          </div>

          <p className="text-xl font-bold font-mono text-white tabular-nums" data-testid="exchange-deadline-date">
            {deadlines.exchangeDeadline}
          </p>
          <p className="text-[11px] text-slate-400">
            Must acquire and close title on designated replacement property by midnight of Day 180.
          </p>
        </div>
      </div>

      {/* Identified Replacement Properties Log */}
      <div className="space-y-4 pt-2 border-t border-white/10">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#7A9EAA]" />
          Identified Replacement Properties ({properties.length})
        </h4>

        {/* Add Property Form */}
        <form onSubmit={handleAddProperty} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            data-testid="new-prop-address-input"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Property Address (e.g. 1042 Ocean Drive, Miami FL)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
          <input
            type="number"
            data-testid="new-prop-price-input"
            value={newTargetPrice}
            onChange={(e) => setNewTargetPrice(e.target.value)}
            placeholder="Target Price ($)"
            className="w-full sm:w-36 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            data-testid="add-replacement-property-btn"
            disabled={!newAddress.trim()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Candidate
          </button>
        </form>

        {/* Property List */}
        {properties.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-4 border border-dashed border-white/10 rounded-xl text-center">
            No replacement properties identified yet. Add properties to track statutory compliance.
          </p>
        ) : (
          <div className="space-y-2">
            {properties.map((prop) => (
              <div
                key={prop.id}
                data-testid="replacement-property-item"
                className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h5 className="font-bold text-white">{prop.address}</h5>
                  <p className="text-[10px] text-slate-400">
                    Identified: {prop.identifiedDate} · Target Price: {fmtCurrency(prop.targetPrice || 0)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveProperty(prop.id)}
                  aria-label="Remove property"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
