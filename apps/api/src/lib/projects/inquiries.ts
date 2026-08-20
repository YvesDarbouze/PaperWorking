export function validateInquiryPatchBody(body: {
  isShared?: unknown;
  status?: unknown;
}): { ok: true; update: Record<string, unknown>; shareToggledOn: boolean } | { ok: false; error: string; status: number } {
  const update: Record<string, unknown> = {};
  if (typeof body.isShared === 'boolean') update.isShared = body.isShared;
  if (body.status === 'open' || body.status === 'answered') update.status = body.status;

  if (Object.keys(update).length === 0) {
    return { ok: false, error: 'No updates provided.', status: 400 };
  }

  return {
    ok: true,
    update,
    shareToggledOn: body.isShared === true,
  };
}

export function buildQnaSharedLedgerEvent(input: {
  projectId: string;
  inquiryId: string;
  listingId: string;
  performedBy: string;
  version: number;
  visibilityMode: string;
  question: string;
  answer: string;
}): Record<string, unknown> {
  return {
    projectId: input.projectId,
    listingId: input.listingId,
    eventType: 'QNA_SHARED',
    performedBy: input.performedBy,
    timestamp: new Date().toISOString(),
    version: input.version,
    visibilityMode: input.visibilityMode,
    metadata: {
      inquiryId: input.inquiryId,
      question: input.question,
      answer: input.answer,
    },
  };
}
