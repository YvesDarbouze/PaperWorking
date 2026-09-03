import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from '../admin.js';
import {
  projectFileFromFirestore,
  projectFileToDocumentRow,
  type ProjectFileReadModel,
} from '../converters/project-file.converter.js';
import { optionalString } from '../converters/timestamp.js';
import { FirestoreProjectRepository } from './project.repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';

export class FirestoreProjectFileRepository {
  private readonly projects: FirestoreProjectRepository;

  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {
    this.projects = new FirestoreProjectRepository(firestoreFactory);
  }

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  private collection() {
    return FIRESTORE_COLLECTIONS.projectFiles;
  }

  async listByProject(projectId: string) {
    const db = await this.db();
    const snap = await db
      .collection(this.collection())
      .where('projectId', '==', projectId)
      .get();

    const rows = snap.docs.flatMap((doc) => {
      const data = documentData(doc);
      if (!data) return [];
      try {
        return [projectFileToDocumentRow(projectFileFromFirestore(doc.id, data))];
      } catch {
        return [];
      }
    });

    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows;
  }

  async findById(projectId: string, documentId: string) {
    const db = await this.db();
    const snap = await db.collection(this.collection()).doc(documentId).get();
    const data = documentData(snap);
    if (!data) return null;
    const model = projectFileFromFirestore(snap.id, data);
    if (model.projectId !== projectId) return null;
    return projectFileToDocumentRow(model);
  }

  async create(data: {
    id: string;
    projectId: string;
    name: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    uploadedBy: string;
    metadata?: Record<string, unknown>;
  }) {
    const project = await this.projects.getById(data.projectId);
    const organizationId = project?.organizationId ?? `org_me_${data.uploadedBy}`;
    const folderId =
      optionalString(data.metadata?.folderId) ?? `folder_documents_${data.projectId}`;
    const category = optionalString(data.metadata?.category) ?? 'General';
    const now = FieldValue.serverTimestamp();

    const payload: Record<string, unknown> = {
      id: data.id,
      projectId: data.projectId,
      organizationId,
      folderId,
      name: data.name,
      category,
      storagePath: data.storageKey,
      storageKey: data.storageKey,
      storageUrl: data.storageKey,
      fileType: data.mimeType,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      uploadedByUid: data.uploadedBy,
      uploadedBy: data.uploadedBy,
      isVerified: false,
      metadata: data.metadata ?? {},
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const db = await this.db();
    await db.collection(this.collection()).doc(data.id).set(payload);

    const created = await this.findById(data.projectId, data.id);
    if (!created) {
      throw new Error(`Project file not found after create: ${data.id}`);
    }
    return created;
  }

  async deleteById(projectId: string, documentId: string) {
    const existing = await this.findById(projectId, documentId);
    if (!existing) return null;
    const db = await this.db();
    await db.collection(this.collection()).doc(documentId).delete();
    return existing;
  }

  async getProjectKpiInputs(projectId: string) {
    const db = await this.db();
    const snap = await db.collection(FIRESTORE_COLLECTIONS.projects).doc(projectId).get();
    const data = documentData(snap);
    if (!data) return null;

    const project = await this.projects.getById(projectId);
    if (!project) return null;

    return {
      id: project.id,
      purchasePrice: project.purchasePrice,
      currentPhase: project.currentPhase,
      phaseData: data.phaseData ?? data.kpiSummary ?? null,
    };
  }
}

export type { ProjectFileReadModel };
