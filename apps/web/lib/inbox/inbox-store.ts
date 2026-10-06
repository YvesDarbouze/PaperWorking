/**
 * Authoritative Server-side Unified Inbox Persistence Store.
 *
 * Implements persistent Google Cloud Firestore storage for notification and messaging threads
 * under the `inbox_threads/{threadId}` collection, with automatic fallback and seed bootstrapping
 * for offline and testing environments.
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import {
  INBOX_THREADS,
  addInboxThread,
  type InboxTabId,
  type InboxItemType,
  type InboxThread,
} from '@/lib/dashboard/shell-seed';

export type { InboxTabId, InboxItemType, InboxThread };

export interface InboxThreadRecord extends InboxThread {
  dealId?: string;
  projectId?: string;
  archived?: boolean;
  organizationId?: string;
  recipientUid?: string;
  recipientEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __pw_inbox_cache: Map<string, InboxThreadRecord> | undefined;
}

const memoryInboxCache: Map<string, InboxThreadRecord> =
  globalThis.__pw_inbox_cache ?? (globalThis.__pw_inbox_cache = new Map<string, InboxThreadRecord>());

// Initialize cache from seed threads if empty
if (memoryInboxCache.size === 0) {
  for (const t of INBOX_THREADS) {
    memoryInboxCache.set(t.id, {
      ...t,
      archived: false,
      organizationId: 'org-1',
      createdAt: t.receivedAt || new Date().toISOString(),
      updatedAt: t.receivedAt || new Date().toISOString(),
    });
  }
}

function normalizeThreadRecord(docId: string, data: Record<string, unknown>): InboxThreadRecord {
  return {
    id: docId,
    tab: (data.tab as InboxTabId) || 'opportunities',
    type: (data.type as InboxItemType) || 'INVEST_INVITE',
    subject: (data.subject as string) || 'Notification',
    project: (data.project as string) || 'General',
    dealId: (data.dealId as string) || undefined,
    projectId: (data.projectId as string) || undefined,
    from: (data.from as string) || 'PaperWorking System',
    fromRole: (data.fromRole as string) || undefined,
    preview: (data.preview as string) || '',
    body: (data.body as string) || '',
    unread: typeof data.unread === 'boolean' ? data.unread : true,
    archived: Boolean(data.archived),
    receivedAt: (data.receivedAt as string) || new Date().toISOString(),
    deepLinkUrl: (data.deepLinkUrl as string) || undefined,
    actionable: typeof data.actionable === 'boolean' ? data.actionable : false,
    organizationId: (data.organizationId as string) || 'org-1',
    recipientUid: (data.recipientUid as string) || undefined,
    recipientEmail: (data.recipientEmail as string) || undefined,
    createdAt: (data.createdAt as string) || new Date().toISOString(),
    updatedAt: (data.updatedAt as string) || new Date().toISOString(),
  };
}

/**
 * Lists persistent inbox threads with filtering.
 */
export async function listInboxThreadsFromStore(options?: {
  organizationId?: string;
  recipientUid?: string;
  tab?: string;
  search?: string;
  unreadOnly?: boolean;
  includeArchived?: boolean;
}): Promise<InboxThreadRecord[]> {
  const filterList = (list: InboxThreadRecord[]): InboxThreadRecord[] => {
    let result = [...list];

    // Exclude archived unless explicitly requested
    if (!options?.includeArchived) {
      result = result.filter((t) => !t.archived);
    }

    // Filter by tab
    if (options?.tab && options.tab !== 'all') {
      result = result.filter((t) => t.tab === options.tab);
    }

    // Filter by unread
    if (options?.unreadOnly) {
      result = result.filter((t) => t.unread);
    }

    // Search query filter
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q) ||
          t.from.toLowerCase().includes(q) ||
          t.project.toLowerCase().includes(q),
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return result;
  };

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      let queryRef: FirebaseFirestore.Query = db.collection('inbox_threads');

      if (options?.organizationId) {
        queryRef = queryRef.where('organizationId', '==', options.organizationId);
      }

      const snap = await queryRef.get();
      if (!snap.empty) {
        const records = snap.docs.map((d) => normalizeThreadRecord(d.id, d.data()));
        for (const r of records) {
          memoryInboxCache.set(r.id, r);
        }
        return filterList(records);
      }

      // If Firestore is empty, bootstrap from seed INBOX_THREADS
      const batch = db.batch();
      for (const s of INBOX_THREADS) {
        const rec = normalizeThreadRecord(s.id, {
          ...s,
          archived: false,
          organizationId: options?.organizationId || 'org-1',
          createdAt: s.receivedAt || new Date().toISOString(),
          updatedAt: s.receivedAt || new Date().toISOString(),
        });
        const docRef = db.collection('inbox_threads').doc(s.id);
        batch.set(docRef, rec);
        memoryInboxCache.set(s.id, rec);
      }
      batch.commit().catch((err) => {
        console.warn('[inbox-store] Non-fatal batch seed commit warning:', err?.message || err);
      });

      return filterList(Array.from(memoryInboxCache.values()));
    } catch (err: any) {
      console.warn('[inbox-store] Firestore list failed, falling back to cache:', err?.message || err);
    }
  }

  // Fallback to cache
  return filterList(Array.from(memoryInboxCache.values()));
}

/**
 * Retrieves a single inbox thread by ID.
 */
export async function getInboxThreadFromStore(id: string): Promise<InboxThreadRecord | null> {
  if (!id) return null;

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const doc = await db.collection('inbox_threads').doc(id).get();
      if (doc.exists) {
        const record = normalizeThreadRecord(doc.id, doc.data() as Record<string, unknown>);
        memoryInboxCache.set(id, record);
        return record;
      }
    } catch (err: any) {
      console.warn(`[inbox-store] Firestore get failed for ${id}:`, err?.message || err);
    }
  }

  return memoryInboxCache.get(id) || null;
}

/**
 * Creates and persists a new inbox thread in Firestore and memory cache.
 */
export async function createInboxThreadInStore(
  payload: Partial<InboxThreadRecord> & {
    subject: string;
    body: string;
    from?: string;
    project?: string;
  },
): Promise<InboxThreadRecord> {
  const id = payload.id || `thread-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: InboxThreadRecord = normalizeThreadRecord(id, {
    tab: 'opportunities',
    type: 'INVEST_INVITE',
    from: 'PaperWorking System',
    project: 'Investment Opportunity',
    preview: payload.body.slice(0, 110) + (payload.body.length > 110 ? '...' : ''),
    unread: true,
    archived: false,
    actionable: true,
    receivedAt: now,
    createdAt: now,
    updatedAt: now,
    organizationId: 'org-1',
    ...payload,
    id,
  });

  memoryInboxCache.set(id, record);

  // Sync with shell-seed array for existing test mocks
  addInboxThread(record);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db
        .collection('inbox_threads')
        .doc(id)
        .set({
          ...record,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
    } catch (err: any) {
      console.error(`[inbox-store] Failed to persist thread ${id} to Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to create inbox thread in Firestore (${err?.message || 'unknown'})`);
      }
    }
  }

  return record;
}

/**
 * Updates an inbox thread in Firestore and memory cache.
 */
export async function updateInboxThreadInStore(
  id: string,
  patch: Partial<InboxThreadRecord>,
): Promise<InboxThreadRecord | null> {
  const existing = await getInboxThreadFromStore(id);
  if (!existing) return null;

  const merged: InboxThreadRecord = normalizeThreadRecord(id, {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  memoryInboxCache.set(id, merged);
  addInboxThread(merged);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db
        .collection('inbox_threads')
        .doc(id)
        .set(
          {
            ...patch,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } catch (err: any) {
      console.error(`[inbox-store] Failed to update thread ${id} in Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to update inbox thread in Firestore (${err?.message || 'unknown'})`);
      }
    }
  }

  return merged;
}

/**
 * Deletes an inbox thread from Firestore and memory cache.
 */
export async function deleteInboxThreadInStore(id: string): Promise<boolean> {
  memoryInboxCache.delete(id);

  // Remove from INBOX_THREADS seed array
  const idx = INBOX_THREADS.findIndex((t) => t.id === id);
  if (idx >= 0) {
    INBOX_THREADS.splice(idx, 1);
  }

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await db.collection('inbox_threads').doc(id).delete();
      return true;
    } catch (err: any) {
      console.error(`[inbox-store] Failed to delete thread ${id} in Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to delete inbox thread in Firestore (${err?.message || 'unknown'})`);
      }
      return false;
    }
  }

  return true;
}

/**
 * Marks all active inbox threads as read.
 */
export async function markAllInboxThreadsReadInStore(options?: {
  organizationId?: string;
  recipientUid?: string;
}): Promise<number> {
  const threads = await listInboxThreadsFromStore({
    organizationId: options?.organizationId,
    recipientUid: options?.recipientUid,
    includeArchived: false,
  });

  let count = 0;
  for (const t of threads) {
    if (t.unread) {
      await updateInboxThreadInStore(t.id, { unread: false });
      count += 1;
    }
  }

  return count;
}
