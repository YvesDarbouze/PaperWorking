import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

const PHASE_MAP: Record<string, number> = {
  acquisition: 1,
  purchase: 2,
  hold: 3,
  exit: 4,
};

const PHASE_NAMES = ['', 'acquisition', 'purchase', 'hold', 'exit'] as const;

export const NEST_PROJECT_SUBCOLLECTION_ALLOWLIST = [
  'vendorRequests',
  'commitments',
  'activityLog',
  'phaseSnapshots',
] as const;

export type NestProjectSubcollectionName = (typeof NEST_PROJECT_SUBCOLLECTION_ALLOWLIST)[number];

/** Firestore-backed Nest project advanced operations (phases, hold registry, subcollections). */
export function createFirestoreProjectsNestLegacyRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  async function getProjectDoc(id: string) {
    const db = await requireFirestore(firestoreFactory);
    const snap = await db.collection(FIRESTORE_COLLECTIONS.projects).doc(id).get();
    const data = documentData(snap);
    if (!data) throw new Error('Project not found');
    return { id: snap.id, data };
  }

  return {
    phaseNameToNumber(phase: string): number {
      const n = PHASE_MAP[phase.toLowerCase()];
      if (!n) throw new Error(`Unknown phase: ${phase}`);
      return n;
    },

    phaseNumberToName(n: number): string {
      return PHASE_NAMES[n] || 'acquisition';
    },

    async mergePhase(
      id: string,
      phase: string,
      body: Record<string, unknown>,
      userUid: string,
    ) {
      const db = await requireFirestore(firestoreFactory);
      const { data: project } = await getProjectDoc(id);
      const phaseKey = phase.toLowerCase();
      this.phaseNameToNumber(phaseKey);

      const phaseData =
        project.phaseData && typeof project.phaseData === 'object'
          ? { ...(project.phaseData as Record<string, unknown>) }
          : {};
      const prevPhase = this.phaseNumberToName(Number(project.currentPhase ?? 1));
      const currentPhasePayload =
        phaseData[phaseKey] && typeof phaseData[phaseKey] === 'object'
          ? { ...(phaseData[phaseKey] as Record<string, unknown>) }
          : {};
      phaseData[phaseKey] = { ...currentPhasePayload, ...body };

      const now = FieldValue.serverTimestamp();
      await db.collection(FIRESTORE_COLLECTIONS.projects).doc(id).set(
        {
          phaseData,
          currentPhase: this.phaseNameToNumber(phaseKey),
          updatedAt: now,
        },
        { merge: true },
      );

      const activityId = randomUUID();
      await db
        .collection(FIRESTORE_COLLECTIONS.projects)
        .doc(id)
        .collection('activityLog')
        .doc(activityId)
        .set({
          id: activityId,
          type: 'phase_transition',
          fromPhase: prevPhase,
          toPhase: phaseKey,
          userUid,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
          createdAt: now,
        });

      const updated = await getProjectDoc(id);
      return { id, ...updated.data };
    },

    async getHoldRegistry(id: string) {
      const { data: project } = await getProjectDoc(id);
      const phaseData = (project.phaseData as Record<string, unknown> | null) || {};
      const hold = (phaseData.hold as Record<string, unknown> | undefined) || {};
      return hold.registry ?? { units: [], updatedAt: null };
    },

    async patchHoldRegistry(id: string, registry: unknown) {
      const db = await requireFirestore(firestoreFactory);
      const { data: project } = await getProjectDoc(id);
      const phaseData =
        project.phaseData && typeof project.phaseData === 'object'
          ? { ...(project.phaseData as Record<string, unknown>) }
          : {};
      const hold =
        phaseData.hold && typeof phaseData.hold === 'object'
          ? { ...(phaseData.hold as Record<string, unknown>) }
          : {};
      hold.registry = registry;
      phaseData.hold = hold;

      await db.collection(FIRESTORE_COLLECTIONS.projects).doc(id).set(
        {
          phaseData,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const updated = await getProjectDoc(id);
      return { id, ...updated.data };
    },

    async getSubcollection(projectId: string, name: NestProjectSubcollectionName) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.projects)
        .doc(projectId)
        .collection(name)
        .get();
      return snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        return data ? [{ id: doc.id, ...data }] : [];
      });
    },

    async appendSubcollection(
      projectId: string,
      name: NestProjectSubcollectionName,
      item: Record<string, unknown>,
    ) {
      const db = await requireFirestore(firestoreFactory);
      const id = randomUUID();
      const entry = {
        id,
        createdAt: new Date().toISOString(),
        ...item,
      };
      await db
        .collection(FIRESTORE_COLLECTIONS.projects)
        .doc(projectId)
        .collection(name)
        .doc(id)
        .set({
          ...entry,
          updatedAt: FieldValue.serverTimestamp(),
        });
      return entry;
    },
  };
}

export type FirestoreProjectsNestLegacyRepository = ReturnType<
  typeof createFirestoreProjectsNestLegacyRepository
>;
