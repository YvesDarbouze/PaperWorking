import { jest } from "@jest/globals";
import { handleProjectsPromotePost } from "../routes/projects/promote/handler.js";
import { handleProjectsCreatePost } from "../routes/projects/create/handler.js";
import { handleProjectAcquisitionStatusPatch } from "../routes/projects/acquisition-status/handler.js";
import { deriveIanaTimezoneFromAddress } from "@paperworking/financial-engine";
import {
  assertProjectTimezoneDerivation,
  ProjectTimezoneValidationError,
} from "@paperworking/database";
import type { RouteResult } from "../http/response.js";

function resultBody(result: RouteResult): any {
  return typeof result.body === "string" ? JSON.parse(result.body) : result.body;
}

const mockAuth = {
  uid: "user-investor-1",
  email: "investor@paperworking.com",
};

describe("Acquisition API Handlers", () => {
  describe("POST /api/projects/promote (Deal Calculator Handoff)", () => {
    it("rejects unauthenticated requests", async () => {
      const result = await handleProjectsPromotePost(
        { address: "123 Main St", purchasePrice: 450000 },
        {
          requireAuth: async () => ({
            ok: false,
            status: 401,
            body: { error: "Unauthorized" },
          }),
        }
      );
      expect(result.status).toBe(401);
    });

    it("rejects vendor accounts from promoting deals", async () => {
      const result = await handleProjectsPromotePost(
        { address: "123 Main St", purchasePrice: 450000 },
        {
          requireAuth: async () => mockAuth,
          getUser: async () => ({ account_type: "vendor", role: "vendor" }),
        }
      );
      expect(result.status).toBe(403);
    });

    it("validates required address and purchasePrice with descriptive field-level messages", async () => {
      const result = await handleProjectsPromotePost(
        { purchasePrice: 450000 },
        {
          requireAuth: async () => mockAuth,
          getUser: async () => ({ organizationId: "org-1" }),
        }
      );
      expect(result.status).toBe(400);
      const body = resultBody(result);
      expect(body.error).toBe("Validation failed");
      expect(body.message).toContain("Property Address (address)");
      expect(body.message).toContain("Property address is required");
      expect(body.details?.address).toContain("Property address is required");
    });

    it("Bug_04 Regression: succeeds with 201 when optional fields like estimatedARV are null (5-step wizard default)", async () => {
      const result = await handleProjectsPromotePost(
        {
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
        },
        {
          requireAuth: async () => mockAuth,
          getUser: async () => ({ organizationId: "org-alpha" }),
          countOrgProjects: async () => 1,
          createProject: async ({ projectData }) => ({
            projectId: "proj-null-arv-201",
            project: projectData,
          }),
        }
      );

      expect(result.status).toBe(201);
      const body = resultBody(result);
      expect(body.success).toBe(true);
      expect(body.projectId).toBe("proj-null-arv-201");
    });

    it("atomically promotes deal with immutable snapshot lineage and downstream seeding", async () => {
      let createdPayload: any = null;

      const result = await handleProjectsPromotePost(
        {
          address: "1247 Elm Street, Austin, TX 78702",
          purchasePrice: 520000,
          rehabBudget: 65000,
          estimatedARV: 680000,
          grossRentMonthly: 4500,
          targetLtvPct: 75,
          interestRatePct: 6.5,
          amortizationYears: 30,
          strategy: "buy_and_hold_rental",
          assumptionsNotes: "Promoted from Deal Calculator demo",
        },
        {
          requireAuth: async () => mockAuth,
          getUser: async () => ({ organizationId: "org-alpha" }),
          countOrgProjects: async () => 2,
          createProject: async ({ projectData }) => {
            createdPayload = projectData;
            return {
              projectId: "proj-promoted-123",
              project: projectData,
            };
          },
        }
      );

      expect(result.status).toBe(201);
      const body = resultBody(result);
      expect(body.success).toBe(true);
      expect(body.projectId).toBe("proj-promoted-123");

      // Verify Timezone Derivation at write time (Texas address -> America/Chicago)
      expect(createdPayload.ianaTimezone).toBe("America/Chicago");

      // Verify Snapshot-with-Lineage
      expect(createdPayload).not.toBeNull();
      expect(createdPayload.underwritingSnapshot).toBeDefined();
      expect(createdPayload.underwritingSnapshot.source).toBe("deal_calculator");
      expect(createdPayload.underwritingSnapshot.inputs.purchasePrice).toBe(520000);
      expect(createdPayload.underwritingSnapshot.outputs.maximumAllowableOffer70Pct).toBe(400600);

      // Verify Downstream Seeding
      expect(createdPayload.downstreamSeeding.hold.budget.allocatedTotal).toBe(65000);
      expect(createdPayload.downstreamSeeding.fund.loan.targetLoanAmount).toBe(390000);
    });
  });

  describe("PATCH /api/projects/:id/acquisition-status", () => {
    it("rejects transition to invalid target state", async () => {
      const result = await handleProjectAcquisitionStatusPatch(
        "proj-123",
        { targetStatus: "closed" },
        {
          requireAuth: async () => mockAuth,
          getProject: async () => ({ id: "proj-123", acquisitionStatus: "lead" }),
        }
      );
      expect(result.status).toBe(422);
      expect(resultBody(result).code).toBe("INVALID_TRANSITION");
    });

    it("requires dead reason category and notes when transitioning to dead", async () => {
      const result = await handleProjectAcquisitionStatusPatch(
        "proj-123",
        { targetStatus: "dead" },
        {
          requireAuth: async () => mockAuth,
          getProject: async () => ({ id: "proj-123", acquisitionStatus: "analyzing" }),
        }
      );
      expect(result.status).toBe(422);
      expect(resultBody(result).code).toBe("DEAD_REASON_REQUIRED");
    });

    it("generates 11 tasks when transitioning to under_contract", async () => {
      let updatedData: any = null;

      const result = await handleProjectAcquisitionStatusPatch(
        "proj-123",
        {
          targetStatus: "under_contract",
          psaDocumentUrl: "https://docs.paperworking.com/psa.pdf",
          psaExecutionDate: "2026-09-10T12:00:00Z",
          closingDate: "2026-10-10T12:00:00Z",
          emdAmount: 5000,
        },
        {
          requireAuth: async () => mockAuth,
          getProject: async () => ({ id: "proj-123", acquisitionStatus: "offer_sent" }),
          updateProject: async (id, updates) => {
            updatedData = updates;
            return { id, ...updates };
          },
        }
      );

      expect(result.status).toBe(200);
      const body = resultBody(result);
      expect(body.currentStatus).toBe("under_contract");
      expect(body.autoGeneratedTasks).toHaveLength(11);
      expect(updatedData.tasks).toHaveLength(11);
      expect(updatedData.statusHistory).toHaveLength(1);
    });

    it("records deadRecord when transitioning to dead with valid reason", async () => {
      let updatedData: any = null;

      const result = await handleProjectAcquisitionStatusPatch(
        "proj-123",
        {
          targetStatus: "dead",
          deadReason: "numbers_failed",
          deadReasonNotes: "Seller rejected counteroffer; cap rate fell below 5%",
        },
        {
          requireAuth: async () => mockAuth,
          getProject: async () => ({ id: "proj-123", acquisitionStatus: "negotiating" }),
          updateProject: async (id, updates) => {
            updatedData = updates;
            return { id, ...updates };
          },
        }
      );

      expect(result.status).toBe(200);
      const body = resultBody(result);
      expect(body.currentStatus).toBe("dead");
      expect(updatedData.isArchived).toBe(true);
      expect(updatedData.deadRecord.deadReasonCategory).toBe("numbers_failed");
      expect(updatedData.deadRecord.previousStatus).toBe("negotiating");
    });
  });

  describe("POST /api/projects/create (Write-Time IANA Timezone Derivation)", () => {
    it("creates a project with a Texas address and derives America/Chicago at write time", async () => {
      let createdPayload: any = null;

      const result = await handleProjectsCreatePost(
        {
          propertyName: "Austin Value-Add",
          property_address: "1247 Elm Street, Austin, TX 78702",
          strategy: "buy_and_hold_rental",
          purchasePrice: 450000,
          organizationId: "org-alpha",
        },
        {
          requireAuth: async () => ({ uid: "user-alpha-member", organizationId: "org-alpha" }),
          getUser: async () => ({ organizationId: "org-alpha", account_type: "investor" }),
          countOrgProjects: async () => 1,
          createProject: async ({ payload }) => {
            const derivedTz = deriveIanaTimezoneFromAddress(payload.property_address);
            const ianaTimezone = assertProjectTimezoneDerivation({
              address: payload.property_address,
              ianaTimezone: derivedTz,
            });
            createdPayload = {
              ...payload,
              ianaTimezone,
            };
            return {
              projectId: "proj-tx-test-1",
              project: createdPayload,
            };
          },
        }
      );

      expect(result.status).toBe(201);
      const body = resultBody(result);
      expect(body.success).toBe(true);
      expect(createdPayload.ianaTimezone).toBe("America/Chicago");
    });

    it("fails validation loudly when project creation omits IANA timezone derivation", () => {
      expect(() =>
        assertProjectTimezoneDerivation({
          address: "1247 Elm Street, Austin, TX 78702",
          ianaTimezone: undefined,
        })
      ).toThrow(ProjectTimezoneValidationError);

      expect(() =>
        assertProjectTimezoneDerivation({
          address: "1247 Elm Street, Austin, TX 78702",
          ianaTimezone: "",
        })
      ).toThrow(
        "Project creation requires explicit IANA timezone derivation at write time; relying on column default is forbidden"
      );
    });

    it("fails validation loudly when project address is empty or whitespace", () => {
      expect(() =>
        assertProjectTimezoneDerivation({
          address: "",
          ianaTimezone: "America/Chicago",
        })
      ).toThrow(ProjectTimezoneValidationError);

      expect(() =>
        assertProjectTimezoneDerivation({
          address: "   ",
          ianaTimezone: "America/Chicago",
        })
      ).toThrow("Property address is required to create a project and derive contractual IANA timezone");
    });

    it("Bug_27 Regression: normalizes camelCase/snake_case aliases and currency-formatted strings across projectCreateSchema and projectPromoteSchema", async () => {
      let createdPayload: any = null;
      const createRes = await handleProjectsCreatePost(
        {
          projectName: "London Bridge Court",
          address: "London Bridge Court, Aspen Hill, MD, USA",
          strategy: "Fix_and_Flip",
          purchasePrice: "$485,000",
          rehabBudget: "$50,000",
          organizationId: "org-alpha",
        },
        {
          requireAuth: async () => ({ uid: "user-alpha-member", organizationId: "org-alpha" }),
          getUser: async () => ({ organizationId: "org-alpha", account_type: "investor" }),
          countOrgProjects: async () => 1,
          createProject: async ({ payload }) => {
            createdPayload = payload;
            return {
              projectId: "proj-bug27-create",
              project: payload as unknown as Record<string, unknown>,
            };
          },
        }
      );

      expect(createRes.status).toBe(201);
      expect(createdPayload.property_address).toBe("London Bridge Court, Aspen Hill, MD, USA");
      expect(createdPayload.propertyName).toBe("London Bridge Court");
      expect(createdPayload.purchase_price).toBe(485000);
      expect(createdPayload.rehab_budget).toBe(50000);
      expect(createdPayload.strategy).toBe("flip");

      const promoteRes = await handleProjectsPromotePost(
        {
          property_address: "London Bridge Court, Aspen Hill, MD, USA",
          propertyName: "London Bridge Court",
          purchase_price: "$485,000",
          rehab_budget: "$50,000",
          estimatedARV: "",
          strategy: "flip",
        },
        {
          requireAuth: async () => mockAuth,
          getUser: async () => ({ organizationId: "org-alpha" }),
          countOrgProjects: async () => 1,
          createProject: async ({ projectData }) => ({
            projectId: "proj-bug27-promote",
            project: projectData,
          }),
        }
      );

      expect(promoteRes.status).toBe(201);
      const promoteBody = resultBody(promoteRes);
      expect(promoteBody.success).toBe(true);
      expect(promoteBody.projectId).toBe("proj-bug27-promote");
    });
  });
});

