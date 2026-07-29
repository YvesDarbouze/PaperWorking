import { classifyTransaction } from '../classifier';

describe('classifyTransaction', () => {
  const testTransactions = [
    { name: 'RENT PAYMENT - TENANT LLC', expected: 'rental_income', confidence: 0.9 },
    { name: 'MORTGAGE PAYMENT - WELLS FARGO', expected: 'debt_service', confidence: 0.95 },
    { name: 'HOA FEE - OAKWOOD ASSOC', expected: 'hoa_fees', confidence: 0.9 },
    { name: 'STATE FARM INSURANCE', expected: 'insurance', confidence: 0.85 },
    { name: 'CHECK #1234', expected: 'unknown', confidence: 0.0 },
    { name: 'REPAIR - ABC PLUMBING', expected: 'maintenance', confidence: 0.8 },
    { name: 'ELECTRIC BILL - CON EDISON', expected: 'utilities', confidence: 0.85 },
    { name: 'PROPERTY MANAGEMENT FEE', expected: 'property_management', confidence: 0.9 },
    { name: 'ESCROW PAYMENT - TITLE CO', expected: 'closing_costs', confidence: 0.85 },
    { name: 'STAGING FURNITURE RENTAL', expected: 'rehab_staging', confidence: 0.8 },
  ];

  testTransactions.forEach(({ name, expected, confidence }) => {
    it(`should classify "${name}" as "${expected}" with ${confidence} confidence`, () => {
      const result = classifyTransaction(name);
      expect(result.reiCategory).toBe(expected);
      expect(result.confidence).toBe(confidence);
    });
  });
});
