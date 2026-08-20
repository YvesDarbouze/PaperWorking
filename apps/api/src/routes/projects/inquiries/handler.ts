import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildQnaSharedLedgerEvent,
  validateInquiryPatchBody,
} from '../../../lib/projects/inquiries.js';

export type VerifyProjectInquiryAccessFn = (
  projectId: string,
  uid: string,
) => Promise<{ authorized: boolean; project: Record<string, unknown> } | null>;

export type LoadInquiryFn = (
  projectId: string,
  inquiryId: string,
) => Promise<Record<string, unknown> | null>;

export type UpdateInquiryFn = (input: {
  projectId: string;
  inquiryId: string;
  update: Record<string, unknown>;
  ledgerEvent?: Record<string, unknown>;
}) => Promise<void>;

export interface ProjectsInquiryPatchDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectInquiryAccessFn;
  loadInquiry?: LoadInquiryFn;
  updateInquiry?: UpdateInquiryFn;
}

/**
 * PATCH /api/projects/[id]/inquiries/[inquiryId]
 */
export async function handleProjectsInquiryPatch(
  projectId: string,
  inquiryId: string,
  body: { isShared?: unknown; status?: unknown },
  deps: ProjectsInquiryPatchDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const access = deps.verifyAccess
    ? await deps.verifyAccess(projectId, auth.uid)
    : { authorized: true, project: {} };

  if (!access?.authorized) {
    return jsonResponse(403, { error: 'Access denied.' });
  }

  const validated = validateInquiryPatchBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  const inquiry = deps.loadInquiry ? await deps.loadInquiry(projectId, inquiryId) : { isShared: false };
  if (!inquiry) {
    return jsonResponse(404, { error: 'Inquiry thread not found.' });
  }

  const oldShared = !!inquiry.isShared;
  let ledgerEvent: Record<string, unknown> | undefined;

  if (validated.shareToggledOn && !oldShared) {
    const messages = (inquiry.messages as Array<{ sender?: string; text?: string }>) || [];
    const firstQuestion =
      (inquiry.message as string) || messages[0]?.text || '';
    const firstAnswer =
      messages.find((m) => m.sender === 'leadInvestor')?.text || '';

    ledgerEvent = buildQnaSharedLedgerEvent({
      projectId,
      inquiryId,
      listingId: String(access.project.activeListingId || ''),
      performedBy: auth.uid,
      version: Number(access.project.version || 1),
      visibilityMode: String(access.project.visibilityMode || 'PRIVATE'),
      question: firstQuestion,
      answer: firstAnswer,
    });
  }

  if (deps.updateInquiry) {
    await deps.updateInquiry({
      projectId,
      inquiryId,
      update: validated.update,
      ledgerEvent,
    });
  }

  return jsonResponse(200, { success: true });
}
