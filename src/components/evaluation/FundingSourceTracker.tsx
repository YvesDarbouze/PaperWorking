'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Landmark, Wallet, Users, Plus, Check, ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Funding Source Tracker — Phase 1 Module
   Tracks Hard Money, Traditional, and Private funding sources.
   ═══════════════════════════════════════════════════════ */

type FundingType = 'Hard Money' | 'Traditional' | 'Private';

interface FundingSource {
  id: string;
  type: FundingType;
  lenderName: string;
  amount: number;
  interestRate: number;
  term: string;
  status: 'Pre-Approved' | 'Applied' | 'Approved' | 'Funded';
}

const FUNDING_ICONS: Record<FundingType, React.ReactNode> = {
  'Hard Money': <Wallet className="w-4 h-4" />,
  'Traditional': <Landmark className="w-4 h-4" />,
  'Private': <Users className="w-4 h-4" />,
};

const STATUS_STYLES: Record<FundingSource['status'], string> = {
  'Pre-Approved': 'bg-blue-50 text-blue-700 border-blue-200',
  'Applied': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Funded': 'bg-gray-900 text-white border-gray-900',
};

const INITIAL_SOURCES: FundingSource[] = [
  { id: '1', type: 'Hard Money', lenderName: 'Kiavi', amount: 200000, interestRate: 10.5, term: '12 months', status: 'Pre-Approved' },
  { id: '2', type: 'Traditional', lenderName: 'Wells Fargo', amount: 180000, interestRate: 7.25, term: '30 years', status: 'Applied' },
];

export default function FundingSourceTracker() {
  const currentProject = useProjectStore(state => state.currentProject);
  const [sources, setSources] = useState<FundingSource[]>(INITIAL_SOURCES);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<FundingType>('Hard Money');

  const totalFunding = sources.reduce((s, f) => s + f.amount, 0);
  const purchasePrice = currentProject?.financials?.purchasePrice || 0;
  const gap = Math.max(0, purchasePrice - totalFunding);

  const handleAddSource = () => {
    setSources([
      ...sources,
      {
        id: Math.random().toString(36).slice(2, 8),
        type: newType,
        lenderName: '',
        amount: 0,
        interestRate: 0,
        term: '',
        status: 'Applied',
      },
    ]);
    setShowAdd(false);
  };

  const updateSource = (id: string, field: keyof FundingSource, value: string | number) => {
    setSources(sources.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Landmark className="w-5 h-5 text-text-primary" />
          <h3 className="text-lg font-medium tracking-tight text-text-primary">Funding Sources</h3>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-bg-primary text-text-primary rounded-md hover:bg-gray-200 transition"
        >
          <Plus className="w-3 h-3" /> Add Source
        </button>
      </div>

      {/* Funding Gap Indicator */}
      {purchasePrice > 0 && (
        <div className="mb-5 p-3 rounded-lg bg-bg-primary border border-border-accent">
          <div className="flex justify-between text-xs text-text-secondary mb-1.5">
            <span>Funding Coverage</span>
            <span>
              ${totalFunding.toLocaleString()} / ${purchasePrice.toLocaleString()}
              {gap > 0 && <span className="text-red-500 ml-1">(Gap: ${gap.toLocaleString()})</span>}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                totalFunding >= purchasePrice ? 'bg-emerald-500' : totalFunding / purchasePrice > 0.7 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(100, (totalFunding / Math.max(1, purchasePrice)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Source Dropdown */}
      {showAdd && (
        <div className="mb-4 p-4 border border-border-accent rounded-lg bg-bg-primary flex items-center gap-3">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as FundingType)}
            className="text-sm border border-border-accent rounded-md px-3 py-1.5 focus:ring-1 focus:ring-gray-400 focus:outline-none"
          >
            <option value="Hard Money">Hard Money</option>
            <option value="Traditional">Traditional</option>
            <option value="Private">Private</option>
          </select>
          <button
            onClick={handleAddSource}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md hover:bg-gray-800 transition"
          >
            Create
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Source List */}
      <div className="space-y-3">
        {sources.map((src) => (
          <div key={src.id} className="p-4 border border-border-accent rounded-lg hover:bg-bg-primary transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-bg-primary flex items-center justify-center text-text-secondary">
                  {FUNDING_ICONS[src.type]}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{src.type}</p>
                  <input
                    type="text"
                    defaultValue={src.lenderName}
                    placeholder="Lender name..."
                    onChange={(e) => updateSource(src.id, 'lenderName', e.target.value)}
                    className="text-sm font-medium text-text-primary bg-transparent border-none p-0 focus:ring-0 w-full"
                  />
                </div>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[src.status]}`}>
                {src.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider block mb-0.5">Amount</label>
                <input
                  type="number"
                  defaultValue={src.amount}
                  onChange={(e) => updateSource(src.id, 'amount', Number(e.target.value))}
                  className="text-sm font-medium text-text-primary bg-bg-primary border border-border-accent rounded px-2 py-1 w-full focus:ring-1 focus:ring-gray-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider block mb-0.5">Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={src.interestRate}
                  onChange={(e) => updateSource(src.id, 'interestRate', Number(e.target.value))}
                  className="text-sm font-medium text-text-primary bg-bg-primary border border-border-accent rounded px-2 py-1 w-full focus:ring-1 focus:ring-gray-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider block mb-0.5">Term</label>
                <input
                  type="text"
                  defaultValue={src.term}
                  placeholder="12 months"
                  onChange={(e) => updateSource(src.id, 'term', e.target.value)}
                  className="text-sm font-medium text-text-primary bg-bg-primary border border-border-accent rounded px-2 py-1 w-full focus:ring-1 focus:ring-gray-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}

        {sources.length === 0 && (
          <div className="p-8 text-center text-text-secondary border-2 border-dashed border-border-accent rounded-lg">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No funding sources tracked yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
