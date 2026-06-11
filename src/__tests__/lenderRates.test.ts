import {
  getLenderRateProvider,
  FirestoreRateAdapter,
  HardcodedFallbackAdapter,
  ZillowRatesAdapter,
  DEFAULT_RATES,
} from '../lib/providers/lenderRates';

describe('Lender Rates Provider Abstraction & Adapters', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Factory: getLenderRateProvider', () => {
    it('returns FirestoreRateAdapter by default', () => {
      const provider = getLenderRateProvider();
      expect(provider).toBeInstanceOf(FirestoreRateAdapter);
    });

    it('returns HardcodedFallbackAdapter when type is "hardcoded"', () => {
      const provider = getLenderRateProvider('hardcoded');
      expect(provider).toBeInstanceOf(HardcodedFallbackAdapter);
    });

    it('returns ZillowRatesAdapter when type is "zillow"', () => {
      const provider = getLenderRateProvider('zillow');
      expect(provider).toBeInstanceOf(ZillowRatesAdapter);
    });

    it('falls back to environment variable default if type is omitted', () => {
      process.env.LENDER_RATE_PROVIDER = 'zillow';
      const provider = getLenderRateProvider();
      expect(provider).toBeInstanceOf(ZillowRatesAdapter);
    });
  });

  describe('HardcodedFallbackAdapter', () => {
    it('returns DEFAULT_RATES', async () => {
      const provider = new HardcodedFallbackAdapter();
      const rates = await provider.getRates();
      expect(rates).toEqual(DEFAULT_RATES);
    });
  });

  describe('ZillowRatesAdapter', () => {
    it('is marked as not enabled', () => {
      const provider = new ZillowRatesAdapter('mock-zillow-key');
      expect(provider.isEnabled).toBe(false);
    });

    it('throws a partner api not enabled error on getRates()', async () => {
      const provider = new ZillowRatesAdapter('mock-zillow-key');
      await expect(provider.getRates()).rejects.toThrow(
        /Zillow Get Current Rates API integration is not yet enabled/
      );
    });
  });

  describe('FirestoreRateAdapter', () => {
    it('falls back to DEFAULT_RATES when db is missing or collection throws', async () => {
      const provider = new FirestoreRateAdapter(null);
      const rates = await provider.getRates();
      expect(rates).toEqual(DEFAULT_RATES);
    });

    it('successfully queries mock firestore if db is provided', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          rates: [
            {
              id: 'MOCK_LENDER',
              name: 'Mock Lender Partner',
              interestRate: 5.5,
              points: 0.5,
              lenderFeesCents: 99900,
              asOf: { toDate: () => new Date('2026-06-01') },
            },
          ],
        }),
      });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      const mockDb = { collection: mockCollection };

      const provider = new FirestoreRateAdapter(mockDb);
      const rates = await provider.getRates();

      expect(mockCollection).toHaveBeenCalledWith('systemConfig');
      expect(mockDoc).toHaveBeenCalledWith('lenderRates');
      expect(rates).toHaveLength(1);
      expect(rates[0]).toEqual({
        id: 'MOCK_LENDER',
        name: 'Mock Lender Partner',
        interestRate: 5.5,
        points: 0.5,
        lenderFeesCents: 99900,
        asOf: new Date('2026-06-01'),
      });
    });
  });
});
