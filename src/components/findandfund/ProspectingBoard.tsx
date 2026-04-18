'use client';

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  Search, Plus, X, ChevronDown, ChevronUp, MapPin,
  DollarSign, TrendingUp, Users2, ToggleLeft, ToggleRight,
  FileText, MoreHorizontal,
} from 'lucide-react';
import type { ProspectProperty, ProspectStatus, OfferLetter } from '@/types/schema';
import toast from 'react-hot-toast';
import OfferLetterGenerator from './OfferLetterGenerator';

const CrowdfundInviteModal = lazy(() => import('@/components/team/CrowdfundInviteModal'));

/* ═══════════════════════════════════════════════════════
   ProspectingBoard — Active Prospect Pipeline
   Card-based UI for listing homes currently under
   prospecting. Includes offer letter generation,
   tracking, and syndication toggle.
   ═══════════════════════════════════════════════════════ */

const STATUS_FLOW: ProspectStatus[] = ['Researching', 'Offer Sent', 'Counter', 'Accepted', 'Dead'];

const STATUS_COLORS: Record<ProspectStatus, string> = {
  Researching: 'bg-blue-50 text-blue-600',
  'Offer Sent': 'bg-amber-50 text-amber-600',
  Counter: 'bg-orange-50 text-orange-600',
  Accepted: 'bg-emerald-50 text-emerald-600',
  Dead: 'bg-red-50 text-red-500',
};

const EMPTY_PROSPECT: Omit<ProspectProperty, 'id' | 'maxOffer' | 'offerLetters' | 'createdAt'> = {
  address: '',
  askingPrice: 0,
  estimatedARV: 0,
  estimatedRepairs: 0,
  status: 'Researching',
  syndicationEnabled: false,
  notes: '',
};

export default function ProspectingBoard() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateProspects = useProjectStore((s) => s.updateProspects);
  const prospects = currentProject?.prospects || [];

  const [expanded, setExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [crowdfundTarget, setCrowdfundTarget] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_PROSPECT);

  const totalEquity = currentProject?.fractionalInvestors?.reduce((s, i) => s + i.equityPercentage, 0) || 0;

  const setField = useCallback(
    <K extends keyof typeof EMPTY_PROSPECT>(key: K, value: (typeof EMPTY_PROSPECT)[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    []
  );

  const calc70 = (arv: number, repairs: number) => Math.max(0, arv * 0.7 - repairs);

  const handleAdd = () => {
    if (!form.address.trim()) {
      toast.error('Address is required.');
      return;
    }
    const prospect: ProspectProperty = {
      ...form,
      id: `prsp_${Date.now()}`,
      maxOffer: calc70(form.estimatedARV, form.estimatedRepairs),
      offerLetters: [],
      createdAt: new Date(),
    };
    if (currentProject) {
      updateProspects(currentProject.id, [...prospects, prospect]);
      toast.success(`${form.address} added to pipeline.`);
    }
    setForm(EMPTY_PROSPECT);
    setShowAddForm(false);
  };

  const updateProspect = (id: string, updates: Partial<ProspectProperty>) => {
    if (!currentProject) return;
    const updated = prospects.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    updateProspects(currentProject.id, updated);
  };

  const removeProspect = (id: string) => {
    if (!currentProject) return;
    updateProspects(currentProject.id, prospects.filter((p) => p.id !== id));
    toast.success('Prospect removed.');
  };

  const updateOfferLetters = (prospectId: string, letters: OfferLetter[]) => {
    updateProspect(prospectId, { offerLetters: letters });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50/60 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pw-subtle/30 flex items-center justify-center">
            <Search className="w-4.5 h-4.5 text-gray-600" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Prospecting Board</h2>
            <p className="text-sm text-gray-500">
              {prospects.length} active prospect{prospects.length !== 1 ? 's' : ''} in pipeline
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Status Pipeline Summary */}
          {prospects.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {STATUS_FLOW.map((status) => {
                const count = prospects.filter((p) => p.status === status).length;
                return (
                  <span
                    key={status}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${count > 0 ? STATUS_COLORS[status] : 'bg-gray-50 text-gray-300'}`}
                  >
                    {status} ({count})
                  </span>
                );
              })}
            </div>
          )}

          {/* Prospect Cards */}
          <div className="space-y-3">
            {prospects.map((prospect) => {
              const isExpanded = expandedCardId === prospect.id;
              const maxOffer = calc70(prospect.estimatedARV, prospect.estimatedRepairs);
              const passesRule = prospect.askingPrice <= maxOffer;

              return (
                <div
                  key={prospect.id}
                  className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition"
                >
                  {/* Card Header */}
                  <div className="px-4 py-3 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{prospect.address}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[prospect.status]}`}>
                            {prospect.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            Ask: ${prospect.askingPrice.toLocaleString()} · Max: ${maxOffer.toLocaleString()}
                          </span>
                          {!passesRule && prospect.askingPrice > 0 && (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">ABOVE 70% RULE</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Syndication Toggle */}
                      <button
                        onClick={() => updateProspect(prospect.id, { syndicationEnabled: !prospect.syndicationEnabled })}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition ${
                          prospect.syndicationEnabled
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'bg-gray-50 text-gray-400 hover:text-gray-600'
                        }`}
                        title={prospect.syndicationEnabled ? 'Syndication ON' : 'Syndication OFF'}
                      >
                        {prospect.syndicationEnabled ? (
                          <ToggleRight className="w-3.5 h-3.5" />
                        ) : (
                          <ToggleLeft className="w-3.5 h-3.5" />
                        )}
                        <Users2 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => setExpandedCardId(isExpanded ? null : prospect.id)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-50 bg-gray-50/30 space-y-4">
                      {/* Financial Snapshot */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { label: 'Asking', value: `$${prospect.askingPrice.toLocaleString()}` },
                          { label: 'Est. ARV', value: `$${prospect.estimatedARV.toLocaleString()}` },
                          { label: 'Est. Repairs', value: `$${prospect.estimatedRepairs.toLocaleString()}` },
                          { label: '70% Max Offer', value: `$${maxOffer.toLocaleString()}`, highlight: true },
                        ].map((m) => (
                          <div key={m.label} className={`rounded-lg px-3 py-2 ${m.highlight ? 'bg-gray-900 text-white' : 'bg-white border border-gray-100'}`}>
                            <p className={`text-xs font-bold uppercase tracking-widest ${m.highlight ? 'text-gray-400' : 'text-gray-400'}`}>{m.label}</p>
                            <p className={`text-sm font-semibold mt-0.5 ${m.highlight ? 'text-white' : 'text-gray-900'}`}>{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Status Transition */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Move Status</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {STATUS_FLOW.map((s) => (
                            <button
                              key={s}
                              onClick={() => updateProspect(prospect.id, { status: s })}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                prospect.status === s
                                  ? 'bg-gray-900 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Offer Letters Section */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Offer Letters ({prospect.offerLetters.length})
                        </p>
                        <OfferLetterGenerator
                          letters={prospect.offerLetters}
                          onUpdate={(letters) => updateOfferLetters(prospect.id, letters)}
                        />
                      </div>

                      {/* Syndication CTA */}
                      {prospect.syndicationEnabled && currentProject && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-indigo-700">Syndication Active</p>
                            <p className="text-xs text-indigo-500">Invite investors to co-fund this prospect.</p>
                          </div>
                          <button
                            onClick={() => setCrowdfundTarget(prospect.id)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                          >
                            Invite Investor
                          </button>
                        </div>
                      )}

                      {/* Notes */}
                      <textarea
                        value={prospect.notes}
                        onChange={(e) => updateProspect(prospect.id, { notes: e.target.value })}
                        placeholder="Notes about this prospect…"
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition resize-none"
                      />

                      {/* Remove */}
                      <button
                        onClick={() => removeProspect(prospect.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium transition"
                      >
                        Remove Prospect
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Prospect Form */}
          {showAddForm ? (
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Add Prospect</h3>
                <button onClick={() => setShowAddForm(false)} className="p-1 rounded hover:bg-gray-200 text-gray-400 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />Address
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="456 Prospect Ave, Tampa, FL"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                  />
                </div>
                {[
                  { key: 'askingPrice' as const, label: 'Asking Price' },
                  { key: 'estimatedARV' as const, label: 'Est. ARV' },
                  { key: 'estimatedRepairs' as const, label: 'Est. Repairs' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      <DollarSign className="w-3 h-3 inline mr-1" />{label}
                    </label>
                    <input
                      type="number"
                      value={form[key] || ''}
                      onChange={(e) => setField(key, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    />
                  </div>
                ))}
              </div>

              {/* 70% Rule Preview */}
              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  70% Max Offer
                </div>
                <span className="text-sm font-bold text-gray-900">
                  ${calc70(form.estimatedARV, form.estimatedRepairs).toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleAdd}
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
              >
                Add to Pipeline
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition font-medium"
            >
              <Plus className="w-4 h-4" /> Add Prospect
            </button>
          )}
        </div>
      )}

      {/* Crowdfund Modal (uses existing component) */}
      {crowdfundTarget && currentProject && (
        <Suspense fallback={null}>
          <CrowdfundInviteModal
            projectId={currentProject.id}
            dealName={currentProject.propertyName}
            currentEquityAllocated={totalEquity}
            onClose={() => setCrowdfundTarget(null)}
          />
        </Suspense>
      )}
    </section>
  );
}
