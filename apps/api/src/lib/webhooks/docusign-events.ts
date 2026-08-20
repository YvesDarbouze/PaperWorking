import { createHmac, timingSafeEqual } from 'crypto';

export interface DocuSignWebhookEvent {
  envelopeId: string;
  status: string;
  completedAt?: string;
  isFinal: boolean;
}

export function verifyDocuSignSignature(
  body: string,
  signature: string | null,
  hmacKey: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', hmacKey).update(body).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseDocuSignWebhookEvent(raw: Record<string, unknown>): DocuSignWebhookEvent | null {
  const data = raw.data as Record<string, unknown> | undefined;
  const envelopeSummary = data?.envelopeSummary as Record<string, unknown> | undefined;

  const envelopeId = (raw.envelopeId ?? data?.envelopeId) as string | undefined;
  const rawStatus = (raw.status ?? envelopeSummary?.status) as string | undefined;
  const completedAt = (raw.completedDateTime ?? envelopeSummary?.completedDateTime) as
    | string
    | undefined;

  if (!envelopeId || !rawStatus) {
    return null;
  }

  const status = rawStatus.toLowerCase();
  const isFinal = status === 'completed' || status === 'declined' || status === 'voided';

  return { envelopeId, status, completedAt, isFinal };
}

export function mapDocuSignToESignStatus(status: string): string {
  if (status === 'completed') return 'Signed';
  if (status === 'declined') return 'Declined';
  return 'Not Required';
}

export function mapDocuSignToCommitmentStatus(
  status: string,
  currentStatus: string,
): string {
  if (status === 'completed') return 'signed';
  if (status === 'declined') return 'soft-committed';
  return currentStatus;
}
