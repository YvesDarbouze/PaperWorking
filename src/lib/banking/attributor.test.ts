import { attributeTransaction } from './attributor';

// Mock projects matching user spec
const mockProjects = [
  {
    id: 'proj_rent',
    address: '123 Main St',
    financials: { monthlyGrossRent: 250000 }, // $2,500 in cents
    acquisitionDate: new Date('2025-06-01'),
    dispositionType: 'RENT',
    phase: 'hold',
    loans: [],
  },
  {
    id: 'proj_mortgage',
    address: '456 Oak Ave',
    loans: [
      {
        lenderName: 'Wells Fargo',
        amountCents: 18000000,
        interestRatePercent: 6.5,
        termMonths: 360,
      },
    ],
    phase: 'hold',
  },
];

describe('Transaction Attribution Engine', () => {
  it('attributes rent payment to the correct project (Strategy 1)', async () => {
    const tx = {
      plaidId: 'tx_rent_1',
      name: 'RENT PAYMENT',
      amount: 250000,
      date: new Date('2026-01-01'),
      reiCategory: 'rental_income',
    };

    const result = await attributeTransaction(tx, 'user_123', mockProjects);
    expect(result.projectId).toBe('proj_rent');
    expect(result.matchType).toBe('rent_match');
    expect(result.confidence).toBe(0.9);
  });

  it('attributes mortgage payment to the correct project (Strategy 2)', async () => {
    const tx = {
      plaidId: 'tx_mortgage_1',
      name: 'MORTGAGE - WELLS FARGO',
      amount: -180000,
      date: new Date('2026-01-01'),
      reiCategory: 'debt_service',
    };

    const result = await attributeTransaction(tx, 'user_123', mockProjects);
    expect(result.projectId).toBe('proj_mortgage');
    expect(result.matchType).toBe('mortgage_match');
    expect(result.confidence).toBe(0.85);
  });

  it('sends unmatched transaction to manual review', async () => {
    const tx = {
      plaidId: 'tx_unknown_1',
      name: 'RANDOM CHECK',
      amount: -50000,
      date: new Date('2026-01-01'),
      reiCategory: 'unknown',
    };

    const result = await attributeTransaction(tx, 'user_123', mockProjects);
    expect(result.projectId).toBeNull();
    expect(result.matchType).toBe('manual_review');
    expect(result.confidence).toBe(0);
  });
});
