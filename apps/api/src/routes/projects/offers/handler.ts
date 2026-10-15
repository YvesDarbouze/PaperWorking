import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export interface ProjectOffersDeps {
  requireAuth?: RequireAuthFn;
  getProject?: (projectId: string) => Promise<{ id: string; organizationId?: string; offers?: any[] } | null>;
  createOffer?: (projectId: string, offerData: any) => Promise<any>;
}

export async function handleProjectOffersGet(
  projectId: string,
  deps: ProjectOffersDeps = {},
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
      offers: project.offers ?? [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to fetch offers', details: message });
  }
}

export async function handleProjectOffersPost(
  projectId: string,
  body: unknown,
  deps: ProjectOffersDeps = {},
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
    if (!payload.offerPrice || Number(payload.offerPrice) <= 0) {
      return jsonResponse(400, { error: 'Valid positive offerPrice is required' });
    }

    const existingOffers = project.offers ?? [];
    const nextVersion = existingOffers.length + 1;

    const newOffer = {
      ...payload,
      version: payload.version ?? nextVersion,
      offerPrice: Number(payload.offerPrice),
      earnestMoneyAmount: Number(payload.earnestMoneyAmount || 5000),
      closingDays: Number(payload.closingDays || 30),
      inspectionDays: Number(payload.inspectionDays || 10),
      financingDays: Number(payload.financingDays || 21),
      appraisalDays: Number(payload.appraisalDays || 14),
      titleDays: Number(payload.titleDays || 15),
      status: payload.status ?? 'pending',
      offeringParty: payload.offeringParty ?? 'buyer',
      submittedAt: new Date().toISOString(),
    };

    if (!deps.createOffer) {
      return jsonResponse(500, { error: 'Offer creator not configured' });
    }

    const created = await deps.createOffer(projectId, newOffer);

    return jsonResponse(201, {
      success: true,
      projectId,
      offer: created,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to create offer', details: message });
  }
}
