'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Lock,
  DollarSign,
  Target,
  Hammer,
  TrendingUp,
  Percent,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   DealDataEntryForm — Phase 1 "Find & Fund" Data Entry

   Two sections:
   1. Property Intelligence
      • Seller Asking Price    (MLS-locked, read-only)
      • Target MAO             (user-editable, auto-seeded at 70%)
      • Est. Rehab Budget      (user-editable)

   2. The Capital Stack
      • Total Capital Needed   (derived, read-only)
      • Est. ARV               (user-editable)
      • Loan Amount            (user-editable)
      • Interest Rate          (user-editable)

   Accessibility:
   • MLS-locked fields: aria-readonly + aria-describedby tooltip
     + high-contrast "#555" text on "#e8e8e8" bg — NOT inaccessible
     pale-grey-on-white. Passes WCAG AA (contrast ratio ≥ 4.5:1).
   • All labels are explicit <label> elements with htmlFor wiring.
   • Focus ring: 2px solid #0d0d0d via outline utility.
   ═══════════════════════════════════════════════════════ */

// ── Formatting helpers ─────────────────────────────────

function parseCurrency(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
}

function fmtCurrency(n: number): string {
  if (!n) return '';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDisplay(n: number): string {
  if (!n) return '—';
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// ── Shared input primitives ─────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  icon?: React.ReactNode;
  suffix?: string;
  locked?: boolean;                  // MLS-pulled, cannot edit
  describedBy?: string;              // aria-describedby ID
  hint?: string;
  placeholder?: string;
}

function FormField({
  id,
  label,
  value,
  onChange,
  icon,
  suffix,
  locked = false,
  describedBy,
  hint,
  placeholder = '0',
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: '#555' }}
        >
          {label}
          {locked && (
            <>
              <Lock
                className="w-2.5 h-2.5"
                aria-hidden="true"
                style={{ color: '#888' }}
              />
              <span
                id={describedBy}
                className="sr-only"
              >
                This value is sourced from the MLS and cannot be edited.
              </span>
            </>
          )}
        </label>
        {hint && (
          <span className="text-[10px]" style={{ color: '#888' }}>
            {hint}
          </span>
        )}
      </div>

      {/* Input wrapper */}
      <div className="relative">
        {icon && (
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: locked ? '#777' : '#555' }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          readOnly={locked}
          aria-readonly={locked || undefined}
          aria-describedby={describedBy}
          onChange={locked ? undefined : (e) => onChange?.(e.target.value)}
          placeholder={locked ? undefined : placeholder}
          className={[
            'w-full text-sm font-medium transition',
            icon ? 'pl-9' : 'pl-4',
            suffix ? 'pr-12' : 'pr-4',
            'h-11 border',
            locked
              ? /* MLS-locked: accessible disabled look */
                'cursor-not-allowed select-none'
              : /* editable: interactive */
                'cursor-text',
          ].join(' ')}
          style={
            locked
              ? {
                  background: '#e8e8e8',
                  borderColor: '#d0d0d0',
                  color: '#333',             // ≥ 4.5:1 on #e8e8e8
                  outline: 'none',
                }
              : {
                  background: '#ffffff',
                  borderColor: '#d0d0d0',
                  color: '#0d0d0d',
                }
          }
          onFocus={(e) => {
            if (!locked) {
              e.currentTarget.style.borderColor = '#0d0d0d';
              e.currentTarget.style.outline = '2px solid #0d0d0d';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d0d0d0';
            e.currentTarget.style.outline = 'none';
          }}
        />

        {suffix && (
          <span
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
            style={{ color: locked ? '#777' : '#888' }}
            aria-hidden="true"
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Derived row (non-editable, computed) ────────────────

function DerivedRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border"
      style={{
        background: highlight ? '#0d0d0d' : '#f5f5f5',
        borderColor: highlight ? '#0d0d0d' : '#e4e4e4',
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: highlight ? '#f2f2f2' : '#666' }}
      >
        {label}
      </span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: highlight ? '#f2f2f2' : '#0d0d0d' }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Section header ──────────────────────────────────────

function SectionHead({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-4" style={{ borderBottom: '1px solid #e4e4e4' }}>
      <div
        className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: '#0d0d0d' }}
        aria-hidden="true"
      >
        <span className="w-4 h-4 text-white" style={{ color: '#f2f2f2' }}>
          {icon}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-bold tracking-tight" style={{ color: '#0d0d0d' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] mt-0.5" style={{ color: '#888' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────

interface Props {
  /** Pre-seed: address string displayed at top of form */
  propertyAddress?: string;
  /** Pre-seed: MLS asking price (locked, cannot be edited) */
  mlsAskingPrice?: number;
  /** Pre-seed: auto-calculated MAO (70% rule) */
  initialMAO?: number;
}

export default function DealDataEntryForm({
  propertyAddress,
  mlsAskingPrice = 0,
  initialMAO = 0,
}: Props) {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateProjectFinancials = useProjectStore((s) => s.updateProjectFinancials);

  // ── Section 1: Property Intelligence ──────────────────
  // Asking price is always MLS-locked; shown but not editable.
  const lockedAskingPrice = mlsAskingPrice || currentProject?.financials?.estimatedARV || 0;

  const [targetMAO, setTargetMAO] = useState(
    initialMAO
      ? fmtCurrency(initialMAO)
      : currentProject?.financials?.maxOffer
      ? fmtCurrency(currentProject.financials.maxOffer)
      : lockedAskingPrice
      ? fmtCurrency(Math.round(lockedAskingPrice * 0.7))
      : ''
  );
  const [rehabBudget, setRehabBudget] = useState(
    currentProject?.financials?.projectedRehabCost
      ? fmtCurrency(currentProject.financials.projectedRehabCost)
      : ''
  );

  // ── Section 2: The Capital Stack ───────────────────────
  const [estARV, setEstARV] = useState(
    currentProject?.financials?.estimatedARV
      ? fmtCurrency(currentProject.financials.estimatedARV)
      : ''
  );
  const [loanAmount, setLoanAmount] = useState(
    currentProject?.financials?.loanAmount
      ? fmtCurrency(currentProject.financials.loanAmount)
      : ''
  );
  const [interestRate, setInterestRate] = useState(
    currentProject?.financials?.loanInterestRate
      ? currentProject.financials.loanInterestRate.toString()
      : ''
  );

  // Re-seed when the active project changes
  useEffect(() => {
    const f = currentProject?.financials;
    if (!f) return;
    if (f.maxOffer) setTargetMAO(fmtCurrency(f.maxOffer));
    if (f.projectedRehabCost) setRehabBudget(fmtCurrency(f.projectedRehabCost));
    if (f.estimatedARV) setEstARV(fmtCurrency(f.estimatedARV));
    if (f.loanAmount) setLoanAmount(fmtCurrency(f.loanAmount));
    if (f.loanInterestRate) setInterestRate(f.loanInterestRate.toString());
  }, [currentProject?.id]);

  // ── Derived values ─────────────────────────────────────
  const maoNum = parseCurrency(targetMAO);
  const rehabNum = parseCurrency(rehabBudget);
  const arvNum = parseCurrency(estARV);
  const loanNum = parseCurrency(loanAmount);

  const totalCapitalNeeded = maoNum + rehabNum;

  const capRate = useMemo(() => {
    if (!maoNum || !arvNum) return null;
    const noi = arvNum - maoNum - rehabNum;
    return maoNum > 0 ? (noi / maoNum) * 100 : null;
  }, [maoNum, rehabNum, arvNum]);

  const monthlyBurnRate = useMemo(() => {
    if (!loanNum) return null;
    const rate = parseCurrency(interestRate) / 100 / 12;
    return loanNum * rate;
  }, [loanNum, interestRate]);

  // ── Apply to store ─────────────────────────────────────
  const [saved, setSaved] = useState(false);

  const handleApply = () => {
    if (!currentProject) {
      toast.error('No active deal selected');
      return;
    }
    updateProjectFinancials(currentProject.id, {
      purchasePrice: maoNum || currentProject.financials?.purchasePrice || 0,
      projectedRehabCost: rehabNum,
      estimatedARV: arvNum || lockedAskingPrice,
      maxOffer: maoNum,
      loanAmount: loanNum || undefined,
      loanInterestRate: parseCurrency(interestRate) || undefined,
    });
    setSaved(true);
    toast.success('Deal financials saved');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">

      {/* ─── Section 1: Property Intelligence ─────────── */}
      <section
        aria-labelledby="section-prop-intel"
        className="p-6 border"
        style={{ background: '#fafafa', borderColor: '#e4e4e4' }}
      >
        <div className="mb-5">
          <SectionHead
            icon={<MapPin className="w-4 h-4" />}
            title="Property Intelligence"
            subtitle={propertyAddress || currentProject?.address || 'No property selected'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Seller Asking Price — MLS locked */}
          <FormField
            id="field-asking-price"
            label="Seller Asking Price"
            value={lockedAskingPrice ? fmtCurrency(lockedAskingPrice) : '—'}
            icon={<DollarSign />}
            locked
            describedBy="asking-price-hint"
            hint="MLS source"
          />

          {/* Target MAO — editable */}
          <FormField
            id="field-target-mao"
            label="Target MAO"
            value={targetMAO}
            onChange={setTargetMAO}
            icon={<Target />}
            hint="70% rule auto-set"
            placeholder="Enter offer price"
          />

          {/* Est. Rehab Budget — editable */}
          <FormField
            id="field-rehab-budget"
            label="Est. Rehab Budget"
            value={rehabBudget}
            onChange={setRehabBudget}
            icon={<Hammer />}
            placeholder="Enter rehab cost"
          />
        </div>

        {/* Derived: Total Capital Needed */}
        <div className="mt-4">
          <DerivedRow
            label="Total Capital Needed (MAO + Rehab)"
            value={totalCapitalNeeded ? fmtDisplay(totalCapitalNeeded) : '—'}
            highlight
          />
        </div>
      </section>

      {/* ─── Section 2: The Capital Stack ─────────────── */}
      <section
        aria-labelledby="section-capital-stack"
        className="p-6 border"
        style={{ background: '#fafafa', borderColor: '#e4e4e4' }}
      >
        <div className="mb-5">
          <SectionHead
            icon={<Layers className="w-4 h-4" />}
            title="The Capital Stack"
            subtitle="Financing structure and projected returns"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Est. ARV */}
          <FormField
            id="field-arv"
            label="Est. ARV"
            value={estARV}
            onChange={setEstARV}
            icon={<TrendingUp />}
            hint="After-Repair Value"
            placeholder="After-repair value"
          />

          {/* Loan Amount */}
          <FormField
            id="field-loan-amount"
            label="Loan Amount"
            value={loanAmount}
            onChange={setLoanAmount}
            icon={<DollarSign />}
            placeholder="Hard money draw"
          />

          {/* Interest Rate */}
          <FormField
            id="field-interest-rate"
            label="Interest Rate"
            value={interestRate}
            onChange={setInterestRate}
            icon={<Percent />}
            suffix="% / yr"
            placeholder="e.g. 12"
          />
        </div>

        {/* Derived: Cap Rate + Monthly Burn */}
        <div className="mt-4 space-y-px">
          <DerivedRow
            label="Projected Cap Rate"
            value={capRate !== null ? `${capRate.toFixed(1)}%` : '—'}
          />
          <DerivedRow
            label="Est. Monthly Burn Rate"
            value={monthlyBurnRate !== null ? fmtDisplay(Math.round(monthlyBurnRate)) : '—'}
          />
        </div>

        {/* MLS-locked field legend */}
        <div
          className="mt-4 flex items-center gap-2 px-4 py-3 border"
          style={{ background: '#f0f0f0', borderColor: '#e4e4e4' }}
          role="note"
          aria-label="Field source legend"
        >
          <Info className="w-3.5 h-3.5 shrink-0" style={{ color: '#555' }} aria-hidden="true" />
          <p className="text-[10px] leading-relaxed" style={{ color: '#555' }}>
            <span className="font-bold" style={{ color: '#333' }}>Shaded fields</span>
            {' '}are sourced from MLS data and cannot be edited. All other fields accept manual input.
          </p>
        </div>
      </section>

      {/* ─── Apply CTA ─────────────────────────────────── */}
      <button
        onClick={handleApply}
        disabled={!currentProject || !maoNum}
        aria-disabled={!currentProject || !maoNum}
        className="w-full h-12 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-200"
        style={
          !currentProject || !maoNum
            ? {
                background: '#e4e4e4',
                color: '#999',
                cursor: 'not-allowed',
                border: '1px solid #d0d0d0',
              }
            : saved
            ? {
                background: '#1a1a1a',
                color: '#f2f2f2',
                border: '1px solid #0d0d0d',
              }
            : {
                background: '#0d0d0d',
                color: '#f2f2f2',
                border: '1px solid #0d0d0d',
              }
        }
        onMouseEnter={(e) => {
          if (currentProject && maoNum && !saved)
            e.currentTarget.style.background = '#333';
        }}
        onMouseLeave={(e) => {
          if (currentProject && maoNum && !saved)
            e.currentTarget.style.background = '#0d0d0d';
        }}
      >
        {saved ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Financials Saved
          </>
        ) : (
          'Apply to Deal'
        )}
      </button>
    </div>
  );
}
