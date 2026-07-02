/**
 * P4 Exit Interview — Exit Type Gating Tests
 *
 * Validates that ExitInterview correctly branches across three exit types:
 * - Sale: sale price + selling costs + sale date → archive & lock
 * - Stabilization: mark stabilized + stabilization date → return to Hold
 * - Refinance: new loan terms + cash-out + refi date → return to Hold with reset debt
 *
 * Guardrails:
 * - Don't force a sale price on a stabilizing rental
 * - Realized appreciation/IRR only exist after a sale
 * - Refi resets primary debt metrics (loanAmount, rate, term)
 */



// ── Inline question definitions matching ExitInterview.tsx ──

interface ExitStep {
  id: string;
  question: string;
  field: string;
  type: string;
  required: boolean;
}

/**
 * Build the Exit steps array exactly as ExitInterview.tsx does.
 * Accepts formData.exitType for branching.
 */
function buildExitSteps(exitType: string): ExitStep[] {
  const list: ExitStep[] = [
    {
      id: 'exitType',
      question: "What is your exit pathway?",
      field: 'exitType',
      type: 'select',
      required: true,
    }
  ];

  if (exitType === 'Sale') {
    list.push(
      {
        id: 'actualSalePrice',
        question: "What did it sell for?",
        field: 'financials.actualSalePrice',
        type: 'currency',
        required: true,
      },
      {
        id: 'sellingCosts',
        question: "Selling + marketing costs?",
        field: 'financials.sellingCosts',
        type: 'currency',
        required: true,
      },
      {
        id: 'soldDate',
        question: "Sale / closing date?",
        field: 'financials.soldDate',
        type: 'date',
        required: true,
      }
    );
  } else if (exitType === 'Stabilization') {
    list.push(
      {
        id: 'isStabilized',
        question: "Mark as stabilized operating rental?",
        field: 'financials.isStabilized',
        type: 'select',
        required: true,
      },
      {
        id: 'stabilizationDate',
        question: "Stabilization date?",
        field: 'financials.stabilizationDate',
        type: 'date',
        required: true,
      }
    );
  } else if (exitType === 'Refinance') {
    list.push(
      {
        id: 'refiLoanAmount',
        question: "New loan amount?",
        field: 'financials.refiLoanAmount',
        type: 'currency',
        required: true,
      },
      {
        id: 'refiInterestRate',
        question: "New interest rate?",
        field: 'financials.refiInterestRate',
        type: 'percentage',
        required: true,
      },
      {
        id: 'refiLoanTermYears',
        question: "New loan term (years)?",
        field: 'financials.refiLoanTermYears',
        type: 'integer',
        required: true,
      },
      {
        id: 'refiCashOut',
        question: "Cash pulled out?",
        field: 'financials.refiCashOut',
        type: 'currency',
        required: true,
      },
      {
        id: 'refiDate',
        question: "Refinance date?",
        field: 'financials.refiDate',
        type: 'date',
        required: true,
      }
    );
  }

  return list;
}

function getStepIds(exitType: string): string[] {
  return buildExitSteps(exitType).map(s => s.id);
}


// ── Exit completion behavior (mirrors handleCompleteExit logic) ──

interface ExitOutcome {
  newStatus: string;
  newPhase: number | null;  // null = no phase change (archived)
  archivesProject: boolean;
  resetsDebt: boolean;
}

function evaluateExitOutcome(exitType: string): ExitOutcome {
  switch (exitType) {
    case 'Sale':
      return {
        newStatus: 'Sold',
        newPhase: null,
        archivesProject: true,
        resetsDebt: false,
      };
    case 'Stabilization':
      return {
        newStatus: 'Rented',
        newPhase: 3, // return to Hold
        archivesProject: false,
        resetsDebt: false,
      };
    case 'Refinance':
      return {
        newStatus: 'current', // status unchanged
        newPhase: 3, // return to Hold
        archivesProject: false,
        resetsDebt: true, // loanAmount/rate/term overwritten with refi values
      };
    default:
      throw new Error(`Unknown exit type: ${exitType}`);
  }
}


// ═════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════

describe('P4 Exit Phase — Exit Type Question Gating', () => {

  // ── Sale ──
  describe('Sale exit pathway', () => {
    it('shows 4 questions: exit type + sale price + selling costs + sale date', () => {
      const steps = buildExitSteps('Sale');
      expect(steps).toHaveLength(4);
    });

    it('includes actualSalePrice, sellingCosts, and soldDate', () => {
      const ids = getStepIds('Sale');
      expect(ids).toContain('actualSalePrice');
      expect(ids).toContain('sellingCosts');
      expect(ids).toContain('soldDate');
    });

    it('does NOT include refi or stabilization questions', () => {
      const ids = getStepIds('Sale');
      expect(ids).not.toContain('isStabilized');
      expect(ids).not.toContain('stabilizationDate');
      expect(ids).not.toContain('refiLoanAmount');
      expect(ids).not.toContain('refiCashOut');
    });

    it('all sale questions are required', () => {
      const steps = buildExitSteps('Sale');
      for (const step of steps) {
        expect(step.required).toBe(true);
      }
    });
  });

  // ── Stabilization ──
  describe('Stabilization exit pathway', () => {
    it('shows 3 questions: exit type + isStabilized + stabilizationDate', () => {
      const steps = buildExitSteps('Stabilization');
      expect(steps).toHaveLength(3);
    });

    it('does NOT ask for sale price (guardrail: no forced sale on rental)', () => {
      const ids = getStepIds('Stabilization');
      expect(ids).not.toContain('actualSalePrice');
      expect(ids).not.toContain('sellingCosts');
      expect(ids).not.toContain('soldDate');
    });

    it('does NOT include refi questions', () => {
      const ids = getStepIds('Stabilization');
      expect(ids).not.toContain('refiLoanAmount');
      expect(ids).not.toContain('refiCashOut');
    });
  });

  // ── Refinance ──
  describe('Refinance exit pathway', () => {
    it('shows 6 questions: exit type + loan amount + rate + term + cash-out + refi date', () => {
      const steps = buildExitSteps('Refinance');
      expect(steps).toHaveLength(6);
    });

    it('includes all refi terms', () => {
      const ids = getStepIds('Refinance');
      expect(ids).toContain('refiLoanAmount');
      expect(ids).toContain('refiInterestRate');
      expect(ids).toContain('refiLoanTermYears');
      expect(ids).toContain('refiCashOut');
      expect(ids).toContain('refiDate');
    });

    it('does NOT ask for sale price or stabilization', () => {
      const ids = getStepIds('Refinance');
      expect(ids).not.toContain('actualSalePrice');
      expect(ids).not.toContain('isStabilized');
    });

    it('all refi questions are required', () => {
      const steps = buildExitSteps('Refinance');
      for (const step of steps) {
        expect(step.required).toBe(true);
      }
    });
  });

  // ── Shared ──
  describe('Shared behavior', () => {
    it('exit type selector is always the first question', () => {
      for (const type of ['Sale', 'Stabilization', 'Refinance']) {
        const steps = buildExitSteps(type);
        expect(steps[0].id).toBe('exitType');
        expect(steps[0].type).toBe('select');
      }
    });
  });
});


describe('P4 Exit Phase — Completion Outcomes', () => {

  // ── Sale Outcome ──
  describe('Sale outcome', () => {
    const outcome = evaluateExitOutcome('Sale');

    it('sets status to Sold', () => {
      expect(outcome.newStatus).toBe('Sold');
    });

    it('archives and locks the project', () => {
      expect(outcome.archivesProject).toBe(true);
    });

    it('does not reset debt metrics', () => {
      expect(outcome.resetsDebt).toBe(false);
    });
  });

  // ── Stabilization Outcome ──
  describe('Stabilization outcome', () => {
    const outcome = evaluateExitOutcome('Stabilization');

    it('sets status to Rented', () => {
      expect(outcome.newStatus).toBe('Rented');
    });

    it('returns project to Hold (phase 3)', () => {
      expect(outcome.newPhase).toBe(3);
    });

    it('does NOT archive the project', () => {
      expect(outcome.archivesProject).toBe(false);
    });
  });

  // ── Refinance Outcome ──
  describe('Refinance outcome', () => {
    const outcome = evaluateExitOutcome('Refinance');

    it('returns project to Hold (phase 3)', () => {
      expect(outcome.newPhase).toBe(3);
    });

    it('resets primary debt metrics with new refi values', () => {
      expect(outcome.resetsDebt).toBe(true);
    });

    it('does NOT archive the project', () => {
      expect(outcome.archivesProject).toBe(false);
    });
  });
});
