export const ALLOWED_LOGO_FORMATS = ['png', 'jpg', 'jpeg', 'svg'] as const;
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

export function validateWorkspaceLogoUpload(body: {
  logoBase64?: unknown;
  format?: unknown;
  sizeBytes?: unknown;
}): { ok: true } | { ok: false; error: string } {
  if (!body.logoBase64 || typeof body.logoBase64 !== 'string') {
    return { ok: false, error: 'Missing logo data' };
  }

  if (typeof body.sizeBytes === 'number' && body.sizeBytes > MAX_LOGO_SIZE_BYTES) {
    return { ok: false, error: 'Logo size exceeds 2MB limit' };
  }

  if (
    body.format &&
    typeof body.format === 'string' &&
    !ALLOWED_LOGO_FORMATS.includes(body.format.toLowerCase() as (typeof ALLOWED_LOGO_FORMATS)[number])
  ) {
    return {
      ok: false,
      error: 'Invalid file format. Only PNG, JPG, and SVG are supported.',
    };
  }

  return { ok: true };
}

export function validateWorkspaceDeleteConfirmation(
  confirmName: unknown,
  orgName: string,
): { ok: true } | { ok: false; error: string } {
  if (!confirmName || typeof confirmName !== 'string' || confirmName !== orgName) {
    return { ok: false, error: 'Workspace name confirmation does not match.' };
  }
  return { ok: true };
}

export function buildWorkspaceUpdatePatch(body: {
  name?: unknown;
  timezone?: unknown;
  logo?: unknown;
}): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.timezone !== undefined) update.timezone = body.timezone;
  if (body.logo !== undefined) update.logo = body.logo;
  return update;
}

export type WorkspaceAction = 'logo' | 'delete' | 'cancel-deletion';

export function parseWorkspaceAction(action: string | undefined): WorkspaceAction | null {
  if (action === 'logo' || action === 'delete' || action === 'cancel-deletion') {
    return action;
  }
  return null;
}

export function computeDeletionScheduleDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
}
