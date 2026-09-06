import { randomUUID } from 'node:crypto';
import type { Firestore, QuerySnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin, FIRESTORE_COLLECTIONS } from '../admin.js';
import { projectFromFirestore } from '../converters/project.converter.js';
import { optionalString } from '../converters/timestamp.js';
import type { ProjectReadModel } from '../types/read-models.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';

export type FirestoreProjectCreateInput = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  purchasePrice?: number;
  organizationId?: string;
  userId: string;
  dealId?: string;
  dealSlug?: string;
};

export class FirestoreProjectRepository {
  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {}

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  async getById(id: string): Promise<ProjectReadModel | null> {
    const snap = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.projects)
      .doc(id)
      .get();
    const data = documentData(snap);
    if (!data) return null;
    return projectFromFirestore(snap.id, data);
  }

  async listByOrganization(organizationId: string): Promise<ProjectReadModel[]> {
    const query = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.projects)
      .where('organizationId', '==', organizationId)
      .get();

    return query.docs.flatMap((doc) => {
      const data = documentData(doc);
      if (!data) return [];
      try {
        return [projectFromFirestore(doc.id, data)];
      } catch {
        return [];
      }
    });
  }

  async listForUser(userId: string, orgIds: string[], q?: string): Promise<ProjectReadModel[]> {
    const db = await this.db();
    const col = db.collection(FIRESTORE_COLLECTIONS.projects);
    const seen = new Map<string, ProjectReadModel>();

    const addSnapshot = (snapshot: QuerySnapshot) => {
      for (const doc of snapshot.docs) {
        const data = documentData(doc);
        if (!data) continue;
        try {
          seen.set(doc.id, projectFromFirestore(doc.id, data));
        } catch {
          // skip malformed docs
        }
      }
    };

    const ownerFields = ['userId', 'ownerUid', 'ownerId', 'investorId'] as const;
    await Promise.all(
      ownerFields.map(async (field) => {
        addSnapshot(await col.where(field, '==', userId).get());
      }),
    );

    await Promise.all(
      orgIds.map(async (orgId) => {
        addSnapshot(await col.where('organizationId', '==', orgId).get());
      }),
    );

    const memberships = await db
      .collection(FIRESTORE_COLLECTIONS.projectMembers)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();

    await Promise.all(
      memberships.docs.map(async (doc) => {
        const data = documentData(doc);
        const projectId = optionalString(data?.projectId);
        if (!projectId || seen.has(projectId)) return;
        const project = await this.getById(projectId);
        if (project) seen.set(projectId, project);
      }),
    );

    let rows = [...seen.values()];
    const needle = q?.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((project) => {
        const haystacks = [project.name, project.title, project.address, project.city]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        return haystacks.some((value) => value.includes(needle));
      });
    }

    rows.sort(
      (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
    );
    return rows;
  }

  async create(data: FirestoreProjectCreateInput): Promise<ProjectReadModel> {
    const db = await this.db();
    const id = randomUUID();
    const now = FieldValue.serverTimestamp();
    const purchasePrice = data.purchasePrice ?? 0;

    const projectDoc: Record<string, unknown> = {
      id,
      name: data.name,
      title: data.name,
      propertyName: data.name,
      address: data.address ?? '',
      addressLine: data.address ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
      zip: data.zip ?? '',
      organizationId: data.organizationId ?? null,
      userId: data.userId,
      ownerUid: data.userId,
      ownerId: data.userId,
      investorId: data.userId,
      status: 'acquisition',
      lifecyclePhase: 'acquisition',
      currentPhase: 1,
      visibility: 'private',
      purchasePrice,
      financials: {
        purchasePrice,
        estimatedARV: 0,
        costs: [],
      },
      ...(data.dealId ? { dealId: data.dealId } : {}),
      ...(data.dealSlug ? { dealSlug: data.dealSlug } : {}),
      members: {
        [data.userId]: {
          uid: data.userId,
          role: 'Lead Investor',
          joinedAt: new Date().toISOString(),
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    const memberDoc = {
      id: `${id}_${data.userId}`,
      projectId: id,
      userId: data.userId,
      role: 'Lead Investor',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.runTransaction(async (tx) => {
      const projectRef = db.collection(FIRESTORE_COLLECTIONS.projects).doc(id);
      const memberRef = db.collection(FIRESTORE_COLLECTIONS.projectMembers).doc(memberDoc.id);
      tx.set(projectRef, projectDoc);
      tx.set(memberRef, memberDoc);
    });

    const created = await this.getById(id);
    if (!created) {
      throw new Error(`Firestore project ${id} was not readable after create`);
    }
    return created;
  }

  async update(id: string, patch: Record<string, unknown>): Promise<ProjectReadModel> {
    const db = await this.db();
    const ref = db.collection(FIRESTORE_COLLECTIONS.projects).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Project not found: ${id}`);
    }

    const firestorePatch: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    for (const key of [
      'name',
      'title',
      'address',
      'city',
      'state',
      'zip',
      'purchasePrice',
      'status',
      'visibility',
      'currentPhase',
      'dealId',
      'dealSlug',
      'organizationId',
    ] as const) {
      if (patch[key] !== undefined) {
        firestorePatch[key] = patch[key];
      }
    }

    if (typeof patch.name === 'string') {
      firestorePatch.title = patch.name;
      firestorePatch.propertyName = patch.name;
    }
    if (typeof patch.address === 'string') {
      firestorePatch.addressLine = patch.address;
    }

    await ref.set(firestorePatch, { merge: true });
    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Project not found after update: ${id}`);
    }
    return updated;
  }
}
