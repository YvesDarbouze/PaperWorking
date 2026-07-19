'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { LoanRecord } from '@/types/schema';
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

type WizardStep = 'occupancy' | 'credit' | 'structure';
type OccupancyType = 'existing' | 'new_construction';

const STEP_ORDER: WizardStep[] = ['occupancy', 'credit', 'structure'];

const STEP_LABELS: Record<WizardStep, string> = {
  occupancy: 'Occupancy Eligibility',
  credit: 'Business Credit Context',
  structure: 'Structure Proportions',
};

export function Sba504Card({ projectId }: Props) {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('occupancy');

  // Step 1: Occupancy
  const [occupancyType, setOccupancyType] = useState<OccupancyType | null>(null);
  const [occupancyRate, setOccupancyRate] = useState<string>('');
  const [occupancyRateTenYears, setOccupancyRateTenYears] = useState<string>('');

  // Step 2: Credit
  const [paydexScore, setPaydexScore] = useState<string>('');
  const [paydexSource, setPaydexSource] = useState<string>('');
  const [sbssScore, setSbssScore] = useState<string>('');
  const [sbssSource, setSbssSource] = useState<string>('');
  const [intelliscoreScore, setIntelliscoreScore] = useState<string>('');
  const [intelliscoreSource, setIntelliscoreSource] = useState<string>('');

  // Step 3: Injection Tier
  const [injectionTier, setInjectionTier] = useState<10 | 15 | 20 | null>(null);

  // Listen to project
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) setProject(snap.data());
    });
    return unsub;
  }, [projectId]);

  // Listen to loans
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(
      collection(db, 'projects', projectId, 'loans'),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as LoanRecord[];
        setLoans(docs);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [projectId]);

  // Seed form from existing financials
  useEffect(() => {
    if (!project?.financials) return;
    const f = project.financials;
    if (f.sbaOccupancyType) setOccupancyType(f.sbaOccupancyType);
    if (f.sbaOccupancyRate != null) setOccupancyRate(String(f.sbaOccupancyRate));
    if (f.sbaOccupancyRateTenYears != null) setOccupancyRateTenYears(String(f.sbaOccupancyRateTenYears));
    if (f.sbaPaydexScore != null) setPaydexScore(String(f.sbaPaydexScore));
    if (f.sbaPaydexSource) setPaydexSource(f.sbaPaydexSource);
    if (f.sbaSbssScore != null) setSbssScore(String(f.sbaSbssScore));
    if (f.sbaSbssSource) setSbssSource(f.sbaSbssSource);
    if (f.sbaIntelliscoreScore != null) setIntelliscoreScore(String(f.sbaIntelliscoreScore));
    if (f.sbaIntelliscoreSource) setIntelliscoreSource(f.sbaIntelliscoreSource);
    if (f.sbaInjectionTier) setInjectionTier(f.sbaInjectionTier);
  }, [project?.financials]);

  const isSba504 = loans.some((l) => l.instrument === 'SBA 504');
  const isConfigured = !!project?.financials?.sbaInjectionTier;

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) setCurrentStep(STEP_ORDER[idx + 1]);
  }, [currentStep]);

  const goPrev = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEP_ORDER[idx - 1]);
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!occupancyType || !occupancyRate || !injectionTier) {
      toast.error('Complete all required fields before confirming.');
      return;
    }

    const rate = parseFloat(occupancyRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Occupancy rate must be between 0 and 100.');
      return;
    }

    if (occupancyType === 'new_construction') {
      const tenYr = parseFloat(occupancyRateTenYears);
      if (isNaN(tenYr) || tenYr < 0 || tenYr > 100) {
        toast.error('10-year projected occupancy must be between 0 and 100.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication required.');

      const payload: Record<string, any> = {
        occupancyType,
        occupancyRate: parseFloat(occupancyRate),
        injectionTier,
      };

      if (occupancyType === 'new_construction') {
        payload.occupancyRateTenYears = parseFloat(occupancyRateTenYears);
      }
      if (paydexScore) {
        payload.paydexScore = parseFloat(paydexScore);
        payload.paydexSource = paydexSource || null;
      }
      if (sbssScore) {
        payload.sbssScore = parseFloat(sbssScore);
        payload.sbssSource = sbssSource || null;
      }
      if (intelliscoreScore) {
        payload.intelliscoreScore = parseFloat(intelliscoreScore);
        payload.intelliscoreSource = intelliscoreSource || null;
      }

      const res = await fetch(`/api/projects/${projectId}/loans/sba504`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to configure SBA 504 structure.');
      }

      const result = await res.json();
      toast.success(`SBA 504 structure confirmed: ${result.structure.bankPct}/${result.structure.cdcPct}/${result.structure.injectionPct}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to configure SBA 504.');
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render if no SBA 504 loans exist
  if (!isSba504 || loading) return null;

  const purchasePrice = project?.financials?.purchasePrice || 0;
  const stepIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-pw-border pb-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#7A9EAA]" />
            SBA 504 Configuration
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            Owner-occupied commercial real estate — three-part capital structure.
          </p>
        </div>
        {isConfigured && (
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
            Configured
          </span>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-3">
        {STEP_ORDER.map((step, i) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className="flex items-center gap-2"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                i === stepIdx
                  ? 'bg-[#7A9EAA] text-white shadow-sm'
                  : i < stepIdx
                  ? 'bg-[#ECFDF5] text-[#047857]'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < stepIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-semibold hidden md:inline ${
              i === stepIdx ? 'text-pw-black' : 'text-pw-muted'
            }`}>
              {STEP_LABELS[step]}
            </span>
            {i < STEP_ORDER.length - 1 && (
              <div className="w-8 h-px bg-gray-200 hidden md:block" />
            )}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[220px]">
        {/* ── Step 1: Occupancy Attestation ── */}
        {currentStep === 'occupancy' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 p-3 rounded bg-blue-50 text-blue-900 border border-blue-200 text-xs">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Eligibility Attestation</span>
                The platform organizes eligibility — it never determines it. These are SBA program
                requirements you attest to. Final determination rests with your CDC and lender.
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-pw-muted uppercase tracking-wider">
                Property Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setOccupancyType('existing')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    occupancyType === 'existing'
                      ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 shadow-sm'
                      : 'border-pw-border hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-pw-black">Existing Building</span>
                    {occupancyType === 'existing' && <CheckCircle2 className="w-4 h-4 text-[#7A9EAA]" />}
                  </div>
                  <p className="text-[11px] text-pw-muted">≥51% owner-occupied at time of acquisition</p>
                </button>

                <button
                  onClick={() => setOccupancyType('new_construction')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    occupancyType === 'new_construction'
                      ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 shadow-sm'
                      : 'border-pw-border hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-pw-black">New Construction</span>
                    {occupancyType === 'new_construction' && <CheckCircle2 className="w-4 h-4 text-[#7A9EAA]" />}
                  </div>
                  <p className="text-[11px] text-pw-muted">≥60% initial, with ≥80% within 10 years</p>
                </button>
              </div>
            </div>

            {occupancyType && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                    {occupancyType === 'existing'
                      ? 'Current Owner-Occupancy Rate (%)'
                      : 'Initial Owner-Occupancy Rate (%)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={occupancyRate}
                    onChange={(e) => setOccupancyRate(e.target.value)}
                    placeholder={occupancyType === 'existing' ? '≥ 51' : '≥ 60'}
                    className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                  />
                  {occupancyRate && parseFloat(occupancyRate) < (occupancyType === 'existing' ? 51 : 60) && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-amber-600 text-[10px]">
                      <AlertCircle className="w-3 h-3" />
                      Below SBA minimum threshold ({occupancyType === 'existing' ? '51%' : '60%'})
                    </div>
                  )}
                </div>

                {occupancyType === 'new_construction' && (
                  <div>
                    <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                      Projected 10-Year Occupancy Rate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={occupancyRateTenYears}
                      onChange={(e) => setOccupancyRateTenYears(e.target.value)}
                      placeholder="≥ 80"
                      className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                    />
                    {occupancyRateTenYears && parseFloat(occupancyRateTenYears) < 80 && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-amber-600 text-[10px]">
                        <AlertCircle className="w-3 h-3" />
                        Below SBA 10-year target of 80%
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Business Credit Context ── */}
        {currentStep === 'credit' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 p-3 rounded bg-blue-50 text-blue-900 border border-blue-200 text-xs">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Credit Context (Optional)</span>
                Enter your business credit scores as user-provided values with source noted.
                The platform never fetches or fabricates credit scores.
              </div>
            </div>

            {/* PAYDEX */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                  PAYDEX Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={paydexScore}
                  onChange={(e) => setPaydexScore(e.target.value)}
                  placeholder="0–100"
                  className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                />
                <div className="flex items-center gap-1 mt-1 text-[10px] text-pw-muted">
                  <Building2 className="w-3 h-3" /> Guidance: 80+ preferred
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                  Source
                </label>
                <input
                  type="text"
                  value={paydexSource}
                  onChange={(e) => setPaydexSource(e.target.value)}
                  placeholder="e.g. D&B Report, Feb 2026"
                  className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                />
              </div>
            </div>

            {/* FICO SBSS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                  FICO SBSS Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={sbssScore}
                  onChange={(e) => setSbssScore(e.target.value)}
                  placeholder="0–300"
                  className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                />
                <div className="flex items-center gap-1 mt-1 text-[10px] text-pw-muted">
                  <Building2 className="w-3 h-3" /> Guidance: ≥165 prescreen
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                  Source
                </label>
                <input
                  type="text"
                  value={sbssSource}
                  onChange={(e) => setSbssSource(e.target.value)}
                  placeholder="e.g. SBA Prescreen, Mar 2026"
                  className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                />
              </div>
            </div>

            {/* Intelliscore */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                  Intelliscore Plus
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={intelliscoreScore}
                  onChange={(e) => setIntelliscoreScore(e.target.value)}
                  placeholder="1–100"
                  className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider mb-1.5">
                  Source
                </label>
                <input
                  type="text"
                  value={intelliscoreSource}
                  onChange={(e) => setIntelliscoreSource(e.target.value)}
                  placeholder="e.g. Experian Pull, Jan 2026"
                  className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Injection Tier & Structure Visualization ── */}
        {currentStep === 'structure' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-3">
              <label className="text-xs font-bold text-pw-muted uppercase tracking-wider">
                Borrower Equity Injection Tier
              </label>
              <div className="grid grid-cols-3 gap-3">
                {([10, 15, 20] as const).map((tier) => {
                  const isSelected = injectionTier === tier;
                  const cdcPct = 100 - 50 - tier;
                  const labels: Record<number, string> = {
                    10: 'Standard',
                    15: 'New-Business or Special-Purpose',
                    20: 'Both Conditions',
                  };
                  return (
                    <button
                      key={tier}
                      onClick={() => setInjectionTier(tier)}
                      className={`p-4 border rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-[#7A9EAA] bg-[#7A9EAA]/5 shadow-sm'
                          : 'border-pw-border hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-pw-black">{tier}%</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#7A9EAA]" />}
                      </div>
                      <p className="text-[10px] text-pw-muted leading-tight">{labels[tier]}</p>
                      <p className="text-[10px] text-pw-muted mt-1">
                        50 / {cdcPct} / {tier}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FX-7 Structure Visualization */}
            {injectionTier && purchasePrice > 0 && (
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-pw-muted uppercase tracking-wider">
                  SBA 504 Capital Structure — FX-7
                </h4>

                {/* Stacked Bar */}
                <div className="flex rounded overflow-hidden h-6">
                  <div
                    className="bg-[#7A9EAA] flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ width: '50%' }}
                  >
                    Bank 50%
                  </div>
                  <div
                    className="bg-[#4B7A8A] flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ width: `${100 - 50 - injectionTier}%` }}
                  >
                    CDC {100 - 50 - injectionTier}%
                  </div>
                  <div
                    className="bg-[#047857] flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ width: `${injectionTier}%` }}
                  >
                    Equity {injectionTier}%
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-pw-muted font-light block">Bank 1st Lien</span>
                    <strong className="text-pw-black font-semibold">
                      ${Math.round(purchasePrice * 0.5).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-pw-muted font-light block">CDC Debenture</span>
                    <strong className="text-pw-black font-semibold">
                      ${Math.round(purchasePrice * ((100 - 50 - injectionTier) / 100)).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-pw-muted font-light block">Borrower Injection</span>
                    <strong className="text-pw-black font-semibold">
                      ${Math.round(purchasePrice * (injectionTier / 100)).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-pw-muted">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Structure sums to 100% of ${purchasePrice.toLocaleString()} purchase price
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-pw-border">
        <button
          onClick={goPrev}
          disabled={stepIdx === 0}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 rounded transition-all ${
            stepIdx === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-pw-black hover:bg-gray-50 border border-pw-border'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {stepIdx < STEP_ORDER.length - 1 ? (
          <button
            onClick={goNext}
            disabled={
              (currentStep === 'occupancy' && (!occupancyType || !occupancyRate))
            }
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 rounded transition-all ${
              (currentStep === 'occupancy' && (!occupancyType || !occupancyRate))
                ? 'bg-gray-300 text-white cursor-not-allowed'
                : 'bg-[#7A9EAA] text-white hover:bg-[#688a95] shadow-sm'
            }`}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!injectionTier || submitting}
            className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 rounded transition-all ${
              !injectionTier || submitting
                ? 'bg-gray-300 text-white cursor-not-allowed'
                : 'bg-[#047857] text-white hover:bg-[#065f46] shadow-sm'
            }`}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm SBA 504 Structure
          </button>
        )}
      </div>
    </div>
  );
}
