import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';

export const USER_CONSENT_COLLECTION = 'consentRecords';

export interface UserConsentInput {
  userId?: string | null;
  consentType: string;
  version?: string;
  agreedAt?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UserConsentRecord {
  id: string;
  userId: string | null;
  consentType: string;
  version: string;
  agreedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const memoryConsents = new Map<string, UserConsentRecord>();

export function generateConsentId(): string {
  return `consent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function resetMemoryConsents(): void {
  memoryConsents.clear();
}

export function getMemoryConsentCount(): number {
  return memoryConsents.size;
}

/** Records a consent event in Firestore (`consentRecords`), memory fallback when unavailable. */
export async function recordUserConsent(input: UserConsentInput): Promise<UserConsentRecord> {
  const now = input.agreedAt ?? new Date().toISOString();
  const record: UserConsentRecord = {
    id: generateConsentId(),
    userId: input.userId ?? null,
    consentType: input.consentType,
    version: input.version ?? '2026-08',
    agreedAt: now,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? null,
    createdAt: now,
  };

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await db
        .collection(USER_CONSENT_COLLECTION)
        .doc(record.id)
        .set(JSON.parse(JSON.stringify(record)));
      return record;
    } catch (error) {
      console.warn(
        '[user-consent-store] Firestore write failed; using memory fallback:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  memoryConsents.set(record.id, record);
  return record;
}
