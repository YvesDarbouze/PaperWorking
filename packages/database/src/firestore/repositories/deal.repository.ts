import { randomUUID } from 'node:crypto';
import type { Firestore, QuerySnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from '../admin.js';
import {
  dealFromFirestore,
  type DealReadModel,
} from '../converters/deal.converter.js';
import { optionalString } from '../converters/timestamp.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';
import { FirestoreProjectRepository } from './project.repository.js';

export type FirestoreDealCreateInput = {
  id?: string;
  slug: string;
  address: string;
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  holdingCosts: number;
  projectedRoi: number;
  status: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
  visibility: 'marketplace' | 'invitation_only' | 'private';
  creatorId: string;
  projectId?: string;
  organizationId?: string;
};

function addSnapshot(
  target: Map<string, DealReadModel>,
  snapshot: QuerySnapshot,
): void {
  for (const doc of snapshot.docs) {
    const data = documentData(doc);
    if (!data) continue;
    try {
      target.set(doc.id, dealFromFirestore(doc.id, data));
    } catch {
      // skip malformed docs
    }
  }
}

export class FirestoreDealRepository {
  private readonly projects: FirestoreProjectRepository;

  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {
    this.projects = new FirestoreProjectRepository(firestoreFactory);
  }

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  async getById(id: string): Promise<DealReadModel | null> {
    const snap = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.dealListings)
      .doc(id)
      .get();
    const data = documentData(snap);
    if (!data) return null;
    return dealFromFirestore(snap.id, data);
  }

  async findBySlug(slug: string): Promise<DealReadModel | null> {
    const db = await this.db();
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.dealListings)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    const data = documentData(doc);
    if (!data) return null;
    return dealFromFirestore(doc.id, data);
  }

  async findBySlugOrId(slugOrId: string): Promise<DealReadModel | null> {
    const byId = await this.getById(slugOrId);
    if (byId) return byId;
    return this.findBySlug(slugOrId);
  }

  async listDeals(input: {
    accessOr: Array<Record<string, unknown>>;
    q?: string;
  }): Promise<DealReadModel[]> {
    const db = await this.db();
    const col = db.collection(FIRESTORE_COLLECTIONS.dealListings);
    const seen = new Map<string, DealReadModel>();

    for (const clause of input.accessOr) {
      if (typeof clause.creatorId === 'string') {
        const uid = clause.creatorId;
        addSnapshot(seen, await col.where('creatorId', '==', uid).get());
        addSnapshot(seen, await col.where('ownerUid', '==', uid).get());
        addSnapshot(seen, await col.where('ownerId', '==', uid).get());
        continue;
      }

      const andClause = clause.AND;
      if (Array.isArray(andClause)) {
        const visibility = andClause.find(
          (item) =>
            item &&
            typeof item === 'object' &&
            'visibility' in item &&
            (item as { visibility?: unknown }).visibility === 'marketplace',
        );
        const published = andClause.find(
          (item) =>
            item &&
            typeof item === 'object' &&
            'status' in item &&
            (item as { status?: unknown }).status === 'published',
        );
        if (visibility && published) {
          addSnapshot(
            seen,
            await col
              .where('visibility', '==', 'marketplace')
              .where('status', '==', 'published')
              .get(),
          );
        }
      }
    }

    let deals = [...seen.values()];
    const q = input.q?.trim().toLowerCase();
    if (q) {
      deals = deals.filter(
        (deal) =>
          deal.address.toLowerCase().includes(q) || deal.slug.toLowerCase().includes(q),
      );
    }

    deals.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return deals.slice(0, 100);
  }

  async create(data: FirestoreDealCreateInput): Promise<DealReadModel> {
    const db = await this.db();
    const id = data.id ?? randomUUID();
    const now = FieldValue.serverTimestamp();

    let organizationId = data.organizationId;
    if (!organizationId && data.projectId) {
      const project = await this.projects.getById(data.projectId);
      organizationId = project?.organizationId ?? undefined;
    }
    if (!organizationId) {
      organizationId = `org_me_${data.creatorId}`;
    }

    const payload: Record<string, unknown> = {
      id,
      slug: data.slug,
      address: data.address,
      title: data.address,
      summary: data.address,
      purchasePrice: data.purchasePrice,
      rehabCost: data.rehabCost,
      arv: data.arv,
      holdingCosts: data.holdingCosts,
      projectedRoi: data.projectedRoi,
      status: data.status,
      visibility: data.visibility,
      creatorId: data.creatorId,
      ownerUid: data.creatorId,
      ownerId: data.creatorId,
      organizationId,
      createdAt: now,
      updatedAt: now,
    };

    if (data.projectId) {
      payload.projectId = data.projectId;
    }

    const ref = db.collection(FIRESTORE_COLLECTIONS.dealListings).doc(id);
    await ref.set(payload);

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Deal not found after create: ${id}`);
    }
    return created;
  }

  async findDealSummaryById(
    dealId: string,
  ): Promise<{ id: string; slug: string; address?: string; projectId?: string } | null> {
    const snap = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.dealListings)
      .doc(dealId)
      .get();
    const data = documentData(snap);
    if (!data) return null;
    return {
      id: snap.id,
      slug: optionalString(data.slug) ?? snap.id,
      address: optionalString(data.address) ?? optionalString(data.title) ?? undefined,
      projectId: optionalString(data.projectId) ?? undefined,
    };
  }
}
