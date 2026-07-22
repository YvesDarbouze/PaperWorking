/**
 * AQ-1 Acceptance Tests — Variable Registry & Golden-File Verification
 *
 * AC2: DEMO_SEED produces registry rows with correct types/sources.
 * AC3: deriveAllMetrics against seeded registry returns locked values:
 *       NOI $12,486 · Cap 4.5% · CF −$4,444 · DSCR 0.74 · CoC −7.41%
 */

import {
  ACQUISITION_VARIABLE_REGISTRY,
  DEMO_SEED,
  seedToProjectFinancials,
  getRegistryField,
  getFieldsByGroup,
  getFieldsForMetric,
  getDualSlotFields,
  getSeedSourceMap,
} from '@/lib/metrics/acquisitionVariableRegistry';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import type { RegistryFieldDefinition, SeededVariable } from '@/types/schema';

describe('AQ-1: Acquisition Variable Registry', () => {
  // ── AC2: Registry Structure ─────────────────────────────────────────────

  describe('AC2: Registry field definitions', () => {
    it('registry contains exactly 30 atomic variables', () => {
      expect(ACQUISITION_VARIABLE_REGISTRY.length).toBe(30);
    });

    it('covers all 5 acquisition groups', () => {
      const groups = new Set(ACQUISITION_VARIABLE_REGISTRY.map((f) => f.group));
      expect(groups).toEqual(
        new Set([
          'property_identity',
          'income',
          'operating_expenses',
          'deal_capital',
          'rehab',
        ])
      );
    });

    it('every field has a unique id', () => {
      const ids = ACQUISITION_VARIABLE_REGISTRY.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every field has a valid type', () => {
      const validTypes = ['usd', 'percent', 'count', 'string', 'enum', 'boolean', 'timestamp'];
      for (const field of ACQUISITION_VARIABLE_REGISTRY) {
        expect(validTypes).toContain(field.type);
      }
    });

    it('every field has a valid source tag', () => {
      const validTags = ['user_assumption', 'user_actual', 'document', 'derived', 'plaid'];
      for (const field of ACQUISITION_VARIABLE_REGISTRY) {
        expect(validTags).toContain(field.defaultSourceTag);
      }
    });

    it('no field stores a derived metric (NOI, Cap Rate, etc.)', () => {
      const metricFieldIds = [
        'noi', 'netOperatingIncome', 'capRate', 'cashOnCashReturn',
        'grossRentMultiplier', 'dscr', 'annualCashFlow', 'netCashFlow',
      ];
      for (const field of ACQUISITION_VARIABLE_REGISTRY) {
        expect(metricFieldIds).not.toContain(field.id);
      }
    });

    it('Group 1 (Property Identity) has 8 fields', () => {
      expect(getFieldsByGroup('property_identity')).toHaveLength(8);
    });

    it('Group 2 (Income) has 3 fields', () => {
      expect(getFieldsByGroup('income')).toHaveLength(3);
    });

    it('Group 3 (Operating Expenses) has 8 fields', () => {
      expect(getFieldsByGroup('operating_expenses')).toHaveLength(8);
    });

    it('Group 4 (Deal & Capital) has 10 fields', () => {
      expect(getFieldsByGroup('deal_capital')).toHaveLength(10);
    });

    it('Group 5 (Rehab) has 1 field', () => {
      expect(getFieldsByGroup('rehab')).toHaveLength(1);
    });
  });

  describe('AC2: A→U dual-slot fields', () => {
    it('identifies the correct dual-slot fields', () => {
      const dualSlots = getDualSlotFields();
      const dualIds = dualSlots.map((f) => f.id);
      expect(dualIds).toContain('purchase_price');
      expect(dualIds).toContain('rehab_budget');
      expect(dualIds).toContain('gross_rent_per_unit');
    });

    it('every dual-slot has both projected and actual field paths', () => {
      for (const field of getDualSlotFields()) {
        expect(field.dualSlot).toBeDefined();
        expect(field.dualSlot!.projectedField).toBeTruthy();
        expect(field.dualSlot!.actualField).toBeTruthy();
        expect(field.dualSlot!.projectedField).not.toBe(field.dualSlot!.actualField);
      }
    });
  });

  describe('AC2: Metric consumption mapping', () => {
    it('NOI consumes at least rent, vacancy, taxes, insurance, management, maintenance', () => {
      const noiFields = getFieldsForMetric('NOI');
      const noiIds = noiFields.map((f) => f.id);
      expect(noiIds).toContain('gross_rent_per_unit');
      expect(noiIds).toContain('vacancy_pct');
      expect(noiIds).toContain('tax');
      expect(noiIds).toContain('insurance');
      expect(noiIds).toContain('management_pct');
      expect(noiIds).toContain('maintenance');
    });

    it('Cap Rate consumes purchasePrice', () => {
      const fields = getFieldsForMetric('CAP_RATE');
      expect(fields.map((f) => f.id)).toContain('purchase_price');
    });

    it('DSCR consumes loan fields', () => {
      const fields = getFieldsForMetric('DSCR');
      const ids = fields.map((f) => f.id);
      expect(ids).toContain('loan_amount');
      expect(ids).toContain('loan_interest_rate');
      expect(ids).toContain('loan_term');
    });
  });

  // ── AC2: DEMO_SEED ────────────────────────────────────────────────────

  describe('AC2: DEMO_SEED registry rows', () => {
    it('every seeded fieldId exists in the registry', () => {
      for (const row of DEMO_SEED) {
        const def = getRegistryField(row.fieldId);
        expect(def).toBeDefined();
      }
    });

    it('every seeded value matches its registry field type', () => {
      const numberTypes = ['usd', 'percent', 'count'];
      const stringTypes = ['string', 'enum'];

      for (const row of DEMO_SEED) {
        const def = getRegistryField(row.fieldId)!;
        if (numberTypes.includes(def.type)) {
          expect(typeof row.value).toBe('number');
        } else if (stringTypes.includes(def.type)) {
          expect(typeof row.value).toBe('string');
        } else if (def.type === 'boolean') {
          expect(typeof row.value).toBe('boolean');
        }
      }
    });

    it('every seeded row has a valid source tag', () => {
      const validTags = ['user_assumption', 'user_actual', 'document', 'derived', 'plaid'];
      for (const row of DEMO_SEED) {
        expect(validTags).toContain(row.sourceTag);
      }
    });

    it('every seeded row has a valid slot', () => {
      for (const row of DEMO_SEED) {
        expect(['projected', 'actual']).toContain(row.slot);
      }
    });

    it('source map contains all seeded fields', () => {
      const sourceMap = getSeedSourceMap(DEMO_SEED);
      expect(sourceMap.size).toBe(DEMO_SEED.length);
      for (const row of DEMO_SEED) {
        expect(sourceMap.has(row.fieldId)).toBe(true);
      }
    });
  });

  describe('AC2: seedToProjectFinancials', () => {
    it('converts DEMO_SEED to a valid ProjectFinancials partial', () => {
      const financials = seedToProjectFinancials(DEMO_SEED);
      expect(financials.purchasePrice).toBe(279_000);
      expect(financials.gross_rent_per_unit).toBe(1_950);
      expect(financials.loanAmount).toBe(223_200);
      expect(financials.loanInterestRate).toBe(6.5);
      expect(financials.loanTermYears).toBe(30);
      expect(financials.vacancy_pct).toBe(7);
      expect(financials.tax).toBe(200);
      expect(financials.insurance).toBe(58);
      expect(financials.utilities).toBe(125);
      expect(financials.management_pct).toBe(10);
      expect(financials.maintenance).toBe(195);
      expect(financials.totalCashInvested).toBe(60_000);
    });

    it('throws on unknown field ID', () => {
      const bad: SeededVariable[] = [
        { fieldId: 'nonexistent_field', value: 123, sourceTag: 'user_actual', slot: 'actual' },
      ];
      expect(() => seedToProjectFinancials(bad)).toThrow('Unknown registry field');
    });
  });

  // ── AC3: Golden-File Metric Verification ──────────────────────────────

  describe('AC3: deriveAllMetrics against DEMO_SEED', () => {
    const financials = seedToProjectFinancials(DEMO_SEED);
    const metrics = deriveAllMetrics(financials as any);

    it('NOI = $12,486 (on gross-scheduled-rent PM fee basis)', () => {
      expect(metrics.noi).toBe(12_486);
      // eslint-disable-next-line no-console
      console.log(`  NOI:       $${metrics.noi.toLocaleString()}`);
    });

    it('Cap Rate ≈ 4.5% (locked)', () => {
      expect(metrics.capRate).toBeCloseTo(4.48, 1);
      // eslint-disable-next-line no-console
      console.log(`  Cap Rate:  ${metrics.capRate.toFixed(2)}%`);
    });

    it('Cash Flow ≈ −$4,444 (on gross-scheduled-rent PM fee basis)', () => {
      expect(metrics.annualCashFlow).toBeCloseTo(-4443.31, 0);
      // eslint-disable-next-line no-console
      console.log(`  Cash Flow: $${metrics.annualCashFlow.toFixed(2)}`);
    });

    it('DSCR ≈ 0.74 (on gross-scheduled-rent PM fee basis)', () => {
      expect(metrics.dscr).toBeCloseTo(0.74, 1);
      // eslint-disable-next-line no-console
      console.log(`  DSCR:      ${metrics.dscr.toFixed(2)}`);
    });

    it('CoC Return ≈ −7.41% (on gross-scheduled-rent PM fee basis)', () => {
      expect(metrics.cashOnCashReturn).toBeCloseTo(-7.41, 1);
      // eslint-disable-next-line no-console
      console.log(`  CoC:       ${metrics.cashOnCashReturn.toFixed(2)}%`);
    });

    it('GRM ≈ 11.92 (locked)', () => {
      expect(metrics.grossRentMultiplier).toBeCloseTo(11.92, 1);
      // eslint-disable-next-line no-console
      console.log(`  GRM:       ${metrics.grossRentMultiplier.toFixed(2)}`);
    });
  });
});
