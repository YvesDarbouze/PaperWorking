import { describe, expect, it } from '@jest/globals';
import { auditProjectKpiInputProvenance, CANONICAL_KPI_DEFAULT_FIELDS } from '../projects/project-kpi-provenance.js';

describe('auditProjectKpiInputProvenance', () => {
  it('marks purchase price as REAL_DB when stored on project row', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: 400_000,
      currentPhase: 2,
    });

    expect(summary.inputProvenance.purchase_price).toBe('REAL_DB');
    expect(summary.inputProvenance.property_value).toBe('DERIVED_FROM_REAL_DB');
    expect(summary.inputProvenance.gross_scheduled_rent).toBe('UNAVAILABLE');
    expect(summary.sourceStatus).toBe('partially_projected');
    expect(summary.usesCanonicalDefaults).toBe(false);
  });

  it('marks inputs unavailable when purchase price missing', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: null,
      currentPhase: 1,
    });

    expect(summary.inputProvenance.purchase_price).toBe('UNAVAILABLE');
    expect(summary.sourceStatus).toBe('projected');
    expect(summary.scorecardTrust.noi).toBe('UNAVAILABLE');
  });

  it('classifies NOI as partially projected when only purchase price is real', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: 500_000,
    });

    expect(summary.scorecardTrust.noi).toBe('PARTIALLY_PROJECTED');
    expect(summary.scorecardTrust.longTermAppreciation).toBe('UNAVAILABLE');
  });

  it('classifies appreciation as unavailable without stored input', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: 500_000,
    });

    expect(summary.scorecardTrust.longTermAppreciation).toBe('UNAVAILABLE');
  });

  it('marks financials rent and opex as REAL_DB', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p-fin',
      purchasePrice: 400_000,
      financials: {
        monthlyGrossRent: 2500,
        operatingExpenseTaxes: 3600,
      },
    });

    expect(summary.inputProvenance.gross_scheduled_rent).toBe('REAL_DB');
    expect(summary.inputProvenance.operating_expenses).toBe('REAL_DB');
    expect(summary.sourceStatus).toBe('actual');
  });

  it('marks otherIncome and cash-flow schedule as REAL_DB / IRR ACTUAL', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p-irr',
      purchasePrice: 400_000,
      financials: {
        monthlyGrossRent: 2500,
        otherIncome: 2400,
        operatingExpenseTaxes: 3600,
        cashFlowEvents: [
          { date: '2026-01-01', type: 'outflow', amount: 80000 },
          { date: '2027-01-01', type: 'inflow', amount: 120000 },
        ],
      },
    });

    expect(summary.inputProvenance.other_income).toBe('REAL_DB');
    expect(summary.scorecardTrust.irr).toBe('ACTUAL');
  });
});
