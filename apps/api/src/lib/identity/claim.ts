export function validateClaimStartBody(body: {
  claimEmail?: unknown;
}): { ok: true; claimEmail: string } | { ok: false; error: string; status: number } {
  const claimEmail = typeof body.claimEmail === 'string' ? body.claimEmail.toLowerCase().trim() : '';
  if (!claimEmail) return { ok: false, error: 'claimEmail is required.', status: 400 };
  return { ok: true, claimEmail };
}

export function validateClaimVerifyBody(body: {
  claimEmail?: unknown;
  code?: unknown;
}): { ok: true; claimEmail: string; code: string } | { ok: false; error: string; status: number } {
  const claimEmail = typeof body.claimEmail === 'string' ? body.claimEmail.toLowerCase().trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!claimEmail || !code) {
    return { ok: false, error: 'claimEmail and code are required.', status: 400 };
  }
  return { ok: true, claimEmail, code };
}

export function validateClaimBindTokenBody(body: {
  token?: unknown;
}): { ok: true; token: string } | { ok: false; error: string; status: number } {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return { ok: false, error: 'token is required.', status: 400 };
  return { ok: true, token };
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function validateIdentityAppealBody(body: Record<string, unknown>): { ok: true } | { ok: false; error: string; status: number } {
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) return { ok: false, error: 'reason is required.', status: 400 };
  return { ok: true };
}

export function validateReportSpamBody(body: {
  email?: unknown;
  token?: unknown;
  projectId?: unknown;
}): { ok: true; email: string; token: string; projectId: string } | { ok: false; error: string; status: number } {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!email || !token || !projectId) {
    return { ok: false, error: 'email, token, and projectId are required.', status: 400 };
  }
  return { ok: true, email, token, projectId };
}
