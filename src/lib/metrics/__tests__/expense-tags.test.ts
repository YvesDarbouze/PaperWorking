import { CANONICAL_EXPENSE_TAGS, validateExpenseTag, REJECTED_EXPENSE_TAGS } from '../types';
import { calculateManagementFee } from '../deriveAllProjectMetrics';

describe('Audit Suite 5: Canonical 8 Expense Tags & Management Fee', () => {
  test('Canonical 8 tags return the validated tag string', () => {
    const validTags = ['tax', 'insurance', 'security', 'maintenance', 'utilities', 'management', 'HOA', 'capex'];
    validTags.forEach(tag => {
      expect(validateExpenseTag(tag)).toBe(tag);
    });
  });

  test('All 7 DEPRECATED expense tags are explicitly REJECTED with clear guidance', () => {
    const expectedRejected = [
      'mortgage_payment',
      'property_tax',
      'repair',
      'utility',
      'contractor_payment',
      'marketing',
      'management_fee',
    ];

    expectedRejected.forEach(deprecatedTag => {
      expect(REJECTED_EXPENSE_TAGS).toContain(deprecatedTag);
      expect(() => validateExpenseTag(deprecatedTag)).toThrow(
        `REJECTED expense tag: "${deprecatedTag}". This tag is not in the canonical 8.`
      );
    });
  });

  test('Unknown arbitrary tags throw invalid tag error', () => {
    const unknownTags = ['arbitrary_label', 'other_expense', 'landscaping'];
    unknownTags.forEach(unknownTag => {
      expect(() => validateExpenseTag(unknownTag)).toThrow(
        `Invalid expense tag: "${unknownTag}". Must be one of: tax, insurance, security, maintenance, utilities, management, HOA, capex`
      );
    });
  });

  test('Management fee uses gross_scheduled_rent, not effective_rent (BUG-8 Rule)', () => {
    const project = {
      gross_scheduled_rent: 24000,
      vacancy_rate: 0.10, // Effective rent = $21,600
      management_fee_pct: 0.10,
    };

    const fee = calculateManagementFee(project);
    expect(fee).toBe(2400); // 10% of $24,000, NOT 10% of $21,600 ($2,160)
  });
});
