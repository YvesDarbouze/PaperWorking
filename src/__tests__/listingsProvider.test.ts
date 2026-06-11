import {
  getListingsProvider,
  MockListingsDataProvider,
  RentCastListingsDataProvider,
} from '../lib/providers/listings';

describe('Listings Provider Abstraction & Adapters', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Factory: getListingsProvider', () => {
    it('returns MockListingsDataProvider when type is "mock"', () => {
      const provider = getListingsProvider('mock');
      expect(provider).toBeInstanceOf(MockListingsDataProvider);
    });

    it('returns RentCastListingsDataProvider when type is "rentcast" and API key is present', () => {
      process.env.RENTCAST_API_KEY = 'test-api-key';
      const provider = getListingsProvider('rentcast');
      expect(provider).toBeInstanceOf(RentCastListingsDataProvider);
    });

    it('falls back to MockListingsDataProvider when type is "rentcast" but API key is missing', () => {
      delete process.env.RENTCAST_API_KEY;
      const provider = getListingsProvider('rentcast');
      expect(provider).toBeInstanceOf(MockListingsDataProvider);
    });

    it('falls back to environment variable default if type is omitted', () => {
      process.env.PROPERTY_DATA_PROVIDER = 'rentcast';
      process.env.RENTCAST_API_KEY = 'test-api-key';
      const provider = getListingsProvider();
      expect(provider).toBeInstanceOf(RentCastListingsDataProvider);
    });
  });

  describe('MockListingsDataProvider', () => {
    const mockProvider = new MockListingsDataProvider();

    it('returns a list of mock sale listings with correct fields', async () => {
      const listings = await mockProvider.getSaleListings({ zipCode: '90210' });
      expect(listings.length).toBeGreaterThan(0);
      expect(listings[0]).toEqual(
        expect.objectContaining({
          id: expect.stringContaining('mock-sale-90210'),
          formattedAddress: expect.any(String),
          addressLine1: expect.any(String),
          city: expect.any(String),
          state: expect.any(String),
          zipCode: '90210',
          price: expect.any(Number),
          listingType: 'SALE',
          bedrooms: expect.any(Number),
          bathrooms: expect.any(Number),
          squareFootage: expect.any(Number),
        })
      );
    });

    it('returns a list of mock rental listings with correct fields', async () => {
      const listings = await mockProvider.getRentalListings({ zipCode: '33101' });
      expect(listings.length).toBeGreaterThan(0);
      expect(listings[0]).toEqual(
        expect.objectContaining({
          id: expect.stringContaining('mock-rental-33101'),
          formattedAddress: expect.any(String),
          addressLine1: expect.any(String),
          city: expect.any(String),
          state: expect.any(String),
          zipCode: '33101',
          price: expect.any(Number),
          listingType: 'RENTAL',
          bedrooms: expect.any(Number),
          bathrooms: expect.any(Number),
          squareFootage: expect.any(Number),
        })
      );
    });
  });
});
