export function validateReilAssignmentBody(body: {
  fieldKey?: unknown;
  assignedToId?: unknown;
}): { ok: true; fieldKey: string; assignedToId: string } | { ok: false; error: string; issues?: unknown[]; status: number } {
  const fieldKey = typeof body.fieldKey === 'string' ? body.fieldKey.trim() : '';
  const assignedToId = typeof body.assignedToId === 'string' ? body.assignedToId.trim() : '';
  if (!fieldKey || !assignedToId) {
    return { ok: false, error: 'Validation failed', issues: [{ path: ['fieldKey'], message: 'Required' }], status: 422 };
  }
  return { ok: true, fieldKey, assignedToId };
}

export function validateReilStatusBody(body: {
  status?: unknown;
  note?: unknown;
}): { ok: true; status: string; note: string | null } | { ok: false; error: string; status: number } {
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!status) return { ok: false, error: 'status is required', status: 422 };
  const note = typeof body.note === 'string' ? body.note : null;
  return { ok: true, status, note };
}

export const REIL_COLLABORATOR_ROLES = ['OWNER', 'PARTNER', 'ANALYST', 'VIEWER'] as const;

export function validateReilInviteBody(body: {
  email?: unknown;
  role?: unknown;
}): { ok: true; email: string; role: string } | { ok: false; error: string; issues?: unknown[]; status: number } {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Validation failed', issues: [{ path: ['email'], message: 'Valid email required.' }], status: 422 };
  }
  const roleRaw = typeof body.role === 'string' ? body.role : 'VIEWER';
  const role = (REIL_COLLABORATOR_ROLES as readonly string[]).includes(roleRaw) ? roleRaw : 'VIEWER';
  return { ok: true, email, role };
}

export function validateReilTermsBody(body: Record<string, unknown>): {
  ok: true;
  data: Record<string, unknown>;
} | { ok: false; error: string; issues?: unknown[]; status: number } {
  if (body.sellerResponse === 'COUNTERED' && !body.counterPriceCents) {
    return {
      ok: false,
      error: 'Validation failed',
      issues: [{ path: ['counterPriceCents'], message: 'Counter price is required when seller has countered.' }],
      status: 422,
    };
  }
  return { ok: true, data: body };
}
