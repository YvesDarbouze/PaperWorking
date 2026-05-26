'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, RefreshCw, Save, ChevronDown, ChevronUp, Building2, Banknote, Wallet, Tag } from 'lucide-react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   Deal Analyzer — PRO-ANALYSIS TERMINAL
   Stitch screen: 65cd1ea0c5bd4190aa191e26b6bc2d02

   2-column layout:
     Left  (7/12): Collapsible input sections
     Right (5/12): Sticky live projections + cost distribution chart
   Flip / Rental mode toggle. All calculations reactive.
   ═══════════════════════════════════════════════════════════════ */

type AnalyzerMode = 'flip' | 'rental';

interface FlipInputs {
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  loanAmount: number;
  interestRate: number;
  loanLengthMonths: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyUtilities: number;
  monthlyOther: number;
  costOfSalePct: number;
}

interface RentalInputs {
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  monthlyRent: number;
  vacancyRatePct: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  propertyMgmtPct: number;
}

/* ── Collapsible Section Wrapper ── */
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(24,33,39,0.6)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-teal-400">{icon}</span>
          <span className="text-base font-bold text-white font-mono tracking-tight">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

/* ── Number Input ── */
function NumInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1000,
  note,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  note?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 font-bold font-mono text-sm">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full rounded-xl py-3 font-mono text-sm text-white outline-none transition-all
            bg-white/[0.04] border border-white/[0.08]
            focus:border-teal-500/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-teal-500/20
            ${prefix ? 'pl-8 pr-4' : suffix ? 'pl-4 pr-8' : 'px-4'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 font-bold font-mono text-sm">{suffix}</span>
        )}
      </div>
      {note && <p className="text-[10px] text-slate-600 italic px-1">{note}</p>}
    </div>
  );
}

/* ── Metric Result Card ── */
function ResultCard({
  label,
  value,
  sub,
  fillPct,
  accent = false,
  large = false,
}: {
  label: string;
  value: string;
  sub: string;
  fillPct: number;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5 border border-white/[0.08]" style={{ background: 'rgba(24,33,39,0.6)' }}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      <div className={`font-mono font-bold mt-1 mb-3 ${large ? 'text-3xl' : 'text-xl'} ${accent ? 'text-teal-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(Math.max(fillPct, 0), 100)}%`,
            background: accent ? '#2dd4bf' : '#64748b',
            boxShadow: accent ? '0 0 10px rgba(45,212,191,0.4)' : 'none',
          }}
        />
      </div>
      <p className="text-[10px] text-slate-600 leading-tight">{sub}</p>
    </div>
  );
}

/* ── Cost Distribution ECharts bar ── */
function CostDistChart({ purchase, rehab, holding }: { purchase: number; rehab: number; holding: number }) {
  const total = purchase + rehab + holding;
  if (total === 0) return null;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (p: any) => `${p.name}: $${p.value.toLocaleString()} (${((p.value / total) * 100).toFixed(1)}%)`,
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        padAngle: 3,
        itemStyle: { borderRadius: 4 },
        label: { show: false },
        emphasis: { scale: false },
        data: [
          { name: 'Purchase', value: purchase, itemStyle: { color: '#2dd4bf' } },
          { name: 'Rehab', value: rehab, itemStyle: { color: '#818cf8' } },
          { name: 'Holding', value: holding, itemStyle: { color: '#64748b' } },
        ],
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} style={{ height: 130, width: '100%' }} opts={{ renderer: 'canvas' }} />
      <div className="flex justify-center gap-4 mt-1">
        {[['#2dd4bf', 'Purchase'], ['#818cf8', 'Rehab'], ['#64748b', 'Holding']].map(([color, name]) => (
          <div key={name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_FLIP: FlipInputs = {
  purchasePrice: 325000,
  rehabCost: 65000,
  arv: 485000,
  loanAmount: 275000,
  interestRate: 9.5,
  loanLengthMonths: 6,
  monthlyTaxes: 350,
  monthlyInsurance: 180,
  monthlyUtilities: 250,
  monthlyOther: 100,
  costOfSalePct: 6.0,
};

const DEFAULT_RENTAL: RentalInputs = {
  purchasePrice: 325000,
  rehabCost: 65000,
  arv: 485000,
  loanAmount: 275000,
  interestRate: 7.5,
  loanTermYears: 30,
  monthlyRent: 2800,
  vacancyRatePct: 5,
  monthlyTaxes: 350,
  monthlyInsurance: 180,
  monthlyMaintenance: 150,
  propertyMgmtPct: 8,
};

export default function DealAnalyzerPage() {
  const [mode, setMode] = useState<AnalyzerMode>('flip');
  const [flip, setFlip] = useState<FlipInputs>(DEFAULT_FLIP);
  const [rental, setRental] = useState<RentalInputs>(DEFAULT_RENTAL);

  const setF = <K extends keyof FlipInputs>(k: K) => (v: number) => setFlip((s) => ({ ...s, [k]: v }));
  const setR = <K extends keyof RentalInputs>(k: K) => (v: number) => setRental((s) => ({ ...s, [k]: v }));

  /* ── Flip Calculations ── */
  const flipCalc = useMemo(() => {
    const f = flip;
    const monthlyInterest = (f.loanAmount * (f.interestRate / 100)) / 12;
    const financingCost = monthlyInterest * f.loanLengthMonths;
    const monthlyHolding = f.monthlyTaxes + f.monthlyInsurance + f.monthlyUtilities + f.monthlyOther;
    const totalHoldingCost = monthlyHolding * f.loanLengthMonths;
    const costOfSaleAmt = f.arv * (f.costOfSalePct / 100);
    const totalCosts = f.purchasePrice + f.rehabCost + financingCost + totalHoldingCost + costOfSaleAmt;
    const grossProfit = f.arv - totalCosts;
    const downPayment = f.purchasePrice - f.loanAmount;
    const totalCashNeeded = Math.max(downPayment, 0) + f.rehabCost + monthlyHolding * 2;
    const roi = totalCashNeeded > 0 ? (grossProfit / totalCashNeeded) * 100 : 0;
    return {
      grossProfit,
      roi,
      totalCashNeeded,
      monthlyInterest,
      totalHoldingCost,
      financingCost,
      costOfSaleAmt,
    };
  }, [flip]);

  /* ── Rental Calculations ── */
  const rentalCalc = useMemo(() => {
    const r = rental;
    const effectiveRent = r.monthlyRent * (1 - r.vacancyRatePct / 100);
    const mgmtFee = effectiveRent * (r.propertyMgmtPct / 100);
    const monthlyOpEx = r.monthlyTaxes + r.monthlyInsurance + r.monthlyMaintenance + mgmtFee;
    const monthlyDebtSvc = (r.loanAmount * (r.interestRate / 100)) / 12;
    const monthlyCF = effectiveRent - monthlyOpEx - monthlyDebtSvc;
    const annualCF = monthlyCF * 12;
    const annualNOI = (effectiveRent - monthlyOpEx) * 12;
    const capRate = r.arv > 0 ? (annualNOI / r.arv) * 100 : 0;
    const totalInvested = Math.max(r.purchasePrice - r.loanAmount, 0) + r.rehabCost;
    const coc = totalInvested > 0 ? (annualCF / totalInvested) * 100 : 0;
    return { monthlyCF, annualCF, annualNOI, capRate, coc, monthlyDebtSvc, monthlyOpEx };
  }, [rental]);

  const fmt = (v: number, decimals = 0) =>
    v < 0
      ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: decimals })}`
      : `$${v.toLocaleString('en-US', { maximumFractionDigits: decimals })}`;

  return (
    <div className="min-h-full px-6 lg:px-8 py-8" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight font-mono uppercase">Pro-Analysis Terminal</h1>
          </div>
          <p className="text-sm text-slate-400">Real-time deal underwriting — Flip &amp; Rental modes.</p>
        </div>
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setMode('flip')}
            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
              mode === 'flip' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flip
          </button>
          <button
            onClick={() => setMode('rental')}
            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
              mode === 'rental' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rental
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── Left: Input Sections ── */}
        <div className="xl:col-span-7 space-y-5">

          {/* Purchase & Rehab */}
          <Section title="Purchase & Rehab" icon={<Building2 className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <NumInput label="Purchase Price" value={mode === 'flip' ? flip.purchasePrice : rental.purchasePrice}
                onChange={mode === 'flip' ? setF('purchasePrice') : setR('purchasePrice')} prefix="$" />
              <NumInput label="Rehab Cost" value={mode === 'flip' ? flip.rehabCost : rental.rehabCost}
                onChange={mode === 'flip' ? setF('rehabCost') : setR('rehabCost')} prefix="$" />
              <NumInput label="After-Repair Value (ARV)" value={mode === 'flip' ? flip.arv : rental.arv}
                onChange={mode === 'flip' ? setF('arv') : setR('arv')} prefix="$" />
            </div>
          </Section>

          {/* Financing */}
          <Section title="Financing" icon={<Banknote className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <NumInput label="Loan Amount" value={mode === 'flip' ? flip.loanAmount : rental.loanAmount}
                onChange={mode === 'flip' ? setF('loanAmount') : setR('loanAmount')} prefix="$" />
              <NumInput label="Interest Rate" value={mode === 'flip' ? flip.interestRate : rental.interestRate}
                onChange={mode === 'flip' ? setF('interestRate') : setR('interestRate')} suffix="%" step={0.1} />
              {mode === 'flip' ? (
                <NumInput label="Length (Months)" value={flip.loanLengthMonths}
                  onChange={setF('loanLengthMonths')} step={1} />
              ) : (
                <NumInput label="Loan Term (Years)" value={rental.loanTermYears}
                  onChange={setR('loanTermYears')} step={1} />
              )}
            </div>
          </Section>

          {/* Holding Costs / Operating Expenses */}
          <Section title={mode === 'flip' ? 'Monthly Holding Costs' : 'Monthly Operating Expenses'} icon={<Wallet className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <NumInput label="Property Taxes" value={mode === 'flip' ? flip.monthlyTaxes : rental.monthlyTaxes}
                onChange={mode === 'flip' ? setF('monthlyTaxes') : setR('monthlyTaxes')} prefix="$" step={50} />
              <NumInput label="Insurance" value={mode === 'flip' ? flip.monthlyInsurance : rental.monthlyInsurance}
                onChange={mode === 'flip' ? setF('monthlyInsurance') : setR('monthlyInsurance')} prefix="$" step={25} />
              {mode === 'flip' ? (
                <>
                  <NumInput label="Utilities" value={flip.monthlyUtilities} onChange={setF('monthlyUtilities')} prefix="$" step={25} />
                  <NumInput label="Other" value={flip.monthlyOther} onChange={setF('monthlyOther')} prefix="$" step={25} />
                </>
              ) : (
                <>
                  <NumInput label="Maintenance Reserve" value={rental.monthlyMaintenance} onChange={setR('monthlyMaintenance')} prefix="$" step={25} />
                  <NumInput label="Property Mgmt" value={rental.propertyMgmtPct} onChange={setR('propertyMgmtPct')} suffix="%" step={0.5} />
                </>
              )}
            </div>
          </Section>

          {/* Rental Income or Sale */}
          {mode === 'rental' ? (
            <Section title="Rental Income" icon={<Tag className="w-4 h-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <NumInput label="Monthly Gross Rent" value={rental.monthlyRent} onChange={setR('monthlyRent')} prefix="$" step={50} />
                <NumInput label="Vacancy Rate" value={rental.vacancyRatePct} onChange={setR('vacancyRatePct')} suffix="%" step={0.5} />
              </div>
            </Section>
          ) : (
            <Section title="Sale" icon={<Tag className="w-4 h-4" />}>
              <div className="max-w-xs">
                <NumInput
                  label="Cost of Sale"
                  value={flip.costOfSalePct}
                  onChange={setF('costOfSalePct')}
                  suffix="%"
                  step={0.5}
                  note="Includes agent commissions and closing fees."
                />
              </div>
            </Section>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard/projects/new"
              className="flex-1 py-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Project
            </Link>
            <button
              onClick={() => { mode === 'flip' ? setFlip(DEFAULT_FLIP) : setRental(DEFAULT_RENTAL); }}
              className="px-8 py-4 rounded-xl border border-white/10 text-sm font-semibold text-slate-400 hover:border-white/20 hover:text-white transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* ── Right: Live Projections ── */}
        <div className="xl:col-span-5 xl:sticky xl:top-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-teal-400 font-mono uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Live Projections
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Real-Time Calc
            </span>
          </div>

          {mode === 'flip' ? (
            <>
              <ResultCard
                label="Anticipated Gross Profit"
                value={fmt(flipCalc.grossProfit)}
                sub="Net gain after ARV minus all acquisition, rehab, and holding costs."
                fillPct={(flipCalc.grossProfit / flip.arv) * 100}
                accent
                large
              />
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  label="ROI %"
                  value={`${flipCalc.roi.toFixed(1)}%`}
                  sub="Annualized return on capital invested."
                  fillPct={flipCalc.roi}
                  accent
                />
                <ResultCard
                  label="Total Cash Needed"
                  value={fmt(flipCalc.totalCashNeeded)}
                  sub="Down payment + rehab + 2-month buffer."
                  fillPct={(flipCalc.totalCashNeeded / flip.arv) * 100}
                />
                <ResultCard
                  label="Monthly Int. Payment"
                  value={fmt(flipCalc.monthlyInterest)}
                  sub="Interest: (Rate × Loan / 12)."
                  fillPct={30}
                />
                <ResultCard
                  label="Total Holding Cost"
                  value={fmt(flipCalc.totalHoldingCost)}
                  sub={`Sum of monthly costs × ${flip.loanLengthMonths} months.`}
                  fillPct={45}
                />
              </div>

              {/* Cost Distribution Chart */}
              <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(24,33,39,0.6)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cost Distribution</span>
                </div>
                <CostDistChart
                  purchase={flip.purchasePrice}
                  rehab={flip.rehabCost}
                  holding={flipCalc.totalHoldingCost}
                />
              </div>
            </>
          ) : (
            <>
              <ResultCard
                label="Monthly Cash Flow"
                value={fmt(rentalCalc.monthlyCF)}
                sub="Effective rent minus operating expenses and debt service."
                fillPct={Math.abs(rentalCalc.monthlyCF / rental.monthlyRent) * 100}
                accent={rentalCalc.monthlyCF > 0}
                large
              />
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  label="Annual Cash Flow"
                  value={fmt(rentalCalc.annualCF)}
                  sub="Net cash flow over 12 months."
                  fillPct={Math.max(rentalCalc.annualCF / (rental.monthlyRent * 12), 0) * 100}
                  accent={rentalCalc.annualCF > 0}
                />
                <ResultCard
                  label="Cap Rate"
                  value={`${rentalCalc.capRate.toFixed(2)}%`}
                  sub="Annual NOI ÷ property value."
                  fillPct={rentalCalc.capRate * 10}
                  accent
                />
                <ResultCard
                  label="Cash-on-Cash"
                  value={`${rentalCalc.coc.toFixed(2)}%`}
                  sub="Annual CF ÷ equity invested."
                  fillPct={rentalCalc.coc * 5}
                  accent={rentalCalc.coc > 0}
                />
                <ResultCard
                  label="Monthly Debt Service"
                  value={fmt(rentalCalc.monthlyDebtSvc)}
                  sub="Principal + interest payment."
                  fillPct={40}
                />
              </div>

              {/* NOI Distribution */}
              <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(24,33,39,0.6)' }}>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Income vs. Expenses</span>
                <CostDistChart
                  purchase={rentalCalc.annualNOI > 0 ? rentalCalc.annualNOI : 0}
                  rehab={rentalCalc.monthlyOpEx * 12}
                  holding={rentalCalc.monthlyDebtSvc * 12}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
