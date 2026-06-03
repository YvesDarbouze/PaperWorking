'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Activity, DollarSign, Percent, ChevronRight, Save, Info, AlertTriangle, CheckCircle, Home, Layers, Landmark } from 'lucide-react';
import { calculateCapRate, calculateCoC, calculateIRR, calculateROI } from '@/lib/utils/reiCalculators';
import { CashFlowChart } from './charts/CashFlowChart';
import { EquityBuildupChart } from './charts/EquityBuildupChart';
import { useProjectStore } from '@/store/projectStore';

/* ═══════════════════════════════════════════════════════════════
   Deal Analyzer — Underwriting Input Terminal & Pro-Forma
   Matches Stitch design for Underwriting Input Terminal (a9666c0ef5b3405f9a8870b40833a101)
   and 5-Year Pro-Forma dashboard (7c2b1b1e8b4143fdbb664789fbaff585).
   ═══════════════════════════════════════════════════════════════ */

type StrategyType = 'rental' | 'flip';
type SubTabType = 'pnl' | 'assumptions' | 'sensitivity';

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
  closingCostsPct: number;
  downPaymentPct: number;
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
  closingCostsPct: number;
  downPaymentPct: number;
}

const DEFAULT_FLIP: FlipInputs = {
  purchasePrice: 325000,
  rehabCost: 65000,
  arv: 485000,
  loanAmount: 260000,
  interestRate: 9.5,
  loanLengthMonths: 6,
  monthlyTaxes: 350,
  monthlyInsurance: 180,
  monthlyUtilities: 250,
  monthlyOther: 100,
  costOfSalePct: 6.0,
  closingCostsPct: 2.0,
  downPaymentPct: 20,
};

const DEFAULT_RENTAL: RentalInputs = {
  purchasePrice: 325000,
  rehabCost: 65000,
  arv: 485000,
  loanAmount: 260000,
  interestRate: 7.5,
  loanTermYears: 30,
  monthlyRent: 2800,
  vacancyRatePct: 5,
  monthlyTaxes: 350,
  monthlyInsurance: 180,
  monthlyMaintenance: 150,
  propertyMgmtPct: 8,
  closingCostsPct: 2.5,
  downPaymentPct: 20,
};

export interface DealAnalyzerTerminalProps {
  data?: Partial<RentalInputs>;
  isLoading?: boolean;
}

export function DealAnalyzerTerminal({ data, isLoading = false }: DealAnalyzerTerminalProps = {}) {
  const storeProject = useProjectStore(state => state.currentProject);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  // View States
  const [activeTab, setActiveTab] = useState<'inputs' | 'proforma'>('inputs');
  const [strategy, setStrategy] = useState<StrategyType>('rental');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('pnl');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Derived initial states from store project or props
  const initialRentalInputs = useMemo(() => {
    const fin = storeProject?.financials;
    return {
      purchasePrice: fin?.purchasePrice ?? data?.purchasePrice ?? DEFAULT_RENTAL.purchasePrice,
      rehabCost: fin?.rehabBudget ?? fin?.actualRehabCost ?? data?.rehabCost ?? DEFAULT_RENTAL.rehabCost,
      arv: fin?.estimatedARV ?? fin?.arv ?? data?.arv ?? DEFAULT_RENTAL.arv,
      loanAmount: fin?.loanAmount ?? data?.loanAmount ?? DEFAULT_RENTAL.loanAmount,
      interestRate: fin?.loanInterestRate ?? data?.interestRate ?? DEFAULT_RENTAL.interestRate,
      loanTermYears: fin?.loanTermYears ?? data?.loanTermYears ?? DEFAULT_RENTAL.loanTermYears,
      monthlyRent: fin?.monthlyGrossRent ?? data?.monthlyRent ?? DEFAULT_RENTAL.monthlyRent,
      vacancyRatePct: fin?.vacancyRatePercent ?? data?.vacancyRatePct ?? DEFAULT_RENTAL.vacancyRatePct,
      monthlyTaxes: fin?.operatingExpenseTaxes ? fin.operatingExpenseTaxes / 12 : (data?.monthlyTaxes ?? DEFAULT_RENTAL.monthlyTaxes),
      monthlyInsurance: fin?.operatingExpenseInsurance ? fin.operatingExpenseInsurance / 12 : (data?.monthlyInsurance ?? DEFAULT_RENTAL.monthlyInsurance),
      monthlyMaintenance: fin?.monthlyMaintenanceReserve ?? data?.monthlyMaintenance ?? DEFAULT_RENTAL.monthlyMaintenance,
      propertyMgmtPct: fin?.propertyManagementFeePercent ?? data?.propertyMgmtPct ?? DEFAULT_RENTAL.propertyMgmtPct,
      closingCostsPct: DEFAULT_RENTAL.closingCostsPct,
      downPaymentPct: fin?.purchasePrice && fin?.loanAmount 
        ? Math.round(((fin.purchasePrice - fin.loanAmount) / fin.purchasePrice) * 100)
        : DEFAULT_RENTAL.downPaymentPct,
    };
  }, [storeProject, data]);

  const initialFlipInputs = useMemo(() => {
    const fin = storeProject?.financials;
    const derivedDownPayment = fin?.purchasePrice && fin?.loanAmount 
      ? Math.round(((fin.purchasePrice - fin.loanAmount) / fin.purchasePrice) * 100)
      : DEFAULT_FLIP.downPaymentPct;
    return {
      purchasePrice: fin?.purchasePrice ?? DEFAULT_FLIP.purchasePrice,
      rehabCost: fin?.rehabBudget ?? fin?.actualRehabCost ?? DEFAULT_FLIP.rehabCost,
      arv: fin?.estimatedARV ?? fin?.arv ?? DEFAULT_FLIP.arv,
      loanAmount: fin?.loanAmount ?? DEFAULT_FLIP.loanAmount,
      interestRate: fin?.loanInterestRate ?? DEFAULT_FLIP.interestRate,
      loanLengthMonths: fin?.estimatedTimelineDays ? Math.round(fin.estimatedTimelineDays / 30) : DEFAULT_FLIP.loanLengthMonths,
      monthlyTaxes: fin?.operatingExpenseTaxes ? fin.operatingExpenseTaxes / 12 : DEFAULT_FLIP.monthlyTaxes,
      monthlyInsurance: fin?.operatingExpenseInsurance ? fin.operatingExpenseInsurance / 12 : DEFAULT_FLIP.monthlyInsurance,
      monthlyUtilities: DEFAULT_FLIP.monthlyUtilities,
      monthlyOther: DEFAULT_FLIP.monthlyOther,
      costOfSalePct: (fin?.buyersAgentCommission || 0) + (fin?.sellersAgentCommission || 0) || DEFAULT_FLIP.costOfSalePct,
      closingCostsPct: DEFAULT_FLIP.closingCostsPct,
      downPaymentPct: derivedDownPayment,
    };
  }, [storeProject]);

  // Set strategy from project strategyType if it exists
  useEffect(() => {
    if (storeProject?.strategyType) {
      const type = storeProject.strategyType;
      if (type === 'Sell' || type === 'Fix & Flip') {
        setStrategy('flip');
      } else {
        setStrategy('rental');
      }
    }
  }, [storeProject]);

  // Local Inputs State
  const [rentalInputs, setRentalInputs] = useState<RentalInputs>(initialRentalInputs);
  const [flipInputs, setFlipInputs] = useState<FlipInputs>(initialFlipInputs);

  useEffect(() => {
    setRentalInputs(initialRentalInputs);
  }, [initialRentalInputs]);

  useEffect(() => {
    setFlipInputs(initialFlipInputs);
  }, [initialFlipInputs]);

  // Handle Input Changes
  const handleInputChange = (field: keyof RentalInputs | keyof FlipInputs, value: number) => {
    if (strategy === 'rental') {
      setRentalInputs(prev => {
        const next = { ...prev, [field]: value };
        if (field === 'downPaymentPct') {
          next.loanAmount = next.purchasePrice * (1 - value / 100);
        }
        if (field === 'purchasePrice') {
          next.loanAmount = value * (1 - next.downPaymentPct / 100);
        }
        return next;
      });
    } else {
      setFlipInputs(prev => {
        const next = { ...prev, [field]: value };
        if (field === 'downPaymentPct') {
          next.loanAmount = next.purchasePrice * (1 - value / 100);
        }
        if (field === 'purchasePrice') {
          next.loanAmount = value * (1 - next.downPaymentPct / 100);
        }
        return next;
      });
    }
  };

  // Sync / Save Action
  const handleSave = async () => {
    if (!storeProject) {
      // Standalone simulation feedback
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
      return;
    }

    try {
      if (strategy === 'rental') {
        await updateProjectFinancials(storeProject.id, {
          purchasePrice: rentalInputs.purchasePrice,
          estimatedARV: rentalInputs.arv,
          arv: rentalInputs.arv,
          rehabBudget: rentalInputs.rehabCost,
          loanAmount: rentalInputs.loanAmount,
          loanInterestRate: rentalInputs.interestRate,
          loanTermYears: rentalInputs.loanTermYears,
          monthlyGrossRent: rentalInputs.monthlyRent,
          vacancyRatePercent: rentalInputs.vacancyRatePct,
          operatingExpenseTaxes: rentalInputs.monthlyTaxes * 12,
          operatingExpenseInsurance: rentalInputs.monthlyInsurance * 12,
          monthlyMaintenanceReserve: rentalInputs.monthlyMaintenance,
          propertyManagementFeePercent: rentalInputs.propertyMgmtPct,
        });
      } else {
        await updateProjectFinancials(storeProject.id, {
          purchasePrice: flipInputs.purchasePrice,
          estimatedARV: flipInputs.arv,
          arv: flipInputs.arv,
          rehabBudget: flipInputs.rehabCost,
          loanAmount: flipInputs.loanAmount,
          loanInterestRate: flipInputs.interestRate,
          estimatedTimelineDays: flipInputs.loanLengthMonths * 30,
          operatingExpenseTaxes: flipInputs.monthlyTaxes * 12,
          operatingExpenseInsurance: flipInputs.monthlyInsurance * 12,
          buyersAgentCommission: flipInputs.costOfSalePct,
        });
      }
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
    } catch (err) {
      console.error('[DealAnalyzerTerminal] Save failed:', err);
    }
  };

  /* ── Rental Calculations ── */
  const rentalCalc = useMemo(() => {
    const r = rentalInputs;
    const effectiveRent = r.monthlyRent * (1 - r.vacancyRatePct / 100);
    const mgmtFee = effectiveRent * (r.propertyMgmtPct / 100);
    const monthlyOpEx = r.monthlyTaxes + r.monthlyInsurance + r.monthlyMaintenance + mgmtFee;
    
    // Standard Amortizing Debt Service
    const p = r.loanAmount;
    const rate = r.interestRate / 100 / 12;
    const n = r.loanTermYears * 12;
    const monthlyDebtSvc = rate > 0 && n > 0
      ? (p * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1)
      : p / (n || 1);

    const monthlyCF = effectiveRent - monthlyOpEx - monthlyDebtSvc;
    const annualCF = monthlyCF * 12;
    const annualNOI = (effectiveRent - monthlyOpEx) * 12;
    const capRate = calculateCapRate(annualNOI, r.purchasePrice || 1);
    
    const closingCostsAmt = r.purchasePrice * (r.closingCostsPct / 100);
    const totalInvested = Math.max(r.purchasePrice - r.loanAmount, 0) + r.rehabCost + closingCostsAmt;
    const coc = calculateCoC(annualCF, totalInvested);
    const dscr = monthlyDebtSvc > 0 ? (annualNOI / 12) / monthlyDebtSvc : 1.25;

    return { 
      monthlyCF, 
      annualCF, 
      annualNOI, 
      capRate, 
      coc, 
      monthlyDebtSvc, 
      monthlyOpEx, 
      totalInvested, 
      closingCostsAmt, 
      dscr 
    };
  }, [rentalInputs]);

  /* ── Flip Calculations ── */
  const flipCalc = useMemo(() => {
    const f = flipInputs;
    const monthlyInterest = (f.loanAmount * (f.interestRate / 100)) / 12;
    const financingCost = monthlyInterest * f.loanLengthMonths;
    const monthlyHolding = f.monthlyTaxes + f.monthlyInsurance + f.monthlyUtilities + f.monthlyOther;
    const totalHoldingCost = monthlyHolding * f.loanLengthMonths;
    const costOfSaleAmt = f.arv * (f.costOfSalePct / 100);
    const closingCostsAmt = f.purchasePrice * (f.closingCostsPct / 100);
    
    const totalCosts = f.purchasePrice + f.rehabCost + financingCost + totalHoldingCost + costOfSaleAmt + closingCostsAmt;
    const grossProfit = f.arv - totalCosts;
    const downPayment = f.purchasePrice - f.loanAmount;
    const totalCashNeeded = Math.max(downPayment, 0) + f.rehabCost + closingCostsAmt + (monthlyHolding * 2);
    const roi = calculateROI(grossProfit, totalCashNeeded);
    return {
      grossProfit,
      roi,
      totalCashNeeded,
      monthlyInterest,
      totalHoldingCost,
      financingCost,
      costOfSaleAmt,
      closingCostsAmt,
      totalCosts
    };
  }, [flipInputs]);

  /* ── 5-Year Projections (Rental) ── */
  const projections = useMemo(() => {
    const years = [1, 2, 3, 4, 5];
    const rentGrowth = 0.03;
    const expenseGrowth = 0.03;
    const appreciation = 0.03;

    return years.map(year => {
      const grossPotentialRent = rentalInputs.monthlyRent * 12 * Math.pow(1 + rentGrowth, year - 1);
      const vacancyLoss = grossPotentialRent * (rentalInputs.vacancyRatePct / 100);
      const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
      const mgmtFee = effectiveGrossIncome * (rentalInputs.propertyMgmtPct / 100);
      
      const baseOpEx = (rentalInputs.monthlyTaxes + rentalInputs.monthlyInsurance + rentalInputs.monthlyMaintenance) * 12;
      const grownBaseOpEx = baseOpEx * Math.pow(1 + expenseGrowth, year - 1);
      const operatingExpenses = grownBaseOpEx + mgmtFee;
      
      const noi = effectiveGrossIncome - operatingExpenses;
      const debtService = rentalCalc.monthlyDebtSvc * 12;
      const preTaxCashFlow = noi - debtService;

      const propertyValue = rentalInputs.arv * Math.pow(1 + appreciation, year);
      const loanBalance = rentalInputs.loanAmount * Math.pow(1 - 0.02, year);
      const equity = propertyValue - loanBalance;
      
      return {
        year,
        grossPotentialRent,
        vacancyLoss,
        effectiveGrossIncome,
        operatingExpenses,
        noi,
        debtService,
        preTaxCashFlow,
        propertyValue,
        loanBalance,
        equity
      };
    });
  }, [rentalInputs, rentalCalc]);

  // IRR Calculation
  const irr = useMemo(() => {
    const cashFlows = [
      -rentalCalc.totalInvested,
      ...projections.map((p, i) => {
        if (i === 4) {
          const netSaleProceeds = p.propertyValue * (1 - 0.06) - p.loanBalance;
          return p.preTaxCashFlow + netSaleProceeds;
        }
        return p.preTaxCashFlow;
      })
    ];
    return calculateIRR(cashFlows);
  }, [projections, rentalCalc]);

  const cashFlowData = useMemo(() => {
    return projections.map(p => ({
      period: `Year ${p.year}`,
      gpr: p.grossPotentialRent,
      opEx: p.operatingExpenses,
    }));
  }, [projections]);

  const equityData = useMemo(() => {
    return projections.map(p => ({
      period: `Year ${p.year}`,
      loanBalance: p.loanBalance,
      equity: p.equity,
    }));
  }, [projections]);

  const fmt = (v: number, decimals = 0) =>
    v < 0
      ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: decimals })}`
      : `$${v.toLocaleString('en-US', { maximumFractionDigits: decimals })}`;

  // Helper to compute metrics for sensitivity tables
  const computeCocAndIrr = useMemo(() => {
    return (rent: number, vacancyRate: number, interestRate: number) => {
      const years = [1, 2, 3, 4, 5];
      const rentGrowth = 0.03;
      const expenseGrowth = 0.03;
      const appreciation = 0.03;

      const effectiveRent = rent * (1 - vacancyRate / 100);
      const mgmtFee = effectiveRent * (rentalInputs.propertyMgmtPct / 100);
      const monthlyOpEx = rentalInputs.monthlyTaxes + rentalInputs.monthlyInsurance + rentalInputs.monthlyMaintenance + mgmtFee;
      
      const p = rentalInputs.loanAmount;
      const r = interestRate / 100 / 12;
      const n = rentalInputs.loanTermYears * 12;
      const monthlyDebtSvc = r > 0 && n > 0
        ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        : p / (n || 1);

      const annualCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      const totalInvested = Math.max(rentalInputs.purchasePrice - rentalInputs.loanAmount, 0) + rentalInputs.rehabCost + (rentalInputs.purchasePrice * (rentalInputs.closingCostsPct / 100));
      const coc = calculateCoC(annualCF, totalInvested);

      // Projections for the IRR
      const yearProjections = years.map(year => {
        const grossPotentialRent = rent * 12 * Math.pow(1 + rentGrowth, year - 1);
        const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
        const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
        const yearMgmtFee = effectiveGrossIncome * (rentalInputs.propertyMgmtPct / 100);
        
        const baseOpEx = (rentalInputs.monthlyTaxes + rentalInputs.monthlyInsurance + rentalInputs.monthlyMaintenance) * 12;
        const grownBaseOpEx = baseOpEx * Math.pow(1 + expenseGrowth, year - 1);
        const operatingExpenses = grownBaseOpEx + yearMgmtFee;
        
        const noi = effectiveGrossIncome - operatingExpenses;
        const debtService = monthlyDebtSvc * 12;
        const preTaxCashFlow = noi - debtService;

        const propertyValue = rentalInputs.arv * Math.pow(1 + appreciation, year);
        const loanBalance = rentalInputs.loanAmount * Math.pow(1 - 0.02, year);
        const equity = propertyValue - loanBalance;
        
        return {
          preTaxCashFlow,
          propertyValue,
          loanBalance,
          equity
        };
      });

      const cashFlows = [
        -totalInvested,
        ...yearProjections.map((p, i) => {
          if (i === 4) {
            const netSaleProceeds = p.propertyValue * (1 - 0.06) - p.loanBalance;
            return p.preTaxCashFlow + netSaleProceeds;
          }
          return p.preTaxCashFlow;
        })
      ];

      const calculatedIrrDecimal = calculateIRR(cashFlows);
      const calculatedIrr = calculatedIrrDecimal * 100;

      return { coc, irr: calculatedIrr };
    };
  }, [rentalInputs]);

  // Interest Rate Sensitivity
  const interestRateSensitivity = useMemo(() => {
    const baseRate = rentalInputs.interestRate;
    const rates = [baseRate - 2, baseRate - 1, baseRate, baseRate + 1, baseRate + 2];
    return rates.map(r => {
      const metrics = computeCocAndIrr(rentalInputs.monthlyRent, rentalInputs.vacancyRatePct, r);
      
      const p = rentalInputs.loanAmount;
      const rate = r / 100 / 12;
      const n = rentalInputs.loanTermYears * 12;
      const monthlyDebtSvc = rate > 0 && n > 0
        ? (p * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1)
        : p / (n || 1);

      const effectiveRent = rentalInputs.monthlyRent * (1 - rentalInputs.vacancyRatePct / 100);
      const mgmtFee = effectiveRent * (rentalInputs.propertyMgmtPct / 100);
      const monthlyOpEx = rentalInputs.monthlyTaxes + rentalInputs.monthlyInsurance + rentalInputs.monthlyMaintenance + mgmtFee;
      const firstYearCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      return {
        label: `${r.toFixed(2)}%`,
        rate: r,
        firstYearCF,
        coc: metrics.coc,
        irr: metrics.irr,
        isBase: Math.abs(r - baseRate) < 0.01,
      };
    });
  }, [rentalInputs, computeCocAndIrr]);

  // Rent Sensitivity
  const rentSensitivity = useMemo(() => {
    const baseRent = rentalInputs.monthlyRent;
    const rents = [baseRent * 0.9, baseRent * 0.95, baseRent, baseRent * 1.05, baseRent * 1.1];
    return rents.map(rent => {
      const metrics = computeCocAndIrr(rent, rentalInputs.vacancyRatePct, rentalInputs.interestRate);
      const effectiveRent = rent * (1 - rentalInputs.vacancyRatePct / 100);
      const mgmtFee = effectiveRent * (rentalInputs.propertyMgmtPct / 100);
      const monthlyOpEx = rentalInputs.monthlyTaxes + rentalInputs.monthlyInsurance + rentalInputs.monthlyMaintenance + mgmtFee;
      
      const p = rentalInputs.loanAmount;
      const r = rentalInputs.interestRate / 100 / 12;
      const n = rentalInputs.loanTermYears * 12;
      const monthlyDebtSvc = r > 0 && n > 0
        ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        : p / (n || 1);

      const firstYearCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      return {
        label: fmt(rent),
        rent,
        firstYearCF,
        coc: metrics.coc,
        irr: metrics.irr,
        isBase: Math.abs(rent - baseRent) < 1,
      };
    });
  }, [rentalInputs, computeCocAndIrr]);

  // Vacancy Sensitivity
  const vacancySensitivity = useMemo(() => {
    const baseVacancy = rentalInputs.vacancyRatePct;
    const vacancies = [0, 2.5, 5.0, 7.5, 10.0];
    return vacancies.map(v => {
      const metrics = computeCocAndIrr(rentalInputs.monthlyRent, v, rentalInputs.interestRate);
      const effectiveRent = rentalInputs.monthlyRent * (1 - v / 100);
      const mgmtFee = effectiveRent * (rentalInputs.propertyMgmtPct / 100);
      const monthlyOpEx = rentalInputs.monthlyTaxes + rentalInputs.monthlyInsurance + rentalInputs.monthlyMaintenance + mgmtFee;
      
      const p = rentalInputs.loanAmount;
      const r = rentalInputs.interestRate / 100 / 12;
      const n = rentalInputs.loanTermYears * 12;
      const monthlyDebtSvc = r > 0 && n > 0
        ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        : p / (n || 1);

      const firstYearCF = (effectiveRent - monthlyOpEx - monthlyDebtSvc) * 12;
      return {
        label: `${v.toFixed(1)}%`,
        vacancy: v,
        firstYearCF,
        coc: metrics.coc,
        irr: metrics.irr,
        isBase: Math.abs(v - baseVacancy) < 0.01,
      };
    });
  }, [rentalInputs, computeCocAndIrr]);

  return (
    <div className="min-h-full py-8 w-full text-[#dae4ec]">
      
      {/* ─── Top Header & Tabs ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 lg:px-8 border-b border-white/10 pb-6 mb-8 bg-[#091015]/20">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[11px] font-bold uppercase tracking-widest text-[#859490]">
            <span>Intelligence Hub</span>
            <span>›</span>
            <span className="text-[#57f1db]">Deal Analyzer</span>
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight leading-none">Deal Analyzer</h1>
          <p className="text-xs text-[#859490] mt-2">
            {activeTab === 'inputs' 
              ? 'Formulate and adjust acquisition assumptions.' 
              : 'Evaluate long-term 5-year yields & returns.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Selector */}
          <div className="flex rounded-xl p-1 bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab('inputs')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'inputs' ? 'bg-[#57f1db] text-[#003731] shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Underwriting Inputs
            </button>
            <button
              onClick={() => setActiveTab('proforma')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'proforma' ? 'bg-[#57f1db] text-[#003731] shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              5-Year Pro-Forma
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8">
        
        {/* ─── VIEW 1: UNDERWRITING INPUT TERMINAL ─── */}
        {activeTab === 'inputs' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Left Inputs Column */}
            <div className="xl:col-span-8 space-y-6">
              
              {/* Strategy Toggle */}
              <div className="glass-card p-1.5 rounded-xl flex inline-flex w-fit bg-slate-900/35 border border-white/10">
                <button
                  onClick={() => setStrategy('rental')}
                  className={`px-6 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all ${
                    strategy === 'rental' 
                      ? 'bg-surface-variant text-white border border-white/10 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rental Strategy
                </button>
                <button
                  onClick={() => setStrategy('flip')}
                  className={`px-6 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all ${
                    strategy === 'flip' 
                      ? 'bg-surface-variant text-white border border-white/10 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Flip Strategy
                </button>
              </div>

              {strategy === 'rental' ? (
                <>
                  {/* Rental: Purchase Details */}
                  <section className="space-y-3">
                    <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                      <Home className="w-4 h-4 text-[#57f1db]" />
                      Purchase Details
                    </h3>
                    <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Purchase Price</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <span className="text-[#859490] mr-2 font-mono">$</span>
                          <input
                            type="number"
                            value={rentalInputs.purchasePrice}
                            onChange={(e) => handleInputChange('purchasePrice', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">After Repair Value (ARV)</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <span className="text-[#859490] mr-2 font-mono">$</span>
                          <input
                            type="number"
                            value={rentalInputs.arv}
                            onChange={(e) => handleInputChange('arv', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Repair Budget</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <span className="text-[#859490] mr-2 font-mono">$</span>
                          <input
                            type="number"
                            value={rentalInputs.rehabCost}
                            onChange={(e) => handleInputChange('rehabCost', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Estimated Closing Costs</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg justify-between">
                          <input
                            type="number"
                            value={rentalInputs.closingCostsPct}
                            onChange={(e) => handleInputChange('closingCostsPct', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-1/3 outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">%</span>
                            <span className="text-xs text-slate-500 font-mono">(= {fmt(rentalCalc.closingCostsAmt)})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Rental: Financing */}
                  <section className="space-y-3">
                    <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-[#57f1db]" />
                      Debt &amp; Financing
                    </h3>
                    <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-2 md:col-span-3">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Down Payment</label>
                        <div className="flex gap-4 items-center">
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg w-1/3 justify-between">
                            <input
                              type="number"
                              value={rentalInputs.downPaymentPct}
                              onChange={(e) => handleInputChange('downPaymentPct', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-1/2 outline-none text-right pr-2"
                            />
                            <span className="text-[#859490] font-mono">%</span>
                          </div>
                          <span className="text-[#859490] font-mono text-sm">
                            = {fmt(rentalInputs.purchasePrice * (rentalInputs.downPaymentPct / 100))} down
                          </span>
                          <span className="text-slate-500 font-mono text-sm">
                            ({fmt(rentalInputs.loanAmount)} loan)
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Interest Rate</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <input
                            type="number"
                            step="0.01"
                            value={rentalInputs.interestRate}
                            onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                          <span className="text-[#859490] ml-2 font-mono">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Amortization</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <input
                            type="number"
                            value={rentalInputs.loanTermYears}
                            onChange={(e) => handleInputChange('loanTermYears', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                          <span className="text-[#859490] ml-2 text-xs uppercase">Years</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Rental: Income & Expenses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Income */}
                    <section className="space-y-3">
                      <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#57f1db]" />
                        Income
                      </h3>
                      <div className="glass-card rounded-2xl p-6 space-y-4">
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Gross Rent (Monthly)</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <span className="text-[#859490] mr-2 font-mono">$</span>
                            <input
                              type="number"
                              value={rentalInputs.monthlyRent}
                              onChange={(e) => handleInputChange('monthlyRent', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Vacancy Allowance</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <input
                              type="number"
                              value={rentalInputs.vacancyRatePct}
                              onChange={(e) => handleInputChange('vacancyRatePct', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                            <span className="text-[#859490] ml-2 font-mono">%</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Operating Expenses */}
                    <section className="space-y-3">
                      <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#57f1db]" />
                        Operating Expenses
                      </h3>
                      <div className="glass-card rounded-2xl p-6 space-y-4">
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Property Taxes (Annual)</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg justify-between">
                            <div className="flex items-center">
                              <span className="text-[#859490] mr-2 font-mono">$</span>
                              <input
                                type="number"
                                value={rentalInputs.monthlyTaxes * 12}
                                onChange={(e) => handleInputChange('monthlyTaxes', Number(e.target.value) / 12)}
                                className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">(= {fmt(rentalInputs.monthlyTaxes)}/mo)</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Insurance (Annual)</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg justify-between">
                            <div className="flex items-center">
                              <span className="text-[#859490] mr-2 font-mono">$</span>
                              <input
                                type="number"
                                value={rentalInputs.monthlyInsurance * 12}
                                onChange={(e) => handleInputChange('monthlyInsurance', Number(e.target.value) / 12)}
                                className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">(= {fmt(rentalInputs.monthlyInsurance)}/mo)</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Maintenance / CapEx (Monthly)</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <span className="text-[#859490] mr-2 font-mono">$</span>
                            <input
                              type="number"
                              value={rentalInputs.monthlyMaintenance}
                              onChange={(e) => handleInputChange('monthlyMaintenance', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Property Mgmt Fee</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <input
                              type="number"
                              value={rentalInputs.propertyMgmtPct}
                              onChange={(e) => handleInputChange('propertyMgmtPct', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                            <span className="text-[#859490] ml-2 font-mono">%</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <>
                  {/* Flip: Purchase Details */}
                  <section className="space-y-3">
                    <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                      <Home className="w-4 h-4 text-[#57f1db]" />
                      Purchase Details
                    </h3>
                    <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Purchase Price</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <span className="text-[#859490] mr-2 font-mono">$</span>
                          <input
                            type="number"
                            value={flipInputs.purchasePrice}
                            onChange={(e) => handleInputChange('purchasePrice', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">After Repair Value (ARV)</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <span className="text-[#859490] mr-2 font-mono">$</span>
                          <input
                            type="number"
                            value={flipInputs.arv}
                            onChange={(e) => handleInputChange('arv', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Rehab Budget</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <span className="text-[#859490] mr-2 font-mono">$</span>
                          <input
                            type="number"
                            value={flipInputs.rehabCost}
                            onChange={(e) => handleInputChange('rehabCost', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Purchase Closing Costs</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg justify-between">
                          <input
                            type="number"
                            value={flipInputs.closingCostsPct}
                            onChange={(e) => handleInputChange('closingCostsPct', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-1/3 outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">%</span>
                            <span className="text-xs text-slate-500 font-mono">(= {fmt(flipCalc.closingCostsAmt)})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Flip: Financing */}
                  <section className="space-y-3">
                    <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-[#57f1db]" />
                      Debt &amp; Financing
                    </h3>
                    <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-2 md:col-span-3">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Down Payment</label>
                        <div className="flex gap-4 items-center">
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg w-1/3 justify-between">
                            <input
                              type="number"
                              value={flipInputs.downPaymentPct}
                              onChange={(e) => handleInputChange('downPaymentPct', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-1/2 outline-none text-right pr-2"
                            />
                            <span className="text-[#859490] font-mono">%</span>
                          </div>
                          <span className="text-[#859490] font-mono text-sm">
                            = {fmt(flipInputs.purchasePrice * (flipInputs.downPaymentPct / 100))} down
                          </span>
                          <span className="text-slate-500 font-mono text-sm">
                            ({fmt(flipInputs.loanAmount)} loan)
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Interest Rate</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <input
                            type="number"
                            step="0.01"
                            value={flipInputs.interestRate}
                            onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                          <span className="text-[#859490] ml-2 font-mono">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Holding Period (Months)</label>
                        <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                          <input
                            type="number"
                            value={flipInputs.loanLengthMonths}
                            onChange={(e) => handleInputChange('loanLengthMonths', Number(e.target.value))}
                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                          />
                          <span className="text-[#859490] ml-2 text-xs uppercase">Mos</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Flip: Holding & Disposition Costs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Holding Costs */}
                    <section className="space-y-3">
                      <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#57f1db]" />
                        Monthly Holding Costs
                      </h3>
                      <div className="glass-card rounded-2xl p-6 space-y-4">
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Monthly Taxes</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <span className="text-[#859490] mr-2 font-mono">$</span>
                            <input
                              type="number"
                              value={flipInputs.monthlyTaxes}
                              onChange={(e) => handleInputChange('monthlyTaxes', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Monthly Insurance</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <span className="text-[#859490] mr-2 font-mono">$</span>
                            <input
                              type="number"
                              value={flipInputs.monthlyInsurance}
                              onChange={(e) => handleInputChange('monthlyInsurance', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Monthly Utilities</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <span className="text-[#859490] mr-2 font-mono">$</span>
                            <input
                              type="number"
                              value={flipInputs.monthlyUtilities}
                              onChange={(e) => handleInputChange('monthlyUtilities', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Monthly Other</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg">
                            <span className="text-[#859490] mr-2 font-mono">$</span>
                            <input
                              type="number"
                              value={flipInputs.monthlyOther}
                              onChange={(e) => handleInputChange('monthlyOther', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-full outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Exit Costs */}
                    <section className="space-y-3">
                      <h3 className="font-label-md text-label-md text-white flex items-center gap-2">
                        <Percent className="w-4 h-4 text-[#57f1db]" />
                        Disposition Costs
                      </h3>
                      <div className="glass-card rounded-2xl p-6 space-y-4">
                        <div className="flex flex-col gap-2">
                          <label className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wider">Cost of Sale (Commissions &amp; Exit fees)</label>
                          <div className="glass-input flex items-center px-4 py-3 rounded-lg justify-between">
                            <input
                              type="number"
                              value={flipInputs.costOfSalePct}
                              onChange={(e) => handleInputChange('costOfSalePct', Number(e.target.value))}
                              className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono text-[16px] w-1/3 outline-none"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-[#859490] font-mono">%</span>
                              <span className="text-xs text-slate-500 font-mono">(= {fmt(flipCalc.costOfSaleAmt)})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </div>

            {/* Right Underwriting Sidebar */}
            <div className="xl:col-span-4 sticky top-24 space-y-6">
              <h3 className="font-headline-sm text-[18px] font-semibold text-white tracking-tight">Live Deal Metrics</h3>

              {strategy === 'rental' ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Monthly Cash Flow */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group col-span-2">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${rentalCalc.monthlyCF >= 0 ? 'bg-[#57f1db]' : 'bg-red-400'}`} />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">Monthly Cash Flow</span>
                    <div className="flex items-end gap-1">
                      <span className={`font-headline-lg text-headline-lg font-bold font-mono-num ${rentalCalc.monthlyCF >= 0 ? 'text-[#57f1db] metric-glow-teal' : 'text-red-400'}`}>
                        {fmt(rentalCalc.monthlyCF)}
                      </span>
                      <span className="text-slate-500 text-[12px] mb-2 font-mono">/mo</span>
                    </div>
                  </div>

                  {/* Cap Rate */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#57f1db]" />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">Cap Rate</span>
                    <div className="flex items-end gap-1">
                      <span className="font-headline-lg text-headline-lg text-white font-mono-num font-bold">
                        {rentalCalc.capRate.toFixed(2)}
                      </span>
                      <span className="text-slate-500 text-[12px] mb-2 font-mono">%</span>
                    </div>
                  </div>

                  {/* Cash on Cash */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${rentalCalc.coc >= 6.0 ? 'bg-[#57f1db]' : 'bg-amber-400'}`} />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">Cash-on-Cash</span>
                    <div className="flex items-end gap-1">
                      <span className={`font-headline-lg text-headline-lg font-mono-num font-bold ${rentalCalc.coc >= 6.0 ? 'text-[#57f1db]' : 'text-amber-400'}`}>
                        {rentalCalc.coc.toFixed(2)}
                      </span>
                      <span className="text-slate-500 text-[12px] mb-2 font-mono">%</span>
                    </div>
                  </div>

                  {/* DSCR */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${rentalCalc.dscr >= 1.25 ? 'bg-[#57f1db]' : 'bg-amber-400'}`} />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">DSCR</span>
                    <div className="flex items-end gap-1">
                      <span className={`font-headline-lg text-headline-lg font-mono-num font-bold ${rentalCalc.dscr >= 1.25 ? 'text-[#57f1db]' : 'text-amber-400'}`}>
                        {rentalCalc.dscr.toFixed(2)}
                      </span>
                      <span className="text-slate-500 text-[12px] mb-2 font-mono">x</span>
                    </div>
                  </div>

                  {/* Down Payment Total */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10" />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">Equity Deployed</span>
                    <div className="flex items-end gap-1">
                      <span className="font-headline-lg text-headline-lg text-white font-mono font-bold">
                        {fmt(rentalInputs.purchasePrice * (rentalInputs.downPaymentPct / 100))}
                      </span>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="glass-panel rounded-xl p-5 col-span-2 flex justify-between items-center bg-slate-900/40 border border-white/5">
                    <span className="text-sm font-medium text-slate-400">Total Cash Needed</span>
                    <span className="font-headline-md text-headline-md text-white font-mono font-bold">
                      {fmt(rentalCalc.totalInvested)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Gross Profit */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group col-span-2">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${flipCalc.grossProfit >= 0 ? 'bg-[#57f1db]' : 'bg-red-400'}`} />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">Estimated Profit</span>
                    <div className="flex items-end gap-1">
                      <span className={`font-headline-lg text-headline-lg font-bold font-mono-num ${flipCalc.grossProfit >= 0 ? 'text-[#57f1db] metric-glow-teal' : 'text-red-400'}`}>
                        {fmt(flipCalc.grossProfit)}
                      </span>
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${flipCalc.roi >= 15.0 ? 'bg-[#57f1db]' : 'bg-amber-400'}`} />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">Projected ROI</span>
                    <div className="flex items-end gap-1">
                      <span className={`font-headline-lg text-headline-lg font-mono-num font-bold ${flipCalc.roi >= 15.0 ? 'text-[#57f1db]' : 'text-amber-400'}`}>
                        {flipCalc.roi.toFixed(1)}
                      </span>
                      <span className="text-slate-500 text-[12px] mb-2 font-mono">%</span>
                    </div>
                  </div>

                  {/* Financing Cost */}
                  <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10" />
                    <span className="font-label-sm text-label-sm text-[#859490] uppercase tracking-wide">Cost of Debt</span>
                    <div className="flex items-end gap-1">
                      <span className="font-headline-lg text-headline-lg text-white font-mono font-bold">
                        {fmt(flipCalc.financingCost)}
                      </span>
                    </div>
                  </div>

                  {/* Total Costs */}
                  <div className="glass-panel rounded-xl p-5 col-span-2 flex justify-between items-center bg-slate-900/40 border border-white/5">
                    <span className="text-sm font-medium text-slate-400">Total Project Costs</span>
                    <span className="font-headline-md text-headline-md text-white font-mono font-bold">
                      {fmt(flipCalc.totalCosts)}
                    </span>
                  </div>

                  {/* Total Cash Needed */}
                  <div className="glass-panel rounded-xl p-5 col-span-2 flex justify-between items-center bg-slate-900/40 border border-white/5">
                    <span className="text-sm font-medium text-slate-400">Total Cash Needed</span>
                    <span className="font-headline-md text-headline-md text-white font-mono font-bold">
                      {fmt(flipCalc.totalCashNeeded)}
                    </span>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSave}
                  className="luminous-button bg-[#57f1db] hover:bg-[#3cddc7] text-[#003731] w-full py-4 rounded-xl font-label-md text-label-md uppercase tracking-widest flex justify-center items-center gap-2 group cursor-pointer transition-all duration-300"
                >
                  <Save className="w-4 h-4 transition-transform group-hover:scale-110" />
                  {storeProject ? 'Update Deal Model' : 'Save As Project'}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                
                {showSavedFeedback && (
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-lg justify-center transition-all animate-pulse">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Deal assumptions synced successfully</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ─── VIEW 2: 5-YEAR PRO-FORMA PROJECTIONS ─── */}
        {activeTab === 'proforma' && (
          <div className="space-y-6">
            
            {/* Massive KPI Cards Row */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* CoC Return */}
              <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label-md text-label-md text-[#859490]">Cash-on-Cash Return</span>
                  <span className="material-symbols-outlined text-[#57f1db] text-xl">trending_up</span>
                </div>
                <div>
                  <div className="font-headline-xl text-headline-xl text-white flex items-baseline">
                    <span>{rentalCalc.coc.toFixed(1)}</span>
                    <span className="text-[#57f1db] text-2xl ml-1 font-semibold">%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm">
                    <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      rentalCalc.coc > 0 ? 'bg-[#57f1db]/10 text-[#57f1db]' : 'bg-red-500/10 text-red-400'
                    }`}>
                      <span className="material-symbols-outlined text-xs">
                        {rentalCalc.coc > 0 ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      <span>{Math.abs(rentalCalc.coc).toFixed(1)}%</span>
                    </span>
                    <span className="text-[#859490]">
                      {rentalCalc.coc > 0 ? "Positive Cash Flow" : "Negative Cash Flow"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cap Rate */}
              <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-transparent opacity-50"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label-md text-label-md text-[#859490]">Cap Rate</span>
                  <span className="material-symbols-outlined text-secondary text-xl">percent</span>
                </div>
                <div>
                  <div className="font-headline-xl text-headline-xl text-white flex items-baseline">
                    <span>{rentalCalc.capRate.toFixed(2)}</span>
                    <span className="text-[#adc6ff] text-2xl ml-1 font-semibold">%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm">
                    <span className="bg-[#2d363d] text-[#bacac5] px-2 py-0.5 rounded-full">
                      Unleveraged
                    </span>
                    <span className="text-[#859490]">Market Avg: ~5.8%</span>
                  </div>
                </div>
              </div>

              {/* Annual NOI */}
              <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tertiary-container to-transparent opacity-50"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label-md text-label-md text-[#859490]">Annual NOI</span>
                  <span className="material-symbols-outlined text-tertiary-container text-xl font-light">payments</span>
                </div>
                <div>
                  <div className="font-headline-xl text-headline-xl text-white flex items-baseline">
                    <span className="text-[#ffd1aa] text-2xl mr-1 font-semibold">$</span>
                    <span>{rentalCalc.annualNOI.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm">
                    <span className="bg-[#ffdcc0]/10 text-[#ffdcc0] px-2 py-0.5 rounded-full">
                      Net Operating
                    </span>
                    <span className="text-[#859490]">Gross Rent - OpEx</span>
                  </div>
                </div>
              </div>

              {/* IRR */}
              <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label-md text-label-md text-[#859490]">5-Yr IRR</span>
                  <span className="material-symbols-outlined text-primary text-xl">analytics</span>
                </div>
                <div>
                  <div className="font-headline-xl text-headline-xl text-white flex items-baseline">
                    <span>{(irr * 100).toFixed(1)}</span>
                    <span className="text-[#57f1db] text-2xl ml-1 font-semibold">%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-label-sm text-label-sm">
                    <span className="bg-[#57f1db]/10 text-[#57f1db] px-2 py-0.5 rounded-full">
                      Internal Rate
                    </span>
                    <span className="text-[#859490]">Annual Compounded</span>
                  </div>
                </div>
              </div>

            </section>

            {/* Middle Row Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cash Flow Timeline */}
              <div className="lg:col-span-2 glass-card rounded-xl p-6">
                <h3 className="font-label-md text-label-md text-[#859490] mb-6 font-sans">Cash Flow Timeline (5 Yr)</h3>
                <CashFlowChart data={cashFlowData} isLoading={isLoading || !projections || projections.length === 0} />
              </div>

              {/* Equity & Amortization */}
              <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
                <h3 className="font-label-md text-label-md text-[#859490] mb-6 font-sans">Equity &amp; Amortization</h3>
                <div className="flex-1 w-full flex items-center justify-center">
                  <EquityBuildupChart data={equityData} isLoading={isLoading || !projections || projections.length === 0} />
                </div>
                <div className="mt-8 flex justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-label-sm text-label-sm text-[#859490] uppercase font-sans">Loan Balance (Y5)</p>
                    <p className="font-headline-sm text-headline-sm font-mono mt-1 text-white">
                      {projections.length >= 5 ? fmt(projections[4].loanBalance) : '$0'}
                    </p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-label-sm text-label-sm text-[#859490] uppercase font-sans">Built Equity (Y5)</p>
                    <p className="font-headline-sm text-headline-sm font-mono mt-1 text-[#57f1db]">
                      {projections.length >= 5 ? fmt(projections[4].equity) : '$0'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Detailed Tabs */}
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="pw-tabs bg-slate-900/40 px-6 border-b border-white/5">
                {(['pnl', 'assumptions', 'sensitivity'] as SubTabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab)}
                    className={`pw-tab ${activeSubTab === tab ? 'pw-tab--active' : ''} capitalize`}
                  >
                    {tab === 'pnl' ? 'Detailed P&L' : tab === 'sensitivity' ? 'Sensitivity Analysis' : 'Assumptions'}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeSubTab === 'pnl' && (
                  <div className="overflow-x-auto -mx-6 -my-6">
                    <table className="w-full text-left border-collapse font-mono text-sm">
                      <thead className="bg-slate-800/30 font-label-sm text-label-sm text-[#859490] font-sans">
                        <tr>
                          <th className="px-6 py-4">Line Item</th>
                          {projections.map(p => <th key={p.year} className="px-6 py-4 text-right">Year {p.year}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-body-sm text-body-sm">
                        <tr className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-white font-sans group-hover:text-[#57f1db]">Gross Potential Rent</td>
                          {projections.map(p => <td key={p.year} className="px-6 py-4 text-right">{fmt(p.grossPotentialRent)}</td>)}
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-red-400 font-sans group-hover:text-red-300">Vacancy Loss</td>
                          {projections.map(p => <td key={p.year} className="px-6 py-4 text-right text-red-400">-{fmt(p.vacancyLoss)}</td>)}
                        </tr>
                        <tr className="bg-slate-900/50 text-[#57f1db]">
                          <td className="px-6 py-4 font-sans font-bold">Effective Gross Income</td>
                          {projections.map(p => <td key={p.year} className="px-6 py-4 text-right font-bold">{fmt(p.effectiveGrossIncome)}</td>)}
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-red-400 font-sans group-hover:text-red-300">Operating Expenses</td>
                          {projections.map(p => <td key={p.year} className="px-6 py-4 text-right text-red-400">-{fmt(p.operatingExpenses)}</td>)}
                        </tr>
                        <tr className="bg-slate-800/50 text-white">
                          <td className="px-6 py-4 font-sans font-bold uppercase">Net Operating Income (NOI)</td>
                          {projections.map(p => <td key={p.year} className="px-6 py-4 text-right font-bold">{fmt(p.noi)}</td>)}
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-[#859490] font-sans group-hover:text-white">Debt Service (P&amp;I)</td>
                          {projections.map(p => <td key={p.year} className="px-6 py-4 text-right text-[#859490]">-{fmt(p.debtService)}</td>)}
                        </tr>
                        <tr className="bg-[#57f1db]/10 text-[#57f1db]">
                          <td className="px-6 py-4 font-sans font-bold uppercase">Pre-Tax Cash Flow</td>
                          {projections.map(p => <td key={p.year} className="px-6 py-4 text-right font-bold">{fmt(p.preTaxCashFlow)}</td>)}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {activeSubTab === 'assumptions' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Acquisition */}
                    <div className="glass-card p-5 rounded-xl">
                      <h4 className="font-label-md text-label-md text-white mb-4 border-b border-white/5 pb-2 font-sans">Acquisition &amp; Valuation</h4>
                      <div className="space-y-3 font-body-sm text-body-sm font-sans">
                        <div className="flex justify-between">
                          <span className="text-[#859490]">Purchase Price</span>
                          <span className="font-mono text-white">{fmt(rentalInputs.purchasePrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#859490]">Rehab Budget</span>
                          <span className="font-mono text-white">{fmt(rentalInputs.rehabCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#859490]">After Repair Value (ARV)</span>
                          <span className="font-mono text-white">{fmt(rentalInputs.arv)}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2 font-semibold text-sm">
                          <span className="text-[#57f1db]">Total Deployed Capital</span>
                          <span className="font-mono text-[#57f1db]">{fmt(rentalCalc.totalInvested)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Debt & Financing */}
                    <div className="glass-card p-5 rounded-xl">
                      <h4 className="font-label-md text-label-md text-white mb-4 border-b border-white/5 pb-2 font-sans">Debt &amp; Financing</h4>
                      <div className="space-y-3 font-body-sm text-body-sm font-sans">
                        <div className="flex justify-between">
                          <span className="text-[#859490]">Loan Amount</span>
                          <span className="font-mono text-white">{fmt(rentalInputs.loanAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#859490]">LTV Ratio</span>
                          <span className="font-mono text-white">{((rentalInputs.loanAmount / rentalInputs.purchasePrice) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#859490]">Interest Rate</span>
                          <span className="font-mono text-white">{rentalInputs.interestRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2 font-semibold text-sm">
                          <span className="text-[#57f1db]">Monthly Debt Service</span>
                          <span className="font-mono text-[#57f1db]">{fmt(rentalCalc.monthlyDebtSvc)}/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Operations */}
                    <div className="glass-card p-5 rounded-xl">
                      <h4 className="font-label-md text-label-md text-white mb-4 border-b border-white/5 pb-2 font-sans">Operations &amp; Growth</h4>
                      <div className="space-y-3 font-body-sm text-body-sm font-sans">
                        <div className="flex justify-between">
                          <span className="text-[#859490]">Gross Monthly Rent</span>
                          <span className="font-mono text-white">{fmt(rentalInputs.monthlyRent)}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#859490]">Vacancy Rate</span>
                          <span className="font-mono text-white">{rentalInputs.vacancyRatePct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#859490]">Appreciation Rate</span>
                          <span className="text-white font-mono">3.0% / year</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2 font-semibold text-sm">
                          <span className="text-[#57f1db]">Monthly Expenses</span>
                          <span className="font-mono text-[#57f1db]">{fmt(rentalCalc.monthlyOpEx)}/mo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'sensitivity' && (
                  <div className="space-y-6">
                    <p className="text-sm text-slate-400 font-sans">
                      Evaluate return variance relative to shifting macro conditions. Base cases are highlighted.
                    </p>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Interest Rate */}
                      <div className="glass-card p-5 rounded-xl">
                        <h4 className="font-label-md text-label-md text-white mb-4 border-b border-white/5 pb-2 font-sans">Interest Rate Sensitivity</h4>
                        <table className="w-full text-left font-body-sm text-body-sm border-collapse">
                          <thead className="text-[#859490] border-b border-white/5 font-sans">
                            <tr>
                              <th className="py-2">Rate</th>
                              <th className="py-2 text-right">CF (Yr 1)</th>
                              <th className="py-2 text-right">CoC</th>
                              <th className="py-2 text-right">5-Yr IRR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono text-white">
                            {interestRateSensitivity.map(item => (
                              <tr
                                key={item.label}
                                className={`hover:bg-white/5 ${item.isBase ? 'bg-[#57f1db]/15 text-[#57f1db] font-semibold' : 'text-slate-300'}`}
                              >
                                <td className="py-2">{item.label}</td>
                                <td className="py-2 text-right">{fmt(item.firstYearCF)}</td>
                                <td className="py-2 text-right">{item.coc.toFixed(1)}%</td>
                                <td className="py-2 text-right">{item.irr.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Monthly Rent */}
                      <div className="glass-card p-5 rounded-xl">
                        <h4 className="font-label-md text-label-md text-white mb-4 border-b border-white/5 pb-2 font-sans">Monthly Rent Sensitivity</h4>
                        <table className="w-full text-left font-body-sm text-body-sm border-collapse">
                          <thead className="text-[#859490] border-b border-white/5 font-sans">
                            <tr>
                              <th className="py-2">Monthly Rent</th>
                              <th className="py-2 text-right">CF (Yr 1)</th>
                              <th className="py-2 text-right">CoC</th>
                              <th className="py-2 text-right">5-Yr IRR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono text-white">
                            {rentSensitivity.map(item => (
                              <tr
                                key={item.label}
                                className={`hover:bg-white/5 ${item.isBase ? 'bg-[#57f1db]/15 text-[#57f1db] font-semibold' : 'text-slate-300'}`}
                              >
                                <td className="py-2">{item.label}</td>
                                <td className="py-2 text-right">{fmt(item.firstYearCF)}</td>
                                <td className="py-2 text-right">{item.coc.toFixed(1)}%</td>
                                <td className="py-2 text-right">{item.irr.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Vacancy Rate */}
                      <div className="glass-card p-5 rounded-xl">
                        <h4 className="font-label-md text-label-md text-white mb-4 border-b border-white/5 pb-2 font-sans">Vacancy Rate Sensitivity</h4>
                        <table className="w-full text-left font-body-sm text-body-sm border-collapse">
                          <thead className="text-[#859490] border-b border-white/5 font-sans">
                            <tr>
                              <th className="py-2">Vacancy Rate</th>
                              <th className="py-2 text-right">CF (Yr 1)</th>
                              <th className="py-2 text-right">CoC</th>
                              <th className="py-2 text-right">5-Yr IRR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono text-white">
                            {vacancySensitivity.map(item => (
                              <tr
                                key={item.label}
                                className={`hover:bg-white/5 ${item.isBase ? 'bg-[#57f1db]/15 text-[#57f1db] font-semibold' : 'text-slate-300'}`}
                              >
                                <td className="py-2">{item.label}</td>
                                <td className="py-2 text-right">{fmt(item.firstYearCF)}</td>
                                <td className="py-2 text-right">{item.coc.toFixed(1)}%</td>
                                <td className="py-2 text-right">{item.irr.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

      </div>

    </div>
  );
}
