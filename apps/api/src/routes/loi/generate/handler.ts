import { binaryResponse, jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildLoiDocumentRecord,
  loiPdfFilename,
  validateLoiGenerateBody,
} from '../../../lib/loi/generate.js';

export type LoadProjectForLoiFn = (
  projectId: string,
) => Promise<{ propertyName?: string; addressLine?: string } | null>;

export type LoadBuyerProfileFn = (
  uid: string,
) => Promise<{ displayName?: string; name?: string; email?: string }>;

export type GenerateLoiPdfFn = (input: {
  buyerName: string;
  buyerEmail: string;
  buyerEntity: string;
  propertyName: string;
  offerAmount: number;
  earnestMoney: number;
  closingDate?: string;
  contingencies: string[];
}) => Promise<Uint8Array>;

export type SaveLoiDocumentFn = (
  projectId: string,
  docId: string,
  record: Record<string, unknown>,
) => Promise<void>;

export interface LoiGeneratePostDeps {
  requireAuth?: RequireAuthFn;
  loadProject?: LoadProjectForLoiFn;
  loadBuyerProfile?: LoadBuyerProfileFn;
  generatePdf?: GenerateLoiPdfFn;
  saveDocument?: SaveLoiDocumentFn;
}

/**
 * POST /api/loi/generate
 */
export async function handleLoiGeneratePost(
  body: {
    projectId?: unknown;
    offerAmount?: unknown;
    earnestMoney?: unknown;
    closingDate?: unknown;
    contingencies?: unknown;
    buyerEntity?: unknown;
  },
  deps: LoiGeneratePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateLoiGenerateBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { success: false, error: validated.error });
  }

  try {
    const project = deps.loadProject
      ? await deps.loadProject(validated.projectId)
      : { propertyName: 'Sample Property' };

    if (!project) {
      return jsonResponse(404, { success: false, error: 'Project not found' });
    }

    const profile = deps.loadBuyerProfile
      ? await deps.loadBuyerProfile(auth.uid)
      : { displayName: 'Investor', email: auth.email ?? 'investor@paperworking.com' };

    const buyerName = profile.displayName || profile.name || auth.email || 'Investor';
    const buyerEmail = auth.email || profile.email || 'investor@paperworking.com';
    const buyerEntity = typeof body.buyerEntity === 'string' ? body.buyerEntity : '';
    const offerAmount = typeof body.offerAmount === 'number' ? body.offerAmount : 250000;
    const earnestMoney = typeof body.earnestMoney === 'number' ? body.earnestMoney : 2500;
    const closingDate = typeof body.closingDate === 'string' ? body.closingDate : undefined;
    const contingencies = Array.isArray(body.contingencies)
      ? body.contingencies.filter((c): c is string => typeof c === 'string')
      : [];

    const pdfBuffer = deps.generatePdf
      ? await deps.generatePdf({
          buyerName,
          buyerEmail,
          buyerEntity,
          propertyName: project.propertyName || project.addressLine || 'Unnamed Property',
          offerAmount,
          earnestMoney,
          closingDate,
          contingencies,
        })
      : new Uint8Array([0x25, 0x50, 0x44, 0x46]); // minimal PDF header stub

    const docId = `loi_${Math.random().toString(36).substring(2, 11)}`;
    const record = buildLoiDocumentRecord({
      docId,
      projectId: validated.projectId,
      uploadedByUid: auth.uid,
      uploadedByName: buyerName,
    });

    if (deps.saveDocument) {
      await deps.saveDocument(validated.projectId, docId, record);
    }

    return binaryResponse(200, pdfBuffer, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${loiPdfFilename(validated.projectId)}"`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[LOI Generation API] Error:', message);
    return jsonResponse(500, { success: false, error: message || 'Internal Server Error' });
  }
}
