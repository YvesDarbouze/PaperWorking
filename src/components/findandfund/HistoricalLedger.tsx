'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  Archive, Plus, X, ChevronDown, ChevronUp,
  DollarSign, Calendar, MapPin, FileText, TrendingUp, ArrowRight
} from 'lucide-react';
import type { HistoricalProperty } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   HistoricalLedger — Track Record Intake
   
   Institutional-grade ledger for logging past acquisitions.
   Enforces document density and high-contrast clarity.
   ═══════════════════════════════════════════════════════ */

const EMPTY_FORM: Omit<HistoricalProperty, 'id' | 'netProfit'> = {
  address: '',
  purchasePrice: 0,
  salePrice: 0,
  purchaseDate: new Date(),
  saleDate: new Date(),
  totalRehabCost: 0,
  holdingCostTotal: 0,
  notes: '',
};

export default function HistoricalLedger() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateHistoricalProperties = useProjectStore((s) => s.updateHistoricalProperties);
  const properties = currentProject?.historicalProperties || [];

  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);

  const set = useCallback(
    <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    []
  );

  const summary = useMemo(() => {
    if (!properties.length) return null;
    const totalProfit = properties.reduce((s, p) => s + p.netProfit, 0);
    const totalInvested = properties.reduce((s, p) => s + p.purchasePrice + p.totalRehabCost + p.holdingCostTotal, 0);
    const avgROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    const avgHoldDays = properties.reduce((s, p) => {
      const d1 = new Date(p.purchaseDate).getTime();
      const d2 = new Date(p.saleDate).getTime();
      return s + Math.max(0, Math.round((d2 - d1) / 86_400_000));
    }, 0) / properties.length;
    return { totalProfit, avgROI, avgHoldDays: Math.round(avgHoldDays), count: properties.length };
  }, [properties]);

  const handleAdd = () => {
    if (!form.address.trim()) {
      toast.error('VALIDATION_FAILURE: Address required for indexing.');
      return;
    }
    const net = form.salePrice - form.purchasePrice - form.totalRehabCost - form.holdingCostTotal;
    const entry: HistoricalProperty = {
      ...form,
      id: `hist_${Date.now()}`,
      netProfit: net,
    };
    if (currentProject) {
      updateHistoricalProperties(currentProject.id, [...properties, entry]);
      toast.success('ENTRY_LOGGED: Ledger synchronized.');
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    if (currentProject) {
      updateHistoricalProperties(currentProject.id, properties.filter((p) => p.id !== id));
      toast.success('ENTRY_PURGED: Index updated.');
    }
  };

  return (
    <section className="bg-bg-surface border border-pw-black overflow-hidden flex flex-col">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 bg-pw-black text-pw-white hover:bg-pw-accent transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 border border-pw-white/20 flex items-center justify-center">
            <Archive className="w-4.5 h-4.5 text-pw-accent" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black uppercase tracking-[0.4em]">HISTORICAL_LEDGER</h2>
            <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-0.5">
              {properties.length} ENTITIES_INDEXED
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-6 pb-8 pt-6 space-y-6 flex flex-1 flex-col overflow-hidden">
          
          {/* Summary Matrix */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-pw-border border border-border-accent">
              {[
                { label: 'CLOSED_DEALS', value: summary.count.toString() },
                { label: 'CUMULATIVE_P/L', value: `$${summary.totalProfit.toLocaleString()}`, highlight: true },
                { label: 'AVG_ROI_VECTOR', value: `${summary.avgROI.toFixed(1)}%` },
                { label: 'MEAN_HOLD_TIME', value: `${summary.avgHoldDays}D` },
              ].map((m) => (
                <div key={m.label} className="bg-bg-primary px-6 py-4">
                  <p className="text-xs font-black text-text-secondary uppercase tracking-[0.3em] mb-1">{m.label}</p>
                  <p className={`text-lg font-black tracking-tighter font-mono ${m.highlight ? 'text-pw-accent' : 'text-text-primary'}`}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {properties.length > 0 && (
            <div className="overflow-x-auto border border-border-accent">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-primary border-b border-border-accent">
                    {['ASSET_VECTOR', 'BUY_IN', 'EXIT_VAL', 'REHAB_EXP', 'NET_P/L', ''].map((h) => (
                      <th key={h} className="text-xs font-black text-text-secondary uppercase tracking-widest py-3 px-4 border-r border-border-accent last:border-r-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-pw-border">
                  {properties.map((p) => (
                    <tr key={p.id} className="group hover:bg-bg-primary transition-colors">
                      <td className="py-4 px-4 text-xs font-black text-text-primary uppercase tracking-tight border-r border-border-accent">{p.address}</td>
                      <td className="py-4 px-4 text-xs font-black text-text-primary font-mono border-r border-border-accent tracking-tighter">${p.purchasePrice.toLocaleString()}</td>
                      <td className="py-4 px-4 text-xs font-black text-text-primary font-mono border-r border-border-accent tracking-tighter">${p.salePrice.toLocaleString()}</td>
                      <td className="py-4 px-4 text-xs font-black text-text-primary font-mono border-r border-border-accent tracking-tighter">${p.totalRehabCost.toLocaleString()}</td>
                      <td className={`py-4 px-4 text-xs font-black border-r border-border-accent font-mono tracking-tighter ${p.netProfit >= 0 ? 'text-pw-accent' : 'text-text-secondary'}`}>
                        {p.netProfit >= 0 ? '+' : ''}${p.netProfit.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button onClick={() => handleRemove(p.id)} className="text-pw-border hover:text-text-secondary transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Intake Form */}
          {showForm ? (
            <div className="border border-pw-black p-8 bg-bg-primary flex flex-col gap-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border-accent pb-4">
                <h3 className="text-xs font-black text-text-primary uppercase tracking-[0.4em]">INIT_LOG_PROTOCOL</h3>
                <button onClick={() => setShowForm(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Address */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-black text-text-secondary uppercase tracking-[0.3em]">
                    <MapPin className="w-3 h-3 inline mr-1 text-pw-accent" />ASSET_LAT_LONG_IDENT
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="E.G. 123 MAIN ST, MIAMI, FL"
                    className="w-full border border-border-accent bg-bg-surface px-5 py-4 text-sm font-black uppercase tracking-widest focus:border-pw-black focus:outline-none transition-all"
                  />
                </div>

                {/* Financials */}
                {[
                  { key: 'purchasePrice' as const, label: 'ENTRY_CAPITAL', icon: DollarSign },
                  { key: 'salePrice' as const, label: 'EXIT_CAPITAL', icon: DollarSign },
                  { key: 'totalRehabCost' as const, label: 'REHAB_INVEST', icon: DollarSign },
                  { key: 'holdingCostTotal' as const, label: 'PERIOD_COSTS', icon: DollarSign },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="space-y-2">
                    <label className="block text-xs font-black text-text-secondary uppercase tracking-[0.3em]">
                      <Icon className="w-3 h-3 inline mr-1 text-pw-accent" />{label}
                    </label>
                    <input
                      type="number"
                      value={form[key] || ''}
                      onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full border border-border-accent bg-bg-surface px-5 py-4 text-sm font-black font-mono tracking-tighter focus:border-pw-black focus:outline-none transition-all"
                    />
                  </div>
                ))}
              </div>

              {/* Computed State */}
              <div className="flex items-center justify-between bg-pw-black px-6 py-5 border border-pw-black">
                <div className="flex items-center gap-3 text-xs font-black text-pw-white uppercase tracking-widest">
                  <TrendingUp className="w-4 h-4 text-pw-accent" />
                  DELTA_NET_PROJECTION
                </div>
                <span className={`text-sm font-black font-mono tracking-tighter ${(form.salePrice - form.purchasePrice - form.totalRehabCost - form.holdingCostTotal) >= 0 ? 'text-pw-accent' : 'text-text-secondary'}`}>
                  ${(form.salePrice - form.purchasePrice - form.totalRehabCost - form.holdingCostTotal).toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleAdd}
                className="w-full py-5 bg-pw-black text-pw-white text-sm font-black uppercase tracking-[0.4em] hover:bg-pw-accent transition-all flex items-center justify-center gap-4 group"
              >
                <span>COMM_LOG_ACQUISITION</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-3 w-full py-6 border border-dashed border-border-accent text-xs font-black text-text-secondary hover:text-text-primary hover:border-pw-black transition-all uppercase tracking-[0.3em]"
            >
              <Plus className="w-4 h-4 text-pw-accent" /> LOG_PAST_ACQUISITION
            </button>
          )}
        </div>
      )}
    </section>
  );
}
