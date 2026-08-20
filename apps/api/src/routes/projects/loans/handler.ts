import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildAllCashProjectUpdate,
  buildFinancedProjectUpdate,
  buildLoanRecordsForInstrument,
  normalizeSelectedInstruments,
  validateLoanInstruments,
} from '../../../lib/projects/loans.js';

export type VerifyProjectLoansAccessFn = (
  projectId: string,
  uid: string,
  email?: string | null,
) => Promise<{
  authorized: boolean;
  role: string;
  project: Record<string, unknown>;
} | null>;

export type ListProjectLoansFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;
export type ResetProjectFinancingFn = (
  projectId: string,
  update: Record<string, unknown>,
) => Promise<void>;
export type ReplaceProjectLoansFn = (input: {
  projectId: string;
  loans: Array<Record<string, unknown>>;
  projectUpdate: Record<string, unknown>;
}) => Promise<Array<Record<string, unknown>>>;
export type TrackFinancingRouteEventFn = (input: {
  uid: string;
  projectId: string;
  event: 'financing_route_reset' | 'financing_route_selected';
  instruments?: string[];
}) => Promise<void>;

export interface ProjectsLoansGetDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectLoansAccessFn;
  listLoans?: ListProjectLoansFn;
}

export interface ProjectsLoansPostDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectLoansAccessFn;
  resetFinancing?: ResetProjectFinancingFn;
  replaceLoans?: ReplaceProjectLoansFn;
  trackEvent?: TrackFinancingRouteEventFn;
}

/**
 * GET /api/projects/[id]/loans
 */
export async function handleProjectsLoansGet(
  projectId: string,
  deps: ProjectsLoansGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, role: 'Lead Investor', project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const loans = deps.listLoans ? await deps.listLoans(projectId) : [];
    return jsonResponse(200, { loans });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Loans GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch loans' });
  }
}

/**
 * POST /api/projects/[id]/loans
 */
export async function handleProjectsLoansPost(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectsLoansPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, role: 'Lead Investor', project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }
    if (access.role !== 'Lead Investor') {
      return jsonResponse(403, {
        error: 'Forbidden: only Lead Investors can select financing routes',
      });
    }

    const normalized = normalizeSelectedInstruments(body);
    const currentModality =
      ((access.project.fundingPlan as Record<string, unknown> | undefined)?.modality as string[]) || [];

    if (normalized.reset) {
      const update = buildAllCashProjectUpdate(currentModality);
      if (deps.resetFinancing) await deps.resetFinancing(projectId, update);
      if (deps.trackEvent) {
        await deps.trackEvent({ uid: auth.uid, projectId, event: 'financing_route_reset' }).catch(() => undefined);
      }
      return jsonResponse(200, { success: true, message: 'Financing route reset to All Cash.' });
    }

    const validated = validateLoanInstruments(normalized.instruments);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const newLoans: Array<Record<string, unknown>> = [];
    for (const instrument of validated.instruments) {
      newLoans.push(
        ...buildLoanRecordsForInstrument(projectId, instrument, () => crypto.randomUUID()),
      );
    }

    const projectUpdate = buildFinancedProjectUpdate(validated.instruments, currentModality);
    const saved = deps.replaceLoans
      ? await deps.replaceLoans({ projectId, loans: newLoans, projectUpdate })
      : newLoans;

    if (deps.trackEvent) {
      await deps.trackEvent({
        uid: auth.uid,
        projectId,
        event: 'financing_route_selected',
        instruments: validated.instruments,
      }).catch(() => undefined);
    }

    return jsonResponse(201, { success: true, loans: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Loans POST]', message);
    return jsonResponse(500, { error: 'Failed to configure financing route' });
  }
}
