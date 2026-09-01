import { bffFetch } from '@/lib/api/bff-fetch';

export type ProjectApiRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  purchasePrice?: number | null;
  status?: string | null;
  currentPhase?: number;
  organizationId?: string | null;
  userId?: string | null;
  investorId?: string | null;
  [key: string]: unknown;
};

export type CreateProjectPayload = {
  name?: string;
  propertyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  purchasePrice?: number;
  organizationId?: string;
};

export type PatchProjectPayload = Record<string, unknown>;

type JsonRecord = Record<string, unknown>;

async function parseProjectMutationResponse<T extends JsonRecord>(res: Response): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  if (!res.ok) {
    const err =
      data && typeof data === 'object' && 'error' in data
        ? String((data as JsonRecord).error)
        : res.statusText || `HTTP ${res.status}`;
    if (res.status === 401) throw new Error('Unauthorized — sign in again.');
    if (res.status === 403) throw new Error(err || 'Forbidden — insufficient permissions.');
    throw new Error(err);
  }

  return data as T;
}

/** POST /api/projects via same-origin BFF (Phase B8). */
export async function createProjectFromBff(
  payload: CreateProjectPayload,
): Promise<ProjectApiRecord> {
  const res = await bffFetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseProjectMutationResponse<{ success: true; project: ProjectApiRecord }>(res);
  return data.project;
}

/** PATCH /api/projects/:id via same-origin BFF (Phase B8). */
export async function patchProjectFromBff(
  projectId: string,
  payload: PatchProjectPayload,
): Promise<ProjectApiRecord> {
  const res = await bffFetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseProjectMutationResponse<{ success: true; project: ProjectApiRecord }>(res);
  return data.project;
}
