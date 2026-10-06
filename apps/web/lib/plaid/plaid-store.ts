import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  decryptAccessTokenEnvelope,
  type PlaidEncryptedCredentials,
} from './token-vault';

const PLAID_ITEMS_COLLECTION = 'plaid_items';

export type PlaidConnectionStatus =
  | 'connected'
  | 'login_repair_required'
  | 'stale_reconnect_required'
  | 'disconnected';

export interface PlaidConnectionRecord {
  id: string;
  userId: string;
  itemId: string;
  institutionId?: string | null;
  institutionName: string;
  env: string;
  status: PlaidConnectionStatus;
  credentials: PlaidEncryptedCredentials;
  accounts?: unknown[];
  syncedAt?: string | null;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function collection() {
  return getAdminFirestore().collection(PLAID_ITEMS_COLLECTION);
}

export async function savePlaidConnection(record: PlaidConnectionRecord): Promise<void> {
  await collection().doc(record.id).set(JSON.parse(JSON.stringify(record)));
}

export async function listPlaidConnections(userId: string): Promise<PlaidConnectionRecord[]> {
  const snapshot = await collection().where('userId', '==', userId).get();
  return snapshot.docs
    .map((doc) => ({ ...(doc.data() as PlaidConnectionRecord), id: doc.id }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function findPlaidConnection(
  userId: string,
  connectionIdOrItemId: string,
): Promise<PlaidConnectionRecord | null> {
  const direct = await collection().doc(connectionIdOrItemId).get();
  if (direct.exists) {
    const record = { ...(direct.data() as PlaidConnectionRecord), id: direct.id };
    if (record.userId === userId) return record;
  }

  const snapshot = await collection()
    .where('userId', '==', userId)
    .where('itemId', '==', connectionIdOrItemId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { ...(doc.data() as PlaidConnectionRecord), id: doc.id };
}

export async function markPlaidConnectionDisconnected(
  userId: string,
  connectionId: string,
): Promise<boolean> {
  const record = await findPlaidConnection(userId, connectionId);
  if (!record) return false;
  await collection().doc(record.id).set(
    { status: 'disconnected', updatedAt: new Date().toISOString() },
    { merge: true },
  );
  return true;
}

export async function markPlaidStatusByItemId(
  itemId: string,
  status: PlaidConnectionStatus,
): Promise<void> {
  const snapshot = await collection().where('itemId', '==', itemId).limit(5).get();
  await Promise.all(
    snapshot.docs.map((doc) =>
      doc.ref.set({ status, updatedAt: new Date().toISOString() }, { merge: true }),
    ),
  );
}

export function decryptPlaidConnectionToken(record: PlaidConnectionRecord): string {
  return decryptAccessTokenEnvelope(record.credentials);
}
