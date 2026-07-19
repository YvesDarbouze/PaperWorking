'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Plus, FileText, Trash2, ArrowUpRight, TrendingUp, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ValuationEntry } from '@/types/schema';

interface Props {
  projectId: string;
  currentValue: ValuationEntry[];
  onAddValuation: (newEntry: ValuationEntry) => Promise<void>;
  onDeleteValuation: (id: string) => Promise<void>;
}

export function CurrentValueTracker({ projectId, currentValue = [], onAddValuation, onDeleteValuation }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [valAmount, setValAmount] = useState('');
  const [valDate, setValDate] = useState(new Date().toISOString().slice(0, 10));
  const [valSource, setValSource] = useState<'user_assumption' | 'appraisal' | 'bpo' | 'avm'>('user_assumption');
  const [docName, setDocName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chronological sorting (newest first)
  const sortedValuations = [...currentValue].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate appreciation if we have at least 2 valuations
  const appreciationMetrics = (() => {
    if (currentValue.length < 2) return null;
    const chronoValuations = [...currentValue].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const earliest = chronoValuations[0];
    const latest = chronoValuations[chronoValuations.length - 1];
    const diff = latest.value - earliest.value;
    const pct = earliest.value > 0 ? (diff / earliest.value) * 100 : 0;
    return {
      earliest,
      latest,
      diff,
      pct,
      isGain: diff >= 0
    };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(valAmount.replace(/,/g, ''));
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Please enter a valid valuation amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const isDocSource = valSource === 'appraisal' || valSource === 'bpo';
      const entry: ValuationEntry = {
        id: `val-${Date.now()}`,
        date: valDate,
        value: Math.round(parsed * 100),
        source: valSource,
        documentUrl: isDocSource ? `https://firebasestorage.googleapis.com/v0/b/paperworking.appspot.com/o/valuations%2F${projectId}%2F${Date.now()}.pdf` : null,
        documentName: isDocSource ? (docName.trim() || `${valSource.toUpperCase()} Document`) : null
      };

      await onAddValuation(entry);
      setValAmount('');
      setDocName('');
      setShowAddForm(false);
      toast.success('New valuation recorded');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'user_assumption': return 'User Assumption';
      case 'appraisal': return 'Appraisal Report';
      case 'bpo': return 'Broker Price Opinion';
      case 'avm': return 'Automated Valuation (AVM)';
      default: return src;
    }
  };

  return (
    <div className="glass-card border border-white/5 rounded-xl p-5 space-y-5 text-left">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-wider">
            Market &amp; Valuation (Card H4.1)
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">
            Current Estimated Value
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-3 py-1.5 rounded-lg transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Valuation'}
        </button>
      </div>

      <p className="text-xs text-[#9E9DA0] leading-relaxed">
        Vacancy and appreciation are crucial components of long-run property yields. Record purchase-to-hold valuation estimates to capture equity growth instead of guessing at Exit.
      </p>

      {/* Appreciation Banner */}
      {appreciationMetrics && (
        <div className={`p-4 border rounded-xl flex items-center justify-between ${
          appreciationMetrics.isGain
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5" />
            <div className="text-xs">
              <span className="font-bold text-white">Appreciation Tracked:</span>
              <p className="text-[#9E9DA0] mt-0.5">
                From {new Date(appreciationMetrics.earliest.date).toLocaleDateString()} to {new Date(appreciationMetrics.latest.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold block">
              {appreciationMetrics.isGain ? '+' : ''}${(appreciationMetrics.diff / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-semibold text-[#9E9DA0]">
              ({appreciationMetrics.isGain ? '+' : ''}{appreciationMetrics.pct.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Add Valuation Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#9E9DA0] flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#7A9EAA]" />
                Value Estimate ($)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 265,000.00"
                value={valAmount}
                onChange={e => setValAmount(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#9E9DA0] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#7A9EAA]" />
                Valuation Date
              </label>
              <input
                type="date"
                required
                value={valDate}
                onChange={e => setValDate(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none filter invert"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Valuation Source</label>
              <select
                value={valSource}
                onChange={e => setValSource(e.target.value as any)}
                className="bg-[#121014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none"
              >
                <option value="user_assumption">User Assumption</option>
                <option value="appraisal">Appraisal Report</option>
                <option value="bpo">Broker Price Opinion (BPO)</option>
                <option value="avm">Automated (AVM)</option>
              </select>
            </div>
          </div>

          {(valSource === 'appraisal' || valSource === 'bpo') && (
            <div className="space-y-2 border-t border-white/5 pt-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Document / File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Appraisal Report - Apex.pdf"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none"
                />
              </div>
              <div className="border border-dashed border-white/10 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 transition">
                <FileText className="w-6 h-6 text-[#7A9EAA] mx-auto mb-1.5" />
                <span className="text-[10px] text-[#9E9DA0]">Click to select Appraisal/BPO file to upload</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[#9E9DA0] bg-white/5 px-3 py-1.5 rounded hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-white font-bold bg-[#7A9EAA] px-4 py-1.5 rounded hover:bg-[#7A9EAA]/80 transition"
            >
              {isSubmitting ? 'Recording...' : 'Add Valuation'}
            </button>
          </div>
        </form>
      )}

      {/* History Timeline */}
      <div className="space-y-3">
        <p className="text-[10px] text-[#9E9DA0] uppercase font-bold tracking-wider">
          Valuation History Series
        </p>

        {sortedValuations.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-white/5 rounded-xl">
            <p className="text-xs text-[#9E9DA0]/60">No valuations recorded yet. Add your initial assumption above.</p>
          </div>
        ) : (
          <div className="relative border-l border-white/10 ml-2 pl-4 space-y-4">
            {sortedValuations.map((val, idx) => {
              const isLatest = idx === 0;

              return (
                <div key={val.id} className="relative flex justify-between items-start text-xs text-left">
                  {/* Circle dot on line */}
                  <div className={`absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border ${
                    isLatest
                      ? 'bg-[#7A9EAA] border-[#7A9EAA] shadow-[0_0_8px_rgba(122,158,170,0.5)]'
                      : 'bg-[#121014] border-white/20'
                  }`} />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm font-mono">
                        ${(val.value / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        val.source === 'appraisal' ? 'bg-[#7A9EAA]/25 text-[#7A9EAA]' : 'bg-white/5 text-[#9E9DA0]'
                      }`}>
                        {getSourceLabel(val.source)}
                      </span>
                    </div>

                    {val.documentUrl && (
                      <a
                        href={val.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#7A9EAA] hover:underline flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{val.documentName || 'Download Document'}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-medium text-[#9E9DA0]">{new Date(val.date).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => onDeleteValuation(val.id)}
                      className="p-1 text-[#9E9DA0] hover:text-red-400 rounded transition"
                      title="Delete Valuation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
