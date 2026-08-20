export function validateVendorPortalQuoteBody(body: {
  requestId?: unknown;
  projectId?: unknown;
  quotedFee?: unknown;
  message?: unknown;
  status?: unknown;
}): {
  ok: true;
  requestId: string;
  projectId: string;
  targetStatus: 'QUOTED' | 'DECLINED';
  quotedFee?: number;
  message?: string;
} | { ok: false; error: string; status: number } {
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const targetStatus = body.status === 'DECLINED' ? 'DECLINED' : 'QUOTED';
  if (!requestId || !projectId) {
    return { ok: false, error: 'Missing required fields', status: 400 };
  }
  if (targetStatus === 'QUOTED' && (typeof body.quotedFee !== 'number' && typeof body.quotedFee !== 'string')) {
    return { ok: false, error: 'quotedFee is required when submitting a quote', status: 400 };
  }
  return {
    ok: true,
    requestId,
    projectId,
    targetStatus,
    quotedFee: body.quotedFee != null ? Number(body.quotedFee) : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
  };
}

export function validateVendorRequestBody(body: {
  idToken?: unknown;
  projectId?: unknown;
  vendorUid?: unknown;
  message?: unknown;
}): { ok: true; projectId: string; vendorUid: string; message: string } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const vendorUid = typeof body.vendorUid === 'string' ? body.vendorUid.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!body.idToken || !projectId || !vendorUid || !message) {
    return {
      ok: false,
      error: 'Missing required fields: idToken, projectId, vendorUid, message',
      status: 400,
    };
  }
  return { ok: true, projectId, vendorUid, message };
}

export function enrichVendorPortalRequests(
  requests: Array<Record<string, unknown>>,
  projectsMap: Record<string, Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return requests
    .map((req) => {
      const project = projectsMap[String(req.projectId)] || {};
      return {
        ...req,
        dealName: project.propertyName || 'Unknown Project',
        location: project.address || 'Unknown Location',
        dealPhase: project.status || 'Sourcing',
        investor: project.leadEmail || 'Lead Investor',
        actionItems: project.actionItems || [],
      } as Record<string, unknown>;
    })
    .sort(
      (a, b) =>
        new Date(String(b.requestedAt)).getTime() - new Date(String(a.requestedAt)).getTime(),
    );
}
