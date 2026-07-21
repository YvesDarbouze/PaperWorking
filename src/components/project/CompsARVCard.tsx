'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, MapPin, Calculator, AlertCircle, Check, DollarSign } from 'lucide-react';
import type { Project } from '@/types/schema';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

interface CompsARVCardProps {
  project: Project;
  phaseColor?: string;
  onSave: (updates: any) => Promise<void>;
}

interface LocalComp {
  id?: string;
  addressLine: string;
  soldPrice: number;
  soldDate: string;
  sqft: number;
  distanceMiles: number;
  condition: string;
}

export function CompsARVCard({
  project,
  phaseColor = '#595959',
  onSave,
}: CompsARVCardProps) {
  // Load initial comps from project
  const initialComps: LocalComp[] = useMemo(() => {
    const rawComps = project.comps || [];
    return rawComps.map((c: any) => ({
      id: c.id,
      addressLine: c.addressLine || '',
      soldPrice: c.soldPriceCents ? Number(c.soldPriceCents) / 100 : c.priceCents ? Number(c.priceCents) / 100 : 0,
      soldDate: c.soldDate ? new Date(c.soldDate).toISOString().split('T')[0] : c.listedDate ? new Date(c.listedDate).toISOString().split('T')[0] : '',
      sqft: c.sqft || 0,
      distanceMiles: c.distanceMiles || 0,
      condition: c.condition || 'Good',
    }));
  }, [project.comps]);

  const [comps, setComps] = useState<LocalComp[]>(initialComps);
  const [arv, setArv] = useState<string>(
    project.arvCents
      ? (Number(project.arvCents) / 100).toString()
      : project.financials?.estimatedARV
      ? project.financials.estimatedARV.toString()
      : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with project updates
  useEffect(() => {
    setComps(initialComps);
    setArv(
      project.arvCents
        ? (Number(project.arvCents) / 100).toString()
        : project.financials?.estimatedARV
        ? project.financials.estimatedARV.toString()
        : ''
    );
  }, [project, initialComps]);

  const liveMetrics = useMemo(() => {
    const tempFinancials = {
      ...project.financials,
      condition: project.condition,
      squareFootage: project.propertyFacts?.sqft || project.squareFootage || 0,
    };
    return deriveAllMetrics(
      tempFinancials as any,
      undefined,
      project.dispositionType,
      project.currentPhase,
      project.createdAt,
      undefined,
      { ...project, comps }
    );
  }, [project, comps]);

  const compRollups = liveMetrics.compRollups || { avgPricePerSqft: 0, impliedARV: 0, comps: [] };
  const showARVCard = liveMetrics.isARVRequired ?? false;
  const subjectSqft = project.propertyFacts?.sqft || project.squareFootage || 0;

  const handleAddComp = () => {
    const newComp: LocalComp = {
      addressLine: '',
      soldPrice: 0,
      soldDate: new Date().toISOString().split('T')[0],
      sqft: 0,
      distanceMiles: 0,
      condition: 'Good',
    };
    setComps([...comps, newComp]);
  };

  const handleUpdateComp = (index: number, fields: Partial<LocalComp>) => {
    const updated = comps.map((c, i) => (i === index ? { ...c, ...fields } : c));
    setComps(updated);
  };

  const handleDeleteComp = (index: number) => {
    const updated = comps.filter((_, i) => i !== index);
    setComps(updated);
  };

  const handleSaveAll = async (currentComps = comps, currentArv = arv) => {
    setIsSaving(true);
    try {
      const parsedArv = parseFloat(currentArv) || 0;
      const arvCents = Math.round(parsedArv * 100);

      // Convert local comps to database schema structure
      const compsPayload = currentComps.map((c) => ({
        addressLine: c.addressLine,
        soldPriceCents: Math.round(c.soldPrice * 100),
        soldDate: c.soldDate ? new Date(c.soldDate).toISOString() : null,
        sqft: c.sqft || null,
        distanceMiles: c.distanceMiles || null,
        condition: c.condition,
        compType: 'SALE',
      }));

      const updates: any = {
        comps: compsPayload,
        arvCents: arvCents || null,
        'financials.estimatedARV': parsedArv || null,
        'financials.arv': parsedArv || null,
      };

      await onSave(updates);
    } catch (err) {
      console.error('Failed to save comps and ARV:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isCompsComplete = comps.length >= 3;

  return (
    <div className="rounded-xl border border-white/5 bg-[#161217] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-white" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Comparables &amp; ARV</h4>
            <p className="text-[10px] text-[#9E9DA0] mt-0.5">Analyze market sales and determine After-Repair Value</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isCompsComplete ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
          }`}>
            {isCompsComplete ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            Comps: {comps.length}/3
          </div>
          <button
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="px-3 py-1 rounded bg-[#241e26] border border-white/10 hover:bg-white/5 text-white text-[9px] font-bold uppercase tracking-widest transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Comps'}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Comps Repeater list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Comparable Sales</span>
            <button
              onClick={handleAddComp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase tracking-widest transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Comp
            </button>
          </div>

          {comps.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-white/5 rounded-lg text-xs text-[#9E9DA0]">
              No comparables added yet. Click "Add Comp" to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {comps.map((comp, index) => {
                const ppsqft = compRollups.comps[index]?.ppsqft ?? 0;
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-[#241e26] border border-white/5 rounded-lg relative group"
                  >
                    {/* Address (Span 4) */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[8px] uppercase tracking-widest text-[#9E9DA0]">Address</label>
                      <input
                        type="text"
                        value={comp.addressLine}
                        onChange={(e) => handleUpdateComp(index, { addressLine: e.target.value })}
                        className="w-full rounded px-2.5 py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                        placeholder="123 Comp St"
                      />
                    </div>

                    {/* Price (Span 2) */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[8px] uppercase tracking-widest text-[#9E9DA0]">Price ($)</label>
                      <input
                        type="number"
                        value={comp.soldPrice || ''}
                        onChange={(e) => handleUpdateComp(index, { soldPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded px-2.5 py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                        placeholder="Price"
                      />
                    </div>

                    {/* Sqft (Span 1.5) */}
                    <div className="md:col-span-1.5 space-y-1">
                      <label className="text-[8px] uppercase tracking-widest text-[#9E9DA0]">Sqft</label>
                      <input
                        type="number"
                        value={comp.sqft || ''}
                        onChange={(e) => handleUpdateComp(index, { sqft: parseInt(e.target.value) || 0 })}
                        className="w-full rounded px-2.5 py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                        placeholder="Sqft"
                      />
                    </div>

                    {/* Distance (Span 1.5) */}
                    <div className="md:col-span-1.5 space-y-1">
                      <label className="text-[8px] uppercase tracking-widest text-[#9E9DA0]">Distance (Mi)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={comp.distanceMiles || ''}
                        onChange={(e) => handleUpdateComp(index, { distanceMiles: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded px-2.5 py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                        placeholder="Miles"
                      />
                    </div>

                    {/* Condition (Span 1.5) */}
                    <div className="md:col-span-1.5 space-y-1">
                      <label className="text-[8px] uppercase tracking-widest text-[#9E9DA0]">Condition</label>
                      <select
                        value={comp.condition}
                        onChange={(e) => handleUpdateComp(index, { condition: e.target.value })}
                        className="w-full rounded px-2 py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#454955]"
                      >
                        <option value="Turnkey">Turnkey</option>
                        <option value="Good">Good</option>
                        <option value="Needs Rehab">Needs Rehab</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>

                    {/* $/sqft indicator & Action Button (Span 1.5) */}
                    <div className="md:col-span-1.5 flex items-center justify-between pt-4 md:pt-0">
                      <div className="space-y-1">
                        <label className="text-[8px] block uppercase tracking-widest text-[#9E9DA0]">$/Sqft</label>
                        <span className="text-[10px] font-mono font-bold text-white">
                          {ppsqft > 0 ? `$${ppsqft.toFixed(2)}` : '—'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteComp(index)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-[#9E9DA0] hover:text-red-400 transition-colors"
                        title="Delete Comp"
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

        {/* Rollups and ARV Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
          {/* Rollup Summary Card */}
          <div className="rounded-lg bg-white/[0.01] border border-white/5 p-4 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] block border-b border-white/5 pb-2">
              Comps Rollup Analytics
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0]">Avg Price/Sqft</span>
                <span className="text-sm font-bold text-white font-mono">
                  {compRollups.avgPricePerSqft > 0 ? `$${compRollups.avgPricePerSqft.toFixed(2)}/sqft` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0]">Comp-Implied Value</span>
                <span className="text-sm font-bold text-[#7A9EAA] font-mono">
                  {compRollups.impliedARV > 0 ? formatCurrency(compRollups.impliedARV) : '—'}
                </span>
                <span className="block text-[8px] text-[#9E9DA0] mt-0.5">
                  ({subjectSqft > 0 ? `${subjectSqft} subject sqft` : 'Subject sqft missing'})
                </span>
              </div>
            </div>
          </div>

          {/* Conditional ARV Sub-Card */}
          {showARVCard ? (
            <div className="rounded-lg bg-yellow-500/[0.02] border border-yellow-500/10 p-4 space-y-4">
              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                    After-Repair Value (ARV)
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-[#9E9DA0]">
                    Required Sub-Card
                  </span>
                </div>
                {/* Confirmation State Pill */}
                <div className="flex">
                  {compRollups.impliedARV > 0 && Math.abs((parseFloat(arv) || 0) - compRollups.impliedARV) < 1 ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-green-400 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Comp-Implied ARV Confirmed
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Custom ARV Declared (Suggestion pending confirmation)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {compRollups.impliedARV > 0 && (
                  <div className="p-2 rounded bg-yellow-500/5 border border-yellow-500/10 flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-yellow-400/80">Comp-Implied Suggestion</span>
                      <span className="text-xs font-mono font-bold text-white">
                        {formatCurrency(compRollups.impliedARV)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const val = compRollups.impliedARV.toString();
                        setArv(val);
                        handleSaveAll(comps, val);
                      }}
                      className="px-2 py-0.5 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-[8px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Use Suggestion
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
                    Declared ARV ($)
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <DollarSign className="h-3 w-3 text-[#9E9DA0]" />
                    </div>
                    <input
                      type="number"
                      value={arv}
                      onChange={(e) => {
                        setArv(e.target.value);
                        handleSaveAll(comps, e.target.value);
                      }}
                      className="w-full pl-7 rounded px-2.5 py-1.5 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#454955] font-mono"
                      placeholder="e.g. 350000"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-white/[0.01] border border-white/5 p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">
                ARV Not Required
              </span>
              <p className="text-[10px] text-[#9E9DA0] max-w-xs leading-relaxed">
                Property condition is Turnkey and disposition is not Sale. ARV calculation is optional.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
