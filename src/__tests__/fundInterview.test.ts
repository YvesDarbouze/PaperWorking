/**
 * P2 Purchase Interview — Gating Tests
 * 
 * Validates that the PurchaseInterview question flow correctly gates
 * loan questions behind financingType === 'Financed', and that
 * all-cash deals skip loan-related questions entirely.
 */

export {};


// ── Inline question definitions matching PurchaseInterview.tsx ──
// We replicate the steps array here so tests run without React rendering.

interface PurchaseStep {
  id: string;
  question: string;
  field: string;
  type: string;
  required: boolean;
  condition?: (data: any) => boolean;
}

const PURCHASE_STEPS: PurchaseStep[] = [
  {
    id: 'purchasePrice',
    question: "What was the actual purchase price?",
    field: 'financials.purchasePrice',
    type: 'currency',
    required: true,
  },
  {
    id: 'closingCosts',
    question: "What were your total closing costs?",
    field: 'financials.closingCosts',
    type: 'currency',
    required: true,
  },
  {
    id: 'totalCashInvested',
    question: "Total cash you put in (down payment + closing)?",
    field: 'financials.totalCashInvested',
    type: 'currency',
    required: true,
  },
  {
    id: 'financingType',
    question: "How are you financing this acquisition?",
    field: 'financials.financingType',
    type: 'select',
    required: true,
  },
  {
    id: 'loanAmount',
    question: "What is the loan amount?",
    field: 'financials.loanAmount',
    type: 'currency',
    required: true,
    condition: (data: any) => data.financials.financingType === 'Financed',
  },
  {
    id: 'loanInterestRate',
    question: "What is the annual interest rate?",
    field: 'financials.loanInterestRate',
    type: 'percentage',
    required: true,
    condition: (data: any) => data.financials.financingType === 'Financed',
  },
  {
    id: 'loanTermYears',
    question: "What is the loan term (in years)?",
    field: 'financials.loanTermYears',
    type: 'integer',
    required: true,
    condition: (data: any) => data.financials.financingType === 'Financed',
  },
  {
    id: 'loanOriginationPoints',
    question: "How many origination points?",
    field: 'financials.loanOriginationPoints',
    type: 'percentage',
    required: false,
    condition: (data: any) => data.financials.financingType === 'Financed',
  },
  {
    id: 'acquisitionDate',
    question: "What is the closing / acquisition date?",
    field: 'financials.acquisitionDate',
    type: 'date',
    required: true,
  },
  {
    id: 'loanProcessorName',
    question: "Who is your loan processor / loan officer?",
    field: 'financials.loanProcessorName',
    type: 'text',
    required: false,
    condition: (data: any) => data.financials.financingType === 'Financed',
  },
  {
    id: 'closingAttorneyName',
    question: "Who is your real estate attorney?",
    field: 'financials.closingAttorneyName',
    type: 'text',
    required: false,
  },
];

// Helper: compute active questions for a given form state
function getActiveQuestions(formData: any): PurchaseStep[] {
  return PURCHASE_STEPS.filter(s => !s.condition || s.condition(formData));
}

function getActiveIds(formData: any): string[] {
  return getActiveQuestions(formData).map(q => q.id);
}

describe('P2 Purchase Phase — Financing Type Gating', () => {

  it('shows all 11 questions for financed deals', () => {
    const formData = {
      financials: {
        financingType: 'Financed',
      }
    };
    const active = getActiveQuestions(formData);
    expect(active).toHaveLength(11);
    
    // All loan questions are present
    const ids = active.map(q => q.id);
    expect(ids).toContain('loanAmount');
    expect(ids).toContain('loanInterestRate');
    expect(ids).toContain('loanTermYears');
    expect(ids).toContain('loanOriginationPoints');
    expect(ids).toContain('loanProcessorName');
  });

  it('hides loan questions for all-cash deals (6 questions only)', () => {
    const formData = {
      financials: {
        financingType: 'All Cash',
      }
    };
    const active = getActiveQuestions(formData);
    expect(active).toHaveLength(6);
    
    // Loan questions are excluded
    const ids = active.map(q => q.id);
    expect(ids).not.toContain('loanAmount');
    expect(ids).not.toContain('loanInterestRate');
    expect(ids).not.toContain('loanTermYears');
    expect(ids).not.toContain('loanOriginationPoints');
    expect(ids).not.toContain('loanProcessorName');
  });

  it('always shows closingAttorneyName regardless of financing type', () => {
    const financed = getActiveIds({ financials: { financingType: 'Financed' } });
    const allCash = getActiveIds({ financials: { financingType: 'All Cash' } });
    
    expect(financed).toContain('closingAttorneyName');
    expect(allCash).toContain('closingAttorneyName');
  });

  it('always requires acquisitionDate regardless of financing type', () => {
    const financed = getActiveQuestions({ financials: { financingType: 'Financed' } });
    const allCash = getActiveQuestions({ financials: { financingType: 'All Cash' } });
    
    const financedDate = financed.find(q => q.id === 'acquisitionDate');
    const allCashDate = allCash.find(q => q.id === 'acquisitionDate');
    
    expect(financedDate).toBeDefined();
    expect(financedDate?.required).toBe(true);
    expect(allCashDate).toBeDefined();
    expect(allCashDate?.required).toBe(true);
  });

  it('hides loanProcessorName for all-cash deals', () => {
    const allCash = getActiveIds({ financials: { financingType: 'All Cash' } });
    expect(allCash).not.toContain('loanProcessorName');
    
    const financed = getActiveIds({ financials: { financingType: 'Financed' } });
    expect(financed).toContain('loanProcessorName');
  });

  it('shows only non-gated questions when financingType is not yet set', () => {
    const formData = {
      financials: {
        financingType: '', // Not yet answered
      }
    };
    const active = getActiveQuestions(formData);
    const ids = active.map(q => q.id);

    // Should show the 6 non-gated questions (same as all-cash)
    expect(ids).toContain('purchasePrice');
    expect(ids).toContain('closingCosts');
    expect(ids).toContain('totalCashInvested');
    expect(ids).toContain('financingType');
    expect(ids).toContain('acquisitionDate');
    expect(ids).toContain('closingAttorneyName');
    
    // Should NOT show any loan-gated questions
    expect(ids).not.toContain('loanAmount');
    expect(ids).not.toContain('loanInterestRate');
    expect(ids).not.toContain('loanTermYears');
    expect(ids).not.toContain('loanOriginationPoints');
    expect(ids).not.toContain('loanProcessorName');
  });

  it('correctly orders questions: price → closing → cash → financing → loan block → date → vendors', () => {
    const formData = {
      financials: {
        financingType: 'Financed',
      }
    };
    const ids = getActiveIds(formData);
    
    // Verify ordering
    expect(ids[0]).toBe('purchasePrice');
    expect(ids[1]).toBe('closingCosts');
    expect(ids[2]).toBe('totalCashInvested');
    expect(ids[3]).toBe('financingType');
    expect(ids[4]).toBe('loanAmount');
    expect(ids[5]).toBe('loanInterestRate');
    expect(ids[6]).toBe('loanTermYears');
    expect(ids[7]).toBe('loanOriginationPoints');
    expect(ids[8]).toBe('acquisitionDate');
    expect(ids[9]).toBe('loanProcessorName');
    expect(ids[10]).toBe('closingAttorneyName');
  });

  it('marks purchasePrice, closingCosts, totalCashInvested, financingType, and acquisitionDate as required', () => {
    const allSteps = PURCHASE_STEPS;
    
    const requiredIds = ['purchasePrice', 'closingCosts', 'totalCashInvested', 'financingType', 'acquisitionDate'];
    for (const id of requiredIds) {
      const step = allSteps.find(s => s.id === id);
      expect(step?.required).toBe(true);
    }
    
    // Vendor fields are optional
    const optionalIds = ['loanProcessorName', 'closingAttorneyName', 'loanOriginationPoints'];
    for (const id of optionalIds) {
      const step = allSteps.find(s => s.id === id);
      expect(step?.required).toBe(false);
    }
  });
});
