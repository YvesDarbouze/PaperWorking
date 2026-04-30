'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '@/store/projectStore';
import { ComparableSale, LeadSource } from '@/types/schema';
import { Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle2, MapPin, Calendar } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Deal Analyzer — Phase 01 Sourcing
   Real-time MAO engine, comp grid, lead intelligence.
   ═══════════════════════════════════════════════════════ */

const LEAD_SOURCES: LeadSource[] = [
  'Wholesaler', 'MLS', 'REO', 'Direct Mail',
  'Auction', 'Probate', 'Driving for Dollars', 'Referral',
];

const MAX_COMPS = 5;

function parseCurrency(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
}

function fmtCurrency(n: number): string {
  if (n === 0) return '';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ── Sub-components ───────────────────────────────────────

function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = '0',
  hint,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const [raw, setRaw] = useState(fmtCurrency(value));

  // Sync when value changes from outside (e.g. project switch)
  useEffect(() => { setRaw(fmtCurrency(value)); }, [value]);

  return (
    <div className="space-y-1.5">
      <label className="block text-[9px] font-black text-text-secondary uppercase tracking-[0.25em]">
        {label}
      </label>
      <div className={`relative flex items-center border border-border-accent bg-bg-primary focus-within:border-pw-black transition-colors ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
        <span className="pl-3 text-xs font-black text-text-secondary select-none">$</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={raw}
          disabled={disabled}
          onChange={(e) => {
            const stripped = e.target.value.replace(/[^0-9]/g, '');
            setRaw(stripped ? parseInt(stripped, 10).toLocaleString() : '');
            onChange(parseInt(stripped, 10) || 0);
          }}
          onBlur={() => setRaw(fmtCurrency(value))}
          className={`flex-1 px-2 py-3 text-sm font-black text-text-primary bg-transparent outline-none tabular-nums placeholder:text-text-secondary/40 ${disabled ? 'cursor-not-allowed' : ''}`}
        />
      </div>
      {hint && <p className="text-[9px] text-text-secondary font-bold tracking-wide">{hint}</p>}
    </div>
  );
}

function ReadOnlyLine({ label, value, emphasis, positive, negative }: {
  label: string;
  value: string;
  emphasis?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">{label}</span>
      <span className={`tabular-nums ${
        emphasis ? 'text-base font-black' :
        'text-xs font-black'
      } ${
        positive ? 'text-green-700' :
        negative ? 'text-red-600' :
        'text-text-primary'
      }`}>
        {value}
      </span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

export default function DealAnalyzer() {
  const currentProject = useProjectStore(state => state.currentProject);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  const uid = useId();

  // ── Local form state ──
  const [arv, setArv] = useState(0);
  const [rehabEst, setRehabEst] = useState(0);
  const [fixedCosts, setFixedCosts] = useState(0);
  const [comps, setComps] = useState<ComparableSale[]>([]);
  const [leadSource, setLeadSource] = useState<LeadSource | ''>('');
  const [sellerMotivation, setSellerMotivation] = useState('');
  const [emdAmount, setEmdAmount] = useState(0);
  const [emdGoHardDate, setEmdGoHardDate] = useState('');

  // Sync from project when it changes
  useEffect(() => {
    if (!currentProject) return;
    const f = currentProject.financials;
    setArv(f.estimatedARV || 0);
    setRehabEst(f.projectedRehabCost || 0);
    setFixedCosts(f.fixedAcquisitionCosts || 0);
    setComps(f.comparableSales || []);
    setLeadSource(f.leadSource || '');
    setSellerMotivation(f.sellerMotivation || '');
    setEmdAmount(f.emdAmount || 0);
    setEmdGoHardDate(
      f.emdGoHardDate
        ? new Date(f.emdGoHardDate).toISOString().split('T')[0]
        : ''
    );
  }, [currentProject?.id]);

  if (!currentProject) return null;

  // ── Real-time MAO ──
  const mao = Math.max(0, arv * 0.7 - rehabEst - fixedCosts);
  const maoIsSetup = arv > 0;
  const purchasePrice = currentProject.financials.purchasePrice || 0;
  const maoViolated = maoIsSetup && purchasePrice > mao;
  const maoVariance = mao - purchasePrice;
  const isLocked = currentProject.isClearToClose ?? false;

  // ── Comparable Sales averages ──
  const validComps = comps.filter(c => c.soldPrice > 0);
  const avgCompPrice = validComps.length > 0
    ? validComps.reduce((s, c) => s + c.soldPrice, 0) / validComps.length
    : 0;

  // ── Persist helpers ──
  const save = useCallback((patch: Parameters<typeof updateProjectFinancials>[1]) => {
    if (isLocked) return;
    updateProjectFinancials(currentProject.id, patch);
  }, [currentProject.id, updateProjectFinancials, isLocked]);

  const handleArv = (n: number) => { setArv(n); save({ estimatedARV: n }); };
  const handleRehab = (n: number) => { setRehabEst(n); save({ projectedRehabCost: n }); };
  const handleFixed = (n: number) => { setFixedCosts(n); save({ fixedAcquisitionCosts: n }); };

  // Persist MAO whenever ARV/rehab/fixed change
  useEffect(() => {
    if (!currentProject?.id) return;
    save({ maxOffer: mao });
  }, [mao, currentProject?.id]);

  const addComp = () => {
    if (isLocked) return;
    if (comps.length >= MAX_COMPS) return;
    const newComp: ComparableSale = {
      id: `${uid}-${Date.now()}`,
      address: '',
      soldPrice: 0,
      distanceMiles: 0,
      daysOnMarket: 0,
    };
    const updated = [...comps, newComp];
    setComps(updated);
    save({ comparableSales: updated });
  };

  const updateComp = (id: string, patch: Partial<ComparableSale>) => {
    if (isLocked) return;
    const updated = comps.map(c => c.id === id ? { ...c, ...patch } : c);
    setComps(updated);
    save({ comparableSales: updated });
  };

  const removeComp = (id: string) => {
    if (isLocked) return;
    const updated = comps.filter(c => c.id !== id);
    setComps(updated);
    save({ comparableSales: updated });
  };

  return (
    <div className="border border-pw-black bg-bg-surface overflow-hidden">
      {/* ── Header ── */}
      <div className="px-8 py-5 border-b border-pw-black bg-pw-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-white" />
            <div>
              <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em]">Phase_01 · Sourcing</p>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                Deal.Analyzer
                {isLocked && <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-white/20 text-white rounded-sm">Locked</span>}
              </h2>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">MAO Formula</p>
            <p className="text-[9px] font-mono text-white/60">(ARV × 0.70) − Rehab − Fixed</p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10">

        {/* ── Section 1: MAO Engine ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Input Column */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-border-accent">
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.3em]">Financial Inputs</span>
            </div>
            <CurrencyInput
              label="After Repair Value (ARV)"
              value={arv}
              onChange={handleArv}
              disabled={isLocked}
              hint="Estimated market value after full renovation"
            />
            <CurrencyInput
              label="Rehab Estimate"
              value={rehabEst}
              onChange={handleRehab}
              disabled={isLocked}
              hint="Total projected renovation cost"
            />
            <CurrencyInput
              label="Fixed / Closing Costs"
              value={fixedCosts}
              onChange={handleFixed}
              disabled={isLocked}
              hint="Acquisition-side closing costs, inspections, etc."
            />
          </div>

          {/* MAO Output Column */}
          <div className="flex flex-col justify-between bg-bg-primary border border-border-accent p-6 space-y-4">
            <div>
              <p className="text-[9px] font-black text-text-secondary uppercase tracking-[0.3em] mb-4">Calculation Breakdown</p>
              <ReadOnlyLine
                label="ARV"
                value={maoIsSetup ? `$${arv.toLocaleString()}` : '—'}
              />
              <ReadOnlyLine
                label="× 0.70 Threshold"
                value={maoIsSetup ? `$${(arv * 0.7).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
              />
              <ReadOnlyLine
                label="− Rehab Estimate"
                value={rehabEst > 0 ? `-$${rehabEst.toLocaleString()}` : '—'}
                negative={rehabEst > 0}
              />
              <ReadOnlyLine
                label="− Fixed Costs"
                value={fixedCosts > 0 ? `-$${fixedCosts.toLocaleString()}` : '—'}
                negative={fixedCosts > 0}
              />
              <div className="border-t border-border-accent mt-2 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">
                    Max Allowable Offer
                  </span>
                  <span className={`text-2xl font-black tabular-nums ${
                    !maoIsSetup ? 'text-text-secondary' :
                    maoViolated ? 'text-red-600' :
                    'text-text-primary'
                  }`}>
                    {maoIsSetup ? `$${mao.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* Verdict banner */}
            <AnimatePresence mode="wait">
              {maoIsSetup && purchasePrice > 0 && (
                <motion.div
                  key={maoViolated ? 'over' : 'under'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`flex items-start gap-3 p-4 border ${
                    maoViolated
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-green-50 border-green-200 text-green-800'
                  }`}
                >
                  {maoViolated
                    ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                  }
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {maoViolated ? 'Threshold Exceeded' : 'Under MAO Threshold'}
                    </p>
                    <p className="text-[10px] mt-0.5 opacity-80 leading-relaxed">
                      {maoViolated
                        ? `Purchase price exceeds MAO by $${Math.abs(maoVariance).toLocaleString()}. Margin is eroding.`
                        : `Purchase price is $${maoVariance.toLocaleString()} below target. Deal has margin.`
                      }
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Section 2: Comparable Sales ── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-border-accent">
            <div className="flex items-center gap-3">
              <MapPin className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-[9px] font-black text-text-primary uppercase tracking-[0.3em]">Comparable_Sales</span>
              <span className="text-[9px] font-black text-text-secondary">({comps.length}/{MAX_COMPS})</span>
            </div>
            {!isLocked && comps.length < MAX_COMPS && (
              <button
                onClick={addComp}
                className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] border border-pw-black text-text-primary hover:bg-pw-black hover:text-white transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Comp
              </button>
            )}
          </div>

          {/* Comp rows */}
          <AnimatePresence>
            {comps.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-dashed border-border-accent p-8 text-center"
              >
                <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-[0.3em]">
                  No comps added — click Add Comp to begin
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {/* Column headers */}
                <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_90px_32px] gap-3">
                  {['Address', 'Sold Price', 'Distance (mi)', 'DOM', ''].map((h) => (
                    <span key={h} className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">{h}</span>
                  ))}
                </div>

                {comps.map((comp) => (
                  <motion.div
                    key={comp.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_90px_32px] gap-3 items-start md:items-center p-4 md:p-0 bg-bg-primary md:bg-transparent border border-border-accent md:border-none"
                  >
                    {/* Address */}
                    <div className="space-y-1">
                      <label className="md:hidden text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">Address</label>
                      <input
                        type="text"
                        placeholder="123 Main St, City, ST"
                        value={comp.address}
                        disabled={isLocked}
                        onChange={(e) => updateComp(comp.id, { address: e.target.value })}
                        className={`w-full px-3 py-2.5 text-xs font-black text-text-primary bg-bg-primary border border-border-accent focus:border-pw-black outline-none placeholder:text-text-secondary/30 placeholder:font-normal ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                      />
                    </div>

                    {/* Sold Price */}
                    <div className="space-y-1">
                      <label className="md:hidden text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">Sold Price</label>
                      <div className={`relative flex items-center border border-border-accent bg-bg-primary focus-within:border-pw-black transition-colors ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}>
                        <span className="pl-2 text-xs font-black text-text-secondary">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={comp.soldPrice > 0 ? comp.soldPrice.toLocaleString() : ''}
                          disabled={isLocked}
                          onChange={(e) => {
                            const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                            updateComp(comp.id, { soldPrice: n });
                          }}
                          className={`w-full px-1 py-2.5 text-xs font-black text-text-primary bg-transparent outline-none tabular-nums placeholder:text-text-secondary/30 ${isLocked ? 'cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Distance */}
                    <div className="space-y-1">
                      <label className="md:hidden text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">Distance (mi)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.0"
                        step="0.1"
                        min="0"
                        disabled={isLocked}
                        value={comp.distanceMiles || ''}
                        onChange={(e) => updateComp(comp.id, { distanceMiles: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-3 py-2.5 text-xs font-black text-text-primary bg-bg-primary border border-border-accent focus:border-pw-black outline-none tabular-nums placeholder:text-text-secondary/30 ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                      />
                    </div>

                    {/* Days on Market */}
                    <div className="space-y-1">
                      <label className="md:hidden text-[9px] font-black text-text-secondary uppercase tracking-[0.2em]">DOM</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        min="0"
                        disabled={isLocked}
                        value={comp.daysOnMarket || ''}
                        onChange={(e) => updateComp(comp.id, { daysOnMarket: parseInt(e.target.value, 10) || 0 })}
                        className={`w-full px-3 py-2.5 text-xs font-black text-text-primary bg-bg-primary border border-border-accent focus:border-pw-black outline-none tabular-nums placeholder:text-text-secondary/30 ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                      />
                    </div>

                    {/* Remove */}
                    {!isLocked && (
                      <button
                        onClick={() => removeComp(comp.id)}
                        className="flex items-center justify-center w-8 h-8 border border-border-accent hover:border-red-400 hover:text-red-600 text-text-secondary transition-colors self-center"
                        aria-label="Remove comp"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Average Comp Price */}
          {validComps.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between border-t border-border-accent pt-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.3em]">
                  Average Comp Price
                </span>
                <span className="text-[9px] font-black text-text-secondary/50">
                  ({validComps.length} sale{validComps.length !== 1 ? 's' : ''})
                </span>
              </div>
              <span className="text-lg font-black text-text-primary tabular-nums">
                ${avgCompPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </motion.div>
          )}
        </div>

        {/* ── Section 3: Lead Intelligence + EMD ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border-accent">
            <Calendar className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-[9px] font-black text-text-primary uppercase tracking-[0.3em]">Lead_Intelligence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Lead Source */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-text-secondary uppercase tracking-[0.25em]">
                Lead Source
              </label>
              <div className={`relative border border-border-accent bg-bg-primary focus-within:border-pw-black transition-colors ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}>
                <select
                  value={leadSource}
                  disabled={isLocked}
                  onChange={(e) => {
                    const val = e.target.value as LeadSource | '';
                    setLeadSource(val);
                    save({ leadSource: val as LeadSource || undefined });
                  }}
                  className={`w-full px-3 py-3 text-xs font-black text-text-primary bg-transparent outline-none appearance-none cursor-pointer ${isLocked ? 'cursor-not-allowed' : ''}`}
                >
                  <option value="">Select source…</option>
                  {LEAD_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-3 h-3 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* EMD Amount */}
            <CurrencyInput
              label="Earnest Money Deposit (EMD)"
              value={emdAmount}
              disabled={isLocked}
              onChange={(n) => { setEmdAmount(n); save({ emdAmount: n }); }}
              hint="Good faith deposit amount"
            />

            {/* Go Hard Date */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-text-secondary uppercase tracking-[0.25em]">
                Go Hard Date
              </label>
              <div className={`border border-border-accent bg-bg-primary focus-within:border-pw-black transition-colors ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}>
                <input
                  type="date"
                  value={emdGoHardDate}
                  disabled={isLocked}
                  onChange={(e) => {
                    setEmdGoHardDate(e.target.value);
                    save({
                      emdGoHardDate: e.target.value ? new Date(e.target.value) : undefined,
                    });
                  }}
                  className={`w-full px-3 py-3 text-xs font-black text-text-primary bg-transparent outline-none cursor-pointer ${isLocked ? 'cursor-not-allowed' : ''}`}
                />
              </div>
              <p className="text-[9px] text-text-secondary font-bold tracking-wide">EMD becomes non-refundable</p>
            </div>
          </div>

          {/* Seller Motivation */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black text-text-secondary uppercase tracking-[0.25em]">
              Seller Motivation
            </label>
            <textarea
              rows={3}
              placeholder="Describe the seller's motivation, urgency level, pain points, and deal context…"
              value={sellerMotivation}
              disabled={isLocked}
              onChange={(e) => {
                setSellerMotivation(e.target.value);
                save({ sellerMotivation: e.target.value });
              }}
              className={`w-full px-4 py-3 text-xs font-black text-text-primary bg-bg-primary border border-border-accent focus:border-pw-black outline-none resize-none leading-relaxed placeholder:text-text-secondary/30 placeholder:font-normal ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
