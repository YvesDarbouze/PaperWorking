'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { LoanRecord } from '@/types/schema';
import {
  DollarSign,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  Target,
  Upload,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

const EXIT_LABELS: Record<string, string> = {
  SALE: 'Sell the asset',
  RENT: 'Hold & rent',
  LEASE: 'Commercial lease',
  REFINANCE: 'Refinance into permanent debt',
};

export function HardMoneyTermsCard({ projectId }: Props) {
  const [project, setProject] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form fields
  const [arvCents, setArvCents] = useState<string>('');
  const [arvSource, setArvSource] = useState<'user_assumption' | 'arv_appraisal'>('user_assumption');
  const [amountCents, setAmountCents] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [termMonths, setTermMonths] = useState<string>('');
  const [points, setPoints] = useState<string>('');
  const [interestOnly, setInterestOnly] = useState(false);

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

  // Find the active hard money / bridge loan record
  const activeLoan = useMemo(
    () => loans.find((l) => l.instrument === 'Hard Money' || l.instrument === 'Bridge'),
    [loans]
  );

  // Seed form from existing loan
  useEffect(() => {
    if (!activeLoan) return;
    if (activeLoan.arvCents) setArvCents(String(activeLoan.arvCents / 100));
    if (activeLoan.arvSource) setArvSource(activeLoan.arvSource);
    if (activeLoan.amountCents) setAmountCents(String(activeLoan.amountCents / 100));
    if (activeLoan.interestRate) setInterestRate(String(activeLoan.interestRate));
    if (activeLoan.termMonths) setTermMonths(String(activeLoan.termMonths));
    if (activeLoan.points != null) setPoints(String(activeLoan.points));
    if (activeLoan.interestOnly) setInterestOnly(true);
  }, [activeLoan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exit plan — read from project, never re-ask
  const exitPlan = project?.dispositionType || null;

  // Computed LTARV preview
  const parsedAmount = parseFloat(amountCents) || 0;
  const parsedArv = parseFloat(arvCents) || 0;
  const ltarvPreview = parsedArv > 0 ? ((parsedAmount / parsedArv) * 100).toFixed(1) : null;

  const handleSubmit = async () => {
    if (!activeLoan) {
      toast.error('No Hard Money or Bridge loan record found.');
      return;
    }

    setSubmitting(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication required.');

      const payload: Record<string, any> = {
        loanId: activeLoan.id,
        interestOnly,
      };

      if (arvCents) payload.arvCents = Math.round(parseFloat(arvCents) * 100);
      payload.arvSource = arvSource;
      if (amountCents) payload.amountCents = Math.round(parseFloat(amountCents) * 100);
      if (interestRate) payload.interestRate = parseFloat(interestRate);
      if (termMonths) payload.termMonths = parseInt(termMonths, 10);
      if (points) payload.points = parseFloat(points);

      const res = await fetch(`/api/projects/${projectId}/loans/hard-money-terms`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save terms.');
      }

      const data = await res.json();
      setResult(data);
      toast.success(`${activeLoan.instrument} terms saved.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save terms.');
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render if no hard money / bridge loan exists
  if (!activeLoan || loading) return null;

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-pw-border pb-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-[#7A9EAA]" />
            {activeLoan.instrument} Terms
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            {activeLoan.instrument === 'Hard Money'
              ? 'Asset/ARV-based short-term financing — compressed timeline.'
              : 'Gap liquidity bridge — fast close, short hold.'}
          </p>
        </div>
        {activeLoan.arvCents && activeLoan.interestRate ? (
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
            Terms Set
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            Needs Configuration
          </span>
        )}
      </div>

      {/* Exit Plan — read-only from dispositionType */}
      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3">
        <Target className="w-4 h-4 text-[#7A9EAA] flex-shrink-0" />
        <div className="text-xs">
          <span className="text-pw-muted font-light">Exit Plan</span>
          <strong className="text-pw-black font-semibold block">
            {exitPlan ? EXIT_LABELS[exitPlan] || exitPlan : 'Not yet set (configure in Strategy)'}
          </strong>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ARV */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider">
            After-Repair Value (ARV)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              min={0}
              step={1000}
              value={arvCents}
              onChange={(e) => setArvCents(e.target.value)}
              placeholder="e.g. 450000"
              className="w-full pl-9 pr-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
            />
          </div>

          {/* ARV Source Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setArvSource('user_assumption')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all ${
                arvSource === 'user_assumption'
                  ? 'border-[#7A9EAA] bg-[#7A9EAA]/10 text-[#7A9EAA]'
                  : 'border-pw-border text-pw-muted hover:border-gray-300'
              }`}
            >
              Assumption
            </button>
            <button
              onClick={() => setArvSource('arv_appraisal')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all flex items-center gap-1 ${
                arvSource === 'arv_appraisal'
                  ? 'border-[#7A9EAA] bg-[#7A9EAA]/10 text-[#7A9EAA]'
                  : 'border-pw-border text-pw-muted hover:border-gray-300'
              }`}
            >
              <Upload className="w-3 h-3" />
              Appraisal
            </button>
          </div>
        </div>

        {/* Loan Amount */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider">
            Loan Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              min={0}
              step={1000}
              value={amountCents}
              onChange={(e) => setAmountCents(e.target.value)}
              placeholder="e.g. 315000"
              className="w-full pl-9 pr-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
            />
          </div>
          {/* LTARV preview */}
          {ltarvPreview && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <TrendingUp className="w-3 h-3 text-[#7A9EAA]" />
              <span className="text-pw-muted">Loan-to-ARV:</span>
              <strong className={`font-bold ${
                parseFloat(ltarvPreview) > 75 ? 'text-amber-600' : 'text-green-700'
              }`}>
                {ltarvPreview}%
              </strong>
              {parseFloat(ltarvPreview) > 75 && (
                <span className="text-amber-600">(above 75% threshold)</span>
              )}
            </div>
          )}
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider">
            Interest Rate (%)
          </label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              min={0}
              max={30}
              step={0.125}
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="e.g. 10.5"
              className="w-full pl-9 pr-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
            />
          </div>
        </div>

        {/* Term Months */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider">
            Term (Months)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              min={1}
              max={60}
              step={1}
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              placeholder={activeLoan.instrument === 'Hard Money' ? '6-24' : '12-36'}
              className="w-full pl-9 pr-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
            />
          </div>
        </div>

        {/* Points */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider">
            Origination Points
          </label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.25}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="e.g. 2"
            className="w-full px-3 py-2 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
          />
        </div>

        {/* Interest-Only Toggle */}
        <div className="space-y-2 flex flex-col justify-end">
          <label className="block text-xs font-bold text-pw-muted uppercase tracking-wider">
            Interest-Only
          </label>
          <button
            onClick={() => setInterestOnly((v) => !v)}
            className={`w-full px-3 py-2 border rounded text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              interestOnly
                ? 'border-[#7A9EAA] bg-[#7A9EAA]/10 text-[#7A9EAA]'
                : 'border-pw-border bg-pw-white text-pw-muted hover:border-gray-300'
            }`}
          >
            {interestOnly ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Interest-Only Enabled
              </>
            ) : (
              'No — Fully Amortizing'
            )}
          </button>
          <p className="text-[10px] text-pw-muted">
            {interestOnly
              ? 'Monthly payment covers interest only — balloon due at term end.'
              : 'Standard principal + interest payments.'}
          </p>
        </div>
      </div>

      {/* Debt Service Result */}
      {result?.debtService && (
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold text-pw-muted uppercase tracking-wider">
            Debt Service Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-pw-muted font-light block">Monthly Payment</span>
              <strong className="text-pw-black font-semibold text-sm">
                ${result.debtService.monthlyPayment.toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-pw-muted font-light block">Annual Debt Service</span>
              <strong className="text-pw-black font-semibold text-sm">
                ${result.debtService.annualDebtService.toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-pw-muted font-light block">1st-Year Interest</span>
              <strong className="text-pw-black font-semibold text-sm">
                ${result.debtService.firstYearInterest.toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-pw-muted font-light block">1st-Year Principal</span>
              <strong className={`font-semibold text-sm ${
                result.debtService.firstYearPrincipal === 0 ? 'text-amber-600' : 'text-pw-black'
              }`}>
                ${result.debtService.firstYearPrincipal.toLocaleString()}
                {result.debtService.firstYearPrincipal === 0 && (
                  <span className="text-[9px] font-normal ml-1">(I/O)</span>
                )}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-pw-muted">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Compressed timeline template active for this route
          </div>
        </div>
      )}

      {/* High LTARV Warning */}
      {ltarvPreview && parseFloat(ltarvPreview) > 85 && (
        <div className="flex items-start gap-2.5 p-3 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">High Loan-to-ARV</span>
            Most hard money lenders cap LTARV at 70-75%. A ratio above 85% may require
            additional collateral or equity injection.
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2 border-t border-pw-border">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 rounded transition-all ${
            submitting
              ? 'bg-gray-300 text-white cursor-not-allowed'
              : 'bg-[#7A9EAA] text-white hover:bg-[#688a95] shadow-sm'
          }`}
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save {activeLoan.instrument} Terms
        </button>
      </div>
    </div>
  );
}
