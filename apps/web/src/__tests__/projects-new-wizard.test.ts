import fs from 'node:fs';
import path from 'node:path';
import {
  getStrategyTemplateDefaults,
  acquisitionPipelineStatusEnum,
  deadReasonCategoryEnum,
} from "@paperworking/validation";
import {
  computeMAO,
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
} from "@paperworking/financial-engine";
import {
  assertProjectTimezoneDerivation,
  ProjectTimezoneValidationError,
} from "@paperworking/database";

describe("Create Project Wizard & Acquisition Foundation (Stage 3)", () => {
  describe("Low-Friction Rule & Strategy Defaults", () => {
    it("enforces institutional 6-8% vacancy floors across rental strategies", () => {
      const rental = getStrategyTemplateDefaults("buy_and_hold_rental");
      expect(rental.vacancyRatePct).toBe(6.0); // 6% floor
      expect(rental.operatingExpenseRatioPct).toBe(35.0);
      expect(rental.targetLtvPct).toBe(75.0);

      const brrrr = getStrategyTemplateDefaults("brrrr");
      expect(brrrr.vacancyRatePct).toBe(7.0); // 7% floor
      expect(brrrr.dispositionType).toBe("RENT");

      const commercial = getStrategyTemplateDefaults("commercial_value_add");
      expect(commercial.vacancyRatePct).toBe(8.0); // 8% floor
      expect(commercial.dispositionType).toBe("MIXED");
    });

    it("prefills realistic flip defaults with 0% vacancy and SALE disposition", () => {
      const flip = getStrategyTemplateDefaults("flip");
      expect(flip.dispositionType).toBe("SALE");
      expect(flip.vacancyRatePct).toBe(0.0);
      expect(flip.holdPeriodYears).toBe(1);
    });

    it("prefills short-term rental with hospitality operating expense ratio", () => {
      const str = getStrategyTemplateDefaults("short_term_rental_airbnb");
      expect(str.operatingExpenseRatioPct).toBe(45.0);
      expect(str.vacancyRatePct).toBe(25.0);
    });
  });

  describe("Deal Calculator to Project Promotion Handoff", () => {
    it("creates authoritative project document with immutable snapshot lineage", () => {
      const transformed = transformCalculatorToProject({
        address: "1247 Elm Street, Austin, TX 78702",
        purchasePrice: 520000,
        rehabBudget: 65000,
        estimatedARV: 680000,
        grossRentMonthly: 4500,
        targetLtvPct: 75,
        interestRatePct: 6.5,
        amortizationYears: 30,
        strategy: "buy_and_hold_rental",
        createdByUid: "user-buyer-1",
        organizationId: "org-alpha",
        assumptionsNotes: "Promoted from wizard",
      });

      expect(transformed.address).toBe("1247 Elm Street, Austin, TX 78702");
      expect(transformed.phase).toBe("acquisition");
      expect(transformed.acquisitionStatus).toBe("analyzing");
      expect(transformed.purchasePrice).toBe(520000);

      // Write-time derived IANA timezone (Texas address -> America/Chicago)
      expect(transformed.ianaTimezone).toBe("America/Chicago");
      expect(
        assertProjectTimezoneDerivation({
          address: transformed.address,
          ianaTimezone: transformed.ianaTimezone,
        }),
      ).toBe("America/Chicago");

      // Lineage snapshot
      expect(transformed.underwritingSnapshot.source).toBe("deal_calculator");
      expect(transformed.underwritingSnapshot.version).toBe(1);
      expect(transformed.underwritingSnapshot.inputs.purchasePrice).toBe(520000);

      // Downstream phase seeding
      expect(transformed.downstreamSeeding.hold.budget.allocatedTotal).toBe(65000);
      expect(transformed.downstreamSeeding.fund.loan.targetLoanAmount).toBe(390000);
    });

    it("fails validation loudly when project creation omits IANA timezone derivation", () => {
      expect(() =>
        assertProjectTimezoneDerivation({
          address: "1247 Elm Street, Austin, TX 78702",
          ianaTimezone: undefined,
        }),
      ).toThrow(ProjectTimezoneValidationError);

      expect(() =>
        assertProjectTimezoneDerivation({
          address: "1247 Elm Street, Austin, TX 78702",
          ianaTimezone: "",
        }),
      ).toThrow(
        "Project creation requires explicit IANA timezone derivation at write time; relying on column default is forbidden",
      );
    });

    it("computes MAO (70% rule) accurately", () => {
      const result = computeMAO(700000, 60000, 0.70, 10000);
      // (700,000 * 0.70) - 60,000 - 10,000 = 490,000 - 70,000 = 420,000
      expect(result.mao).toBe(420000);
      expect(result.isViable).toBe(true);
    });
  });

  describe("Pipeline Status Enums", () => {
    it("recognizes all 8 canonical states plus dead", () => {
      const states = acquisitionPipelineStatusEnum.options;
      expect(states).toEqual([
        "lead",
        "analyzing",
        "offer_sent",
        "negotiating",
        "under_contract",
        "due_diligence",
        "clear_to_close",
        "closed",
        "dead",
      ]);
    });

    it("requires one of the 6 canonical dead reasons", () => {
      const reasons = deadReasonCategoryEnum.options;
      expect(reasons).toContain("numbers_failed");
      expect(reasons).toContain("offer_rejected");
      expect(reasons).toContain("inspection");
      expect(reasons).toContain("financing");
      expect(reasons).toContain("title");
      expect(reasons).toContain("other");
    });
  });

  describe("Bug_04 Regression: Wizard Project Creation & Descriptive Validation Errors", () => {
    it("POST /api/projects/promote succeeds with 201 when estimatedARV is null (Estimated ARV: N/A)", async () => {
      process.env.TEST_AUTH_UID = "dev-user-1";
      const { POST: postPromoteProject } = await import("../../app/api/projects/promote/route.js");

      const req = new Request("http://localhost/api/projects/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "5026, Austin, TX 78702",
          projectName: "5026",
          purchasePrice: 485000,
          rehabBudget: 58200,
          estimatedARV: null,
          grossRentMonthly: 0,
          operatingExpenseRatioPct: 35,
          targetLtvPct: 75,
          interestRatePct: 6.5,
          amortizationYears: 30,
          strategy: "flip",
          beds: 3,
          baths: 2,
          sqft: 1850,
          yearBuilt: 1995,
          assumptionsNotes: "Created via 5-Step Acquisition Wizard",
        }),
      });

      const res = await postPromoteProject(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.projectId).toBeDefined();
    });

    it("POST /api/projects/promote returns specific field and validation rule details when validation fails", async () => {
      process.env.TEST_AUTH_UID = "dev-user-1";
      const { POST: postPromoteProject } = await import("../../app/api/projects/promote/route.js");
      const { extractValidationErrorMessage } = await import("../../lib/api/adapt-route-result.js");

      const req = new Request("http://localhost/api/projects/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "",
          purchasePrice: -100,
        }),
      });

      const res = await postPromoteProject(req);
      expect(res.status).toBe(400);
      const data = await res.json();

      // Must never be a generic "Validation failed" without field/rule specifics
      expect(data.error.message).not.toBe("Validation failed");
      expect(data.error.message).toContain("Property Address (address)");
      expect(data.error.message).toContain("Property address is required");
      expect(data.error.message).toContain("Purchase Price (purchasePrice)");
      expect(data.error.message).toContain("Purchase price must be greater than zero");
      expect(data.details).toBeDefined();
      expect(data.details.address).toContain("Property address is required");
      expect(data.details.purchasePrice).toContain("Purchase price must be greater than zero");

      const extracted = extractValidationErrorMessage(data);
      expect(extracted).toContain("Property Address (address): Property address is required");
      expect(extracted).toContain("Purchase Price (purchasePrice): Purchase price must be greater than zero");
    });

    it("Bug_21 Regression: newly registered user completes 5-step wizard (London Bridge Court, Aspen Hill, MD, USA, Fix & Flip, $485k purchase, $50k rehab, N/A ARV) and accesses created project", async () => {
      process.env.TEST_AUTH_UID = "usr-bug21-tester22";
      const { POST: postPromoteProject } = await import("../../app/api/projects/promote/route.js");
      const { POST: postProjectTeam } = await import("../../app/api/projects/[id]/team/route.js");
      const { POST: postProjectContingencies } = await import("../../app/api/projects/[id]/contingencies/route.js");
      const { GET: getProjectById } = await import("../../app/api/projects/[id]/route.js");

      const req = new Request("http://localhost/api/projects/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "London Bridge Court, Aspen Hill, MD, USA",
          projectName: "London Bridge Court",
          city: "Aspen Hill",
          state: "MD",
          zip: "20906",
          beds: 3,
          baths: 2,
          sqft: 1850,
          yearBuilt: 1995,
          sourceType: "off-market",
          propertyType: "single_family",
          purchasePrice: 485000,
          rehabBudget: 50000,
          estimatedARV: null,
          grossRentMonthly: 0,
          operatingExpenseRatioPct: 35,
          targetLtvPct: 70,
          interestRatePct: 9.5,
          amortizationYears: 30,
          vacancyRatePct: 0,
          buyerClosingCostsPct: 2,
          capExReservePct: 5,
          exitCapRatePct: 6.5,
          strategy: "flip",
          terminalValueMethod: "appreciation_pct",
          assumptionsNotes: "Created via 5-Step Acquisition Wizard",
          teamMembers: [
            { name: "Lead Investor (You)", role: "Sponsor / Managing Member", email: "" },
          ],
          targetContractDate: "2026-10-18",
          targetClosingDate: "2026-11-15",
          inspectionDays: 10,
          financingDays: 21,
        }),
      });

      const promoteRes = await postPromoteProject(req);
      expect(promoteRes.status).toBe(201);
      const promoteData = await promoteRes.json();
      expect(promoteData.success).toBe(true);
      const projectId = promoteData.projectId as string;
      expect(projectId).toBeDefined();

      // Verify follow-up team seeding succeeds for newly registered user
      const teamRes = await postProjectTeam(
        new Request(`http://localhost/api/projects/${projectId}/team`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Lead Investor (You)",
            role: "Sponsor / Managing Member",
            email: "",
          }),
        }),
        { params: Promise.resolve({ id: projectId }) },
      );
      expect(teamRes.status).toBe(201);

      // Verify follow-up contingency seeding succeeds for newly registered user
      const ctgRes = await postProjectContingencies(
        new Request(`http://localhost/api/projects/${projectId}/contingencies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "inspection",
            name: "General Property Inspection",
            deadlineDate: new Date(Date.now() + 10 * 86400000).toISOString(),
            daysFromEffective: 10,
          }),
        }),
        { params: Promise.resolve({ id: projectId }) },
      );
      expect(ctgRes.status).toBe(201);

      // Verify navigating to /project/[id] loads the project with 200 OK
      const getRes = await getProjectById(
        new Request(`http://localhost/api/projects/${projectId}`),
        { params: Promise.resolve({ id: projectId }) },
      );
      expect(getRes.status).toBe(200);
    });
  });
});

describe('Bug_21 — personal workspace bootstrap (org_me_)', () => {
  it('promote route provisions the personal workspace org and membership bootstrap', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/projects/promote/route.ts'),
      'utf8',
    );
    expect(src).toContain('org_me_');
    expect(src).toContain('ensurePersonalOrganization');
  });
});
