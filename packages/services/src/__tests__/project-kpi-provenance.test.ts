import { describe, expect, it } from '@jest/globals';
import { canonicalSeedDeal } from '@paperworking/financial-engine';
import {
  auditProjectKpiInputProvenance,
  CANONICAL_KPI_DEFAULT_FIELDS,
} from '../projects/project-kpi-provenance.js';

describe('auditProjectKpiInputProvenance', () => {
  it('marks purchase price as REAL_DB when stored on project row', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: 400_000,
      currentPhase: 2,
    });

    expect(summary.inputProvenance.purchase_price).toBe('REAL_DB');
    expect(summary.inputProvenance.property_value).toBe('DERIVED_FROM_REAL_DB');
    expect(summary.inputProvenance.gross_scheduled_rent).toBe('CANONICAL_DEFAULT');
    expect(summary.sourceStatus).toBe('partially_projected');
    expect(summary.usesCanonicalDefaults).toBe(true);
  });

  it('marks all material inputs canonical when purchase price missing', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: null,
      currentPhase: 1,
    });

    expect(summary.inputProvenance.purchase_price).toBe('CANONICAL_DEFAULT');
    expect(summary.sourceStatus).toBe('projected');
    expect(summary.scorecardTrust.noi).toBe('PROJECTED');
  });

  it('classifies NOI as partially projected when only purchase price is real', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: canonicalSeedDeal.purchase_price,
    });

    expect(summary.scorecardTrust.noi).toBe('PARTIALLY_PROJECTED');
    expect(summary.scorecardTrust.longTermAppreciation).toBe('PROJECTED');
  });

  it('documents canonical default fields consumed from seed deal', () => {
    expect(CANONICAL_KPI_DEFAULT_FIELDS).toContain('gross_scheduled_rent');
    expect(CANONICAL_KPI_DEFAULT_FIELDS).toContain('operating_expenses');
  });
});
