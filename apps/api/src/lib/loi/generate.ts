export function validateLoiGenerateBody(
  body: { projectId?: unknown },
): { ok: true; projectId: string } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!projectId) {
    return { ok: false, error: 'projectId is required', status: 400 };
  }
  return { ok: true, projectId };
}

export function buildLoiDocumentRecord(input: {
  docId: string;
  projectId: string;
  uploadedByUid: string;
  uploadedByName: string;
}): Record<string, unknown> {
  const nowStr = new Date().toISOString();
  return {
    id: input.docId,
    projectId: input.projectId,
    category: 'Purchase Agreement',
    fileName: 'Letter_of_Intent.pdf',
    fileUrl: `/api/loi/download?id=${input.docId}`,
    uploadedByUid: input.uploadedByUid,
    uploadedByName: input.uploadedByName,
    uploadedAt: nowStr,
    eSignStatus: 'Not Required',
    notes: 'Generated Letter of Intent (LOI)',
  };
}

export function loiPdfFilename(projectId: string): string {
  return `loi_${projectId}.pdf`;
}
