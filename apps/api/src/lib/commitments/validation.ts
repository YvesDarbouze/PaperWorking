export const COMMITMENT_STATUSES = [
  'pledged',
  'transferred',
  'cleared',
  'soft-committed',
  'docs-out',
  'signed',
  'funds-confirmed',
] as const;

export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const COMMITMENT_PARTY_TYPES = [
  'LeadInvestor',
  'Investor',
  'Co-GP',
  'Preferred Equity',
] as const;

export type CommitmentPartyType = (typeof COMMITMENT_PARTY_TYPES)[number];

export const PRIVILEGED_COMMITMENT_STATUSES: CommitmentStatus[] = [
  'transferred',
  'cleared',
  'docs-out',
  'funds-confirmed',
];

export interface CreateCommitmentBody {
  name?: unknown;
  amountCents?: unknown;
  status?: unknown;
  email?: unknown;
  notes?: unknown;
  partyType?: unknown;
}

export interface PatchCommitmentBody {
  status?: unknown;
  amountCents?: unknown;
  name?: unknown;
  email?: unknown;
  notes?: unknown;
  partyType?: unknown;
  evidence?: unknown;
}

export function isCommitmentStatus(value: unknown): value is CommitmentStatus {
  return typeof value === 'string' && COMMITMENT_STATUSES.includes(value as CommitmentStatus);
}

export function isCommitmentPartyType(value: unknown): value is CommitmentPartyType {
  return typeof value === 'string' && COMMITMENT_PARTY_TYPES.includes(value as CommitmentPartyType);
}

export function resolveCreateCommitmentStatus(
  isLeadInvestor: boolean,
  requestedStatus: unknown,
): CommitmentStatus {
  if (!isLeadInvestor) return 'pledged';
  return isCommitmentStatus(requestedStatus) ? requestedStatus : 'pledged';
}

export function validateCreateCommitmentBody(
  body: CreateCommitmentBody,
  isLeadInvestor: boolean,
): { ok: true; value: {
  name: string;
  amountCents: number;
  status: CommitmentStatus;
  email: string | null;
  notes: string | null;
  partyType: CommitmentPartyType;
} } | { ok: false; error: string; status: number } {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return { ok: false, error: 'name is required', status: 422 };
  }

  if (typeof body.amountCents !== 'number' || body.amountCents <= 0) {
    return { ok: false, error: 'amountCents must be a positive number', status: 422 };
  }

  const status = resolveCreateCommitmentStatus(isLeadInvestor, body.status ?? 'pledged');
  if (!isCommitmentStatus(status)) {
    return {
      ok: false,
      error: `status must be one of: ${COMMITMENT_STATUSES.join(', ')}`,
      status: 422,
    };
  }

  const partyType = typeof body.partyType === 'string' ? body.partyType : 'Investor';
  if (!isCommitmentPartyType(partyType)) {
    return {
      ok: false,
      error: `partyType must be one of: ${COMMITMENT_PARTY_TYPES.join(', ')}`,
      status: 422,
    };
  }

  const email =
    isLeadInvestor && typeof body.email === 'string' && body.email.trim()
      ? body.email.trim()
      : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

  return {
    ok: true,
    value: {
      name,
      amountCents: Math.round(body.amountCents),
      status,
      email,
      notes: notes || null,
      partyType,
    },
  };
}

export function validatePatchCommitmentFields(
  body: PatchCommitmentBody,
  isLeadInvestor: boolean,
  existing: { status?: string; email?: string | null; partyType?: string },
): { ok: true; updates: Record<string, unknown> } | { ok: false; error: string; status: number } {
  if (!isLeadInvestor) {
    if (body.email !== undefined && body.email !== existing.email) {
      return { ok: false, error: 'Cannot change email on an existing commitment', status: 403 };
    }
    if (body.partyType !== undefined && body.partyType !== existing.partyType) {
      return { ok: false, error: 'Cannot change partyType on an existing commitment', status: 403 };
    }
  }

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!isCommitmentStatus(body.status)) {
      return {
        ok: false,
        error: `status must be one of: ${COMMITMENT_STATUSES.join(', ')}`,
        status: 422,
      };
    }
    if (!isLeadInvestor && PRIVILEGED_COMMITMENT_STATUSES.includes(body.status)) {
      return { ok: false, error: 'Cannot self-clear or self-verify commitments', status: 403 };
    }
    updates.status = body.status;
  }

  if (body.amountCents !== undefined) {
    if (typeof body.amountCents !== 'number' || body.amountCents <= 0) {
      return { ok: false, error: 'amountCents must be a positive number', status: 422 };
    }
    updates.amountCents = Math.round(body.amountCents);
  }

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.email !== undefined && isLeadInvestor) {
    updates.email = body.email ? String(body.email).trim() : null;
  }
  if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;
  if (body.partyType !== undefined && isLeadInvestor) {
    if (!isCommitmentPartyType(body.partyType)) {
      return {
        ok: false,
        error: `partyType must be one of: ${COMMITMENT_PARTY_TYPES.join(', ')}`,
        status: 422,
      };
    }
    updates.partyType = body.partyType;
  }

  return { ok: true, updates };
}

export function filterCommitmentsForViewer<T extends { email?: string | null; uid?: string; createdByUid?: string }>(
  commitments: T[],
  isLeadInvestor: boolean,
  viewerEmails: string[],
  viewerUid: string,
): T[] {
  if (isLeadInvestor) return commitments;

  const normalizedEmails = viewerEmails.map((e) => e.toLowerCase()).filter(Boolean);

  return commitments.filter((c) => {
    const emailMatch = c.email && normalizedEmails.includes(c.email.toLowerCase());
    return emailMatch || c.uid === viewerUid || c.createdByUid === viewerUid;
  });
}

export function userOwnsCommitment(
  commitment: { email?: string | null; uid?: string; createdByUid?: string },
  viewerEmails: string[],
  viewerUid: string,
): boolean {
  const normalizedEmails = viewerEmails.map((e) => e.toLowerCase()).filter(Boolean);
  return (
    (commitment.email != null && normalizedEmails.includes(commitment.email.toLowerCase())) ||
    commitment.uid === viewerUid ||
    commitment.createdByUid === viewerUid
  );
}
