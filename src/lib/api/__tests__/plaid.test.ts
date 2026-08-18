import { classifyPlaidTransaction } from '../plaid';
import { CANONICAL_EXPENSE_TAGS, REJECTED_EXPENSE_TAGS } from '@/lib/metrics/types';

describe('Agent 8: Plaid Transaction Classification Unit Tests (Canonical 8 Alignment)', () => {
  test('1. classifies rental income correctly', () => {
    const res = classifyPlaidTransaction({
      transaction_id: 'tx_1',
      amount: -3500, // credit
      name: 'Tenant Rent Transfer John Doe',
      category: ['Transfer', 'Deposit'],
      date: '2026-06-01',
    });
    expect(res.classifiedCategory).toBe('rental_income');
    expect(res.type).toBe('revenue');
    expect(res.amount).toBe(3500);
  });

  test('2. leaves mortgage payment uncategorized (debt service handled by amortization engine)', () => {
    const res = classifyPlaidTransaction({
      transaction_id: 'tx_2',
      amount: 1850,
      name: 'Chase Mortgage Loan AutoPay',
      category: ['Payment', 'Mortgage'],
      date: '2026-06-05',
    });
    expect(res.classifiedCategory).toBe('uncategorized');
    expect(res.type).toBe('expense');
  });

  test('3. classifies Home Depot repair as maintenance (canonical tag, NOT "repair")', () => {
    const res = classifyPlaidTransaction({
      transaction_id: 'tx_3',
      amount: 420,
      name: 'Home Depot Store #0521',
      category: ['Shops', 'Hardware'],
      date: '2026-06-10',
    });
    expect(res.classifiedCategory).toBe('maintenance');
    expect(res.classifiedCategory).not.toBe('repair');
    expect(res.type).toBe('expense');
  });

  test('4. classifies property tax payment as tax (canonical tag, NOT "property_tax")', () => {
    const res = classifyPlaidTransaction({
      transaction_id: 'tx_4',
      amount: 1200,
      name: 'County Treasurer Property Tax',
      category: ['Government', 'Tax'],
      date: '2026-06-15',
    });
    expect(res.classifiedCategory).toBe('tax');
    expect(res.classifiedCategory).not.toBe('property_tax');
    expect(res.type).toBe('expense');
  });

  test('5. classifies property manager invoice as management (canonical tag, NOT "management_fee")', () => {
    const res = classifyPlaidTransaction({
      transaction_id: 'tx_5',
      amount: 240,
      name: 'Property Manager Services Fee',
      category: ['Business', 'Services'],
      date: '2026-06-20',
    });
    expect(res.classifiedCategory).toBe('management');
    expect(res.classifiedCategory).not.toBe('management_fee');
  });

  test('6. NEVER returns any DEPRECATED / REJECTED expense tag', () => {
    const testTxs = [
      { name: 'Mortgage AutoPay', category: ['Mortgage'] },
      { name: 'City Property Tax', category: ['Tax'] },
      { name: 'Plumbing Repair', category: ['Services'] },
      { name: 'Electric Utility', category: ['Utilities'] },
      { name: 'Contractor Payment', category: ['Services'] },
      { name: 'Facebook Marketing Ad', category: ['Advertising'] },
      { name: 'PM Management Fee', category: ['Management'] },
    ];

    testTxs.forEach((tx, i) => {
      const res = classifyPlaidTransaction({
        transaction_id: `tx_test_${i}`,
        amount: 100,
        name: tx.name,
        category: tx.category,
        date: '2026-06-01',
      });
      REJECTED_EXPENSE_TAGS.forEach(rejectedTag => {
        expect(res.classifiedCategory).not.toBe(rejectedTag);
      });
    });
  });
});
