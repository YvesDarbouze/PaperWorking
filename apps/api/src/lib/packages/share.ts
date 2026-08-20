export type PackageType = 'Lender' | 'Investor';

export interface PackageShareToken {
  token: string;
  projectId: string;
  packageType: PackageType;
  creatorUid: string;
  creatorEmail: string;
  creatorRole: string;
  createdAt: string;
  expiresAt: string;
  canDownload: boolean;
  revoked: boolean;
  accessLog: Array<{
    timestamp: string;
    viewerIdentity?: string;
    action: 'view' | 'download';
    slotKey?: string;
  }>;
}

export function canCreateShareLink(role: string): boolean {
  const r = (role || '').trim();
  return ['Lead Investor', 'Investor', 'Admin', 'Platform Admin', 'CEO', 'CFO'].includes(r);
}

export function generatePackageToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'pkg_';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function createShareTokenRecord(input: {
  projectId: string;
  packageType: PackageType;
  creatorUid: string;
  creatorEmail: string;
  creatorRole: string;
  expiryDays?: number;
  canDownload?: boolean;
}): PackageShareToken {
  if (!canCreateShareLink(input.creatorRole)) {
    throw new Error(
      `Access denied: Role '${input.creatorRole}' is not authorized to create package share links.`,
    );
  }

  const days = Math.min(30, Math.max(1, input.expiryDays ?? 30));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  return {
    token: generatePackageToken(),
    projectId: input.projectId,
    packageType: input.packageType,
    creatorUid: input.creatorUid,
    creatorEmail: input.creatorEmail,
    creatorRole: input.creatorRole,
    createdAt: now.toISOString(),
    expiresAt,
    canDownload: input.canDownload ?? true,
    revoked: false,
    accessLog: [],
  };
}

export function validatePackageTokenAccess(tokenRecord: PackageShareToken): {
  valid: boolean;
  reason?: string;
} {
  if (tokenRecord.revoked) {
    return { valid: false, reason: 'Share link has been revoked by the creator' };
  }
  if (Date.now() > new Date(tokenRecord.expiresAt).getTime()) {
    return { valid: false, reason: 'Share link has expired' };
  }
  return { valid: true };
}

export function validatePackageShareCreateBody(body: {
  projectId?: unknown;
  packageType?: unknown;
  expiryDays?: unknown;
  canDownload?: unknown;
}): { ok: true; projectId: string; packageType: PackageType; expiryDays: number; canDownload: boolean } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!projectId) {
    return { ok: false, error: 'projectId is required', status: 400 };
  }

  const packageType = body.packageType === 'Investor' ? 'Investor' : 'Lender';
  const expiryDays = typeof body.expiryDays === 'number' ? body.expiryDays : 30;
  const canDownload = body.canDownload !== false;

  return { ok: true, projectId, packageType, expiryDays, canDownload };
}

export function buildPackageAccessLogEntry(viewerIdentity: string): {
  timestamp: string;
  viewerIdentity: string;
  action: 'view';
} {
  return {
    timestamp: new Date().toISOString(),
    viewerIdentity,
    action: 'view',
  };
}

export function assemblePackageByType(
  packageType: PackageType,
  project: Record<string, unknown>,
  projectFiles: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const propertyName = project.propertyName || project.name || 'Unnamed Property';
  return {
    projectId: project.id,
    propertyName,
    packageType,
    totalSlots: packageType === 'Lender' ? 8 : 6,
    fulfilledSlotsCount: projectFiles.length > 0 ? 1 : 0,
    completenessPct: projectFiles.length > 0 ? 12 : 0,
    slots: [],
    isComplete: false,
  };
}
