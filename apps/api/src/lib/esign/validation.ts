export interface CreateEnvelopeBody {
  projectId?: unknown;
  documentId?: unknown;
  documentName?: unknown;
  signerRole?: unknown;
  signerEmail?: unknown;
  signerName?: unknown;
  documentUrl?: unknown;
}

const REQUIRED_ENVELOPE_FIELDS = [
  'projectId',
  'documentId',
  'documentName',
  'signerRole',
  'signerEmail',
  'signerName',
  'documentUrl',
] as const;

export function validateCreateEnvelopeBody(
  body: CreateEnvelopeBody,
): { ok: true; value: Record<(typeof REQUIRED_ENVELOPE_FIELDS)[number], string> } | { ok: false; error: string } {
  const missing = REQUIRED_ENVELOPE_FIELDS.filter((field) => {
    const value = body[field];
    return typeof value !== 'string' || !value.trim();
  });

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required fields: ${REQUIRED_ENVELOPE_FIELDS.join(', ')}`,
    };
  }

  const value = {} as Record<(typeof REQUIRED_ENVELOPE_FIELDS)[number], string>;
  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    value[field] = String(body[field]).trim();
  }

  return { ok: true, value };
}

export function mapEnvelopeStatusToDocStatus(
  status: string,
): 'Signed' | 'Declined' | 'Not Required' {
  if (status === 'completed') return 'Signed';
  if (status === 'declined') return 'Declined';
  return 'Not Required';
}

export const TERMINAL_ENVELOPE_STATUSES = new Set(['completed', 'declined', 'voided']);
