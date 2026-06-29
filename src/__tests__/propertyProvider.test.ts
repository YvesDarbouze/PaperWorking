import {
  getPropertyProvider,
  MockPropertyDataProvider,
  RentCastPropertyProvider,
  AttomPropertyProvider,
  MashvisorPropertyProvider,
  UnavailablePropertyProvider,
} from "../lib/providers/property";
import { RentCastClient } from "../lib/providers/rentcast/client";

jest.mock("../lib/providers/rentcast/cache", () => ({
  buildCacheKey: (endpoint: string, params: any) => `${endpoint}__${JSON.stringify(params)}`,
  getCached: jest.fn().mockResolvedValue(null),
  setCached: jest.fn().mockResolvedValue(undefined),
  logApiCall: jest.fn().mockResolvedValue(undefined),
}));

describe("Property Data Provider Abstraction & Skeletons", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Factory switcher (getPropertyProvider)", () => {
    it("should default to MockPropertyDataProvider when no env var or arg is set", () => {
      delete process.env.PROPERTY_DATA_PROVIDER;
      const provider = getPropertyProvider();
      expect(provider).toBeInstanceOf(MockPropertyDataProvider);
    });

    it("should return MockPropertyDataProvider when 'mock' is explicitly requested", () => {
      const provider = getPropertyProvider("mock");
      expect(provider).toBeInstanceOf(MockPropertyDataProvider);
    });

    it("should return UnavailablePropertyProvider if rentcast is selected but API key is missing", () => {
      delete process.env.RENTCAST_API_KEY;
      const provider = getPropertyProvider("rentcast");
      expect(provider).toBeInstanceOf(UnavailablePropertyProvider);
    });

    it("should return RentCastPropertyProvider if rentcast is selected and key is present", () => {
      process.env.RENTCAST_API_KEY = "test-rentcast-key";
      const provider = getPropertyProvider("rentcast");
      expect(provider).toBeInstanceOf(RentCastPropertyProvider);
    });

    it("should return UnavailablePropertyProvider if attom is selected but API key is missing", () => {
      delete process.env.ATTOM_API_KEY;
      const provider = getPropertyProvider("attom");
      expect(provider).toBeInstanceOf(UnavailablePropertyProvider);
    });

    it("should return AttomPropertyProvider if attom is selected and key is present", () => {
      process.env.ATTOM_API_KEY = "test-attom-key";
      const provider = getPropertyProvider("attom");
      expect(provider).toBeInstanceOf(AttomPropertyProvider);
    });

    it("should return UnavailablePropertyProvider if mashvisor is selected but API key is missing", () => {
      delete process.env.MASHVISOR_API_KEY;
      const provider = getPropertyProvider("mashvisor");
      expect(provider).toBeInstanceOf(UnavailablePropertyProvider);
    });

    it("should return MashvisorPropertyProvider if mashvisor is selected and key is present", () => {
      process.env.MASHVISOR_API_KEY = "test-mashvisor-key";
      const provider = getPropertyProvider("mashvisor");
      expect(provider).toBeInstanceOf(MashvisorPropertyProvider);
    });
  });

  describe("Provider Skeletons Interface Conformance", () => {
    const address = "123 Main St, Miami, FL 33101";

    it("RentCast provider resolves facts and comps using real implementation and mock fetch", async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes("/properties")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{
            propertyType: "Single Family",
            bedrooms: 3,
            bathrooms: 2,
            squareFootage: 1878,
            yearBuilt: 1973,
            lotSize: 8850,
            lastSaleDate: "2024-11-18T00:00:00.000Z",
            history: {
              "2017-10-19": { event: "Sale", date: "2017-10-19T00:00:00.000Z", price: 185000 },
              "2024-11-18": { event: "Sale", date: "2024-11-18T00:00:00.000Z" },
            },
          }]) });
        }
        if (url.includes("/avm/value")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({
            price: 245000,
            priceRangeLow: 202000,
            priceRangeHigh: 288000,
            comparables: [{
              formattedAddress: "123 Oak St, San Antonio, TX 78244",
              price: 286333,
              distance: 0.38,
              bedrooms: 3,
              bathrooms: 2,
              squareFootage: 1700,
              listedDate: "2024-10-01T00:00:00.000Z",
            }],
          }) });
        }
        if (url.includes("/avm/rent")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ rent: 1620, rentRangeLow: 1510, rentRangeHigh: 1740 }) });
        }
        return Promise.resolve({ ok: false });
      }) as any;

      const provider = new RentCastPropertyProvider(new RentCastClient("test-key"));
      const facts = await provider.getFacts(address);
      const comps = await provider.getComps(address);

      expect(facts.sourceProvider).toBe("RentCast API");
      expect(facts.beds).toBe(3);
      expect(facts.baths).toBe(2);
      expect(facts.sqft).toBe(1878);
      expect(facts.avmPriceCents).toBe(24500000);    // $245,000 AVM estimate
      expect(facts.avmPriceLowCents).toBe(20200000);
      expect(facts.avmPriceHighCents).toBe(28800000);

      expect(facts.estRentCents).toBe(162000);          // $1,620/mo rent
      expect(facts.lastSoldPriceCents).toBe(18500000);  // $185,000 from history
      expect(facts.lastSoldDate).toEqual(new Date("2017-10-19T00:00:00.000Z"));
      expect(comps.length).toBe(1);
      expect(comps[0].addressLine).toBe("123 Oak St, San Antonio, TX 78244");
      expect(comps[0].distanceMiles).toBe(0.38);

      global.fetch = originalFetch;
    });

    it("ATTOM provider resolves facts and comps with custom source name", async () => {
      const provider = new AttomPropertyProvider("test-key");
      const facts = await provider.getFacts(address);
      const comps = await provider.getComps(address);

      expect(facts.sourceProvider).toBe("ATTOM Property API (Skeleton)");
      expect(facts.beds).toBeDefined();
      expect(comps.length).toBeGreaterThan(0);
      expect(comps[0].addressLine).toContain("(ATTOM Comp)");
    });

    it("Mashvisor provider resolves facts and comps with custom source name", async () => {
      const provider = new MashvisorPropertyProvider("test-key");
      const facts = await provider.getFacts(address);
      const comps = await provider.getComps(address);

      expect(facts.sourceProvider).toBe("Mashvisor API (Skeleton)");
      expect(facts.beds).toBeDefined();
      expect(comps.length).toBeGreaterThan(0);
      expect(comps[0].addressLine).toContain("(Mashvisor Comp)");
    });
  });
});
