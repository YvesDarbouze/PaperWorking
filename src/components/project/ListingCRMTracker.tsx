'use client';

import React from 'react';
import type { ProjectFinancials } from '@/types/schema';
import { Users, Calendar, Activity, MessageSquare, Hash, Save } from 'lucide-react';

interface ListingCRMTrackerProps {
  financials: Partial<ProjectFinancials>;
  onChange: (updated: Partial<ProjectFinancials>) => void;
  onSave: () => void;
  isSaving: boolean;
  isLocked?: boolean;
}

const PHASE_COLOR = '#595959';

export function ListingCRMTracker({ financials, onChange, onSave, isSaving, isLocked }: ListingCRMTrackerProps) {
  const listingDate = financials.listingDate ? new Date(financials.listingDate) : null;
  const soldDate = financials.soldDate ? new Date(financials.soldDate) : null;
  const mlsNumber = financials.mlsNumber || '';
  const numberOfShowings = financials.numberOfShowings || 0;
  const openHouseFeedback = financials.openHouseFeedback || '';

  // Calculate Days on Market
  const calculateDOM = () => {
    if (!listingDate) return 0;
    const end = soldDate ? soldDate : new Date();
    const diffTime = Math.abs(end.getTime() - listingDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const dom = calculateDOM();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    if (e.target.value) {
      // Create a date at noon local time to avoid timezone shifts
      const [year, month, day] = e.target.value.split('-').map(Number);
      const newDate = new Date(year, month - 1, day, 12, 0, 0);
      onChange({ listingDate: newDate });
    } else {
      onChange({ listingDate: undefined });
    }
  };

  return (
    <section className="rounded-lg overflow-hidden flex flex-col h-full" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
            <Activity className="w-4 h-4" style={{ color: PHASE_COLOR }} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Listing CRM Tracker</h3>
            <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Market Performance</p>
          </div>
        </div>
        {!isLocked && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
            style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)', border: '1px solid var(--border-ui)' }}
          >
            {isSaving ? (
              <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }} />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {isSaving ? 'Saving' : 'Save CRM'}
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col gap-6 flex-1">
        
        {/* Metric Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-md border" style={{ borderColor: 'var(--border-ui)' }}>
             <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5" style={{ color: PHASE_COLOR }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Days on Market</span>
             </div>
             <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{dom}</span>
             <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>From listing date</p>
          </div>

          <div className="p-4 rounded-md border" style={{ borderColor: 'var(--border-ui)' }}>
             <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5" style={{ color: PHASE_COLOR }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Total Showings</span>
             </div>
             <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{numberOfShowings}</span>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          {/* Listing Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar className="w-3 h-3" /> Listing Date
            </label>
            <input
              type="date"
              disabled={isLocked}
              value={listingDate ? listingDate.toISOString().split('T')[0] : ''}
              onChange={handleDateChange}
              className="w-full bg-transparent text-sm p-2.5 rounded-md focus:outline-none transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* MLS Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Hash className="w-3 h-3" /> MLS Number
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={mlsNumber}
                onChange={(e) => !isLocked && onChange({ mlsNumber: e.target.value })}
                placeholder="e.g. 12345678"
                className="w-full bg-transparent text-sm p-2.5 rounded-md focus:outline-none transition-colors disabled:opacity-50"
                style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Showings Count */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Users className="w-3 h-3" /> Showings Logged
              </label>
              <input
                type="number"
                min="0"
                disabled={isLocked}
                value={numberOfShowings === 0 ? '' : numberOfShowings}
                onChange={(e) => !isLocked && onChange({ numberOfShowings: e.target.value ? Number(e.target.value) : 0 })}
                placeholder="0"
                className="w-full bg-transparent text-sm p-2.5 rounded-md focus:outline-none transition-colors disabled:opacity-50"
                style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Open House Feedback */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <MessageSquare className="w-3 h-3" /> Open House Feedback
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={openHouseFeedback}
              onChange={(e) => !isLocked && onChange({ openHouseFeedback: e.target.value })}
              placeholder="Record notes from recent showings or open houses..."
              className="w-full bg-transparent text-sm p-2.5 rounded-md focus:outline-none transition-colors resize-none disabled:opacity-50"
              style={{ border: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
