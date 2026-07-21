/**
 * P3 Hold Interview — Strategy Gating Tests
 * 
 * Validates that HoldInterview correctly branches between:
 * - Flip path (rehab questions, no rental/occupancy)
 * - Rental path (rental operations, no rehab questions)
 * - BRRRR path (both rehab AND rental)
 * - All strategies get shared operating costs + market value
 * 
 * Guardrails:
 * - Don't ask occupancy for a Flip
 * - Don't ask rehab-budget for a stabilized Rental
 * - Capital improvements are separate from operating expenses
 */

export {};


// ── Inline question definitions matching HoldInterview.tsx ──

interface HoldStep {
  id: string;
  question: string;
  field: string;
  type: string;
  required: boolean;
  condition?: (data: any) => boolean;
}

/**
 * Build the Hold steps array exactly as HoldInterview.tsx does.
 * Accepts formData.dispositionType/subStrategy and formData.financials for dynamic gating.
 */
function buildHoldSteps(formData: any): HoldStep[] {
  const strategy = formData.dispositionType === 'RENT'
    ? (formData.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
    : (formData.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip');
  const isFlip = strategy === 'Fix & Flip' || strategy === 'Sell';
  const isRental = strategy === 'Buy & Hold' || strategy === 'Rent';
  const isBRRRR = strategy === 'Rent';

  const list: HoldStep[] = [];

  // Rehab Path: Flip / BRRRR
  if (isFlip || isBRRRR) {
    list.push(
      {
        id: 'rehabBudget',
        question: "What is your rehab budget? (LIVE)",
        field: 'financials.rehabBudget',
        type: 'currency',
        required: true,
      },
      {
        id: 'rehabActual',
        question: "Track rehab spend: how much has been spent to date? (LIVE)",
        field: 'financials.rehabActual',
        type: 'currency',
        required: true,
      },
      {
        id: 'rehabDoneDate',
        question: "What is the rehab completion date? (LIVE)",
        field: 'financials.rehabDoneDate',
        type: 'date',
        required: false,
      }
    );
  }

  // Shared Operating Costs: All strategies
  list.push(
    {
      id: 'holdingCostTaxes',
      question: "What are your actual monthly property taxes? (LIVE)",
      field: 'financials.holdingCostTaxes',
      type: 'currency',
      required: true,
    },
    {
      id: 'holdingCostInsurance',
      question: "What is your actual monthly property insurance? (LIVE)",
      field: 'financials.holdingCostInsurance',
      type: 'currency',
      required: true,
    },
    {
      id: 'holdingCostUtilities',
      question: "What are the monthly utility costs? (LIVE)",
      field: 'financials.holdingCostUtilities',
      type: 'currency',
      required: true,
    },
    {
      id: 'monthlyHOA',
      question: "What is the monthly HOA fee, if any? (LIVE)",
      field: 'financials.monthlyHOA',
      type: 'currency',
      required: true,
    }
  );

  // Rental Operations Path: Rental / BRRRR
  if (isRental) {
    list.push(
      {
        id: 'propertyManagementFee',
        question: "What is your monthly property management fee? (LIVE)",
        field: 'financials.propertyManagementFee',
        type: 'currency',
        required: true,
      },
      {
        id: 'monthlyMaintenanceReserve',
        question: "What is your monthly maintenance/CapEx reserve? (LIVE)",
        field: 'financials.monthlyMaintenanceReserve',
        type: 'currency',
        required: true,
      },
      {
        id: 'actualRentalIncome',
        question: "Actual monthly rent collected? (LIVE)",
        field: 'financials.actualRentalIncome',
        type: 'currency',
        required: true,
      },
      {
        id: 'otherMonthlyIncome',
        question: "Any other monthly income (parking, laundry, fees)? (LIVE)",
        field: 'financials.otherMonthlyIncome',
        type: 'currency',
        required: true,
      },
      {
        id: 'isOccupied',
        question: "Is the property currently occupied? (LIVE)",
        field: 'financials.isOccupied',
        type: 'select',
        required: true,
      },
      {
        id: 'daysOccupied',
        question: "How many days was the property occupied this period? (LIVE)",
        field: 'financials.daysOccupied',
        type: 'integer',
        required: true,
        condition: (data: any) => data.financials.isOccupied === 'yes',
      }
    );
  }

  // Shared Value Estimation: All strategies
  list.push({
    id: 'estimatedCurrentValue',
    question: "Current estimated market value? (LIVE)",
    field: 'financials.estimatedCurrentValue',
    type: 'currency',
    required: true,
  });

  return list;
}

function getActiveSteps(formData: any): HoldStep[] {
  const steps = buildHoldSteps(formData);
  return steps.filter(s => !s.condition || s.condition(formData));
}

function getActiveIds(formData: any): string[] {
  return getActiveSteps(formData).map(q => q.id);
}

// ── Phase 3 Advance Gating (mirrors FullscreenLifecycleView.tsx lines 168-204) ──

interface GatingResult {
  canAdvance: boolean;
  missingFields: string[];
}

function evaluateP3AdvanceGating(deal: any): GatingResult {
  const strategy = deal.dispositionType === 'RENT'
    ? (deal.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
    : (deal.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip');
  const isFlip = strategy === 'Fix & Flip' || strategy === 'Sell';
  const isRental = strategy === 'Buy & Hold' || strategy === 'Rent';
  const isBRRRR = strategy === 'Rent';

  const missing: string[] = [];

  const hasRehabDone = deal.financials?.rehabDoneDate != null;
  const hasCurrentValue = (deal.financials?.estimatedCurrentValue || 0) > 0;
  const hasTenantPlaced = (deal.financials?.daysOccupied || 0) > 0 || (deal.financials?.occupiedUnits || 0) > 0;
  const hasOpex = (deal.financials?.holdingCostTaxes || 0) > 0 ||
                   (deal.financials?.holdingCostInsurance || 0) > 0 ||
                   (deal.financials?.holdingCostUtilities || 0) > 0 ||
                   (deal.financials?.propertyManagementFee || 0) > 0 ||
                   (deal.financials?.monthlyMaintenanceReserve || 0) > 0 ||
                   (deal.financials?.monthlyHOA || 0) > 0;

  if (isBRRRR) {
    if (!hasRehabDone) missing.push("Rehab Completion Date");
    if (!hasCurrentValue) missing.push("Current Estimated Value (> $0)");
    if (!hasTenantPlaced) missing.push("Tenant Placement (Days Occupied or Occupied Units > 0)");
    if (!hasOpex) missing.push("Captured Monthly Operating Expenses (at least one category > $0)");
  } else if (isFlip) {
    if (!hasRehabDone) missing.push("Rehab Completion Date");
    if (!hasCurrentValue) missing.push("Current Estimated Value (> $0)");
  } else if (isRental) {
    if (!hasTenantPlaced) missing.push("Tenant Placement (Days Occupied or Occupied Units > 0)");
    if (!hasOpex) missing.push("Captured Monthly Operating Expenses (at least one category > $0)");
  }

  return { canAdvance: missing.length === 0, missingFields: missing };
}


// ═════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════

describe('P3 Hold Phase — Strategy-based Question Gating', () => {

  // ── Fix & Flip ──
  describe('Fix & Flip strategy', () => {
    const formData = {
      dispositionType: 'SALE',
      subStrategy: 'FLIP',
      financials: { isOccupied: 'no' },
    };

    it('shows rehab questions (budget, actual, done date)', () => {
      const ids = getActiveIds(formData);
      expect(ids).toContain('rehabBudget');
      expect(ids).toContain('rehabActual');
      expect(ids).toContain('rehabDoneDate');
    });

    it('does NOT show rental/occupancy questions', () => {
      const ids = getActiveIds(formData);
      expect(ids).not.toContain('actualRentalIncome');
      expect(ids).not.toContain('otherMonthlyIncome');
      expect(ids).not.toContain('isOccupied');
      expect(ids).not.toContain('daysOccupied');
      expect(ids).not.toContain('propertyManagementFee');
      expect(ids).not.toContain('monthlyMaintenanceReserve');
    });

    it('shows shared operating costs (taxes, insurance, utilities, HOA)', () => {
      const ids = getActiveIds(formData);
      expect(ids).toContain('holdingCostTaxes');
      expect(ids).toContain('holdingCostInsurance');
      expect(ids).toContain('holdingCostUtilities');
      expect(ids).toContain('monthlyHOA');
    });

    it('shows estimated current value', () => {
      const ids = getActiveIds(formData);
      expect(ids).toContain('estimatedCurrentValue');
    });

    it('has 8 total questions (3 rehab + 4 opex + 1 value)', () => {
      const active = getActiveSteps(formData);
      expect(active).toHaveLength(8);
    });
  });

  // ── Buy & Hold (Stabilized Rental) ──
  describe('Buy & Hold (stabilized Rental) strategy', () => {
    const formData = {
      dispositionType: 'RENT',
      subStrategy: 'LONG_TERM',
      financials: { isOccupied: 'yes' },
    };

    it('does NOT show rehab questions', () => {
      const ids = getActiveIds(formData);
      expect(ids).not.toContain('rehabBudget');
      expect(ids).not.toContain('rehabActual');
      expect(ids).not.toContain('rehabDoneDate');
    });

    it('shows rental operations (rent, other income, PM, maintenance)', () => {
      const ids = getActiveIds(formData);
      expect(ids).toContain('actualRentalIncome');
      expect(ids).toContain('otherMonthlyIncome');
      expect(ids).toContain('propertyManagementFee');
      expect(ids).toContain('monthlyMaintenanceReserve');
    });

    it('shows occupancy questions when occupied', () => {
      const ids = getActiveIds(formData);
      expect(ids).toContain('isOccupied');
      expect(ids).toContain('daysOccupied');
    });

    it('hides daysOccupied when property is vacant', () => {
      const vacantFormData = {
        ...formData,
        financials: { isOccupied: 'no' },
      };
      const ids = getActiveIds(vacantFormData);
      expect(ids).toContain('isOccupied'); // Question itself still shown
      expect(ids).not.toContain('daysOccupied'); // Follow-up hidden
    });

    it('has 11 total questions when occupied (4 opex + 6 rental + 1 value)', () => {
      const active = getActiveSteps(formData);
      // 4 shared opex + 6 rental (PM, maint, rent, other, isOccupied, daysOccupied) + 1 value
      expect(active).toHaveLength(11);
    });
  });

  // ── BRRRR (Rent strategy = Flip path + Rental path) ──
  describe('BRRRR (Rent) strategy', () => {
    const formData = {
      dispositionType: 'RENT',
      subStrategy: 'BRRRR',
      financials: { isOccupied: 'yes' },
    };

    it('shows BOTH rehab AND rental questions', () => {
      const ids = getActiveIds(formData);
      // Rehab
      expect(ids).toContain('rehabBudget');
      expect(ids).toContain('rehabActual');
      expect(ids).toContain('rehabDoneDate');
      // Rental
      expect(ids).toContain('actualRentalIncome');
      expect(ids).toContain('propertyManagementFee');
      expect(ids).toContain('isOccupied');
    });

    it('has 14 total questions (3 rehab + 4 opex + 6 rental + 1 value)', () => {
      const active = getActiveSteps(formData);
      expect(active).toHaveLength(14);
    });
  });

  // ── Shared ──
  describe('Shared questions (all strategies)', () => {
    it('estimatedCurrentValue is present for Flip, Rental, and BRRRR', () => {
      const testCases = [
        { dispositionType: 'SALE', subStrategy: 'FLIP' },
        { dispositionType: 'RENT', subStrategy: 'LONG_TERM' },
        { dispositionType: 'RENT', subStrategy: 'BRRRR' },
        { dispositionType: 'SALE', subStrategy: 'WHOLESALE' },
      ];
      for (const tc of testCases) {
        const ids = getActiveIds({ ...tc, financials: { isOccupied: 'no' } });
        expect(ids).toContain('estimatedCurrentValue');
      }
    });

    it('operating costs (taxes, insurance, utilities, HOA) present for all strategies', () => {
      const testCases = [
        { dispositionType: 'SALE', subStrategy: 'FLIP' },
        { dispositionType: 'RENT', subStrategy: 'LONG_TERM' },
        { dispositionType: 'RENT', subStrategy: 'BRRRR' },
      ];
      for (const tc of testCases) {
        const ids = getActiveIds({ ...tc, financials: { isOccupied: 'no' } });
        expect(ids).toContain('holdingCostTaxes');
        expect(ids).toContain('holdingCostInsurance');
        expect(ids).toContain('holdingCostUtilities');
        expect(ids).toContain('monthlyHOA');
      }
    });
  });
});


describe('P3 Hold Phase — Advance Gating (Phase 3 → Exit)', () => {

  // ── Fix & Flip Advance ──
  describe('Flip advance criteria', () => {
    it('blocks when rehab not complete', () => {
      const deal = {
        dispositionType: 'SALE',
        subStrategy: 'FLIP',
        financials: { estimatedCurrentValue: 200000 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(false);
      expect(result.missingFields).toContain("Rehab Completion Date");
    });

    it('blocks when current value not set', () => {
      const deal = {
        dispositionType: 'SALE',
        subStrategy: 'FLIP',
        financials: { rehabDoneDate: new Date(), estimatedCurrentValue: 0 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(false);
      expect(result.missingFields).toContain("Current Estimated Value (> $0)");
    });

    it('allows advance when rehab done + value set', () => {
      const deal = {
        dispositionType: 'SALE',
        subStrategy: 'FLIP',
        financials: { rehabDoneDate: new Date(), estimatedCurrentValue: 250000 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('does NOT require tenant placement for Flip', () => {
      const deal = {
        dispositionType: 'SALE',
        subStrategy: 'FLIP',
        financials: { rehabDoneDate: new Date(), estimatedCurrentValue: 250000, daysOccupied: 0 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(true);
    });
  });

  // ── Rental Advance ──
  describe('Rental advance criteria', () => {
    it('blocks when no tenant placed', () => {
      const deal = {
        dispositionType: 'RENT',
        subStrategy: 'LONG_TERM',
        financials: { holdingCostTaxes: 500, daysOccupied: 0, occupiedUnits: 0 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(false);
      expect(result.missingFields).toContain("Tenant Placement (Days Occupied or Occupied Units > 0)");
    });

    it('blocks when no opex captured', () => {
      const deal = {
        dispositionType: 'RENT',
        subStrategy: 'LONG_TERM',
        financials: { daysOccupied: 30 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(false);
      expect(result.missingFields).toContain("Captured Monthly Operating Expenses (at least one category > $0)");
    });

    it('allows advance when tenant placed + opex captured', () => {
      const deal = {
        dispositionType: 'RENT',
        subStrategy: 'LONG_TERM',
        financials: { daysOccupied: 30, holdingCostTaxes: 400 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(true);
    });

    it('does NOT require rehab completion for stabilized Rental', () => {
      const deal = {
        dispositionType: 'RENT',
        subStrategy: 'LONG_TERM',
        financials: { daysOccupied: 30, holdingCostInsurance: 200 },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(true);
    });
  });

  // ── BRRRR Advance (needs everything) ──
  describe('BRRRR advance criteria', () => {
    it('requires ALL conditions: rehab + value + tenant + opex', () => {
      const incomplete = {
        dispositionType: 'RENT',
        subStrategy: 'BRRRR',
        financials: {},
      };
      const result = evaluateP3AdvanceGating(incomplete);
      expect(result.canAdvance).toBe(false);
      expect(result.missingFields).toHaveLength(4);
    });

    it('allows advance when all 4 conditions met', () => {
      const deal = {
        dispositionType: 'RENT',
        subStrategy: 'BRRRR',
        financials: {
          rehabDoneDate: new Date(),
          estimatedCurrentValue: 300000,
          daysOccupied: 28,
          holdingCostTaxes: 350,
        },
      };
      const result = evaluateP3AdvanceGating(deal);
      expect(result.canAdvance).toBe(true);
    });
  });
});
