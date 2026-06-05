import {
  getPropertyProvider,
  MockPropertyDataProvider,
  RentCastPropertyProvider,
  AttomPropertyProvider,
  MashvisorPropertyProvider,
} from "../lib/providers/property";

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

    it("should fallback to MockPropertyDataProvider and log a warning if RentCast is selected but API key is missing", () => {
      delete process.env.RENTCAST_API_KEY;
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const provider = getPropertyProvider("rentcast");

      expect(provider).toBeInstanceOf(MockPropertyDataProvider);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[PROPERTY PROVIDER] RENTCAST_API_KEY is missing")
      );
      warnSpy.mockRestore();
    });

    it("should return RentCastPropertyProvider if rentcast is selected and key is present", () => {
      process.env.RENTCAST_API_KEY = "test-rentcast-key";
      const provider = getPropertyProvider("rentcast");
      expect(provider).toBeInstanceOf(RentCastPropertyProvider);
    });

    it("should fallback to MockPropertyDataProvider and log a warning if ATTOM is selected but API key is missing", () => {
      delete process.env.ATTOM_API_KEY;
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const provider = getPropertyProvider("attom");

      expect(provider).toBeInstanceOf(MockPropertyDataProvider);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[PROPERTY PROVIDER] ATTOM_API_KEY is missing")
      );
      warnSpy.mockRestore();
    });

    it("should return AttomPropertyProvider if attom is selected and key is present", () => {
      process.env.ATTOM_API_KEY = "test-attom-key";
      const provider = getPropertyProvider("attom");
      expect(provider).toBeInstanceOf(AttomPropertyProvider);
    });

    it("should fallback to MockPropertyDataProvider and log a warning if Mashvisor is selected but API key is missing", () => {
      delete process.env.MASHVISOR_API_KEY;
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const provider = getPropertyProvider("mashvisor");

      expect(provider).toBeInstanceOf(MockPropertyDataProvider);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[PROPERTY PROVIDER] MASHVISOR_API_KEY is missing")
      );
      warnSpy.mockRestore();
    });

    it("should return MashvisorPropertyProvider if mashvisor is selected and key is present", () => {
      process.env.MASHVISOR_API_KEY = "test-mashvisor-key";
      const provider = getPropertyProvider("mashvisor");
      expect(provider).toBeInstanceOf(MashvisorPropertyProvider);
    });
  });

  describe("Provider Skeletons Interface Conformance", () => {
    const address = "123 Main St, Miami, FL 33101";

    it("RentCast provider resolves facts and comps with custom source name", async () => {
      const provider = new RentCastPropertyProvider("test-key");
      const facts = await provider.getFacts(address);
      const comps = await provider.getComps(address);

      expect(facts.sourceProvider).toBe("RentCast AVM (Skeleton)");
      expect(facts.beds).toBeDefined();
      expect(comps.length).toBeGreaterThan(0);
      expect(comps[0].addressLine).toContain("(RentCast Comp)");
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
