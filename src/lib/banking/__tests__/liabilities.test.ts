import { getBankingProvider } from '../index';
import type { MortgageLiability } from '../index';

describe('MockBankingProvider.getLiabilities()', () => {
  it('returns an array of MortgageLiability records', async () => {
    // Force mock provider for this test
    const originalEnv = process.env.BANKING_PROVIDER;
    process.env.BANKING_PROVIDER = 'mock';

    const provider = getBankingProvider();
    expect(provider.getLiabilities).toBeDefined();

    const liabilities = await provider.getLiabilities!('mock_access_token');
    expect(Array.isArray(liabilities)).toBe(true);
    expect(liabilities.length).toBeGreaterThan(0);

    process.env.BANKING_PROVIDER = originalEnv;
  });

  it('returns MortgageLiability records with required shape', async () => {
    process.env.BANKING_PROVIDER = 'mock';

    const provider = getBankingProvider();
    const liabilities = await provider.getLiabilities!('mock_access_token');

    for (const liability of liabilities) {
      // accountId is always required
      expect(typeof liability.accountId).toBe('string');
      expect(liability.accountId.length).toBeGreaterThan(0);

      // balance must be a number (in cents)
      expect(typeof liability.balance).toBe('number');
      expect(liability.balance).toBeGreaterThan(0);

      // optional fields should be null or correct type
      if (liability.lender !== null) {
        expect(typeof liability.lender).toBe('string');
      }
      if (liability.interestRatePct !== null) {
        expect(typeof liability.interestRatePct).toBe('number');
        expect(liability.interestRatePct).toBeGreaterThan(0);
      }
      if (liability.nextPaymentDueDate !== null) {
        expect(typeof liability.nextPaymentDueDate).toBe('string');
        // ISO date format
        expect(new Date(liability.nextPaymentDueDate).toString()).not.toBe('Invalid Date');
      }
    }
  });

  it('returns realistic mock values for sandbox testing', async () => {
    process.env.BANKING_PROVIDER = 'mock';

    const provider = getBankingProvider();
    const [mortgage] = await provider.getLiabilities!('mock_token');

    // Sanity-check: balance should be in cents range (e.g. > $1,000)
    expect(mortgage.balance).toBeGreaterThan(100_000); // > $1,000 in cents
    // Typical mortgage rate between 1% and 20%
    if (mortgage.interestRatePct !== null) {
      expect(mortgage.interestRatePct).toBeGreaterThan(0);
      expect(mortgage.interestRatePct).toBeLessThan(20);
    }
  });
});

describe('MortgageLiability type contract', () => {
  it('satisfies the required interface shape', () => {
    const validLiability: MortgageLiability = {
      accountId: 'acc_123',
      lender: 'Test Bank',
      balance: 285_000_00,
      originalBalance: 320_000_00,
      interestRatePct: 6.75,
      apr: 6.92,
      nextPaymentDueDate: '2026-08-01',
      nextPaymentAmount: 2_076_00,
      ytdInterestPaid: 14_890_00,
      escrowBalance: 3_200_00,
      lastPaymentAmount: 2_076_00,
      lastPaymentDate: '2026-07-01',
    };

    // All required fields present
    expect(validLiability.accountId).toBeDefined();
    expect(validLiability.balance).toBeDefined();
  });

  it('allows null optional fields', () => {
    const minimalLiability: MortgageLiability = {
      accountId: 'acc_456',
      lender: null,
      balance: 150_000_00,
      originalBalance: null,
      interestRatePct: null,
      apr: null,
      nextPaymentDueDate: null,
      nextPaymentAmount: null,
      ytdInterestPaid: null,
      escrowBalance: null,
      lastPaymentAmount: null,
      lastPaymentDate: null,
    };

    expect(minimalLiability.lender).toBeNull();
    expect(minimalLiability.interestRatePct).toBeNull();
  });
});
