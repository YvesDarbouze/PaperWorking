export const DRIVE_SUB_FOLDERS = ['Closing Docs', 'Receipts', 'Permits'] as const;

export function validateDriveProvisionBody(body: {
  idToken?: unknown;
  projectId?: unknown;
  propertyAddress?: unknown;
}): { ok: true; projectId: string; propertyAddress: string } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const propertyAddress = typeof body.propertyAddress === 'string' ? body.propertyAddress.trim() : '';
  if (!body.idToken || !projectId || !propertyAddress) {
    return {
      ok: false,
      error: 'Missing required fields: idToken, projectId, propertyAddress',
      status: 400,
    };
  }
  return { ok: true, projectId, propertyAddress };
}

export function buildDriveFoldersPayload(input: {
  parentFolder: { id: string; webViewLink: string };
  subFolders: Record<string, { id: string; webViewLink: string }>;
}): Record<string, unknown> {
  return {
    parentFolderId: input.parentFolder.id,
    parentFolderUrl: input.parentFolder.webViewLink,
    subFolders: {
      closingDocs: { id: input.subFolders['Closing Docs'].id, url: input.subFolders['Closing Docs'].webViewLink },
      receipts: { id: input.subFolders['Receipts'].id, url: input.subFolders['Receipts'].webViewLink },
      permits: { id: input.subFolders['Permits'].id, url: input.subFolders['Permits'].webViewLink },
    },
  };
}
