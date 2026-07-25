'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Percent, 
  HelpCircle, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Layers,
  Activity,
  Calculator
} from 'lucide-react';
import type { Project } from '@/types/schema';
import { calculateSyndicationDistribution } from '@/lib/metrics/reiMetrics';
import toast from 'react-hot-toast';

interface SyndicationEconomicsCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  refresh: () => void;
  readOnly?: boolean;
}

export function SyndicationEconomicsCard({
  project,
  onSaveFinancials,
  refresh,
  readOnly = false,
}: SyndicationEconomicsCardProps) {
  const financials = project.financials || {};
  const currentStructure = financials.distributionStructure || {
    type: 'straight',
    splitRatioLP: 70,
    splitRatioGP: 30,
    preferredRate: 7,
    preferredType: 'non_cumulative',
  };

  // State for sequential wizard sequence
  const [step, setStep] = useState<1 | 2>(1);

  // State values for form fields
  const [structType, setStructType] = useState<'straight' | 'pref_return' | 'waterfall'>(currentStructure.type);
  const [splitRatioLP, setSplitRatioLP] = useState<number>(currentStructure.splitRatioLP);
  const [splitRatioGP, setSplitRatioGP] = useState<number>(currentStructure.splitRatioGP);
  const [preferredRate, setPreferredRate] = useState<number>(currentStructure.preferredRate || 7);
  const [preferredType, setPreferredType] = useState<'cumulative' | 'non_cumulative'>(currentStructure.preferredType || 'non_cumulative');

  // Interactive Waterfall Tiers
  const [waterfallTiers, setWaterfallTiers] = useState<any[]>(
    currentStructure.waterfallTiers || [
      { tierNumber: 1, thresholdPct: 7, splitRatioLP: 100, splitRatioGP: 0 },
      { tierNumber: 2, thresholdPct: 14, splitRatioLP: 70, splitRatioGP: 30 },
      { tierNumber: 3, thresholdPct: 999999, splitRatioLP: 50, splitRatioGP: 50 },
    ]
  );

  // Interactive Simulator inputs
  const [simLPCapital, setSimLPCapital] = useState<number>(900000);
  const [simDistributableCash, setSimDistributableCash] = useState<number>(100000);
  const [simPreviousShortfall, setSimPreviousShortfall] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize component states when project financials change
  useEffect(() => {
    if (financials.distributionStructure) {
      setStructType(financials.distributionStructure.type);
      setSplitRatioLP(financials.distributionStructure.splitRatioLP);
      setSplitRatioGP(financials.distributionStructure.splitRatioGP);
      setPreferredRate(financials.distributionStructure.preferredRate || 7);
      setPreferredType(financials.distributionStructure.preferredType || 'non_cumulative');
      setWaterfallTiers(financials.distributionStructure.waterfallTiers || [
        { tierNumber: 1, thresholdPct: 7, splitRatioLP: 100, splitRatioGP: 0 },
        { tierNumber: 2, thresholdPct: 14, splitRatioLP: 70, splitRatioGP: 30 },
        { tierNumber: 3, thresholdPct: 999999, splitRatioLP: 50, splitRatioGP: 50 },
      ]);
    }
  }, [project]);

  // Helper to trigger save to DB
  const handleSave = async (updates: any = {}) => {
    if (readOnly) return;
    setIsSaving(true);
    try {
      const nextStructure = {
        type: updates.type ?? structType,
        splitRatioLP: Number(updates.splitRatioLP ?? splitRatioLP),
        splitRatioGP: Number(updates.splitRatioGP ?? splitRatioGP),
        preferredRate: Number(updates.preferredRate ?? preferredRate),
        preferredType: updates.preferredType ?? preferredType,
        waterfallTiers: (updates.type ?? structType) === 'waterfall' ? (updates.waterfallTiers ?? waterfallTiers) : undefined,
      };

      // Validate splits sum to 100%
      if (nextStructure.type !== 'waterfall') {
        const sum = nextStructure.splitRatioLP + nextStructure.splitRatioGP;
        if (sum !== 100) {
          toast.error('LP and GP split ratios must sum to exactly 100%');
          setIsSaving(false);
          return;
        }
      } else {
        // Validate waterfall tiers splits sum to 100% each
        for (const tier of nextStructure.waterfallTiers || []) {
          if (tier.splitRatioLP + tier.splitRatioGP !== 100) {
            toast.error(`Tier ${tier.tierNumber} split ratios must sum to exactly 100%`);
            setIsSaving(false);
            return;
          }
        }
      }

      await onSaveFinancials({ distributionStructure: nextStructure });
      toast.success('Syndication distribution terms saved!');
      refresh();
    } catch (e) {
      toast.error('Failed to save distribution terms');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLPChange = (val: number) => {
    setSplitRatioLP(val);
    setSplitRatioGP(100 - val);
  };

  const handleGPChange = (val: number) => {
    setSplitRatioGP(val);
    setSplitRatioLP(100 - val);
  };

  // Run live calculation against current input states
  const activeStructure = {
    type: structType,
    splitRatioLP,
    splitRatioGP,
    preferredRate,
    preferredType,
    waterfallTiers: structType === 'waterfall' ? waterfallTiers : undefined,
  };

  const simResult = calculateSyndicationDistribution(
    simLPCapital,
    0, // GP Co-invest
    simDistributableCash,
    activeStructure,
    simPreviousShortfall
  );

  // Fixture Evaluator Engine Verification (Deterministic Check)
  const verifyFixtures = () => {
    // FX-3
    const fx3Result = calculateSyndicationDistribution(900000, 0, 100000, {
      type: 'straight',
      splitRatioLP: 70,
      splitRatioGP: 30,
    });
    const fx3Ok = fx3Result.lpTotal === 70000 && fx3Result.gpTotal === 30000;

    // FX-4
    const fx4Result = calculateSyndicationDistribution(900000, 0, 100000, {
      type: 'pref_return',
      splitRatioLP: 70,
      splitRatioGP: 30,
      preferredRate: 7,
      preferredType: 'non_cumulative',
    });
    const fx4Ok = fx4Result.lpPreferred === 63000 && fx4Result.lpTotal === 88900 && fx4Result.gpTotal === 11100;

    // FX-5 P1
    const fx5P1Result = calculateSyndicationDistribution(900000, 0, 50000, {
      type: 'pref_return',
      splitRatioLP: 70,
      splitRatioGP: 30,
      preferredRate: 7,
      preferredType: 'cumulative',
    });
    const fx5P1Ok = fx5P1Result.lpTotal === 50000 && fx5P1Result.gpTotal === 0 && fx5P1Result.shortfallAccrued === 13000;

    // FX-5 P2
    const fx5P2Result = calculateSyndicationDistribution(900000, 0, 100000, {
      type: 'pref_return',
      splitRatioLP: 70,
      splitRatioGP: 30,
      preferredRate: 7,
      preferredType: 'cumulative',
    }, 13000);
    const fx5P2Ok = fx5P2Result.lpTotal === 92800 && fx5P2Result.gpTotal === 7200;

    // FX-6
    const fx6Result = calculateSyndicationDistribution(900000, 0, 180000, {
      type: 'waterfall',
      splitRatioLP: 70,
      splitRatioGP: 30,
      waterfallTiers: [
        { tierNumber: 1, thresholdPct: 7, splitRatioLP: 100, splitRatioGP: 0 },
        { tierNumber: 2, thresholdPct: 14, splitRatioLP: 70, splitRatioGP: 30 },
        { tierNumber: 3, thresholdPct: 999999, splitRatioLP: 50, splitRatioGP: 50 },
      ],
    });
    const fx6Ok = fx6Result.lpTotal === 139500 && fx6Result.gpTotal === 40500;

    return {
      fx3: { ok: fx3Ok, lp: fx3Result.lpTotal, gp: fx3Result.gpTotal },
      fx4: { ok: fx4Ok, lp: fx4Result.lpTotal, gp: fx4Result.gpTotal },
      fx5p1: { ok: fx5P1Ok, lp: fx5P1Result.lpTotal, gp: fx5P1Result.gpTotal, shortfall: fx5P1Result.shortfallAccrued },
      fx5p2: { ok: fx5P2Ok, lp: fx5P2Result.lpTotal, gp: fx5P2Result.gpTotal },
      fx6: { ok: fx6Ok, lp: fx6Result.lpTotal, gp: fx6Result.gpTotal },
    };
  };

  const status = verifyFixtures();

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 text-[#9E9DA0]">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#7A9EAA]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Card F2.4 — Syndication Economics</h3>
        </div>
        <span className="text-[10px] font-bold text-[#7A9EAA] uppercase tracking-wider bg-[#7A9EAA]/15 px-2.5 py-0.5 rounded-full">Syndication</span>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Step 1: Choose Distribution Structure</h4>
            <p className="text-[11px] text-[#9E9DA0]/80 mt-1">
              Select how cash distributions will be split between LP investors and the GP.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStructType('straight')}
              disabled={readOnly}
              className={`p-3 rounded-xl border text-left transition-all ${
                structType === 'straight'
                  ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 text-white'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-xs font-semibold block mb-0.5">Straight Split</span>
              <span className="text-[9px] text-[#9E9DA0]/70 block leading-tight">Proportional split of all cash from dollar one.</span>
            </button>

            <button
              type="button"
              onClick={() => setStructType('pref_return')}
              disabled={readOnly}
              className={`p-3 rounded-xl border text-left transition-all ${
                structType === 'pref_return'
                  ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 text-white'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-xs font-semibold block mb-0.5">Preferred Return</span>
              <span className="text-[9px] text-[#9E9DA0]/70 block leading-tight">LP receives preferred yield before remainder split.</span>
            </button>

            <button
              type="button"
              onClick={() => setStructType('waterfall')}
              disabled={readOnly}
              className={`p-3 rounded-xl border text-left transition-all ${
                structType === 'waterfall'
                  ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 text-white'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-xs font-semibold block mb-0.5">Waterfalls</span>
              <span className="text-[9px] text-[#9E9DA0]/70 block leading-tight">Multi-tier cash-on-capital hurdle rates (FX-6).</span>
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#7A9EAA] hover:bg-[#7A9EAA]/90 text-white transition-all animate-pulse"
            >
              Next: Configure Parameters →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Step 2: Configure Parameters</h4>
            <p className="text-[11px] text-[#9E9DA0]/80 mt-1">
              Adjust splits, preferred return rates, or waterfall hurdle tiers.
            </p>
          </div>

          {/* Parameters Editor */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Configure Parameters ({structType === 'straight' ? 'Straight Split' : structType === 'pref_return' ? 'Preferred Return' : 'Waterfall'})</h4>

            {structType === 'straight' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white uppercase tracking-wider block" htmlFor="straight-lp-split">LP Split Ratio (%)</label>
                  <div className="relative">
                    <input
                      id="straight-lp-split"
                      type="number"
                      disabled={readOnly || isSaving}
                      value={splitRatioLP}
                      onChange={(e) => handleLPChange(Number(e.target.value))}
                      className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-[#7A9EAA]/50"
                    />
                    <Percent className="w-3.5 h-3.5 text-[#9E9DA0]/50 absolute right-3 top-2.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white uppercase tracking-wider block" htmlFor="straight-gp-split">GP Split Ratio (%)</label>
                  <div className="relative">
                    <input
                      id="straight-gp-split"
                      type="number"
                      disabled={readOnly || isSaving}
                      value={splitRatioGP}
                      onChange={(e) => handleGPChange(Number(e.target.value))}
                      className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-[#7A9EAA]/50"
                    />
                    <Percent className="w-3.5 h-3.5 text-[#9E9DA0]/50 absolute right-3 top-2.5" />
                  </div>
                </div>
              </div>
            )}

            {structType === 'pref_return' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white uppercase tracking-wider block" htmlFor="pref-yield">Preferred Yield (%)</label>
                    <div className="relative">
                      <input
                        id="pref-yield"
                        type="number"
                        step="0.1"
                        disabled={readOnly || isSaving}
                        value={preferredRate}
                        onChange={(e) => setPreferredRate(Number(e.target.value))}
                        className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-[#7A9EAA]/50"
                      />
                      <Percent className="w-3.5 h-3.5 text-[#9E9DA0]/50 absolute right-3 top-2.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white uppercase tracking-wider block" htmlFor="pref-lp-remainder">LP Remainder Split (%)</label>
                    <div className="relative">
                      <input
                        id="pref-lp-remainder"
                        type="number"
                        disabled={readOnly || isSaving}
                        value={splitRatioLP}
                        onChange={(e) => handleLPChange(Number(e.target.value))}
                        className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-[#7A9EAA]/50"
                      />
                      <Percent className="w-3.5 h-3.5 text-[#9E9DA0]/50 absolute right-3 top-2.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white uppercase tracking-wider block" htmlFor="pref-gp-remainder">GP Remainder Split (%)</label>
                    <div className="relative">
                      <input
                        id="pref-gp-remainder"
                        type="number"
                        disabled={readOnly || isSaving}
                        value={splitRatioGP}
                        onChange={(e) => handleGPChange(Number(e.target.value))}
                        className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-[#7A9EAA]/50"
                      />
                      <Percent className="w-3.5 h-3.5 text-[#9E9DA0]/50 absolute right-3 top-2.5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white uppercase tracking-wider block">Preferred Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="radio"
                        name="preferredType"
                        value="non_cumulative"
                        disabled={readOnly || isSaving}
                        checked={preferredType === 'non_cumulative'}
                        onChange={() => setPreferredType('non_cumulative')}
                        className="accent-[#7A9EAA]"
                      />
                      Non-Cumulative (Single Period)
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="radio"
                        name="preferredType"
                        value="cumulative"
                        disabled={readOnly || isSaving}
                        checked={preferredType === 'cumulative'}
                        onChange={() => setPreferredType('cumulative')}
                        className="accent-[#7A9EAA]"
                      />
                      Cumulative (Carries forward shortfall)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {structType === 'waterfall' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Waterfall Hurdle Tiers</span>
                  <span className="text-[9px] text-[#9E9DA0]/70 uppercase font-semibold">Cash-on-Capital Basis</span>
                </div>

                <div className="space-y-3">
                  {waterfallTiers.map((tier, idx) => {
                    const isLast = idx === waterfallTiers.length - 1;
                    return (
                      <div key={tier.tierNumber} className="p-3 rounded-lg border border-white/5 bg-white/[0.01] space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-white">
                          <span>Tier {tier.tierNumber}: {isLast ? 'Residual Split' : `Hurdle ${tier.tierNumber}`}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {!isLast ? (
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#9E9DA0] block" htmlFor={`waterfall-threshold-tier-${tier.tierNumber}`}>LP Return Hurdle Threshold (%)</label>
                              <div className="relative">
                                <input
                                  id={`waterfall-threshold-tier-${tier.tierNumber}`}
                                  type="number"
                                  disabled={readOnly || isSaving}
                                  value={tier.thresholdPct}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...waterfallTiers];
                                    updated[idx] = { ...updated[idx], thresholdPct: val };
                                    setWaterfallTiers(updated);
                                  }}
                                  className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-white focus:outline-none focus:border-[#7A9EAA]/50"
                                />
                                <Percent className="w-3.5 h-3.5 text-[#9E9DA0]/50 absolute right-3 top-2" />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[9px] text-[#9E9DA0] block">Threshold</label>
                              <div className="text-xs text-[#9E9DA0]/60 py-2 font-mono">Residual above Tier 2</div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[9px] text-[#9E9DA0] block" htmlFor={`waterfall-lp-split-tier-${tier.tierNumber}`}>LP Split Ratio (%)</label>
                            <div className="relative">
                              <input
                                  id={`waterfall-lp-split-tier-${tier.tierNumber}`}
                                  type="number"
                                  disabled={readOnly || isSaving}
                                  value={tier.splitRatioLP}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...waterfallTiers];
                                    updated[idx] = {
                                      ...updated[idx],
                                      splitRatioLP: val,
                                      splitRatioGP: 100 - val
                                    };
                                    setWaterfallTiers(updated);
                                  }}
                                  className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-white focus:outline-none focus:border-[#7A9EAA]/50"
                                />
                                <Percent className="w-3.5 h-3.5 text-[#9E9DA0]/50 absolute right-3 top-2" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[9px] text-amber-500/70 italic flex items-center gap-1.5">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  IRR-based hurdles are deferred in v1. Waterfall calculations utilize cash-on-capital return thresholds.
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/[0.04] text-white transition-all"
            >
              ← Back to Structure Choice
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={readOnly || isSaving}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#7A9EAA] hover:bg-[#7A9EAA]/90 text-white transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Distribution Terms'}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Simulator Tool */}
      <div className="p-5 rounded-2xl border border-white/5 bg-[#7A9EAA]/5 space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-[#7A9EAA]" />
          Preview — hypothetical distributable cash
        </h4>
        <p className="text-[10px] text-[#9E9DA0]/80">
          Run live calculations on configured structures using custom capital parameters.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-white uppercase tracking-wider block">LP Committed Capital</label>
            <div className="relative">
              <input
                type="number"
                value={simLPCapital}
                onChange={(e) => setSimLPCapital(Number(e.target.value))}
                className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-6 py-2 text-white focus:outline-none"
              />
              <DollarSign className="w-3 h-3 text-[#9E9DA0]/50 absolute left-2 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-white uppercase tracking-wider block">Distributable Cash</label>
            <div className="relative">
              <input
                type="number"
                value={simDistributableCash}
                onChange={(e) => setSimDistributableCash(Number(e.target.value))}
                className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-6 py-2 text-white focus:outline-none"
              />
              <DollarSign className="w-3 h-3 text-[#9E9DA0]/50 absolute left-2 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-white uppercase tracking-wider block">Prior Shortfall (Accrued)</label>
            <div className="relative">
              <input
                type="number"
                value={simPreviousShortfall}
                onChange={(e) => setSimPreviousShortfall(Number(e.target.value))}
                disabled={structType !== 'pref_return' || preferredType !== 'cumulative'}
                className="w-full text-xs font-mono bg-pw-black border border-white/10 rounded-lg pl-6 py-2 text-white focus:outline-none disabled:opacity-50"
              />
              <DollarSign className="w-3 h-3 text-[#9E9DA0]/50 absolute left-2 top-3" />
            </div>
          </div>
        </div>

        {/* Calculation Result Rollup */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 border-r border-white/5 pr-4">
            <span className="text-[9px] font-bold uppercase text-[#9E9DA0]/70 tracking-wider">LP Distributions</span>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]">LP Preferred Return:</span>
              <span className="text-white font-mono font-medium">${simResult.lpPreferred.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]">LP Share of Remainder:</span>
              <span className="text-white font-mono font-medium">${simResult.lpRemainder.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
              <span className="text-[#7A9EAA]">LP Payout Total:</span>
              <span className="text-[#7A9EAA] font-mono">${simResult.lpTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase text-[#9E9DA0]/70 tracking-wider">GP Distributions</span>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]">GP Preferred Yield:</span>
              <span className="text-white font-mono font-medium">$0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9E9DA0]">GP Share of Remainder:</span>
              <span className="text-white font-mono font-medium">${simResult.gpRemainder.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
              <span className="text-[#7A9EAA]">GP Payout Total:</span>
              <span className="text-[#7A9EAA] font-mono">${simResult.gpTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {structType === 'pref_return' && preferredType === 'cumulative' && simResult.shortfallAccrued > 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Cumulative yield shortfall accrued this period: <strong>${simResult.shortfallAccrued.toLocaleString()}</strong>.
              This amount carries over to the next distribution.
            </span>
          </div>
        )}

        <div className="text-[9px] text-[#9E9DA0]/65 italic bg-white/[0.01] border border-[#7A9EAA]/10 p-2 rounded-lg">
          ⚠️ Disclaimer: This preview is for illustrative modeling purposes only based on hypothetical parameters. It does not constitute a promise or guarantee of actual investor distributions or investment returns.
        </div>
      </div>

      {/* Fixture Verification Log */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#7A9EAA]" />
          Deterministic Fixture Verification (Global Rule 9)
        </h4>

        <div className="space-y-2 text-[10px]">
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">FX-3 (Straight Split)</span>
              <span className="text-[#9E9DA0]/70">distribute $100k at 70/30 split</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="text-[#9E9DA0]">
                Expected LP: $70,000 / GP: $30,000 | Live LP: ${status.fx3.lp.toLocaleString()} / GP: ${status.fx3.gp.toLocaleString()}
              </div>
              {status.fx3.ok ? (
                <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="w-3.5 h-3.5" /> VERIFIED</span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-0.5"><AlertTriangle className="w-3.5 h-3.5" /> ERR</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">FX-4 (7% Preferred)</span>
              <span className="text-[#9E9DA0]/70">distribute $100k, LP Capital $900k</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="text-[#9E9DA0]">
                Expected LP: $88,900 / GP: $11,100 | Live LP: ${status.fx4.lp.toLocaleString()} / GP: ${status.fx4.gp.toLocaleString()}
              </div>
              {status.fx4.ok ? (
                <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="w-3.5 h-3.5" /> VERIFIED</span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-0.5"><AlertTriangle className="w-3.5 h-3.5" /> ERR</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">FX-5 P1 (Cumulative Yr 1)</span>
              <span className="text-[#9E9DA0]/70">distribute $50k, LP Capital $900k</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="text-[#9E9DA0]">
                Expected LP: $50,000 / GP: $0 | Live LP: ${status.fx5p1.lp.toLocaleString()} / GP: ${status.fx5p1.gp.toLocaleString()}
              </div>
              {status.fx5p1.ok ? (
                <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="w-3.5 h-3.5" /> VERIFIED</span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-0.5"><AlertTriangle className="w-3.5 h-3.5" /> ERR</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">FX-5 P2 (Cumulative Yr 2)</span>
              <span className="text-[#9E9DA0]/70">distribute $100k, previous $13k shortfall</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="text-[#9E9DA0]">
                Expected LP: $92,800 / GP: $7,200 | Live LP: ${status.fx5p2.lp.toLocaleString()} / GP: ${status.fx5p2.gp.toLocaleString()}
              </div>
              {status.fx5p2.ok ? (
                <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="w-3.5 h-3.5" /> VERIFIED</span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-0.5"><AlertTriangle className="w-3.5 h-3.5" /> ERR</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">FX-6 (Waterfall Hurdles)</span>
              <span className="text-[#9E9DA0]/70">distribute $180k, LP Capital $900k</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="text-[#9E9DA0]">
                Expected LP: $139,500 / GP: $40,500 | Live LP: ${status.fx6.lp.toLocaleString()} / GP: ${status.fx6.gp.toLocaleString()}
              </div>
              {status.fx6.ok ? (
                <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="w-3.5 h-3.5" /> VERIFIED</span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-0.5"><AlertTriangle className="w-3.5 h-3.5" /> ERR</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footnote Warning */}
      <div className="p-3 border border-white/5 bg-white/[0.01] rounded-xl text-[9px] text-[#9E9DA0]/60 italic">
        ⚖️ Distribution structures represent underwriting modeling parameters for waterfall cash calculations. Actual distributions are governed by the executed partnership agreements signed by general and limited partners off-platform.
      </div>
    </div>
  );
}
