import { jsonResponse, type RouteResult } from "../../../http/response.js";
import type { RequireAuthFn } from "../../../lib/auth/auth-types.js";
import { isAuthFailure } from "../../../lib/auth/auth-types.js";
import {
  projectPromoteSchema,
  calculateStorageQuotaBytes,
  isVendorAccount,
  formatValidationFieldErrors,
  type ProjectPromoteInput,
} from "../../../lib/projects/create-schema.js";
import { transformCalculatorToProject } from "@paperworking/financial-engine";

export type GetUserForPromoteFn = (uid: string) => Promise<{
  organizationId?: string;
  personalOrganizationId?: string;
  account_type?: string;
  accountType?: string;
  role?: string;
  displayName?: string;
  email?: string;
} | null>;

export type CountOrgProjectsFn = (organizationId: string) => Promise<number>;

export type CreatePromotedProjectFn = (input: {
  uid: string;
  projectData: Record<string, unknown>;
  organizationId: string;
  storageQuotaBytes: number;
}) => Promise<{ projectId: string; project: Record<string, unknown> }>;

export interface ProjectsPromotePostDeps {
  requireAuth?: RequireAuthFn;
  getUser?: GetUserForPromoteFn;
  countOrgProjects?: CountOrgProjectsFn;
  createProject?: CreatePromotedProjectFn;
}

/**
 * POST /api/projects/promote
 * Atomically promotes a Deal Calculator scenario to an authoritative Project in the Acquisition phase.
 * Persists the immutable underwritingSnapshot lineage and seeds downstream phases.
 */
export async function handleProjectsPromotePost(
  body: unknown,
  deps: ProjectsPromotePostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: "Auth not configured" });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const validation = projectPromoteSchema.safeParse(body);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return jsonResponse(400, {
        error: "Validation failed",
        message: formatValidationFieldErrors(fieldErrors),
        details: fieldErrors,
      });
    }

    const payload = validation.data;
    const userData = deps.getUser ? await deps.getUser(auth.uid) : null;

    if (isVendorAccount(userData)) {
      return jsonResponse(403, { error: "Vendors are restricted from creating projects." });
    }

    let organizationId = payload.organizationId;
    if (!organizationId) {
      organizationId =
        userData?.organizationId || userData?.personalOrganizationId || auth.uid;
    }

    let existingProjectCount = 0;
    if (deps.countOrgProjects && organizationId) {
      try {
        existingProjectCount = await deps.countOrgProjects(organizationId);
      } catch {
        existingProjectCount = 0;
      }
    }

    const storageQuotaBytes = calculateStorageQuotaBytes(existingProjectCount);

    // Transform calculator inputs using canonical financial engine math
    const transformed = transformCalculatorToProject({
      address: payload.address,
      projectName: payload.projectName,
      purchasePrice: payload.purchasePrice,
      rehabBudget: payload.rehabBudget,
      estimatedARV: payload.estimatedARV,
      grossRentMonthly: payload.grossRentMonthly,
      operatingExpenseRatioPct: payload.operatingExpenseRatioPct,
      targetLtvPct: payload.targetLtvPct,
      interestRatePct: payload.interestRatePct,
      amortizationYears: payload.amortizationYears,
      strategy: payload.strategy,
      createdByUid: auth.uid,
      organizationId,
      assumptionsNotes: payload.assumptionsNotes,
      buyerClosingCostsPct: payload.buyerClosingCostsPct,
      beds: payload.beds,
      baths: payload.baths,
      sqft: payload.sqft,
      yearBuilt: payload.yearBuilt,
      taxAssessment: payload.taxAssessment,
    });

    if (!deps.createProject) {
      return jsonResponse(500, { error: "Project creator not configured" });
    }

    const { projectId, project } = await deps.createProject({
      uid: auth.uid,
      projectData: transformed as unknown as Record<string, unknown>,
      organizationId,
      storageQuotaBytes,
    });

    return jsonResponse(201, {
      success: true,
      projectId,
      project_id: projectId,
      storageQuotaBytes,
      project,
      underwritingSnapshot: transformed.underwritingSnapshot,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Projects Promote API Error]:", message);
    return jsonResponse(500, { error: "Failed to promote deal to project", details: message });
  }
}
