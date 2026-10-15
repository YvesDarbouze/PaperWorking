import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  reconcileAcquisitionUnderwriting,
  ValuationInputRequiredError,
  type ReconciledUnderwritingMetrics,
} from '@paperworking/financial-engine';

export type GetProjectUnderwritingFn = (projectId: string) => Promise<{
  id: string;
  organizationId?: string;
  userId?: string;
  underwritingRecord?: Record<string, unknown> | null;
} | null>;

export type SaveProjectUnderwritingFn = (
  projectId: string,
  data: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export interface ProjectUnderwritingDeps {
  requireAuth?: RequireAuthFn;
  getProject?: GetProjectUnderwritingFn;
  saveUnderwriting?: SaveProjectUnderwritingFn;
}

/**
 * GET /api/projects/:id/underwriting
 */
export async function handleProjectUnderwritingGet(
  projectId: string,
  deps: ProjectUnderwritingDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

    if (!deps.getProject) return jsonResponse(500, { error: 'Project getter not configured' });
    const project = await deps.getProject(projectId);
    if (!project) return jsonResponse(404, { error: 'Project not found' });

    // AuthZ
    const userOrg = (auth as any).organizationId;
    if (project.organizationId && userOrg && project.organizationId !== userOrg) {
      return jsonResponse(403, { error: 'Forbidden' });
    }

    return jsonResponse(200, {
      projectId,
      underwriting: project.underwritingRecord ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to fetch underwriting', details: message });
  }
}

/**
 * PUT /api/projects/:id/underwriting
 * Saves underwriting assumptions, runs canonical financial engine calculations,
 * and updates itemized rehab budget lines.
 */
export async function handleProjectUnderwritingPut(
  projectId: string,
  body: unknown,
  deps: ProjectUnderwritingDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

    if (!deps.getProject) return jsonResponse(500, { error: 'Project getter not configured' });
    const project = await deps.getProject(projectId);
    if (!project) return jsonResponse(404, { error: 'Project not found' });

    // AuthZ
    const userOrg = (auth as any).organizationId;
    if (project.organizationId && userOrg && project.organizationId !== userOrg) {
      return jsonResponse(403, { error: 'Forbidden' });
    }

    if (!body || typeof body !== 'object') {
      return jsonResponse(400, { error: 'Invalid request body' });
    }

    const payload = body as Record<string, any>;
    const purchasePrice = Number(payload.purchasePrice);
    if (!purchasePrice || purchasePrice <= 0) {
      return jsonResponse(400, { error: 'Valid positive purchasePrice is required' });
    }

    const itemizedRehabLines = Array.isArray(payload.rehabBudgetLines) ? payload.rehabBudgetLines : [];
    let calculatedRehabBudget = payload.rehabBudget !== undefined ? Number(payload.rehabBudget) : 0;
    if (itemizedRehabLines.length > 0) {
      calculatedRehabBudget = itemizedRehabLines.reduce(
        (sum: number, line: any) => sum + (Number(line.totalCost) || (Number(line.laborCost) || 0) + (Number(line.materialCost) || 0)),
        0,
      );
    }

    const rawArv = payload.estimatedARV ?? payload.acquisition?.estimatedARV ?? (project as any).arv ?? null;
    let metrics: ReconciledUnderwritingMetrics | null = null;
    if (rawArv && Number(rawArv) > 0) {
      try {
        metrics = reconcileAcquisitionUnderwriting({
          purchasePrice,
          rehabBudget: calculatedRehabBudget,
          estimatedARV: Number(rawArv),
          grossRentMonthly: payload.grossRentMonthly ? Number(payload.grossRentMonthly) : undefined,
          operatingExpenseRatioPct: payload.operatingExpenseRatioPct ? Number(payload.operatingExpenseRatioPct) : undefined,
          vacancyRatePct: payload.vacancyRatePct ? Number(payload.vacancyRatePct) : undefined,
          targetLtvPct: payload.targetLtvPct ? Number(payload.targetLtvPct) : undefined,
          interestRatePct: payload.interestRatePct ? Number(payload.interestRatePct) : undefined,
          amortizationYears: payload.amortizationYears ? Number(payload.amortizationYears) : undefined,
          buyerClosingCostsPct: payload.buyerClosingCostsPct ? Number(payload.buyerClosingCostsPct) : undefined,
          terminalValueMethod: payload.terminalValueMethod ?? payload.exit?.terminalValueMethod ?? 'appreciation_pct',
          allowDefaultTerminalMethod: true,
        });
      } catch (e) {
        if (e instanceof ValuationInputRequiredError) {
          metrics = null;
        } else {
          throw e;
        }
      }
    }

    const underwritingData = {
      ...payload,
      purchasePrice,
      rehabBudget: calculatedRehabBudget,
      estimatedARV: rawArv ? Number(rawArv) : null,
      totalCostBasis: metrics?.totalCostBasis ?? (purchasePrice + calculatedRehabBudget),
      loanAmount: metrics?.loanAmount ?? 0,
      cashRequired: metrics?.cashRequired ?? 0,
      grossOperatingIncome: metrics?.grossOperatingIncome ?? 0,
      totalOperatingExpenses: metrics?.totalOperatingExpenses ?? 0,
      netOperatingIncome: metrics?.netOperatingIncome ?? 0,
      monthlyDebtService: metrics?.monthlyDebtService ?? 0,
      annualDebtService: metrics?.annualDebtService ?? 0,
      annualNetCashFlow: metrics?.annualNetCashFlow ?? 0,
      capRateOnCost: metrics?.capRateOnCost ?? 0,
      cashOnCashReturn: metrics?.cashOnCashReturnPct ?? 0,
      projectedIrr: metrics?.projectedIrrPct ?? null,
      dscr: metrics?.dscr ?? null,
      ltv: metrics?.ltvPct ?? null,
      grm: metrics?.grossRentMultiplier ?? null,
      maximumAllowableOffer: metrics?.maximumAllowableOffer70Pct ?? null,
      rehabBudgetLines: itemizedRehabLines,
      calculatedAt: metrics?.calculatedAt ?? new Date().toISOString(),
      engineVersion: metrics?.engineVersion ?? '3.0.0',
    };

    if (!deps.saveUnderwriting) {
      return jsonResponse(500, { error: 'Underwriting saver not configured' });
    }

    const saved = await deps.saveUnderwriting(projectId, underwritingData);

    return jsonResponse(200, {
      success: true,
      projectId,
      underwriting: saved,
      metrics,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to save underwriting', details: message });
  }
}
