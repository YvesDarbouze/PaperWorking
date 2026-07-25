import { getRegistryField } from '@/lib/metrics/acquisitionVariableRegistry';
import type { Project, VariableSourceTag } from '@/types/schema';

/**
 * Resolves the provenance (source tag) for a given registry field ID on a project.
 * Falls back to registry default if not explicitly defined in project document.
 */
export function getVariableProvenance(
  fieldId: string,
  project: Project,
  slot?: 'projected' | 'actual'
): VariableSourceTag {
  // 1. Check project-level sourceTags map
  const financials = project.financials || {};
  const sourceTags = (financials.sourceTags || {}) as Record<string, string>;
  
  // Look up slot-specific tag first (e.g. purchasePrice_projected, purchasePrice_actual)
  if (slot) {
    const slotKey = `${fieldId}_${slot}`;
    if (sourceTags[slotKey]) {
      return sourceTags[slotKey] as VariableSourceTag;
    }
  }

  if (sourceTags[fieldId]) {
    return sourceTags[fieldId] as VariableSourceTag;
  }

  // Fallback to slot suffixes if slot is not specified
  if (!slot) {
    const projectedKey = `${fieldId}_projected`;
    if (sourceTags[projectedKey]) {
      return sourceTags[projectedKey] as VariableSourceTag;
    }
    const actualKey = `${fieldId}_actual`;
    if (sourceTags[actualKey]) {
      return sourceTags[actualKey] as VariableSourceTag;
    }
  }

  // 2. Fall back to registry default
  const regField = getRegistryField(fieldId);
  if (regField) {
    return regField.defaultSourceTag;
  }

  // Default to user_assumption if all else fails
  return 'user_assumption';
}

/**
 * Calculates a coverage-based deal completeness indicator.
 * Scans the project for required variables and returns the percentage filled.
 */
export function calculateDealCompleteness(project: Project): {
  score: number;
  total: number;
  filled: number;
  missing: string[];
} {
  const financials = project.financials || {};

  // Check if financed
  const modality = project.fundingPlan?.modality || [];
  const isFinanced =
    modality.some((m) =>
      ['conventional_loan', 'sba_504', 'hard_money', 'bridge'].includes(m)
    ) ||
    (project.loans && project.loans.length > 0) ||
    (financials.capitalStack || []).some((s: any) =>
      [
        'Conventional Financing',
        'Hard Money Loans',
        'SBA 504 Bank First Lien',
        'SBA 504 CDC Debenture',
        'Bridge Loans',
      ].includes(s.category)
    );

  // List of required underwriting variables and check functions
  const checks: Array<{ name: string; key: string; isFilled: () => boolean }> = [
    {
      name: 'Purchase Price',
      key: 'purchase_price',
      isFilled: () => {
        const p = financials.purchasePrice || financials.targetPurchasePrice;
        return typeof p === 'number' && p > 0;
      },
    },
    {
      name: 'Monthly Gross Rent',
      key: 'gross_rent_per_unit',
      isFilled: () => {
        const r = financials.gross_rent_per_unit || financials.actualRentalIncome;
        return typeof r === 'number' && r > 0;
      },
    },
    {
      name: 'Vacancy Rate %',
      key: 'vacancy_pct',
      isFilled: () => {
        const v = financials.vacancy_pct;
        return typeof v === 'number' && v >= 0;
      },
    },
    {
      name: 'Taxes',
      key: 'tax',
      isFilled: () => {
        const t = financials.tax;
        return typeof t === 'number' && t >= 0;
      },
    },
    {
      name: 'Insurance',
      key: 'insurance',
      isFilled: () => {
        const i = financials.insurance;
        return typeof i === 'number' && i >= 0;
      },
    },
    {
      name: 'Utilities',
      key: 'utilities',
      isFilled: () => {
        const u = financials.utilities;
        return typeof u === 'number' && u >= 0;
      },
    },
    {
      name: 'Property Mgmt Fee',
      key: 'management_pct',
      isFilled: () => {
        const m = financials.management_pct;
        return typeof m === 'number' && m >= 0;
      },
    },
    {
      name: 'Maintenance Reserve',
      key: 'maintenance',
      isFilled: () => {
        const mt = financials.maintenance || financials.maintenance_pct;
        return typeof mt === 'number' && mt >= 0;
      },
    },
    {
      name: 'Funding Target',
      key: 'funding_target',
      isFilled: () => {
        const f = financials.equityTerms?.funding_target;
        return typeof f === 'number' && f > 0;
      },
    },
  ];

  // If financed, append loan terms
  if (isFinanced) {
    checks.push(
      {
        name: 'Loan Amount',
        key: 'loan_amount',
        isFilled: () => {
          const l = financials.loanAmount || financials.targetLoanAmount || (project.loans && project.loans.length > 0);
          return !!l;
        },
      },
      {
        name: 'Loan Interest Rate',
        key: 'loan_interest_rate',
        isFilled: () => {
          const r = financials.loanInterestRate || financials.targetLoanInterestRate || (project.loans && project.loans.length > 0);
          return !!r;
        },
      },
      {
        name: 'Loan Term',
        key: 'loan_term',
        isFilled: () => {
          const t = financials.loanTermYears || financials.targetLoanTermYears || (project.loans && project.loans.length > 0);
          return !!t;
        },
      }
    );
  }

  const missing: string[] = [];
  let filled = 0;

  checks.forEach((c) => {
    if (c.isFilled()) {
      filled++;
    } else {
      missing.push(c.name);
    }
  });

  const total = checks.length;
  const score = total > 0 ? Math.round((filled / total) * 100) : 0;

  return { score, total, filled, missing };
}
