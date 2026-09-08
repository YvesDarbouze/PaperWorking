import { z } from 'zod';

// ── 33 Underwriting KPIs Financial Inputs Schema ─────────────────────

export const interestRateTypeEnum = z.enum(['fixed', 'floating']);
export const floatingIndexEnum = z.enum(['SOFR', 'Prime']);

export const underwritingAcquisitionSchema = z.object({
  purchasePrice: z.number().positive(),
  buyerClosingCosts: z.number().nonnegative(),
  rehabBudget: z.number().nonnegative(),
  estimatedARV: z.number().nonnegative().optional(),
});

export const underwritingRentRollSchema = z.object({
  grossScheduledRent: z.number().nonnegative(),
  otherIncome: z.number().nonnegative().optional().default(0),
  vacancyRate: z.number().min(0).max(100),
  operatingExpenseRatio: z.number().min(0).max(100),
});

export const underwritingDebtSchema = z.object({
  loanAmount: z.number().nonnegative(),
  targetLTV: z.number().min(0).max(100),
  interestRateType: interestRateTypeEnum,
  interestRate: z.number().min(0).max(100),
  floatingIndex: floatingIndexEnum.optional(),
  floatingSpreadBps: z.number().nonnegative().optional(),
  amortizationYears: z.number().positive(),
  balloonTermYears: z.number().positive().optional(),
  ioPeriodMonths: z.number().nonnegative().optional().default(0),
});

export const underwritingExitSchema = z.object({
  holdPeriodYears: z.number().positive(),
  exitCapRate: z.number().min(0.01).max(100),
  annualRentGrowth: z.number().min(0).max(100),
  annualExpenseGrowth: z.number().min(0).max(100),
  costOfSale: z.number().min(0).max(100),
});

export const underwritingHurdlesSchema = z
  .object({
    minDSCR: z.number().nonnegative(),
    preferredReturn: z.number().min(0).max(100).optional(),
    exitCapSensitivityBps: z.number().positive().default(25),
    rentShockPct: z.number().min(0).max(100).default(5),
    vacancyStressRange: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]).default([5, 20]),
    equityRequiredGpVsLp: z.string().optional(),
    lpEquityPct: z.number().min(0).max(100).optional(),
    gpEquityPct: z.number().min(0).max(100).optional(),
    gpPromotePct: z.number().min(0).max(100).optional(),
    hurdle2Irr: z.number().min(0).max(100).optional(),
    gpPromote2Pct: z.number().min(0).max(100).optional(),
  })
  .refine(
    (data) => {
      const lp = data.lpEquityPct ?? 90;
      const gp = data.gpEquityPct ?? 10;
      return Math.abs(lp + gp - 100) < 0.01;
    },
    {
      message: 'LP Equity % and GP Equity % must sum to 100%',
      path: ['lpEquityPct'],
    },
  );

export const underwritingInputsSchema = z.object({
  acquisition: underwritingAcquisitionSchema,
  rentRoll: underwritingRentRollSchema,
  debt: underwritingDebtSchema,
  exit: underwritingExitSchema,
  hurdles: underwritingHurdlesSchema,
});

export type UnderwritingAcquisition = z.infer<typeof underwritingAcquisitionSchema>;
export type UnderwritingRentRoll = z.infer<typeof underwritingRentRollSchema>;
export type UnderwritingDebt = z.infer<typeof underwritingDebtSchema>;
export type UnderwritingExit = z.infer<typeof underwritingExitSchema>;
export type UnderwritingHurdles = z.infer<typeof underwritingHurdlesSchema>;
export type UnderwritingInputs = z.infer<typeof underwritingInputsSchema>;

export function getDefaultUnderwritingInputs(purchasePrice = 500000): UnderwritingInputs {
  const price = Math.max(purchasePrice, 10000);
  const closingCosts = Math.round(price * 0.02);
  const ltv = 75;
  const loanAmount = Math.round(price * (ltv / 100));
  const grossRent = Math.round(price * 0.008);

  return {
    acquisition: {
      purchasePrice: price,
      buyerClosingCosts: closingCosts,
      rehabBudget: 0,
      estimatedARV: Math.round(price * 1.25),
    },
    rentRoll: {
      grossScheduledRent: grossRent,
      otherIncome: 0,
      vacancyRate: 5,
      operatingExpenseRatio: 40,
    },
    debt: {
      loanAmount,
      targetLTV: ltv,
      interestRateType: 'fixed',
      interestRate: 6.5,
      floatingIndex: 'SOFR',
      floatingSpreadBps: 250,
      amortizationYears: 30,
      balloonTermYears: undefined,
      ioPeriodMonths: 0,
    },
    exit: {
      holdPeriodYears: 5,
      exitCapRate: 6.5,
      annualRentGrowth: 3,
      annualExpenseGrowth: 2,
      costOfSale: 5,
    },
    hurdles: {
      minDSCR: 1.25,
      preferredReturn: 8,
      exitCapSensitivityBps: 25,
      rentShockPct: 5,
      vacancyStressRange: [5, 20],
      equityRequiredGpVsLp: '10% GP / 90% LP',
      lpEquityPct: 90,
      gpEquityPct: 10,
      gpPromotePct: 20,
      hurdle2Irr: undefined,
      gpPromote2Pct: undefined,
    },
  };
}
