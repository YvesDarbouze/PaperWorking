"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/store/projectStore";
import {
  computeNOIComponents,
  computeCapRate,
  computeCoCReturn,
  computeDSCR,
  computeOER,
  computeGRM,
  computeAnnualDebtService,
  deriveAllProjectMetrics,
  computeDOM,
} from "@/lib/metrics/reiMetrics";
import type { Project } from "@/types/schema";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface StressParameters {
  vacancyRate: number; // e.g. 5 for 5% (slider 0-25)
  interestRateSpike: number; // e.g. 1 for +1% (slider 0-3)
  opexOverrun: number; // e.g. 20 for +20% (slider 0-50)
  taxReassessment: number; // e.g. 30 for +30% (slider 0-40)
  rentGrowthOverride?: number; // annual rent growth override (percentage e.g. 3)
  expenseGrowthOverride?: number; // annual expense growth override (percentage e.g. 2.5)
}

export interface AmortizationMonth {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  remainingBalance: number;
}

export interface ProFormaYear {
  year: number;
  propertyValue: number;
  grossRentalIncome: number;
  otherIncome: number;
  vacancyLoss: number;
  egi: number;
  opex: number;
  noi: number;
  debtService: number;
  preTaxCashFlow: number;
  cumulativeCashFlow: number;
  appreciation: number;
  principalPaydown: number;
  netProfit: number;
  coc: number;
  roi: number;
  capRate: number;
  dscr: number;
  oer: number;
  grm: number;
  priceToRent: number;
}

export interface ProjectInsights {
  id: string;
  propertyName: string;
  dispositionType?: string;
  subStrategy?: string;
  currentPhase?: number;
  purchasePrice: number;
  propertyValue: number;
  noi: number;
  egi: number;
  opex: number;
  capRate: number;
  annualPreTaxCashFlow: number;
  totalCashInvested: number;
  coc: number;
  roi: number;
  netProfit: number;
  totalInvestment: number;
  dscr: number;
  oer: number;
  grm: number;
  priceToRent: number;
  dom: number | null;
  isWorkingCapital: boolean;
  proForma: ProFormaYear[];
}

export interface PortfolioRollup {
  totalNOI: number;
  averageCapRate: number;
  averageCoC: number;
  averageROI: number;
  averageDSCR: number;
  averageOER: number;
  averageGRM: number;
  priceToRentRatio: number;
  averageDOM: number;
}

// ─── Helpers & Utilities ─────────────────────────────────────────────────────

/**
 * Standard median helper
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[half];
  }
  return (sorted[half - 1] + sorted[half]) / 2;
}

/**
 * Standard average helper
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Monthly Amortization Schedule Solver
 * Incorporates Month 360 (or final month) Amortization Drift Reconciliation Guard.
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  annualInterestRatePercent: number,
  loanTermMonths: number
): AmortizationMonth[] {
  if (loanAmount <= 0 || loanTermMonths <= 0) return [];

  const r = annualInterestRatePercent / 100 / 12;
  const n = loanTermMonths;
  let monthlyPayment = 0;

  if (annualInterestRatePercent > 0) {
    const pow = Math.pow(1 + r, n);
    monthlyPayment = (loanAmount * r * pow) / (pow - 1);
  } else {
    monthlyPayment = loanAmount / n;
  }

  // Round monthly payment to cents
  monthlyPayment = Math.round(monthlyPayment * 100) / 100;

  const schedule: AmortizationMonth[] = [];
  let balance = loanAmount;

  for (let m = 1; m <= n; m++) {
    if (balance <= 0) {
      schedule.push({
        month: m,
        payment: 0,
        interest: 0,
        principal: 0,
        remainingBalance: 0,
      });
      continue;
    }

    let interest = 0;
    if (annualInterestRatePercent > 0) {
      interest = Math.round(balance * r * 100) / 100;
    }

    let principal = Math.round((monthlyPayment - interest) * 100) / 100;

    // Check if it's the final month of the loan
    const isFinalMonth = m === n;
    if (isFinalMonth || principal >= balance) {
      // Amortization Drift Reconciliation Guard:
      // Force the final principal portion to equal exactly the remaining balance
      principal = balance;
      const finalPayment = Math.round((principal + interest) * 100) / 100;
      balance = 0;
      schedule.push({
        month: m,
        payment: finalPayment,
        interest,
        principal,
        remainingBalance: 0,
      });
    } else {
      balance = Math.round((balance - principal) * 100) / 100;
      schedule.push({
        month: m,
        payment: monthlyPayment,
        interest,
        principal,
        remainingBalance: balance,
      });
    }
  }

  return schedule;
}

/**
 * Calculates a 10-year pro forma projection for a single project.
 */
export function calculate10YearProForma(
  project: Project,
  stressParams?: StressParameters
): ProFormaYear[] {
  const financials = project.financials || {};
  const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
  const initialPropertyValue = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;

  // 1. Core initial values from reiMetrics components
  const baseComponents = computeNOIComponents(financials, project.dispositionType, project.currentPhase ?? 1);
  const baseRentalIncome = baseComponents.grossRentalIncome;
  const baseOtherIncome = baseComponents.otherIncome;
  const baseTaxes = baseComponents.propertyTaxes;

  // 2. Extract growth/appreciation assumptions
  let rentGrowthRate = 3; // default 3% rent growth
  if (stressParams?.rentGrowthOverride !== undefined) {
    rentGrowthRate = stressParams.rentGrowthOverride;
  } else if (financials.annualRentGrowthPercent !== undefined) {
    rentGrowthRate = financials.annualRentGrowthPercent;
  }

  const rentGrowth = rentGrowthRate / 100;
  const expGrowth = (stressParams?.expenseGrowthOverride !== undefined ? stressParams.expenseGrowthOverride : 2.5) / 100; // default 2.5% inflation
  const appreciation = (financials.annualAppreciationPercent ?? 4) / 100; // default 4% appreciation

  // 3. Setup Debt and Amortization details
  const loanAmount = financials.loanAmount ?? 0;
  let loanRate = financials.loanInterestRate ?? 0;
  if (stressParams?.interestRateSpike) {
    loanRate += stressParams.interestRateSpike;
  }
  const loanTermYears = financials.loanTermYears ?? 30;
  const loanTermMonths = loanTermYears * 12;

  const amortization = generateAmortizationSchedule(loanAmount, loanRate, loanTermMonths);

  // 4. Denominators for yields
  const derived = deriveAllProjectMetrics(project);
  const totalInvestment = derived.totalInvestment > 0 ? derived.totalInvestment : purchasePrice;
  const totalCashInvested = financials.financingCashInvested ?? computeTotalCashInvestedFallback(project);

  const proForma: ProFormaYear[] = [];
  let cumulativeCashFlow = 0;

  for (let year = 1; year <= 10; year++) {
    // Escalate rental income and other income (YoY growth starts in Year 2)
    const rentEscalationFactor = Math.pow(1 + rentGrowth, year - 1);
    const grossRentalIncome = baseRentalIncome * rentEscalationFactor;
    const otherIncome = baseOtherIncome * rentEscalationFactor;

    // Apply vacancy rate (absolute rate override or project value)
    const vacancyRatePct = stressParams?.vacancyRate !== undefined
      ? stressParams.vacancyRate
      : (financials.vacancyRatePercent ?? financials.vacancyRate ?? 7);
    const vacancyLoss = grossRentalIncome * (vacancyRatePct / 100);
    const egi = grossRentalIncome + otherIncome - vacancyLoss;

    // Escalate operating expenses (taxes, insurance, utilities, maintenance, pm, hoa)
    const expEscalationFactor = Math.pow(1 + expGrowth, year - 1);
    
    // Tax reassessment adjusts Year 1 taxes immediately
    const taxFactor = 1 + (stressParams?.taxReassessment ?? 0) / 100;
    const adjustedBaseTaxes = baseTaxes * taxFactor;

    // Build rest of operating expenses
    const opexOtherThanTaxes = baseComponents.totalOperatingExpenses - baseTaxes;
    
    // Scale expenses by inflation, then apply general opex overrun factor if present
    let opex = (adjustedBaseTaxes + opexOtherThanTaxes) * expEscalationFactor;
    if (stressParams?.opexOverrun) {
      opex = opex * (1 + stressParams.opexOverrun / 100);
    }

    const noi = egi - opex;

    // Value appreciation
    const propertyValue = initialPropertyValue * Math.pow(1 + appreciation, year - 1);

    // Amortization details for Year t (months 12*(t-1) + 1 to 12*t)
    let debtService = 0;
    let principalPaidYear = 0;
    let finalMonthIdx = year * 12 - 1;
    let outstandingBalance = 0;

    if (amortization.length > 0) {
      const startMonthIdx = (year - 1) * 12;
      const endMonthIdx = Math.min(year * 12, amortization.length);

      for (let m = startMonthIdx; m < endMonthIdx; m++) {
        debtService += amortization[m].payment;
        principalPaidYear += amortization[m].principal;
      }
      // Outstanding balance is at the end of the last month of the year
      const lastYearMonth = Math.min(finalMonthIdx, amortization.length - 1);
      outstandingBalance = lastYearMonth >= 0 ? amortization[lastYearMonth].remainingBalance : 0;
    }

    const preTaxCashFlow = noi - debtService;
    cumulativeCashFlow += preTaxCashFlow;

    const propertyAppreciation = propertyValue - purchasePrice;
    const cumulativePrincipalPaydown = amortization.length > 0 
      ? loanAmount - outstandingBalance 
      : 0;

    // Net Profit: Cumulative cash flow + appreciation + principal paydown
    const netProfit = cumulativeCashFlow + propertyAppreciation + cumulativePrincipalPaydown;

    // Metrics calculations
    const capRate = propertyValue > 0 ? (noi / propertyValue) * 100 : 0;
    const coc = totalCashInvested > 0 ? (preTaxCashFlow / totalCashInvested) * 100 : 0;
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const dscr = debtService > 0 ? noi / debtService : (noi > 0 ? 999 : 0);
    const oer = egi > 0 ? (opex / egi) * 100 : 0;
    const grm = grossRentalIncome > 0 ? purchasePrice / grossRentalIncome : 0;
    const priceToRent = grossRentalIncome > 0 ? purchasePrice / grossRentalIncome : 0;

    proForma.push({
      year,
      propertyValue,
      grossRentalIncome,
      otherIncome,
      vacancyLoss,
      egi,
      opex,
      noi,
      debtService,
      preTaxCashFlow,
      cumulativeCashFlow,
      appreciation: propertyAppreciation,
      principalPaydown: cumulativePrincipalPaydown,
      netProfit,
      coc,
      roi,
      capRate,
      dscr,
      oer,
      grm,
      priceToRent,
    });
  }

  return proForma;
}

/**
 * Fallback calculator for out-of-pocket cash invested in a deal
 */
function computeTotalCashInvestedFallback(project: Project): number {
  const financials = project.financials || {};
  const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
  const loanAmount = financials.loanAmount ?? 0;
  const downPayment = Math.max(0, purchasePrice - loanAmount);
  
  const fixedAcquisitionCosts = financials.fixedAcquisitionCosts ?? 0;
  const emdAmount = financials.emdAmount ?? 0;
  const projectedRehabCost = financials.projectedRehabCost ?? 0;
  
  const monthlyHolding =
    (financials.holdingCostTaxes ?? 0) +
    (financials.holdingCostInsurance ?? 0) +
    (financials.holdingCostUtilities ?? 0);
  const holdMonths = financials.projectedHoldTimeMonths ?? 0;

  return downPayment + fixedAcquisitionCosts + emdAmount + projectedRehabCost + monthlyHolding * holdMonths;
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

/**
 * Ingests portfolio properties, applies risk stress testing parameters, and resolves pro formas and rollup cards.
 */
export function usePortfolioInsights(
  projectsOverride?: Project[],
  stressParams?: StressParameters
) {
  const storeProjects = useProjectStore((s) => s.projects);
  const projects = projectsOverride !== undefined ? projectsOverride : storeProjects;

  return useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        projectInsights: [],
        stabilizedProjects: [],
        workingCapitalProjects: [],
        portfolioRollup: {
          totalNOI: 0,
          averageCapRate: 0,
          averageCoC: 0,
          averageROI: 0,
          averageDSCR: 0,
          averageOER: 0,
          averageGRM: 0,
          priceToRentRatio: 0,
          averageDOM: 0,
        },
        portfolioProForma: Array.from({ length: 10 }, (_, i) => ({
          year: i + 1,
          propertyValue: 0,
          grossRentalIncome: 0,
          otherIncome: 0,
          vacancyLoss: 0,
          egi: 0,
          opex: 0,
          noi: 0,
          debtService: 0,
          preTaxCashFlow: 0,
          cumulativeCashFlow: 0,
          appreciation: 0,
          principalPaydown: 0,
          netProfit: 0,
          coc: 0,
          roi: 0,
          capRate: 0,
          dscr: 0,
          oer: 0,
          grm: 0,
          priceToRent: 0,
        })),
      };
    }

    // 1. Process all projects and determine working capital vs. stabilized status
    const allProjectInsights = projects.map((p) => {
      const financials = p.financials || {};
      const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
      const propertyValue = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;

      // Check working capital classification:
      // - dispositionType === 'SALE'
      // - status === 'Renovating'
      // - currentPhase <= 3 (acquisition, rehab, finding deals)
      const isWorkingCapital =
        p.dispositionType === "SALE" ||
        p.status === "hold" ||
        (p.currentPhase !== undefined && p.currentPhase <= 3);

      // Generate 10-year pro forma trajectory
      const proForma = calculate10YearProForma(p, stressParams);
      const yr1 = proForma[0];

      return {
        id: p.id,
        propertyName: p.propertyName || "Unnamed Property",
        dispositionType: p.dispositionType,
        subStrategy: p.subStrategy,
        currentPhase: p.currentPhase,
        purchasePrice,
        propertyValue,
        noi: yr1.noi,
        egi: yr1.egi,
        opex: yr1.opex,
        capRate: yr1.capRate,
        annualPreTaxCashFlow: yr1.preTaxCashFlow,
        totalCashInvested: financials.financingCashInvested ?? computeTotalCashInvestedFallback(p),
        coc: yr1.coc,
        roi: yr1.roi,
        netProfit: yr1.netProfit,
        totalInvestment: yr1.propertyValue - yr1.appreciation, // base total investment helper
        dscr: yr1.dscr,
        oer: yr1.oer,
        grm: yr1.grm,
        priceToRent: yr1.priceToRent,
        dom: computeDOM(financials.listingDate, financials.soldDate),
        isWorkingCapital,
        proForma,
      };
    });

    // 2. Split into separate groups
    const stabilizedProjects = allProjectInsights.filter((x) => !x.isWorkingCapital);
    const workingCapitalProjects = allProjectInsights.filter((x) => x.isWorkingCapital);

    // 3. Stabilized Portfolio Rollups (so flips do not skew metrics)
    const stabilizedRollupProjects = stabilizedProjects.length > 0 ? stabilizedProjects : allProjectInsights;

    const totalNOI = stabilizedRollupProjects.reduce((sum, x) => sum + x.noi, 0);

    const validPrices = stabilizedRollupProjects.map((x) => x.purchasePrice).filter((x) => x > 0);
    const validRents = stabilizedRollupProjects.map((x) => x.egi).filter((x) => x > 0);

    const medianPrice = median(validPrices);
    const avgAnnualRent = average(validRents);
    const portfolioPriceToRent = avgAnnualRent > 0 ? medianPrice / avgAnnualRent : 0;

    const averageCapRate = average(stabilizedRollupProjects.map((x) => x.capRate).filter((x) => x > 0));
    const averageCoC = average(stabilizedRollupProjects.map((x) => x.coc).filter((x) => x > 0));
    const averageROI = average(stabilizedRollupProjects.map((x) => x.roi).filter((x) => x > 0));
    const averageDSCR = average(stabilizedRollupProjects.map((x) => x.dscr).filter((x) => x > 0 && x !== 999));
    const averageOER = average(stabilizedRollupProjects.map((x) => x.oer).filter((x) => x > 0));
    const averageGRM = average(stabilizedRollupProjects.map((x) => x.grm).filter((x) => x > 0));

    const validDOMs = stabilizedRollupProjects.map((x) => x.dom).filter((x) => x !== null && x !== undefined && x > 0) as number[];
    const averageDOM = validDOMs.length > 0 ? average(validDOMs) : 0;

    // 4. Aggregate 10-year pro forma across all stabilized projects
    const portfolioProForma: ProFormaYear[] = Array.from({ length: 10 }, (_, i) => {
      const year = i + 1;
      let yearPropertyValue = 0;
      let yearGrossRentalIncome = 0;
      let yearOtherIncome = 0;
      let yearVacancyLoss = 0;
      let yearEgi = 0;
      let yearOpex = 0;
      let yearNoi = 0;
      let yearDebtService = 0;
      let yearPreTaxCashFlow = 0;
      let yearCumulativeCashFlow = 0;
      let yearAppreciation = 0;
      let yearPrincipalPaydown = 0;
      let yearNetProfit = 0;
      
      let purchasePriceSum = 0;
      let totalCashInvestedSum = 0;
      let totalInvestmentSum = 0;

      stabilizedRollupProjects.forEach((proj) => {
        const pf = proj.proForma[i];
        yearPropertyValue += pf.propertyValue;
        yearGrossRentalIncome += pf.grossRentalIncome;
        yearOtherIncome += pf.otherIncome;
        yearVacancyLoss += pf.vacancyLoss;
        yearEgi += pf.egi;
        yearOpex += pf.opex;
        yearNoi += pf.noi;
        yearDebtService += pf.debtService;
        yearPreTaxCashFlow += pf.preTaxCashFlow;
        yearCumulativeCashFlow += pf.cumulativeCashFlow;
        yearAppreciation += pf.appreciation;
        yearPrincipalPaydown += pf.principalPaydown;
        yearNetProfit += pf.netProfit;

        purchasePriceSum += proj.purchasePrice;
        totalCashInvestedSum += proj.totalCashInvested;
        
        // Find totalInvestment
        const derived = projects.find(p => p.id === proj.id);
        const inv = derived ? (deriveAllProjectMetrics(derived).totalInvestment) : proj.purchasePrice;
        totalInvestmentSum += inv > 0 ? inv : proj.purchasePrice;
      });

      const coc = totalCashInvestedSum > 0 ? (yearPreTaxCashFlow / totalCashInvestedSum) * 100 : 0;
      const roi = totalInvestmentSum > 0 ? (yearNetProfit / totalInvestmentSum) * 100 : 0;
      const capRate = yearPropertyValue > 0 ? (yearNoi / yearPropertyValue) * 100 : 0;
      const dscr = yearDebtService > 0 ? yearNoi / yearDebtService : (yearNoi > 0 ? 999 : 0);
      const oer = yearEgi > 0 ? (yearOpex / yearEgi) * 100 : 0;
      const grm = yearGrossRentalIncome > 0 ? purchasePriceSum / yearGrossRentalIncome : 0;
      const priceToRent = yearGrossRentalIncome > 0 ? purchasePriceSum / yearGrossRentalIncome : 0;

      return {
        year,
        propertyValue: yearPropertyValue,
        grossRentalIncome: yearGrossRentalIncome,
        otherIncome: yearOtherIncome,
        vacancyLoss: yearVacancyLoss,
        egi: yearEgi,
        opex: yearOpex,
        noi: yearNoi,
        debtService: yearDebtService,
        preTaxCashFlow: yearPreTaxCashFlow,
        cumulativeCashFlow: yearCumulativeCashFlow,
        appreciation: yearAppreciation,
        principalPaydown: yearPrincipalPaydown,
        netProfit: yearNetProfit,
        coc,
        roi,
        capRate,
        dscr,
        oer,
        grm,
        priceToRent,
      };
    });

    return {
      projectInsights: allProjectInsights,
      stabilizedProjects,
      workingCapitalProjects,
      portfolioRollup: {
        totalNOI,
        averageCapRate,
        averageCoC,
        averageROI,
        averageDSCR,
        averageOER,
        averageGRM,
        priceToRentRatio: portfolioPriceToRent,
        averageDOM,
      },
      portfolioProForma,
    };
  }, [projects, stressParams]);
}
