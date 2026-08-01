'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Percent,
  Building,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Printer,
  Save,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  calculateRentalDeal,
  calculateFlipDeal,
  calculateBRRRRDeal,
  RentalCalcOutputs,
  FlipCalcOutputs,
  BRRRRCalcOutputs,
} from '@/lib/deal-analyzer/calcEngine';
import { WizardFormData } from '@/lib/deal-analyzer/wizardState';
import { FIELD_REGISTRY } from '@/lib/deal-analyzer/fieldRegistry';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import { useOptionalTenant } from '@/context/TenantContext';

interface DealAnalyzerResultsProps {
  formData: WizardFormData;
  strategy: 'rental' | 'flip' | 'brrrr';
  prefilledBadges?: Record<string, { source: string; retrievedAt: string }>;
  onEditWizard?: () => void;
  onUpdateFormData?: (nextData: WizardFormData) => void;
}

interface TargetHurdles {
  minCoC: number;
  minCapRate: number;
  minCommercialDSCR: number;
  minFlipProfit: number;
  minFlipROI: number;
}

const DEFAULT_HURDLES: TargetHurdles = {
  minCoC: 8.0,
  minCapRate: 6.0,
  minCommercialDSCR: 1.25,
  minFlipProfit: 25000,
  minFlipROI: 15.0,
};

function formatCurrency(val: number): string {
  if (isNaN(val) || !isFinite(val)) return '$0';
  const abs = Math.abs(val);
  const formatted = Math.round(abs).toLocaleString('en-US');
  return val < 0 ? `-$${formatted}` : `$${formatted}`;
}

function formatPercent(val: number, decimals: number = 2): string {
  if (isNaN(val) || !isFinite(val)) return '0.00%';
  return `${val.toFixed(decimals)}%`;
}

/**
 * Tooltip wrapper rendering standard metric definitions and formulas matching PROMPT 5 spec.
 */
function MetricTooltip({ title, formula, hint }: { title: string; formula: string; hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block ml-1.5 text-slate-400 hover:text-white cursor-pointer" tabIndex={0}>
      <HelpCircle
        size={14}
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      />
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-slate-900 border border-white/20 shadow-2xl text-xs font-sans text-slate-200 pointer-events-none">
          <div className="font-bold text-white mb-1">{title}</div>
          <div className="font-mono text-[11px] text-emerald-400 bg-black/40 p-1.5 rounded mb-1 border border-white/10">
            {formula}
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">{hint}</div>
        </div>
      )}
    </div>
  );
}

export function DealAnalyzerResults({
  formData: initialFormData,
  strategy,
  prefilledBadges = {},
  onEditWizard,
  onUpdateFormData,
}: DealAnalyzerResultsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const tenantCtx = useOptionalTenant();
  const activeTenantId = tenantCtx?.activeTenantId ?? null;

  // Local state for instant live recalculation
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);
  const [hurdles, setHurdles] = useState<TargetHurdles>(DEFAULT_HURDLES);
  const [showHurdleConfig, setShowHurdleConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'kpis' | 'proforma' | 'assumptions'>('kpis');
  const [isSaving, setIsSaving] = useState(false);

  // Sync internal state if parent updates initialFormData
  const handleInputChange = useCallback(
    (key: string, value: any) => {
      const updated = { ...formData, [key]: value };
      setFormData(updated);
      if (onUpdateFormData) {
        onUpdateFormData(updated);
      }
    },
    [formData, onUpdateFormData]
  );

  // ── RECALCULATE DEALS LIVE VIA CANONICAL ENGINE ─────────────────────────
  const purchasePrice = Number(formData.purchasePrice || 0);
  const monthlyRent = Number(formData.monthlyRent || 0);
  const arv = Number(formData.arv || purchasePrice);
  const rehabBudget = Number(formData.rehabBudget || 0);
  const holdingMonths = Number(formData.holdingMonths || 6);
  const preRefiHoldMonths = Number(formData.preRefiHoldMonths || 6);

  const rentalResults: RentalCalcOutputs = useMemo(() => {
    return calculateRentalDeal({
      purchasePrice,
      monthlyRent,
      vacancyRate: Number(formData.vacancyRate ?? 5),
      propertyTaxesAnnual: Number(formData.propertyTaxesAnnual ?? 1800),
      insuranceAnnual: Number(formData.insuranceAnnual ?? 1200),
      utilitiesMonthly: Number(formData.utilitiesMonthly ?? 0),
      hoaMonthly: Number(formData.hoaMonthly ?? 0),
      repairsPercent: Number(formData.repairsPercent ?? 5),
      capexPercent: Number(formData.capexPercent ?? 5),
      propertyMgmtPercent: Number(formData.propertyMgmtPercent ?? 10),
      downPaymentPercent: Number(formData.downPaymentPercent ?? 25),
      interestRate: Number(formData.interestRate ?? 6.5),
      loanTermYears: Number(formData.loanTermYears ?? 30),
      closingCostsPercent: Number(formData.purchaseClosingCostsPercent ?? 3),
      upfrontRehabCost: rehabBudget,
      isCashPurchase: formData.financingType === 'Cash',
      quickExpenseMode: !!formData.quickExpenseMode,
      rentGrowthAnnualPercent: Number(formData.rentGrowthAnnual ?? 3.0),
      expenseGrowthAnnualPercent: Number(formData.expenseGrowthAnnual ?? 2.5),
      appreciationAnnualPercent: Number(formData.appreciationAnnual ?? 4.0),
      holdPeriodYears: Number(formData.holdPeriodYears ?? 30),
      sellingCostsPercent: Number(formData.sellingCostsPercent ?? 6.0),
    });
  }, [formData, purchasePrice, monthlyRent, rehabBudget]);

  const flipResults: FlipCalcOutputs = useMemo(() => {
    return calculateFlipDeal({
      purchasePrice,
      arv,
      rehabBudget,
      holdingMonths,
      hardMoneyLTCPercent: Number(formData.hardMoneyLTC ?? 85),
      hardMoneyInterestRate: Number(formData.hardMoneyRate ?? 11.5),
      hardMoneyPointsPercent: Number(formData.hardMoneyPoints ?? 2.0),
      monthlyHoldingStack: Number(formData.monthlyHoldingCosts ?? 600),
      purchaseClosingCostsPercent: Number(formData.purchaseClosingCostsPercent ?? 2.0),
      sellingCostsPercent: Number(formData.sellingCostsPercent ?? 8.0),
      desiredProfit: Number(formData.desiredProfit ?? 25000),
      maoTargetPct: Number(formData.maoTargetPct ?? 0.7),
      isCashPurchase: formData.financingType === 'Cash',
    });
  }, [formData, purchasePrice, arv, rehabBudget, holdingMonths]);

  const brrrrResults: BRRRRCalcOutputs = useMemo(() => {
    return calculateBRRRRDeal({
      purchasePrice,
      arv,
      rehabBudget,
      preRefiHoldMonths,
      bridgeLTCPercent: Number(formData.bridgeLTC ?? 85),
      bridgeInterestRate: Number(formData.bridgeRate ?? 11.5),
      bridgePointsPercent: Number(formData.bridgePoints ?? 2.0),
      monthlyHoldingStack: Number(formData.monthlyHoldingCosts ?? 475),
      purchaseClosingCostsPercent: Number(formData.purchaseClosingCostsPercent ?? 2.0),
      refiLTVPercent: Number(formData.refiLTV ?? 75),
      refiInterestRate: Number(formData.refiInterestRate ?? 8.5),
      refiLoanTermYears: Number(formData.refiLoanTermYears ?? 30),
      refiClosingCostsPercent: Number(formData.refiClosingCostsPercent ?? 2.0),
      postRefiMonthlyRent: monthlyRent,
      vacancyRate: Number(formData.vacancyRate ?? 5),
      propertyTaxesAnnual: Number(formData.propertyTaxesAnnual ?? 1800),
      insuranceAnnual: Number(formData.insuranceAnnual ?? 1200),
      utilitiesMonthly: Number(formData.utilitiesMonthly ?? 0),
      hoaMonthly: Number(formData.hoaMonthly ?? 0),
      repairsPercent: Number(formData.repairsPercent ?? 5),
      capexPercent: Number(formData.capexPercent ?? 5),
      propertyMgmtPercent: Number(formData.propertyMgmtPercent ?? 10),
      rentGrowthAnnualPercent: Number(formData.rentGrowthAnnual ?? 3.0),
      expenseGrowthAnnualPercent: Number(formData.expenseGrowthAnnual ?? 2.5),
      appreciationAnnualPercent: Number(formData.appreciationAnnual ?? 4.0),
      sellingCostsPercent: Number(formData.sellingCostsPercent ?? 6.0),
    });
  }, [formData, purchasePrice, arv, rehabBudget, preRefiHoldMonths, monthlyRent]);

  // ── STRATEGY VERDICT LOGIC ──
  const verdictInfo = useMemo(() => {
    if (strategy === 'rental') {
      const fails: string[] = [];
      if (rentalResults.cashOnCashReturn < hurdles.minCoC) {
        fails.push(`CoC ${formatPercent(rentalResults.cashOnCashReturn)} < ${hurdles.minCoC}% target`);
      }
      if (rentalResults.capRate < hurdles.minCapRate) {
        fails.push(`Cap Rate ${formatPercent(rentalResults.capRate)} < ${hurdles.minCapRate}% target`);
      }
      if (!rentalResults.isCashPurchase && rentalResults.dscrCommercial < hurdles.minCommercialDSCR) {
        fails.push(`DSCR ${rentalResults.dscrCommercial.toFixed(2)}x < ${hurdles.minCommercialDSCR}x target`);
      }

      if (fails.length === 0) {
        return {
          status: 'MEETS TARGETS',
          color: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
          badge: 'bg-emerald-500 text-slate-950',
          icon: ShieldCheck,
          text: `Meets all investment hurdles (CoC ${formatPercent(rentalResults.cashOnCashReturn)}, DSCR ${rentalResults.dscrCommercial.toFixed(2)}x).`,
        };
      } else {
        return {
          status: 'BELOW HURDLES',
          color: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          badge: 'bg-amber-500 text-slate-950',
          icon: AlertTriangle,
          text: `Missed targets: ${fails.join('; ')}.`,
        };
      }
    } else if (strategy === 'flip') {
      const isMaoPassed = purchasePrice <= flipResults.flipMAO70;
      const isRoiPassed = flipResults.flipROI >= hurdles.minFlipROI;

      if (isMaoPassed && isRoiPassed) {
        return {
          status: 'PASS (BUY)',
          color: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
          badge: 'bg-emerald-500 text-slate-950',
          icon: ShieldCheck,
          text: `Meets 70% MAO rule (Price $${purchasePrice.toLocaleString()} ≤ MAO $${Math.round(flipResults.flipMAO70).toLocaleString()}) & yields ${formatPercent(flipResults.flipROI)} ROI.`,
        };
      } else {
        const reasons = [];
        if (!isMaoPassed) reasons.push(`Price $${purchasePrice.toLocaleString()} exceeds 70% MAO ($${Math.round(flipResults.flipMAO70).toLocaleString()})`);
        if (!isRoiPassed) reasons.push(`ROI ${formatPercent(flipResults.flipROI)} < ${hurdles.minFlipROI}% target`);
        return {
          status: 'FAIL (OVERPRICED)',
          color: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          badge: 'bg-rose-500 text-white',
          icon: ShieldAlert,
          text: `Verdict FAIL: ${reasons.join('; ')}.`,
        };
      }
    } else {
      // BRRRR
      const is80CostBasisPassed = brrrrResults.costBasisPercentOfARV <= 80;
      const isCoCPassed = brrrrResults.postRefiCoC >= hurdles.minCoC || brrrrResults.cashLeftInDeal <= 0;

      if (is80CostBasisPassed && isCoCPassed) {
        const cashOutStr = brrrrResults.cashOut >= 0 ? `net $${Math.round(brrrrResults.cashOut).toLocaleString()} cash-out` : `$${Math.abs(Math.round(brrrrResults.cashOut)).toLocaleString()} required`;
        return {
          status: 'STRONG BRRRR',
          color: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
          badge: 'bg-emerald-500 text-slate-950',
          icon: ShieldCheck,
          text: `Passes 80% ARV cost basis screen (${formatPercent(brrrrResults.costBasisPercentOfARV, 1)}) with ${cashOutStr} at refinance.`,
        };
      } else {
        return {
          status: 'WEAK REFINANCE',
          color: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          badge: 'bg-amber-500 text-slate-950',
          icon: AlertTriangle,
          text: `Cost basis is ${formatPercent(brrrrResults.costBasisPercentOfARV, 1)} of ARV (target ≤ 80%). Cash left in deal: $${Math.round(brrrrResults.cashLeftInDeal).toLocaleString()}.`,
        };
      }
    }
  }, [strategy, rentalResults, flipResults, brrrrResults, purchasePrice, hurdles]);

  // ── INSIGHTS & PORTFOLIO SAVE HANDLER ──
  const handleSaveToPortfolio = async () => {
    setIsSaving(true);
    try {
      const addressName = formData.address || 'Analyzed Investment Deal';
      const propertyName = addressName.split(',')[0];

      // Format payload for PaperWorking projects store & backend API
      const projectPayload = {
        ownerUid: user?.uid || 'user_demo',
        propertyName,
        address: formData.address || 'Address Not Specified',
        propertyType: formData.propertyType || 'Residential',
        dispositionType: strategy.toUpperCase(),
        status: 'acquisition',
        currentPhase: 1,
        financials: {
          purchasePrice: purchasePrice * 100, // cents
          estimatedARV: arv * 100,
          projectedRehabCost: rehabBudget * 100,
          monthlyGrossRent: monthlyRent,
          financingType: formData.financingType,
          downPaymentPercent: Number(formData.downPaymentPercent || 25),
          loanInterestRate: Number(formData.interestRate || 6.5),
          loanTermYears: Number(formData.loanTermYears || 30),
          vacancyRatePercent: Number(formData.vacancyRate || 5),
          tax: Number(formData.propertyTaxesAnnual || 1800),
          insurance: Number(formData.insuranceAnnual || 1200),
          utilities: Number(formData.utilitiesMonthly || 0),
          HOA: Number(formData.hoaMonthly || 0),
          capex: Number(formData.capexPercent || 5),
          management_pct: Number(formData.propertyMgmtPercent || 10),
          strategy,
          savedResults: strategy === 'rental' ? rentalResults : strategy === 'flip' ? flipResults : brrrrResults,
        },
      };

      const newId = `deal_${Date.now()}`;
      useProjectStore.getState().addProject({
        id: newId,
        ...projectPayload,
        phaseStatus: 'Phase 1: Find & Fund',
        organizationId: activeTenantId || 'org_default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      toast.success(`Saved "${propertyName}" to your Portfolio & Insights dashboard!`);
    } catch (err: any) {
      toast.error('Failed to save analysis to portfolio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSummary = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* ── PRINT-ONLY DEAL SUMMARY SHEET ── */}
      <div className="hidden print:block text-black bg-white p-8 font-sans space-y-6">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">PaperWorking Deal Summary</h1>
            <p className="text-sm text-gray-600">{formData.address || 'Investment Prospect'}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold uppercase">{strategy} Strategy</div>
            <div className="text-xs text-gray-500">Generated {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border p-4 rounded text-sm">
          <div>
            <span className="text-gray-500 block">Purchase Price:</span>
            <span className="font-bold">{formatCurrency(purchasePrice)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Monthly Rent / ARV:</span>
            <span className="font-bold">{strategy === 'flip' ? formatCurrency(arv) : `${formatCurrency(monthlyRent)}/mo`}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Verdict:</span>
            <span className="font-bold">{verdictInfo.status}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold border-b pb-1">Key Performance Metrics</h2>
          {strategy === 'rental' && (
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>Monthly Cash Flow: <strong>{formatCurrency(rentalResults.monthlyCashFlow)}</strong></div>
              <div>Cash-on-Cash: <strong>{formatPercent(rentalResults.cashOnCashReturn)}</strong></div>
              <div>Cap Rate: <strong>{formatPercent(rentalResults.capRate)}</strong></div>
              <div>Commercial DSCR: <strong>{rentalResults.dscrCommercial.toFixed(2)}x</strong></div>
            </div>
          )}
          {strategy === 'flip' && (
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>Net Profit: <strong>{formatCurrency(flipResults.flipProfit)}</strong></div>
              <div>Flip ROI: <strong>{formatPercent(flipResults.flipROI)}</strong></div>
              <div>70% Rule MAO: <strong>{formatCurrency(flipResults.flipMAO70)}</strong></div>
              <div>Total Cash Needed: <strong>{formatCurrency(flipResults.totalCashInvested)}</strong></div>
            </div>
          )}
          {strategy === 'brrrr' && (
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>Net Cash-Out: <strong>{formatCurrency(brrrrResults.cashOut)}</strong></div>
              <div>Cash Left in Deal: <strong>{formatCurrency(brrrrResults.cashLeftInDeal)}</strong></div>
              <div>Post-Refi Cash Flow: <strong>{formatCurrency(brrrrResults.postRefiMonthlyCashFlow)}/mo</strong></div>
              <div>Post-Refi CoC: <strong>{formatPercent(brrrrResults.postRefiCoC)}</strong></div>
            </div>
          )}
        </div>

        <div className="text-[10px] text-gray-500 border-t pt-4">
          PaperWorking Investment Engine · Confirmed canonical underwriting output per PROMPT 5 spec.
        </div>
      </div>

      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
            <Sparkles size={13} />
            {strategy} Underwriting Results
          </span>
          {formData.address && (
            <span className="text-xs text-slate-400 font-mono truncate max-w-xs">
              {formData.address}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEditWizard && (
            <button
              type="button"
              onClick={onEditWizard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw size={14} />
              Wizard Inputs
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveToPortfolio}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save to Portfolio'}
          </button>

          <button
            type="button"
            onClick={handlePrintSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Printer size={14} />
            Print Report
          </button>
        </div>
      </div>

      {/* ── DEAL VERDICT BANNER ── */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden transition-all duration-300 ${verdictInfo.color}`}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-emerald-400 mt-0.5">
            <verdictInfo.icon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${verdictInfo.badge}`}>
                {verdictInfo.status}
              </span>
              <h2 className="text-lg font-black text-white" id="deal-verdict-title">
                DEAL VERDICT: {verdictInfo.status}
              </h2>
            </div>
            <p className="text-xs text-slate-200 mt-1 max-w-2xl font-mono leading-relaxed">
              {verdictInfo.text}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHurdleConfig(!showHurdleConfig)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors"
        >
          <Sliders size={14} />
          Edit Target Hurdles
          {showHurdleConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── HURDLE CONFIGURATOR DRAWER ── */}
      {showHurdleConfig && (
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-950/80 space-y-4 print:hidden">
          <div className="text-xs font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <Sliders size={14} className="text-emerald-400" />
            Configure Target Investment Hurdles
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Min Cash-on-Cash (%)</label>
              <input
                type="number"
                step="0.5"
                value={hurdles.minCoC}
                onChange={(e) => setHurdles({ ...hurdles, minCoC: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Min Cap Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={hurdles.minCapRate}
                onChange={(e) => setHurdles({ ...hurdles, minCapRate: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Min Commercial DSCR (x)</label>
              <input
                type="number"
                step="0.05"
                value={hurdles.minCommercialDSCR}
                onChange={(e) => setHurdles({ ...hurdles, minCommercialDSCR: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Min Flip ROI (%)</label>
              <input
                type="number"
                step="1"
                value={hurdles.minFlipROI}
                onChange={(e) => setHurdles({ ...hurdles, minFlipROI: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── HIGH-LEVERAGE SENSITIVITY SLIDERS PANEL ── */}
      <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/40 space-y-4 print:hidden" style={{ background: 'rgba(18,16,20,0.95)' }}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Sliders size={15} className="text-emerald-400" />
            <span>Instant Sensitivity Sliders</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (Drag sliders to re-calculate all KPIs and pro-forma instantly)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Purchase Price */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Purchase Price:</span>
              <span className="text-white font-bold" id="slider-val-price">{formatCurrency(purchasePrice)}</span>
            </div>
            <input
              type="range"
              min={50000}
              max={1000000}
              step={5000}
              id="slider-purchase-price"
              value={purchasePrice}
              onChange={(e) => handleInputChange('purchasePrice', Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 2: Rent or ARV */}
          {strategy === 'flip' ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">After-Repair Value (ARV):</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(arv)}</span>
              </div>
              <input
                type="range"
                min={50000}
                max={1500000}
                step={5000}
                value={arv}
                onChange={(e) => handleInputChange('arv', Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Monthly Rent:</span>
                <span className="text-emerald-400 font-bold" id="slider-val-rent">{formatCurrency(monthlyRent)}/mo</span>
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={25}
                id="slider-monthly-rent"
                value={monthlyRent}
                onChange={(e) => handleInputChange('monthlyRent', Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Slider 3: Interest Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Interest Rate:</span>
              <span className="text-white font-bold">
                {formatPercent(Number(formData.interestRate || formData.hardMoneyRate || formData.bridgeRate || 6.5))}
              </span>
            </div>
            <input
              type="range"
              min={3.0}
              max={15.0}
              step={0.125}
              value={Number(formData.interestRate || formData.hardMoneyRate || formData.bridgeRate || 6.5)}
              onChange={(e) => {
                const val = Number(e.target.value);
                handleInputChange('interestRate', val);
                handleInputChange('hardMoneyRate', val);
                handleInputChange('bridgeRate', val);
              }}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 4: Vacancy Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Vacancy Rate:</span>
              <span className="text-white font-bold">{formatPercent(Number(formData.vacancyRate ?? 5), 1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={Number(formData.vacancyRate ?? 5)}
              onChange={(e) => handleInputChange('vacancyRate', Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 5: Rehab Budget */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Rehab Budget:</span>
              <span className="text-white font-bold">{formatCurrency(rehabBudget)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={250000}
              step={2500}
              value={rehabBudget}
              onChange={(e) => handleInputChange('rehabBudget', Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 6: Hold Period */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">
                {strategy === 'rental' ? 'Hold Period (Years):' : 'Holding Duration (Months):'}
              </span>
              <span className="text-white font-bold">
                {strategy === 'rental' ? `${formData.holdPeriodYears || 30} yrs` : `${holdingMonths} mo`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={strategy === 'rental' ? 30 : 24}
              step={1}
              value={strategy === 'rental' ? Number(formData.holdPeriodYears || 30) : holdingMonths}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (strategy === 'rental') {
                  handleInputChange('holdPeriodYears', val);
                } else {
                  handleInputChange('holdingMonths', val);
                  handleInputChange('preRefiHoldMonths', val);
                }
              }}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION TAB SWITCHER ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('kpis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kpis'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-white/5'
          }`}
        >
          <BarChart3 size={15} />
          KPI Metric Stack
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('proforma')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'proforma'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-white/5'
          }`}
        >
          <TrendingUp size={15} />
          Pro Forma &amp; Scenarios
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assumptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'assumptions'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-white/5'
          }`}
        >
          <Sliders size={15} />
          Full Assumptions Panel
        </button>
      </div>

      {/* ── TAB 1: STRATEGY KPI HEADER GRID ── */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          {strategy === 'rental' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Monthly Cash Flow */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1" id="kpi-card-cashflow">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Monthly Cash Flow</span>
                  <MetricTooltip title="Monthly Cash Flow" formula="Annual Pre-Tax Cash Flow ÷ 12" hint="Net cash remaining each month after paying operating expenses and monthly mortgage debt service." />
                </div>
                <div className="text-2xl font-black text-white font-mono" id="kpi-val-cashflow">
                  {formatCurrency(rentalResults.monthlyCashFlow)}
                </div>
                <div className="text-[11px] text-slate-400">{formatCurrency(rentalResults.annualCashFlow)} / year</div>
              </div>

              {/* Cash-on-Cash Return */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1" id="kpi-card-coc">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Cash-on-Cash Return</span>
                  <MetricTooltip title="Cash-on-Cash Return (CoC)" formula="(Annual Pre-Tax Cash Flow ÷ Total Cash Invested) × 100" hint="Annual pre-tax cash flow divided by initial cash out of pocket (down payment + closing costs + upfront rehab)." />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono" id="kpi-val-coc">
                  {formatPercent(rentalResults.cashOnCashReturn)}
                </div>
                <div className="text-[11px] text-slate-400">Cash Invested: {formatCurrency(rentalResults.totalCashInvested)}</div>
              </div>

              {/* Cap Rate */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Cap Rate</span>
                  <MetricTooltip
                    title="Capitalization Rate"
                    formula="(NOI ÷ Purchase Price) × 100"
                    hint="Unleveraged annual return based on Net Operating Income (NOI = EGI - OpEx). Operating Expenses include taxes, insurance, utilities, HOA, repairs (5%), CapEx reserves (5%), and property management (10% EGI). Used consistently across Cap Rate and Cash Flow cards."
                  />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {formatPercent(rentalResults.capRate)}
                </div>
                {rentalResults.upfrontRehabCost > 0 ? (
                  <div className="text-[11px] text-amber-400">Pro Forma Cap: {formatPercent(rentalResults.proFormaCapRate)}</div>
                ) : (
                  <div className="text-[11px] text-slate-400">NOI: {formatCurrency(rentalResults.noi)}</div>
                )}
              </div>

              {/* Commercial DSCR */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>DSCR (NOI ÷ debt service)</span>
                  <MetricTooltip title="Commercial DSCR" formula="NOI ÷ Annual Debt Service (P+I)" hint="Ratio of Net Operating Income to debt service. Lender minimum threshold marker is 1.25x." />
                </div>
                <div className="text-2xl font-black text-indigo-400 font-mono">
                  {rentalResults.isCashPurchase ? 'N/A (Cash)' : `${rentalResults.dscrCommercial.toFixed(2)}x`}
                </div>
                <div className="text-[11px] text-slate-400">Lender Min Marker: 1.25x</div>
              </div>

              {/* Residential DSCR */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>DSCR (rent ÷ PITIA)</span>
                  <MetricTooltip title="Residential DSCR" formula="Effective Monthly Rent ÷ Monthly PITIA" hint="Residential mortgage ratio of collected rent to Principal, Interest, Taxes, Insurance, and HOA. Floor marker 1.0x." />
                </div>
                <div className="text-2xl font-black text-sky-400 font-mono">
                  {rentalResults.isCashPurchase ? 'N/A (Cash)' : `${rentalResults.dscrResidential.toFixed(2)}x`}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">Floor Marker: 1.0x</div>
              </div>

              {/* Break-even Occupancy */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Break-Even Occupancy</span>
                  <MetricTooltip title="Break-Even Occupancy Rate" formula="((OpEx + Debt Service) ÷ Gross Potential Rent) × 100" hint="Minimum occupancy percentage required to cover all operating expenses and debt service without losing money." />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {formatPercent(rentalResults.breakEvenOccupancy, 1)}
                </div>
                <div className="text-[11px] text-slate-400">Vacancy Margin: {formatPercent(100 - rentalResults.breakEvenOccupancy, 1)}</div>
              </div>

              {/* GRM */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Gross Rent Multiplier</span>
                  <MetricTooltip title="Gross Rent Multiplier (GRM)" formula="Purchase Price ÷ Gross Annual Rent" hint="Number of years of gross rent required to pay off the purchase price." />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {(rentalResults.grossRentMultiplier ?? rentalResults.grm ?? 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400">Price / Gross Annual Rent</div>
              </div>

              {/* Rent-to-Price */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Rent-to-price (monthly)</span>
                  <MetricTooltip title="Rent-to-Price Ratio" formula="(Monthly Rent ÷ Purchase Price) × 100" hint="Monthly gross rent expressed as a percentage of purchase price (1% rule benchmark)." />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {formatPercent(rentalResults.rentToPriceMonthly, 2)}
                </div>
                <div className="text-[11px] text-slate-400">Price-to-rent (annual): {rentalResults.priceToRentAnnual.toFixed(2)}</div>
              </div>
            </div>
          )}

          {strategy === 'flip' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Net Profit */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Net Flip Profit</span>
                  <MetricTooltip title="Net Flip Profit" formula="ARV - (Price + Buy Closing + Rehab + Holding + Financing + Selling)" hint="Net cash profit after deducting all acquisition, rehab, debt, holding stack, and selling costs." />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {formatCurrency(flipResults.flipProfit)}
                </div>
                <div className="text-[11px] text-slate-400">Total Costs: {formatCurrency(flipResults.totalProjectCost)}</div>
              </div>

              {/* Flip ROI */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Flip ROI</span>
                  <MetricTooltip title="Flip Return on Investment (ROI)" formula="(Net Profit ÷ Total Cash Invested) × 100" hint="Return generated on out-of-pocket cash capital deployed into the flip deal." />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {formatPercent(flipResults.flipROI)}
                </div>
                <div className="text-[11px] text-slate-400">Cash Invested: {formatCurrency(flipResults.totalCashInvested)}</div>
              </div>

              {/* Profit Margin */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Profit Margin</span>
                  <MetricTooltip title="Profit Margin" formula="(Net Profit ÷ ARV) × 100" hint="Net profit expressed as a percentage of After-Repair Value." />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {formatPercent(flipResults.profitMargin)}
                </div>
                <div className="text-[11px] text-slate-400">Target: ≥ 15%</div>
              </div>

              {/* 70% Rule MAO */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>70% Rule MAO</span>
                  <MetricTooltip title="70% Rule Maximum Allowable Offer" formula="(ARV × 0.70) - Rehab Budget" hint="Rule of thumb maximum purchase price to ensure sufficient margin on a flip deal." />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {formatCurrency(flipResults.flipMAO70)}
                </div>
                <div className="text-[11px] font-bold">
                  {purchasePrice <= flipResults.flipMAO70 ? (
                    <span className="text-emerald-400">PASS (Price ≤ MAO)</span>
                  ) : (
                    <span className="text-rose-400">FAIL (Price &gt; MAO)</span>
                  )}
                </div>
              </div>

              {/* Bottom-Up Max Purchase Price */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Max Purchase Price (Bottom-Up)</span>
                  <MetricTooltip title="Bottom-Up Max Purchase Price" formula="ARV - Rehab - Buying - Holding - Financing - Selling - Desired Profit" hint="Maximum purchase price derived from detailed cost stack line items and target profit." />
                </div>
                <div className="text-2xl font-black text-sky-400 font-mono">
                  {formatCurrency(flipResults.bottomUpMaxPurchasePrice)}
                </div>
                <div className="text-[11px] text-slate-400">Desired Profit: {formatCurrency(flipResults.desiredProfit)}</div>
              </div>

              {/* Total Cash Needed */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Total Cash Needed</span>
                  <MetricTooltip title="Total Cash Needed" formula="Down Payment + Closing + Rehab Cash + Points + Holding" hint="Total liquidity required to complete acquisition and execute the rehab." />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {formatCurrency(flipResults.totalCashInvested)}
                </div>
                <div className="text-[11px] text-slate-400">Loan: {formatCurrency(flipResults.hardMoneyLoanAmount)}</div>
              </div>
            </div>
          )}

          {strategy === 'brrrr' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Net Cash-Out */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Net Cash-Out at Refi</span>
                  <MetricTooltip title="Net Cash-Out" formula="New Refi Loan - Bridge Payoff - Refi Closing Costs" hint="Cash returned to investor upon closing takeout refinance loan." />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {formatCurrency(brrrrResults.cashOut)}
                </div>
                <div className="text-[11px] text-slate-400">New Loan: {formatCurrency(brrrrResults.newRefiLoanAmount)}</div>
              </div>

              {/* Cash Left In Deal */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Cash Left in Deal</span>
                  <MetricTooltip title="Cash Left in Deal" formula="Initial Cash Invested - Net Cash-Out" hint="Net capital remaining in property after refinance payout." />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {brrrrResults.cashLeftInDeal <= 0 ? (
                    <span className="text-emerald-400 font-black">$0 (Infinite CoC)</span>
                  ) : (
                    formatCurrency(brrrrResults.cashLeftInDeal)
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Initial Cash: {formatCurrency(brrrrResults.initialCashInvested)}
                </div>
              </div>

              {/* Post-Refi Monthly Cash Flow */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Post-Refi Cash Flow</span>
                  <MetricTooltip title="Post-Refi Cash Flow" formula="(Post-Refi NOI - Refi Debt Service) ÷ 12" hint="Net monthly cash flow generated after completing refinance." />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {formatCurrency(brrrrResults.postRefiMonthlyCashFlow)}/mo
                </div>
                <div className="text-[11px] text-slate-400">{formatCurrency(brrrrResults.postRefiAnnualCashFlow)} / year</div>
              </div>

              {/* Post-Refi CoC */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Post-Refi CoC Return</span>
                  <MetricTooltip title="Post-Refi Cash-on-Cash Return" formula="Post-Refi Annual Cash Flow ÷ Cash Left in Deal" hint="Annual return on remaining capital left in deal. Renders ∞ when cash left in deal ≤ $0." />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {brrrrResults.postRefiCoCDisplay}
                </div>
                <div className="text-[11px] text-slate-400">Infinite CoC Rule Active</div>
              </div>

              {/* Cost Basis % of ARV */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Cost Basis % of ARV</span>
                  <MetricTooltip title="Cost Basis % of ARV" formula="(Total Cost Basis ÷ ARV) × 100" hint="Total all-in project cost expressed as a percentage of ARV (80% benchmark)." />
                </div>
                <div className="text-2xl font-black font-mono">
                  <span className={brrrrResults.costBasisPercentOfARV <= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                    {formatPercent(brrrrResults.costBasisPercentOfARV, 1)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">80% Refi Ceiling Screen</div>
              </div>

              {/* Post-Refi DSCR */}
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Post-Refi DSCR</span>
                  <MetricTooltip title="Post-Refi Commercial DSCR" formula="Post-Refi NOI ÷ Refi Annual Debt Service" hint="Debt service coverage ratio on takeout refinance loan." />
                </div>
                <div className="text-2xl font-black text-indigo-400 font-mono">
                  {brrrrResults.postRefiDSCR.toFixed(2)}x
                </div>
                <div className="text-[11px] text-slate-400">Refi P&amp;I: {formatCurrency(brrrrResults.postRefiMonthlyPI)}/mo</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PRO FORMA & SCENARIO ANALYSIS ── */}
      {activeTab === 'proforma' && (
        <div className="space-y-8">
          {strategy !== 'flip' ? (
            <>
              {/* 30-Year Wealth & Growth Line Chart */}
              <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-400" />
                      30-Year Buy &amp; Hold Wealth Accumulation Chart
                    </h3>
                    <p className="text-xs text-slate-400">
                      Plots projected Property Value, Equity, and Amortizing Loan Balance over 30 years.
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rentalResults.proFormaSchedule}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        formatter={(val: any) => [`$${Math.round(Number(val)).toLocaleString()}`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="propertyValue" name="Property Value" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="equity" name="Equity" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="loanBalance" name="Loan Balance" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Per-Year 30-Year Table */}
              <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar size={16} className="text-emerald-400" />
                      Complete 30-Year Pro Forma Table (All 30 Years)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Displays exact cash flows, cumulative returns, and profit-if-sold for EVERY year (Year 1 through 30).
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96 scrollbar-thin">
                  <table className="w-full text-xs text-left font-mono">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-white/10">
                      <tr>
                        <th className="p-2.5">Year</th>
                        <th className="p-2.5">Property Value</th>
                        <th className="p-2.5">Loan Balance</th>
                        <th className="p-2.5">Equity</th>
                        <th className="p-2.5">Annual Cash Flow</th>
                        <th className="p-2.5">Cumulative Cash Flow</th>
                        <th className="p-2.5">Profit If Sold</th>
                        <th className="p-2.5">Annualized Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {rentalResults.proFormaSchedule.map((row) => (
                        <tr key={row.year} className="hover:bg-white/5 transition-colors">
                          <td className="p-2.5 font-bold text-white">Yr {row.year}</td>
                          <td className="p-2.5">{formatCurrency(row.propertyValue)}</td>
                          <td className="p-2.5 text-rose-300">{formatCurrency(row.loanBalance)}</td>
                          <td className="p-2.5 text-sky-400 font-bold">{formatCurrency(row.equity)}</td>
                          <td className="p-2.5 text-emerald-400">{formatCurrency(row.annualCashFlow)}</td>
                          <td className="p-2.5 text-emerald-300">{formatCurrency(row.cumulativeCashFlow)}</td>
                          <td className="p-2.5 text-amber-300 font-bold">{formatCurrency(row.profitIfSoldThatYear)}</td>
                          <td className="p-2.5 text-indigo-300">{formatPercent(row.annualizedReturnPercent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* FLIP HOLDING DURATION SCENARIO TABLE */
            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-400" />
                    Flip Holding Duration Scenarios (3, 6, 9, 12 Months)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluates profit, interest costs, holding stack, and ROI as holding time extends.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="p-3">Hold Period</th>
                      <th className="p-3">Interest Cost</th>
                      <th className="p-3">Holding Stack</th>
                      <th className="p-3">Total Costs</th>
                      <th className="p-3">Net Profit</th>
                      <th className="p-3">Flip ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {[3, 6, 9, 12].map((months) => {
                      const scenario = calculateFlipDeal({
                        ...formData,
                        purchasePrice,
                        arv,
                        rehabBudget,
                        holdingMonths: months,
                      } as any);
                      return (
                        <tr key={months} className={months === holdingMonths ? 'bg-emerald-950/40 font-bold' : ''}>
                          <td className="p-3 text-white flex items-center gap-1.5">
                            {months} Months {months === holdingMonths && <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded">Active</span>}
                          </td>
                          <td className="p-3 text-rose-300">{formatCurrency(scenario.interestCost)}</td>
                          <td className="p-3 text-slate-300">{formatCurrency(scenario.holdingCostsTotal)}</td>
                          <td className="p-3 text-slate-100">{formatCurrency(scenario.totalProjectCost)}</td>
                          <td className="p-3 text-emerald-400 font-bold">{formatCurrency(scenario.flipProfit)}</td>
                          <td className="p-3 text-emerald-300 font-bold">{formatPercent(scenario.flipROI)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: FULL ASSUMPTIONS PANEL ── */}
      {activeTab === 'assumptions' && (
        <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-6 print:hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-emerald-400" />
              Complete Editable Assumptions Stack
            </h3>
            <span className="text-xs text-slate-400">All edits recalculate KPIs instantly</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
            {Object.keys(FIELD_REGISTRY).map((fieldKey) => {
              const def = FIELD_REGISTRY[fieldKey];
              if (!def) return null;

              const badge = prefilledBadges[fieldKey];
              return (
                <div key={fieldKey} className="p-3 rounded-xl border border-white/5 bg-slate-950/40 space-y-1.5">
                  <div className="flex justify-between items-center text-slate-300 font-sans">
                    <label className="font-bold text-slate-200">{def.label}</label>
                    {badge && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                        Prefilled
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={formData[fieldKey] ?? ''}
                    onChange={(e) => handleInputChange(fieldKey, Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                  <div className="text-[10px] text-slate-400 font-sans">{def.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
