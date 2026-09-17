import { jest } from "@jest/globals";
import {
  RentCastPropertyAdapter,
  RequiresCredentialsError,
} from "../rentcast-adapter.js";

describe("RentCastPropertyAdapter", () => {
  describe("Honest Credentials Boundary (Rule 5)", () => {
    it("reports isConfigured: false when API key is omitted", () => {
      const adapter = new RentCastPropertyAdapter({ apiKey: undefined });
      expect(adapter.isConfigured).toBe(false);
      expect(adapter.providerId).toBe("rentcast");
    });

    it("throws RequiresCredentialsError on unconfigured fetchPropertyFacts", async () => {
      const adapter = new RentCastPropertyAdapter({ apiKey: "" });
      await expect(adapter.fetchPropertyFacts("1247 Elm St, Austin, TX")).rejects.toThrow(
        RequiresCredentialsError
      );
    });

    it("throws RequiresCredentialsError on unconfigured fetchRentalComps", async () => {
      const adapter = new RentCastPropertyAdapter({ apiKey: "" });
      await expect(adapter.fetchRentalComps("1247 Elm St, Austin, TX")).rejects.toThrow(
        RequiresCredentialsError
      );
    });

    it("throws RequiresCredentialsError on unconfigured fetchValuationComps", async () => {
      const adapter = new RentCastPropertyAdapter({ apiKey: "" });
      await expect(adapter.fetchValuationComps("1247 Elm St, Austin, TX")).rejects.toThrow(
        RequiresCredentialsError
      );
    });
  });

  describe("Configured Adapter Requests", () => {
    it("reports isConfigured: true when API key is provided", () => {
      const adapter = new RentCastPropertyAdapter({ apiKey: "test_live_key_123" });
      expect(adapter.isConfigured).toBe(true);
    });

    it("fetches and maps property facts accurately", async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            formattedAddress: "1247 Elm St, Austin, TX 78702",
            city: "Austin",
            state: "TX",
            zipCode: "78702",
            bedrooms: 3,
            bathrooms: 2,
            squareFootage: 1850,
            yearBuilt: 1984,
            lotSize: 6500,
            propertyType: "Single Family",
            lastSalePrice: 525000,
            taxAssessment: { value: 480000 },
          },
        ],
      });

      const adapter = new RentCastPropertyAdapter({
        apiKey: "test_key",
        fetchFn: mockFetcher as any,
      });

      const facts = await adapter.fetchPropertyFacts("1247 Elm St, Austin, TX 78702");
      expect(facts).not.toBeNull();
      expect(facts?.beds).toBe(3);
      expect(facts?.baths).toBe(2);
      expect(facts?.squareFeet).toBe(1850);
      expect(facts?.yearBuilt).toBe(1984);
      expect(facts?.propertyType).toBe("single_family");
      expect(facts?.taxAssessment).toBe(480000);
      expect(facts?.dataProvider).toBe("rentcast");
    });

    it("returns null when property is not found (404)", async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const adapter = new RentCastPropertyAdapter({
        apiKey: "test_key",
        fetchFn: mockFetcher as any,
      });

      const facts = await adapter.fetchPropertyFacts("99999 Nonexistent St, Nowhere, TX");
      expect(facts).toBeNull();
    });

    it("fetches rental comps successfully", async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rent: 3200,
          rentRangeLow: 2900,
          rentRangeHigh: 3500,
          comparables: [{ id: "comp-1", rent: 3150 }],
        }),
      });

      const adapter = new RentCastPropertyAdapter({
        apiKey: "test_key",
        fetchFn: mockFetcher as any,
      });

      const result = await adapter.fetchRentalComps("1247 Elm St, Austin, TX 78702");
      expect(result.estimatedRent).toBe(3200);
      expect(result.comps).toHaveLength(1);
    });

    it("fetches valuation comps successfully", async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          price: 540000,
          priceRangeLow: 510000,
          priceRangeHigh: 570000,
          comparables: [{ id: "comp-2", price: 535000 }],
        }),
      });

      const adapter = new RentCastPropertyAdapter({
        apiKey: "test_key",
        fetchFn: mockFetcher as any,
      });

      const result = await adapter.fetchValuationComps("1247 Elm St, Austin, TX 78702");
      expect(result.estimatedValue).toBe(540000);
      expect(result.comps).toHaveLength(1);
    });

    it("fetches unified property data and normalizes comparable sales", async () => {
      const mockFetcher = jest.fn((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("/properties")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [
              {
                formattedAddress: "1247 Elm St, Austin, TX 78702",
                city: "Austin",
                state: "TX",
                zipCode: "78702",
                bedrooms: 3,
                bathrooms: 2,
                squareFootage: 1850,
                yearBuilt: 1984,
                lastSalePrice: 525000,
                taxAssessment: { value: 480000 },
              },
            ],
          });
        }
        if (urlStr.includes("/avm/rent")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              rent: 3200,
              rentRangeLow: 2900,
              rentRangeHigh: 3500,
              comparables: [],
            }),
          });
        }
        if (urlStr.includes("/avm/value")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              price: 540000,
              priceRangeLow: 510000,
              priceRangeHigh: 570000,
              comparables: [
                {
                  formattedAddress: "1250 Elm St, Austin, TX 78702",
                  price: 535000,
                  squareFootage: 1800,
                  distance: 0.12,
                  lastSaleDate: "2026-03-15",
                },
                {
                  formattedAddress: "1205 Willow St, Austin, TX 78702",
                  price: 550000,
                  squareFootage: 1920,
                  distance: 0.35,
                  lastSaleDate: "2026-02-28",
                },
              ],
            }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const adapter = new RentCastPropertyAdapter({
        apiKey: "test_key",
        fetchFn: mockFetcher as any,
      });

      const unified = await adapter.fetchUnifiedPropertyData("1247 Elm St, Austin, TX 78702");
      expect(unified.configured).toBe(true);
      expect(unified.provider).toBe("rentcast");
      expect(unified.facts?.beds).toBe(3);
      expect(unified.facts?.baths).toBe(2);
      expect(unified.facts?.squareFeet).toBe(1850);
      expect(unified.estimatedRent).toBe(3200);
      expect(unified.estimatedValue).toBe(540000);
      expect(unified.comps).toHaveLength(2);
      expect(unified.comps[0].address).toBe("1250 Elm St, Austin, TX 78702");
      expect(unified.comps[0].sale_price).toBe(535000);
      expect(unified.comps[0].sqft).toBe(1800);
      expect(unified.comps[0].distance).toBe(0.12);
      expect(unified.comps[0].sale_date).toBe("2026-03-15");
    });
  });
});
