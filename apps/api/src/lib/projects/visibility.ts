export interface VisibilityPatchBody {
  isPublic?: unknown;
}

export function validateVisibilityPatch(
  body: VisibilityPatchBody,
): { ok: true; isPublic: boolean } | { ok: false; error: string } {
  if (typeof body.isPublic !== 'boolean') {
    return { ok: false, error: 'isPublic must be a boolean.' };
  }

  return { ok: true, isPublic: body.isPublic };
}
