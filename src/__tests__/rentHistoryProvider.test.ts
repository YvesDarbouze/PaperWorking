import {
  getRentHistoryProvider,
  MockRentHistoryAdapter,
  RentCastRentHistoryAdapter,
} from "../lib/providers/rentHistory";

describe("Rent History Provider Abstraction & Adapters", () => {
  const originalEnv = process.env;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Factory switcher (getRentHistoryProvider)", () => {
    it("should default to MockRentHistoryAdapter when no env var or arg is set", () => {
      delete process.env.RENTHISTORY_PROVIDER;
      const provider = getRentHistoryProvider();
      expect(provider).toBeInstanceOf(MockRentHistoryAdapter);
    });

    it("should return MockRentHistoryAdapter when 'mock' is explicitly requested", () => {
      const provider = getRentHistoryProvider("mock");
      expect(provider).toBeInstanceOf(MockRentHistoryAdapter);
    });

    it("should fallback to MockRentHistoryAdapter and log a warning if RentCast is selected but API key is missing", () => {
      delete process.env.RENTCAST_API_KEY;
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const provider = getRentHistoryProvider("rentcast");

      expect(provider).toBeInstanceOf(MockRentHistoryAdapter);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[RENT HISTORY PROVIDER] RENTCAST_API_KEY is missing")
      );
      warnSpy.mockRestore();
    });

    it("should return RentCastRentHistoryAdapter if rentcast is selected and key is present", () => {
      process.env.RENTCAST_API_KEY = "test-rentcast-key";
      const provider = getRentHistoryProvider("rentcast");
      expect(provider).toBeInstanceOf(RentCastRentHistoryAdapter);
    });
  });

  describe("MockRentHistoryAdapter", () => {
    it("should return deterministic historical and active listings based on address hash", async () => {
      const adapter = new MockRentHistoryAdapter();
      const address = "123 Test Ave, Miami, FL 33139";
      
      const listings = await adapter.getRentalHistory(address);
      
      expect(listings).toHaveLength(2);
      
      const inactive = listings.find(l => l.status === "Inactive");
      const active = listings.find(l => l.status === "Active");
      
      expect(inactive).toBeDefined();
      expect(active).toBeDefined();
      expect(inactive?.price).toBeLessThan(active?.price || 0);
      expect(inactive?.removedDate).not.toBeNull();
      expect(active?.removedDate).toBeNull();
      
      // Verify determinism
      const listingsSecondTime = await adapter.getRentalHistory(address);
      expect(listingsSecondTime[0].price).toEqual(listings[0].price);
      expect(listingsSecondTime[1].price).toEqual(listings[1].price);
    });
  });

  describe("RentCastRentHistoryAdapter", () => {
    it("should map fetch response array correctly", async () => {
      const mockListingsData = [
        {
          id: "listing-123",
          formattedAddress: "456 Mockingbird Ln, Dallas, TX 75201",
          price: 2500,
          status: "Active",
          listedDate: "2026-01-01T00:00:00.000Z",
          removedDate: null,
          daysOnMarket: 10
        },
        {
          id: "listing-456",
          formattedAddress: "456 Mockingbird Ln, Dallas, TX 75201",
          price: 2400,
          status: "Inactive",
          listedDate: "2025-01-01T00:00:00.000Z",
          removedDate: "2025-12-31T00:00:00.000Z",
          daysOnMarket: 364
        }
      ];

      const mockResponse = {
        ok: true,
        json: async () => mockListingsData
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const adapter = new RentCastRentHistoryAdapter("fake-api-key");
      const listings = await adapter.getRentalHistory("456 Mockingbird Ln, Dallas, TX 75201");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("456%20Mockingbird%20Ln%2C%20Dallas%2C%20TX%2075201"),
        expect.objectContaining({
          headers: {
            "X-Api-Key": "fake-api-key",
            "Accept": "application/json"
          }
        })
      );

      expect(listings).toHaveLength(2);
      expect(listings[0].id).toBe("listing-123");
      expect(listings[0].price).toBe(2500);
      expect(listings[0].status).toBe("Active");
      expect(listings[0].removedDate).toBeNull();

      expect(listings[1].id).toBe("listing-456");
      expect(listings[1].price).toBe(2400);
      expect(listings[1].status).toBe("Inactive");
      expect(listings[1].removedDate).toBe("2025-12-31T00:00:00.000Z");
    });

    it("should throw an error when API response is not ok", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: async () => "Unauthorized"
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const adapter = new RentCastRentHistoryAdapter("invalid-key");
      await expect(
        adapter.getRentalHistory("Any Address")
      ).rejects.toThrow("RentCast API responded with status 401");
    });

    it("should return empty array if response is not an array", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ error: "some invalid response" })
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const adapter = new RentCastRentHistoryAdapter("fake-key");
      const listings = await adapter.getRentalHistory("Any Address");
      expect(listings).toEqual([]);
    });
  });
});
