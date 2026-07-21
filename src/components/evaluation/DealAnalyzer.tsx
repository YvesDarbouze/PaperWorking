'use client';

import { useState, useEffect, useCallback, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '@/store/projectStore';
import { ComparableSale, LeadSource, Project } from '@/types/schema';
import { useDealSync } from '@/hooks/useProjectSync';

/* ═══════════════════════════════════════════════════════
   PRO-ANALYSIS TERMINAL — Deal Analyzer
   
   Luminous Glass reskin — matches Stitch schemas:
   • Rental mode: stepper + accordion + 7 result metrics
   • Flip mode:   flat sections + 5 result metrics + cost bar
   
   Preserves original MAO engine, comp grid, lead intelligence.
   ═══════════════════════════════════════════════════════ */

const LEAD_SOURCES: LeadSource[] = [
  'Wholesaler', 'MLS', 'REO', 'Direct Mail',
  'Auction', 'Probate', 'Driving for Dollars', 'Referral',
];

const MAX_COMPS = 5;

// ── Format Helpers ───────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n === 0) return '';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ── Sub-components ───────────────────────────────────────

function GlassCurrencyInput({
  label,
  value,
  onChange,
  placeholder = '0',
  hint,
  disabled,
  prefix = '$',
  suffix,
  step,
  isPercentage,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  step?: string;
  isPercentage?: boolean;
}) {
  const [raw, setRaw] = useState(isPercentage ? String(value || '') : fmtCurrency(value));

  useEffect(() => {
    setRaw(isPercentage ? String(value || '') : fmtCurrency(value));
  }, [value, isPercentage]);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
        {label}
      </label>
      <div className="relative group">
        {prefix && !suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold font-mono" style={{ color: 'var(--color-primary)' }}>
            {prefix}
          </span>
        )}
        <input
          type={isPercentage ? 'number' : 'text'}
          inputMode="numeric"
          placeholder={placeholder}
          value={raw}
          disabled={disabled}
          step={step}
          onChange={(e) => {
            if (isPercentage) {
              setRaw(e.target.value);
              onChange(parseFloat(e.target.value) || 0);
            } else {
              const stripped = e.target.value.replace(/[^0-9]/g, '');
              setRaw(stripped ? parseInt(stripped, 10).toLocaleString() : '');
              onChange(parseInt(stripped, 10) || 0);
            }
          }}
          onBlur={() => {
            if (!isPercentage) setRaw(fmtCurrency(value));
          }}
          className={`glass-input w-full rounded-xl py-3 font-mono text-[15px] font-bold
            ${prefix && !suffix ? 'pl-8 pr-4' : ''}
            ${suffix ? 'pl-4 pr-8' : ''}
            ${!prefix && !suffix ? 'px-4' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ color: 'var(--color-on-surface)' }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold" style={{ color: 'var(--color-primary)' }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] italic px-1" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.5 }}>{hint}</p>}
    </div>
  );
}

function AccordionSection({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="glass-panel rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        style={{ borderBottom: open ? '1px solid rgba(60, 74, 70, 0.1)' : 'none' }}
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>{icon}</span>
          <h3 className="text-lg font-bold uppercase tracking-wide font-mono" style={{ color: 'var(--color-on-surface)' }}>{title}</h3>
        </div>
        <span className="material-symbols-outlined opacity-50" style={{ transition: 'transform 0.3s', transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}>
          expand_less
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
  variant = 'default',
  bandPercent,
  bandColor,
  badge,
  large,
}: {
  label: string;
  value: string;
  description?: string;
  variant?: 'default' | 'positive' | 'warning' | 'hero';
  bandPercent?: number;
  bandColor?: string;
  badge?: string;
  large?: boolean;
}) {
  const getBandStyle = () => {
    if (variant === 'positive') return { background: 'var(--color-primary)', boxShadow: '0 0 10px var(--color-primary)' };
    if (variant === 'warning') return { background: '#ffac5a', boxShadow: '0 0 10px #ffac5a' };
    if (bandColor) return { background: bandColor, boxShadow: `0 0 10px ${bandColor}` };
    return { background: 'var(--color-on-surface-variant)', boxShadow: 'none' };
  };

  const valueColor = variant === 'positive' || variant === 'hero' ? 'var(--color-primary)' : 'var(--color-on-surface)';

  return (
    <div
      className={`p-${large ? 6 : 5} rounded-2xl relative overflow-hidden ${variant === 'positive' ? 'health-band-positive' : variant === 'warning' ? 'health-band-warning' : ''}`}
      style={{
        background: variant === 'hero'
          ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(69, 73, 85,0.05) 100%)'
          : 'var(--color-surface-container-lowest)',
        border: `1px solid ${variant === 'hero' ? 'rgba(69, 73, 85,0.2)' : 'rgba(60,74,70,0.3)'}`,
      }}
    >
      {variant === 'hero' && (
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>attach_money</span>
        </div>
      )}
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-1">
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: variant === 'hero' ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface-variant)' }}>
            {label}
          </p>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ background: 'rgba(69, 73, 85,0.2)', color: 'var(--color-primary)' }}>
              {badge}
            </span>
          )}
        </div>
        <p className={`${large ? 'text-[48px] leading-[56px]' : 'text-2xl'} font-extrabold font-mono`} style={{ color: valueColor }}>
          {value}
        </p>
        {bandPercent !== undefined && (
          <div className="health-band my-2">
            <div className="health-band-fill" style={{ width: `${Math.min(100, Math.max(0, bandPercent))}%`, ...getBandStyle() }} />
          </div>
        )}
        {description && (
          <p className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>{description}</p>
        )}
      </div>
    </div>
  );
}

// ── Rental Inputs Type ─────────────────────────────────

interface RentalInputs {
  purchasePrice: number;
  closingCosts: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  monthlyRent: number;
  otherIncome: number;
  vacancyRate: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  propertyMgmtPercent: number;
  monthlyHOA: number;
  monthlyUtilities: number;
  percentageOfOwnership: number;
  priceOfSale: number;
  investorExpenses: number;
}

// ── Flip Inputs Type ───────────────────────────────────

interface FlipInputs {
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  loanAmount: number;
  interestRate: number;
  loanMonths: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyUtilities: number;
  monthlyOther: number;
  costOfSalePercent: number;
  percentageOfOwnership: number;
  investorExpenses: number;
}

// ── Props Interface ──────────────────────────────────────
export interface DealAnalyzerProps {
  projectId?: string;
  initialValues?: {
    rental?: Partial<RentalInputs>;
    flip?: Partial<FlipInputs>;
    mode?: 'rental' | 'flip';
    arv?: number;
    rehabEst?: number;
    fixedCosts?: number;
    leadSource?: LeadSource | '';
    sellerMotivation?: string;
    emdAmount?: number;
    emdGoHardDate?: string;
  };
}

// ── Main Component ───────────────────────────────────────

export default function DealAnalyzer({ projectId, initialValues }: DealAnalyzerProps = {}) {
  // Unconditionally call useDealSync, which handles empty/null projectId gracefully.
  useDealSync(projectId ?? '');

  const currentProject = useProjectStore(state => state.currentProject);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  const addProject = useProjectStore(state => state.addProject);
  const uid = useId();

  // ── Mode Toggle ──
  const [mode, setMode] = useState<'rental' | 'flip'>(initialValues?.mode ?? 'rental');

  // ── Original MAO state (preserved from Phase 1 sourcing) ──
  const [arv, setArv] = useState(initialValues?.arv ?? 0);
  const [rehabEst, setRehabEst] = useState(initialValues?.rehabEst ?? 0);
  const [fixedCosts, setFixedCosts] = useState(initialValues?.fixedCosts ?? 0);
  const [comps, setComps] = useState<ComparableSale[]>([]);
  const [leadSource, setLeadSource] = useState<LeadSource | ''>(initialValues?.leadSource ?? '');
  const [sellerMotivation, setSellerMotivation] = useState(initialValues?.sellerMotivation ?? '');
  const [emdAmount, setEmdAmount] = useState(initialValues?.emdAmount ?? 0);
  const [emdGoHardDate, setEmdGoHardDate] = useState(initialValues?.emdGoHardDate ?? '');

  // ── Rental Mode State — zeroed; seeded from project in useEffect ──
  // NOTE: values here are intentionally 0 / empty so that opening the analyzer
  // on a new project starts blank, never showing fictional numbers.
  const [rental, setRental] = useState<RentalInputs>({
    purchasePrice: initialValues?.rental?.purchasePrice ?? 0,
    closingCosts: initialValues?.rental?.closingCosts ?? 0,
    downPaymentPercent: initialValues?.rental?.downPaymentPercent ?? 20,
    interestRate: initialValues?.rental?.interestRate ?? 0,
    loanTermYears: initialValues?.rental?.loanTermYears ?? 30,
    monthlyRent: initialValues?.rental?.monthlyRent ?? 0,
    otherIncome: initialValues?.rental?.otherIncome ?? 0,
    vacancyRate: initialValues?.rental?.vacancyRate ?? 5,
    monthlyTaxes: initialValues?.rental?.monthlyTaxes ?? 0,
    monthlyInsurance: initialValues?.rental?.monthlyInsurance ?? 0,
    monthlyMaintenance: initialValues?.rental?.monthlyMaintenance ?? 0,
    propertyMgmtPercent: initialValues?.rental?.propertyMgmtPercent ?? 8,
    monthlyHOA: initialValues?.rental?.monthlyHOA ?? 0,
    monthlyUtilities: initialValues?.rental?.monthlyUtilities ?? 0,
    percentageOfOwnership: initialValues?.rental?.percentageOfOwnership ?? 100,
    priceOfSale: initialValues?.rental?.priceOfSale ?? 0,
    investorExpenses: initialValues?.rental?.investorExpenses ?? 0,
  });

  // ── Flip Mode State — zeroed; seeded from project in useEffect ──
  const [flip, setFlip] = useState<FlipInputs>({
    purchasePrice: initialValues?.flip?.purchasePrice ?? 0,
    rehabCost: initialValues?.flip?.rehabCost ?? 0,
    arv: initialValues?.flip?.arv ?? 0,
    loanAmount: initialValues?.flip?.loanAmount ?? 0,
    interestRate: initialValues?.flip?.interestRate ?? 0,
    loanMonths: initialValues?.flip?.loanMonths ?? 12,
    monthlyTaxes: initialValues?.flip?.monthlyTaxes ?? 0,
    monthlyInsurance: initialValues?.flip?.monthlyInsurance ?? 0,
    monthlyUtilities: initialValues?.flip?.monthlyUtilities ?? 0,
    monthlyOther: initialValues?.flip?.monthlyOther ?? 0,
    costOfSalePercent: initialValues?.flip?.costOfSalePercent ?? 6.0,
    percentageOfOwnership: initialValues?.flip?.percentageOfOwnership ?? 100,
    investorExpenses: initialValues?.flip?.investorExpenses ?? 0,
  });

  // Synchronize when initialValues changes
  useEffect(() => {
    if (initialValues) {
      if (initialValues.arv !== undefined) setArv(initialValues.arv);
      if (initialValues.rehabEst !== undefined) setRehabEst(initialValues.rehabEst);
      if (initialValues.fixedCosts !== undefined) setFixedCosts(initialValues.fixedCosts);
      if (initialValues.leadSource !== undefined) setLeadSource(initialValues.leadSource);
      if (initialValues.sellerMotivation !== undefined) setSellerMotivation(initialValues.sellerMotivation);
      if (initialValues.emdAmount !== undefined) setEmdAmount(initialValues.emdAmount);
      if (initialValues.emdGoHardDate !== undefined) setEmdGoHardDate(initialValues.emdGoHardDate);
      if (initialValues.rental) {
        setRental(prev => ({ ...prev, ...initialValues.rental }));
      }
      if (initialValues.flip) {
        setFlip(prev => ({ ...prev, ...initialValues.flip }));
      }
      if (initialValues.mode) {
        setMode(initialValues.mode);
      }
    }
  }, [initialValues]);

  // Tracks whether the user has adjusted any what-if field since last project load
  const [underwritingDirty, setUnderwritingDirty] = useState(false);
  const [isSavingUnderwriting, setIsSavingUnderwriting] = useState(false);

  // ── Rental step (for stepper visual) ──
  const [rentalStep] = useState(1);

  // Sync from project when it changes (original MAO)
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
    // Seed rental inputs from project financials.
    // Fields with no stored value start at 0 — explicitly absent, never fictional.
    setRental(prev => ({
      ...prev,
      purchasePrice: f.purchasePrice ?? 0,
      monthlyRent: f.monthlyGrossRent ?? f.projectedMonthlyRent ?? 0,
      otherIncome: f.otherMonthlyIncome ?? 0,
      vacancyRate: f.vacancyRatePercent ?? f.vacancyRate ?? 5,
      interestRate: f.loanInterestRate ?? 0,
      loanTermYears: f.loanTermYears ?? 30,
      monthlyTaxes: f.operatingExpenseTaxes ?? 0,
      monthlyInsurance: f.operatingExpenseInsurance ?? 0,
      propertyMgmtPercent: f.propertyManagementFeePercent ?? 8,
    }));
    // Seed flip inputs from project financials.
    setFlip(prev => ({
      ...prev,
      purchasePrice: f.purchasePrice ?? 0,
      rehabCost: f.projectedRehabCost ?? 0,
      arv: f.estimatedARV ?? 0,
      loanAmount: f.loanAmount ?? 0,
      interestRate: f.loanInterestRate ?? 0,
    }));
    // Clear dirty flag when we re-seed from a (possibly different) project
    setUnderwritingDirty(false);
  }, [currentProject?.id]);

  const isLocked = currentProject?.isClearToClose ?? false;

  // ── Persist helpers (original) ──
  const save = useCallback((patch: Parameters<typeof updateProjectFinancials>[1]) => {
    if (isLocked || !currentProject) return;
    updateProjectFinancials(currentProject.id, patch);
  }, [currentProject?.id, updateProjectFinancials, isLocked, currentProject]);

  // ── Original MAO engine (preserved intact) ──
  const mao = Math.max(0, arv * 0.7 - rehabEst - fixedCosts);
  const maoIsSetup = arv > 0;
  const purchasePrice = currentProject?.financials?.purchasePrice || 0;
  const maoViolated = maoIsSetup && purchasePrice > mao;

  // Persist MAO whenever inputs change
  useEffect(() => {
    if (!currentProject?.id) return;
    save({ maxOffer: mao });
  }, [mao, currentProject?.id]);

  // ── Comp helpers (preserved) ──
  const validComps = comps.filter(c => c.soldPrice > 0);
  const avgCompPrice = validComps.length > 0
    ? validComps.reduce((s, c) => s + c.soldPrice, 0) / validComps.length
    : 0;

  const addComp = () => {
    if (isLocked || comps.length >= MAX_COMPS) return;
    const newComp: ComparableSale = {
      id: `${uid}-${Date.now()}`,
      address: '', soldPrice: 0, distanceMiles: 0, daysOnMarket: 0,
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

  // ═══ RENTAL CALCULATIONS ═══════════════════════════════
  const rentalMetrics = useMemo(() => {
    const r = rental;
    const loanAmount = r.purchasePrice * (1 - r.downPaymentPercent / 100);
    const monthlyRate = r.interestRate / 100 / 12;
    const totalPayments = r.loanTermYears * 12;
    const monthlyMortgage = monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : loanAmount / totalPayments;

    const grossMonthlyIncome = r.monthlyRent + r.otherIncome;
    const effectiveGrossIncome = grossMonthlyIncome * 12 * (1 - r.vacancyRate / 100);
    const propMgmt = grossMonthlyIncome * r.propertyMgmtPercent / 100;
    const totalMonthlyExpenses = r.monthlyTaxes + r.monthlyInsurance + r.monthlyMaintenance + propMgmt + r.monthlyHOA + r.monthlyUtilities;
    const annualOperatingExpenses = totalMonthlyExpenses * 12;
    const noi = effectiveGrossIncome - annualOperatingExpenses;
    const annualDebtService = monthlyMortgage * 12;
    const monthlyCashFlow = noi / 12 - monthlyMortgage;
    const capRate = r.purchasePrice > 0 ? (noi / r.purchasePrice) * 100 : 0;
    const totalCashNeeded = r.purchasePrice * r.downPaymentPercent / 100 + r.closingCosts;
    const coc = totalCashNeeded > 0 ? ((noi - annualDebtService) / totalCashNeeded) * 100 : 0;
    const grm = grossMonthlyIncome > 0 ? r.purchasePrice / (grossMonthlyIncome * 12) : 0;
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

    const ownershipRatio = r.percentageOfOwnership / 100;
    const investorCashFlow = (monthlyCashFlow * ownershipRatio) - r.investorExpenses;
    
    // Profit on sale
    const sellingCosts = r.priceOfSale * 0.06; // Assume 6% cost of sale
    const remainingLoanBalance = loanAmount; // simplified logic
    const totalProfitOnSale = r.priceOfSale - sellingCosts - remainingLoanBalance - totalCashNeeded;
    const investorProfitOnSale = totalProfitOnSale * ownershipRatio;

    return { noi, monthlyCashFlow, capRate, coc, grm, dscr, totalCashNeeded, loanAmount, monthlyMortgage, investorCashFlow, investorProfitOnSale, totalProfitOnSale };
  }, [rental]);

  // ═══ FLIP CALCULATIONS ═════════════════════════════════
  const flipMetrics = useMemo(() => {
    const f = flip;
    const monthlyInterest = f.loanAmount * (f.interestRate / 100) / 12;
    const totalMonthlyHolding = f.monthlyTaxes + f.monthlyInsurance + f.monthlyUtilities + f.monthlyOther + monthlyInterest;
    const totalHoldingCost = totalMonthlyHolding * f.loanMonths;
    const costOfSale = f.arv * (f.costOfSalePercent / 100);
    const totalCost = f.purchasePrice + f.rehabCost + totalHoldingCost + costOfSale;
    const grossProfit = f.arv - totalCost;
    const totalCashNeeded = f.purchasePrice - f.loanAmount + f.rehabCost;
    const roi = totalCashNeeded > 0 ? (grossProfit / totalCashNeeded) * 100 : 0;
    const purchasePct = totalCost > 0 ? (f.purchasePrice / totalCost) * 100 : 0;
    const rehabPct = totalCost > 0 ? (f.rehabCost / totalCost) * 100 : 0;
    const holdingPct = totalCost > 0 ? (totalHoldingCost / totalCost) * 100 : 0;

    const ownershipRatio = f.percentageOfOwnership / 100;
    const investorGrossProfit = (grossProfit * ownershipRatio) - f.investorExpenses;
    const investorTotalCashNeeded = totalCashNeeded * ownershipRatio;
    const investorRoi = investorTotalCashNeeded > 0 ? (investorGrossProfit / investorTotalCashNeeded) * 100 : 0;

    return { grossProfit, roi, totalCashNeeded, monthlyInterest, totalHoldingCost, purchasePct, rehabPct, holdingPct, investorGrossProfit, investorRoi, investorTotalCashNeeded };
  }, [flip]);

  // ═══ SAVE AS PROJECT ═══════════════════════════════════
  const handleSaveAsProject = () => {
    const now = new Date();
    const newProject: Project = {
      id: crypto.randomUUID(),
      organizationId: currentProject?.organizationId || 'default',
      propertyName: mode === 'rental' ? 'Rental Analysis' : 'Flip Analysis',
      address: '',
      status: 'acquisition',
      dispositionType: mode === 'rental' ? 'RENT' : 'SALE',
      subStrategy: mode === 'rental' ? 'LONG_TERM' : 'FLIP',
      phaseStatus: 'Phase 1: Acquisition',
      currentPhase: 1,
      members: {},
      createdAt: now,
      updatedAt: now,
      ownerUid: currentProject?.ownerUid || '',
      financials: mode === 'rental' ? {
        purchasePrice: rental.purchasePrice,
        estimatedARV: rental.purchasePrice,
        costs: [],
        loanAmount: rentalMetrics.loanAmount,
        loanInterestRate: rental.interestRate,
        loanTermYears: rental.loanTermYears,
        monthlyGrossRent: rental.monthlyRent,
        otherMonthlyIncome: rental.otherIncome,
        vacancyRatePercent: rental.vacancyRate,
        operatingExpenseTaxes: rental.monthlyTaxes,
        operatingExpenseInsurance: rental.monthlyInsurance,
        monthlyMaintenanceReserve: rental.monthlyMaintenance,
        propertyManagementFeePercent: rental.propertyMgmtPercent,
        monthlyHOA: rental.monthlyHOA,
        fixedAcquisitionCosts: rental.closingCosts,
      } : {
        purchasePrice: flip.purchasePrice,
        estimatedARV: flip.arv,
        costs: [],
        projectedRehabCost: flip.rehabCost,
        loanAmount: flip.loanAmount,
        loanInterestRate: flip.interestRate,
        estimatedTimelineDays: flip.loanMonths * 30,
        holdingCostTaxes: flip.monthlyTaxes,
        holdingCostInsurance: flip.monthlyInsurance,
        holdingCostUtilities: flip.monthlyUtilities,
        fixedAcquisitionCosts: 0,
      },
    };

    addProject(newProject);
  };

  const handleReset = () => {
    // Re-seed from current project's stored financials (not fictional defaults)
    if (!currentProject) return;
    const f = currentProject.financials;
    if (mode === 'rental') {
      setRental(prev => ({
        ...prev,
        purchasePrice: f.purchasePrice ?? 0,
        monthlyRent: f.monthlyGrossRent ?? f.projectedMonthlyRent ?? 0,
        otherIncome: f.otherMonthlyIncome ?? 0,
        interestRate: f.loanInterestRate ?? 0,
        loanTermYears: f.loanTermYears ?? 30,
        monthlyTaxes: f.operatingExpenseTaxes ?? 0,
        monthlyInsurance: f.operatingExpenseInsurance ?? 0,
        propertyMgmtPercent: f.propertyManagementFeePercent ?? 8,
      }));
    } else {
      setFlip(prev => ({
        ...prev,
        purchasePrice: f.purchasePrice ?? 0,
        rehabCost: f.projectedRehabCost ?? 0,
        arv: f.estimatedARV ?? 0,
        loanAmount: f.loanAmount ?? 0,
        interestRate: f.loanInterestRate ?? 0,
      }));
    }
    setUnderwritingDirty(false);
  };

  /** Explicit save of what-if underwriting inputs to project record.
   *  Must be triggered by user action — never by auto-save. */
  const handleSaveUnderwriting = useCallback(async () => {
    if (!currentProject || isLocked) return;
    setIsSavingUnderwriting(true);
    try {
      const patch =
        mode === 'rental'
          ? {
              financials: {
                ...currentProject.financials,
                purchasePrice: rental.purchasePrice,
                projectedMonthlyRent: rental.monthlyRent,
                otherMonthlyIncome: rental.otherIncome,
                vacancyRatePercent: rental.vacancyRate,
                loanInterestRate: rental.interestRate,
                loanTermYears: rental.loanTermYears,
                operatingExpenseTaxes: rental.monthlyTaxes,
                operatingExpenseInsurance: rental.monthlyInsurance,
                propertyManagementFeePercent: rental.propertyMgmtPercent,
              },
            }
          : {
              financials: {
                ...currentProject.financials,
                purchasePrice: flip.purchasePrice,
                projectedRehabCost: flip.rehabCost,
                estimatedARV: flip.arv,
                loanAmount: flip.loanAmount,
                loanInterestRate: flip.interestRate,
              },
            };
      // Write to Firestore via projectsService
      const { projectsService } = await import('@/lib/firebase/deals');
      await projectsService.updateProject(currentProject.id, patch);
      // Sync Zustand
      updateProjectFinancials(currentProject.id, patch.financials);
      setUnderwritingDirty(false);
    } catch (err) {
      console.error('[DealAnalyzer] save underwriting failed:', err);
    } finally {
      setIsSavingUnderwriting(false);
    }
  }, [currentProject, mode, rental, flip, isLocked, updateProjectFinancials]);

  /** Helper: update rental state and mark dirty */
  const updateRental = useCallback(<K extends keyof RentalInputs>(key: K, val: RentalInputs[K]) => {
    setRental(p => ({ ...p, [key]: val }));
    setUnderwritingDirty(true);
  }, []);

  /** Helper: update flip state and mark dirty */
  const updateFlip = useCallback(<K extends keyof FlipInputs>(key: K, val: FlipInputs[K]) => {
    setFlip(p => ({ ...p, [key]: val }));
    setUnderwritingDirty(true);
  }, []);


  // ═══ RENDER ════════════════════════════════════════════

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-background)' }}>

      {/* ── Mode Toggle (desktop in header, mobile as full-width) ── */}
      <div className="md:hidden flex p-1 mb-6 rounded-xl" style={{ background: 'var(--color-surface-container-high)', border: '1px solid rgba(60,74,70,0.3)' }}>
        <button
          onClick={() => setMode('rental')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg uppercase tracking-wider transition-all ${mode === 'rental' ? 'text-[var(--color-primary)]' : ''}`}
          style={mode === 'rental' ? { background: 'rgba(69, 73, 85,0.1)', border: '1px solid rgba(69, 73, 85,0.2)' } : { color: 'var(--color-on-surface-variant)' }}
        >
          Rental
        </button>
        <button
          onClick={() => setMode('flip')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg uppercase tracking-wider transition-all ${mode === 'flip' ? 'text-[var(--color-primary)]' : ''}`}
          style={mode === 'flip' ? { background: 'rgba(69, 73, 85,0.1)', border: '1px solid rgba(69, 73, 85,0.2)' } : { color: 'var(--color-on-surface-variant)' }}
        >
          Flip Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* ═══ LEFT COLUMN: INPUTS ═══ */}
        <div className={`${mode === 'flip' ? 'xl:col-span-7' : 'lg:col-span-8'} space-y-6`}>

          {/* ── Rental Stepper + Desktop Mode Toggle ── */}
          {mode === 'rental' && (
            <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              {/* Stepper */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>1</div>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>ACQUISITION</span>
                </div>
                <div className="w-12 h-[2px]" style={{ background: 'rgba(60,74,70,0.5)' }} />
                <div className="flex items-center gap-2 opacity-40">
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center text-sm" style={{ borderColor: 'var(--color-on-surface)' }}>2</div>
                  <span className="text-sm">FINANCING</span>
                </div>
                <div className="w-12 h-[2px] hidden md:block" style={{ background: 'rgba(60,74,70,0.5)' }} />
                <div className="hidden md:flex items-center gap-2 opacity-40">
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center text-sm" style={{ borderColor: 'var(--color-on-surface)' }}>3</div>
                  <span className="text-sm">REHAB</span>
                </div>
              </div>
              {/* Desktop Mode Toggle */}
              <div className="hidden md:flex p-1 rounded-xl" style={{ background: 'var(--color-surface-container-lowest)', border: '1px solid rgba(60,74,70,0.3)' }}>
                <button
                  onClick={() => setMode('rental')}
                  className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                  style={mode === 'rental' ? { background: 'rgba(69, 73, 85,0.1)', color: 'var(--color-primary)' } : { color: 'var(--color-on-surface-variant)' }}
                >
                  Rental
                </button>
                <button
                  onClick={() => setMode('flip')}
                  className="px-6 py-2 rounded-lg text-sm transition-all hover:text-[var(--color-on-surface)]"
                  style={{ color: 'var(--color-on-surface-variant)' }}
                >
                  Flip
                </button>
              </div>
            </div>
          )}

          {/* ── Flip Mode: Desktop Toggle (no stepper) ── */}
          {mode === 'flip' && (
            <div className="hidden md:flex justify-end">
              <div className="flex p-1 rounded-xl" style={{ background: 'var(--color-surface-container-high)', border: '1px solid rgba(60,74,70,0.3)' }}>
                <button
                  onClick={() => setMode('rental')}
                  className="px-4 py-1.5 rounded-md text-sm transition-colors hover:text-[var(--color-on-surface)]"
                  style={{ color: 'var(--color-on-surface-variant)' }}
                >
                  Rental
                </button>
                <button
                  onClick={() => setMode('flip')}
                  className="px-4 py-1.5 rounded-md text-sm font-semibold"
                  style={{ background: 'rgba(69, 73, 85,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(69, 73, 85,0.2)' }}
                >
                  Flip
                </button>
              </div>
            </div>
          )}

          {/* ═══════ RENTAL INPUTS ═══════ */}
          {mode === 'rental' && (
            <div className="space-y-6">
              {/* Purchase Group */}
              <AccordionSection icon="payments" title="Purchase" defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCurrencyInput label="Purchase Price" value={rental.purchasePrice} onChange={v => updateRental('purchasePrice', v)} />
                  <GlassCurrencyInput label="Closing Costs" value={rental.closingCosts} onChange={v => updateRental('closingCosts', v)} />
                </div>
              </AccordionSection>

              {/* Financing Group */}
              <AccordionSection icon="account_balance" title="Financing" defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCurrencyInput label="Down Payment" value={rental.downPaymentPercent} onChange={v => updateRental('downPaymentPercent', v)} prefix="" suffix="%" isPercentage step="1" />
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Loan Amount (Auto)</label>
                    <div className="glass-input w-full rounded-xl py-3 px-4 font-mono text-[15px] font-bold opacity-50 cursor-not-allowed" style={{ color: 'var(--color-on-surface-variant)' }}>
                      ${rentalMetrics.loanAmount.toLocaleString()}
                    </div>
                  </div>
                  <GlassCurrencyInput label="Interest Rate" value={rental.interestRate} onChange={v => updateRental('interestRate', v)} prefix="" suffix="%" isPercentage step="0.1" />
                  <GlassCurrencyInput label="Loan Term" value={rental.loanTermYears} onChange={v => updateRental('loanTermYears', v)} prefix="" suffix="YRS" isPercentage />
                </div>
              </AccordionSection>

              {/* Income Group */}
              <AccordionSection icon="trending_up" title="Income" defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCurrencyInput label="Monthly Rent" value={rental.monthlyRent} onChange={v => updateRental('monthlyRent', v)} />
                  <GlassCurrencyInput label="Other Income" value={rental.otherIncome} onChange={v => updateRental('otherIncome', v)} />
                  <GlassCurrencyInput label="Vacancy Rate" value={rental.vacancyRate} onChange={v => updateRental('vacancyRate', v)} prefix="" suffix="%" isPercentage />
                </div>
              </AccordionSection>

              {/* Operating Expenses Group */}
              <AccordionSection icon="receipt_long" title="Operating Expenses" defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <GlassCurrencyInput label="Taxes /mo" value={rental.monthlyTaxes} onChange={v => updateRental('monthlyTaxes', v)} />
                  <GlassCurrencyInput label="Insurance /mo" value={rental.monthlyInsurance} onChange={v => updateRental('monthlyInsurance', v)} />
                  <GlassCurrencyInput label="Maintenance /mo" value={rental.monthlyMaintenance} onChange={v => updateRental('monthlyMaintenance', v)} />
                  <GlassCurrencyInput label="Property Mngmt" value={rental.propertyMgmtPercent} onChange={v => updateRental('propertyMgmtPercent', v)} prefix="" suffix="%" isPercentage />
                  <GlassCurrencyInput label="HOA /mo" value={rental.monthlyHOA} onChange={v => updateRental('monthlyHOA', v)} />
                  <GlassCurrencyInput label="Utilities /mo" value={rental.monthlyUtilities} onChange={v => updateRental('monthlyUtilities', v)} />
                </div>
              </AccordionSection>

              {/* Equity & Exit Strategy Group */}
              <AccordionSection icon="real_estate_agent" title="Equity & Exit Strategy" defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCurrencyInput label="Ownership %" value={rental.percentageOfOwnership} onChange={v => updateRental('percentageOfOwnership', v)} prefix="" suffix="%" isPercentage step="1" />
                  <GlassCurrencyInput label="Price of Sale (Exit)" value={rental.priceOfSale} onChange={v => updateRental('priceOfSale', v)} />
                  <GlassCurrencyInput label="Investor Expenses /mo" value={rental.investorExpenses} onChange={v => updateRental('investorExpenses', v)} hint="E.g. Asset Mgmt Fees" />
                </div>
              </AccordionSection>
            </div>
          )}

          {/* ═══════ FLIP INPUTS ═══════ */}
          {mode === 'flip' && (
            <div className="space-y-6">
              {/* Purchase & Rehab */}
              <AccordionSection icon="home_work" title="Purchase & Rehab" defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCurrencyInput label="Purchase Price" value={flip.purchasePrice} onChange={v => updateFlip('purchasePrice', v)} placeholder="325000" />
                  <GlassCurrencyInput label="Rehab Cost" value={flip.rehabCost} onChange={v => updateFlip('rehabCost', v)} placeholder="65000" />
                  <GlassCurrencyInput label="After-Repair Value" value={flip.arv} onChange={v => updateFlip('arv', v)} placeholder="485000" />
                </div>
              </AccordionSection>

              {/* Financing */}
              <AccordionSection icon="account_balance" title="Financing" defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCurrencyInput label="Loan Amount" value={flip.loanAmount} onChange={v => updateFlip('loanAmount', v)} />
                  <GlassCurrencyInput label="Interest Rate" value={flip.interestRate} onChange={v => updateFlip('interestRate', v)} prefix="" suffix="%" isPercentage step="0.1" />
                  <GlassCurrencyInput label="Length (Months)" value={flip.loanMonths} onChange={v => updateFlip('loanMonths', v)} prefix="" isPercentage />
                </div>
              </AccordionSection>

              {/* Monthly Holding Costs */}
              <AccordionSection icon="payments" title="Monthly Holding Costs" defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCurrencyInput label="Property Taxes" value={flip.monthlyTaxes} onChange={v => updateFlip('monthlyTaxes', v)} />
                  <GlassCurrencyInput label="Insurance (Vacant Policy)" value={flip.monthlyInsurance} onChange={v => updateFlip('monthlyInsurance', v)} />
                  <GlassCurrencyInput label="Utilities" value={flip.monthlyUtilities} onChange={v => updateFlip('monthlyUtilities', v)} />
                  <GlassCurrencyInput label="Other Expenses" value={flip.monthlyOther} onChange={v => updateFlip('monthlyOther', v)} />
                </div>
              </AccordionSection>

              {/* Sale */}
              <AccordionSection icon="sell" title="Sale" defaultOpen={true}>
                <div className="max-w-xs">
                  <GlassCurrencyInput
                    label="Cost of Sale (Percentage)"
                    value={flip.costOfSalePercent}
                    onChange={v => updateFlip('costOfSalePercent', v)}
                    prefix=""
                    suffix="%"
                    isPercentage
                    step="0.5"
                    hint="Typically includes agent commissions and closing fees."
                  />
                </div>
              </AccordionSection>

              {/* Equity & Exit Strategy Group */}
              <AccordionSection icon="real_estate_agent" title="Equity & Exit Strategy" defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCurrencyInput label="Ownership %" value={flip.percentageOfOwnership} onChange={v => updateFlip('percentageOfOwnership', v)} prefix="" suffix="%" isPercentage step="1" />
                  <GlassCurrencyInput label="Investor Expenses" value={flip.investorExpenses} onChange={v => updateFlip('investorExpenses', v)} hint="E.g. Capital Sourcing Fees" />
                </div>
              </AccordionSection>
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-12 xl:pb-0">
            <button
              onClick={handleSaveAsProject}
              className="luminous-button flex-1 py-4 rounded-xl font-extrabold uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Save as Project
            </button>
            {currentProject && underwritingDirty && !isLocked && (
              <button
                onClick={handleSaveUnderwriting}
                disabled={isSavingUnderwriting}
                className="px-6 py-4 text-sm font-semibold uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  opacity: isSavingUnderwriting ? 0.7 : 1,
                }}
                title="Save these what-if inputs to the project's underwriting record"
              >
                <span className="material-symbols-outlined text-[16px]">drive_file_rename_outline</span>
                {isSavingUnderwriting ? 'Saving…' : 'Save to Project'}
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-8 py-4 text-sm font-semibold uppercase tracking-widest rounded-xl transition-colors"
              style={{
                color: 'var(--color-on-surface-variant)',
                border: '1px solid rgba(60,74,70,0.3)',
                background: 'var(--color-surface-container-low)',
              }}
            >
              Reset Analysis
            </button>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: LIVE RESULTS ═══ */}
        <div className={`${mode === 'flip' ? 'xl:col-span-5' : 'lg:col-span-4'} xl:sticky xl:top-24 space-y-6`}>

          {/* Results Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold flex items-center gap-2 font-mono" style={{ color: 'var(--color-primary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>monitoring</span>
              Live Projections
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter" style={{ background: 'rgba(69, 73, 85,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(69, 73, 85,0.3)' }}>
              Real-time Calc
            </span>
          </div>

          {/* ═══ RENTAL RESULTS ═══ */}
          {mode === 'rental' && (
            <div className="glass-card rounded-2xl p-6 space-y-4" style={{ borderColor: 'rgba(69, 73, 85,0.2)', background: 'rgba(69, 73, 85,0.03)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold uppercase tracking-tighter" style={{ color: 'var(--color-primary)' }}>Live Projections</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }} />
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-primary)', opacity: 0.7 }}>Streaming</span>
                </div>
              </div>

              <MetricCard
                label="Monthly Cash Flow"
                value={`$${Math.round(rentalMetrics.monthlyCashFlow).toLocaleString()}`}
                description="Net income after all expenses and debt service."
                variant={rentalMetrics.monthlyCashFlow > 0 ? 'positive' : 'default'}
                bandPercent={Math.min(100, Math.abs(rentalMetrics.monthlyCashFlow) / 20)}
                badge={rentalMetrics.monthlyCashFlow > 500 ? 'Exceeds Goal' : undefined}
              />
              <MetricCard
                label="Annual NOI"
                value={fmtDollar(Math.round(rentalMetrics.noi))}
                description="Net Operating Income: Total income minus operating expenses."
                bandPercent={60}
              />
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Cap Rate"
                  value={fmtPercent(rentalMetrics.capRate)}
                  description="Annual return on purchase price if cash."
                  variant="positive"
                  bandPercent={rentalMetrics.capRate * 10}
                />
                <MetricCard
                  label="CoC Return"
                  value={fmtPercent(rentalMetrics.coc)}
                  description="Annual cash return on actual money invested."
                  variant="warning"
                  bandPercent={Math.min(100, rentalMetrics.coc * 5)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="GRM"
                  value={`${rentalMetrics.grm.toFixed(1)}x`}
                  description="Gross Rent Multiplier for quick screening."
                  bandPercent={50}
                />
                <MetricCard
                  label="DSCR"
                  value={rentalMetrics.dscr.toFixed(2)}
                  description={`Debt Service Coverage Ratio (Target > 1.2).`}
                  variant={rentalMetrics.dscr >= 1.2 ? 'positive' : 'warning'}
                  bandPercent={Math.min(100, rentalMetrics.dscr * 50)}
                />
              </div>
              <MetricCard
                label="Total Cash Needed"
                value={fmtDollar(Math.round(rentalMetrics.totalCashNeeded))}
                description="Sum of down payment and total closing costs."
                variant="hero"
                bandPercent={60}
              />

              {rental.percentageOfOwnership < 100 && (
                <div className="pt-4 mt-4 border-t border-white/10 space-y-4">
                  <h4 className="text-[12px] font-bold uppercase tracking-widest text-primary">Your Share ({rental.percentageOfOwnership}%)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Your Monthly CF"
                      value={fmtDollar(Math.round(rentalMetrics.investorCashFlow))}
                      description="Net cash flow after investor expenses."
                      variant={rentalMetrics.investorCashFlow > 0 ? 'positive' : 'warning'}
                      bandPercent={Math.min(100, Math.abs(rentalMetrics.investorCashFlow) / 10)}
                    />
                    <MetricCard
                      label="Your Profit on Sale"
                      value={fmtDollar(Math.round(rentalMetrics.investorProfitOnSale))}
                      description={`Based on ${fmtDollar(rental.priceOfSale)} exit.`}
                      variant="positive"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 space-y-4">
                <button
                  onClick={handleSaveAsProject}
                  className="luminous-button w-full py-4 rounded-xl font-extrabold uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save as Project
                </button>
                {currentProject && underwritingDirty && !isLocked && (
                  <button
                    onClick={handleSaveUnderwriting}
                    disabled={isSavingUnderwriting}
                    className="w-full py-3 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors rounded-xl"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: isSavingUnderwriting ? 0.7 : 1 }}
                    title="Save these what-if inputs to the project's underwriting record"
                  >
                    <span className="material-symbols-outlined text-[16px]">drive_file_rename_outline</span>
                    {isSavingUnderwriting ? 'Saving…' : 'Save to Project'}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="w-full py-2 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                  style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Reset Analysis
                </button>
              </div>

            </div>
          )}

          {/* ═══ FLIP RESULTS ═══ */}
          {mode === 'flip' && (
            <div className="space-y-4">
              <MetricCard
                label="Anticipated Gross Profit"
                value={fmtDollar(Math.round(flipMetrics.grossProfit))}
                description="Net gain after ARV minus all acquisition, rehab, and holding costs."
                variant="hero"
                large
                bandPercent={flipMetrics.grossProfit > 0 ? 72 : 0}
              />
              <MetricCard
                label="ROI %"
                value={fmtPercent(flipMetrics.roi)}
                description="Annualized return on initial capital investment."
                variant="positive"
                bandPercent={Math.min(100, flipMetrics.roi * 2)}
                bandColor="#7A9EAA"
              />
              <MetricCard
                label="Total Cash Needed"
                value={fmtDollar(Math.round(flipMetrics.totalCashNeeded))}
                description="Down payment, rehab reserve, and initial buffer."
                bandPercent={60}
              />
              <MetricCard
                label="Monthly Int. Payment"
                value={fmtDollar(Math.round(flipMetrics.monthlyInterest))}
                description="Interest: (Rate × Loan / 12)."
                bandPercent={30}
              />
              <MetricCard
                label="Total Holding Cost"
                value={fmtDollar(Math.round(flipMetrics.totalHoldingCost))}
                description="Sum of monthly costs × period."
                bandPercent={45}
              />

              {flip.percentageOfOwnership < 100 && (
                <div className="pt-4 mt-4 border-t border-white/10 space-y-4">
                  <h4 className="text-[12px] font-bold uppercase tracking-widest text-primary">Your Share ({flip.percentageOfOwnership}%)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Your Gross Profit"
                      value={fmtDollar(Math.round(flipMetrics.investorGrossProfit))}
                      variant={flipMetrics.investorGrossProfit > 0 ? 'positive' : 'warning'}
                    />
                    <MetricCard
                      label="Your ROI"
                      value={fmtPercent(flipMetrics.investorRoi)}
                      variant="positive"
                    />
                  </div>
                </div>
              )}

              {/* Cost Distribution Bar */}
              <div className="glass-panel p-6 rounded-2xl" style={{ border: '1px dashed rgba(60,74,70,0.5)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-primary)' }}>data_exploration</span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-on-surface-variant)' }}>Cost Distribution</span>
                </div>
                <div className="h-4 rounded-full flex overflow-hidden" style={{ background: 'var(--color-surface-container-high)' }}>
                  <div style={{ width: `${flipMetrics.purchasePct}%`, background: 'var(--color-primary)' }} />
                  <div style={{ width: `${flipMetrics.rehabPct}%`, background: 'var(--color-secondary)' }} />
                  <div style={{ width: `${flipMetrics.holdingPct}%`, background: 'var(--color-outline)' }} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-bold uppercase" style={{ color: 'var(--color-on-surface-variant)' }}>
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} /> Purchase</div>
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-secondary)' }} /> Rehab</div>
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-outline)' }} /> Holding</div>
                </div>
              </div>
            </div>
          )}

          {/* Strategy Insight Card (Rental only) */}
          {mode === 'rental' && (
            <div className="glass-card rounded-2xl p-6" style={{ borderColor: 'rgba(60,74,70,0.3)' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined" style={{ color: 'var(--color-tertiary-container, #ffac5a)' }}>lightbulb</span>
                <h4 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--color-on-surface)' }}>Market Comparison</h4>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                {rentalMetrics.capRate > 7
                  ? <>This deal is projecting a <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{fmtPercent(rentalMetrics.capRate)} cap rate</span>, which exceeds typical market benchmarks. Strong fundamentals for a buy-and-hold strategy.</>
                  : <>Current cap rate of <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{fmtPercent(rentalMetrics.capRate)}</span> is within normal range. Consider negotiating purchase price or increasing rent projections for better returns.</>
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
