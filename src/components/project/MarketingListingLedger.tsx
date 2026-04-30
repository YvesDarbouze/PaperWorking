'use client';

import React from 'react';
import type { ProjectFinancials } from '@/types/schema';
import { Camera, Layers, Share2, Save, DollarSign } from 'lucide-react';

interface MarketingListingLedgerProps {
  financials: Partial<ProjectFinancials>;
  onChange: (updated: Partial<ProjectFinancials>) => void;
  onSave: () => void;
  isSaving: boolean;
  isLocked?: boolean;
}

const PHASE_COLOR = '#595959';

export function MarketingListingLedger({ financials, onChange, onSave, isSaving, isLocked }: MarketingListingLedgerProps) {
  const stagingCosts = financials.stagingCosts || 0;
  const photographyAndMedia = financials.photographyAndMedia || 0;
  const mlsListingFees = financials.mlsListingFees || 0;

  const totalMarketingCosts = stagingCosts + photographyAndMedia + mlsListingFees;

  const handleCurrencyChange = (field: keyof ProjectFinancials, value: string) => {
    if (isLocked) return;
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    onChange({ [field]: numericValue });
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <section className="rounded-lg overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
            <Share2 className="w-4 h-4" style={{ color: PHASE_COLOR }} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Marketing & Listing Ledger</h3>
            <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-tertiary)' }}>GTM Preparation Expenses</p>
          </div>
        </div>
        {!isLocked && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all hover:shadow-sm"
            style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)', border: '1px solid var(--border-ui)' }}
          >
            {isSaving ? (
              <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }} />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {isSaving ? 'Saving' : 'Save Ledger'}
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Staging Costs */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Layers className="w-3 h-3" /> Staging Costs
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-3.5 w-3.5 text-[#A5A5A5] group-focus-within:text-[#595959] transition-colors" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={stagingCosts ? stagingCosts.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('stagingCosts', e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-sm pl-9 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Photography & Media */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Camera className="w-3 h-3" /> Photography & Media
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-3.5 w-3.5 text-[#A5A5A5] group-focus-within:text-[#595959] transition-colors" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={photographyAndMedia ? photographyAndMedia.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('photographyAndMedia', e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-sm pl-9 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* MLS/Listing Fees */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Share2 className="w-3 h-3" /> MLS/Listing Fees
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-3.5 w-3.5 text-[#A5A5A5] group-focus-within:text-[#595959] transition-colors" />
              </div>
              <input
                type="text"
                disabled={isLocked}
                value={mlsListingFees ? mlsListingFees.toLocaleString() : ''}
                onChange={(e) => handleCurrencyChange('mlsListingFees', e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-sm pl-9 pr-4 py-2.5 rounded-[8px] focus:outline-none transition-all disabled:opacity-50"
                style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* ── Aggregation Footer ── */}
        <div className="pt-6 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>Total Marketing Costs</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(totalMarketingCosts)}</span>
            <div className="w-2 h-2 rounded-full bg-[#595959]/20" />
          </div>
        </div>
      </div>
    </section>
  );
}
