import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from '../admin.js';
import {
  ledgerItemFromFirestore,
  ledgerItemToRecentTransactionRow,
  type LedgerItemReadModel,
} from '../converters/ledger-item.converter.js';
import { FirestoreProjectRepository } from './project.repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';

export const FIRESTORE_LEDGER_SUBCOLLECTION = 'ledgerItems';

function ledgerCollectionPath(projectId: string): string {
  return `${FIRESTORE_COLLECTIONS.projects}/${projectId}/${FIRESTORE_LEDGER_SUBCOLLECTION}`;
}

export type LedgerItemCreateInput = {
  id?: string;
  projectId: string;
  payee?: string;
  merchantName?: string;
  description?: string;
  category?: string | string[];
  reiCategory?: string;
  amountCents?: number;
  amount?: number;
  transactionDate?: Date | string;
  reviewedByUser?: boolean;
  userId: string;
  source?: string;
  status?: string;
};

export class FirestoreProjectLedgerRepository {
  private readonly projects: FirestoreProjectRepository;

  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {
    this.projects = new FirestoreProjectRepository(firestoreFactory);
  }

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  private ledgerCollection(db: Firestore, projectId: string) {
    return db
      .collection(FIRESTORE_COLLECTIONS.projects)
      .doc(projectId)
      .collection(FIRESTORE_LEDGER_SUBCOLLECTION);
  }

  async create(data: LedgerItemCreateInput): Promise<LedgerItemReadModel> {
    const db = await this.db();
    const project = await this.projects.getById(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const id = data.id ?? randomUUID();
    const amountCents =
      data.amountCents ??
      (data.amount != null ? Math.round(data.amount * 100) : 0);
    const transactionDate =
      data.transactionDate instanceof Date
        ? data.transactionDate
        : data.transactionDate
          ? new Date(data.transactionDate)
          : new Date();
    const payee = data.payee ?? data.merchantName ?? data.description ?? null;
    const now = FieldValue.serverTimestamp();

    const payload: Record<string, unknown> = {
      id,
      projectId: data.projectId,
      organizationId: project.organizationId ?? '',
      payee,
      merchantName: data.merchantName ?? payee,
      description: data.description ?? payee,
      category: data.category ?? data.reiCategory ?? 'UNCATEGORIZED',
      reiCategory: data.reiCategory ?? null,
      amountCents,
      amount: amountCents / 100,
      transactionDate,
      date: transactionDate,
      reviewedByUser: data.reviewedByUser ?? false,
      userId: data.userId,
      createdByUid: data.userId,
      source: data.source ?? 'MANUAL',
      status: data.status ?? (data.reviewedByUser ? 'MANUALLY_APPROVED' : 'DRAFT'),
      createdAt: now,
      updatedAt: now,
    };

    await this.ledgerCollection(db, data.projectId).doc(id).set(payload);

    const created = await this.findById(data.projectId, id);
    if (!created) {
      throw new Error(`Ledger item not found after create: ${id}`);
    }
    return created;
  }

  async findById(projectId: string, itemId: string): Promise<LedgerItemReadModel | null> {
    const db = await this.db();
    const snap = await this.ledgerCollection(db, projectId).doc(itemId).get();
    const raw = documentData(snap);
    if (!raw) return null;
    return ledgerItemFromFirestore(snap.id, raw);
  }

  async listByProject(projectId: string): Promise<LedgerItemReadModel[]> {
    const db = await this.db();
    const snap = await this.ledgerCollection(db, projectId).get();
    const rows = snap.docs.flatMap((doc) => {
      const data = documentData(doc);
      if (!data) return [];
      try {
        return [ledgerItemFromFirestore(doc.id, data)];
      } catch {
        return [];
      }
    });
    rows.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
    return rows;
  }

  async listRecentApprovedForKpi(projectId: string, limit = 10) {
    const db = await this.db();
    const snap = await this.ledgerCollection(db, projectId)
      .where('reviewedByUser', '==', true)
      .get();

    const rows = snap.docs.flatMap((doc) => {
      const data = documentData(doc);
      if (!data) return [];
      try {
        return [ledgerItemFromFirestore(doc.id, data)];
      } catch {
        return [];
      }
    });

    rows.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
    return rows.slice(0, limit).map(ledgerItemToRecentTransactionRow);
  }

  /** Test helper — flat collection key used by MockFirestore. */
  static mockCollectionKey(projectId: string): string {
    return ledgerCollectionPath(projectId);
  }
}
