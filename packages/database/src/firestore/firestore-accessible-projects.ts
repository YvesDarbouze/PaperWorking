import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { projectFromFirestore } from './converters/project.converter.js';
import { FirestoreProjectRepository } from './repositories/project.repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';
import type { ProjectReadModel } from './types/read-models.js';

type ParsedAccessibleWhere = {
  admin: boolean;
  userId?: string;
  orgIds: string[];
};

/** Parse Prisma-shaped accessibleProjectsWhere from AuthorizationService. */
export function parseAccessibleProjectsWhere(
  where: Record<string, unknown>,
): ParsedAccessibleWhere {
  if (!where || Object.keys(where).length === 0) {
    return { admin: true, orgIds: [] };
  }

  const or = Array.isArray(where.OR) ? where.OR : [];
  let userId: string | undefined;
  const orgIds: string[] = [];

  for (const clause of or) {
    if (!clause || typeof clause !== 'object') continue;
    if (typeof clause.userId === 'string') userId = clause.userId;
    if (typeof clause.investorId === 'string') userId = userId ?? clause.investorId;
    const orgClause = clause.organizationId as { in?: string[] } | undefined;
    if (orgClause?.in?.length) orgIds.push(...orgClause.in);
  }

  return { admin: false, userId, orgIds: [...new Set(orgIds)] };
}

export async function listAccessibleProjectsFromWhere(
  where: Record<string, unknown>,
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
): Promise<ProjectReadModel[]> {
  const parsed = parseAccessibleProjectsWhere(where);
  const projectsRepo = new FirestoreProjectRepository(firestoreFactory);

  if (parsed.admin) {
    const db = await requireFirestore(firestoreFactory);
    const snap = await db.collection(FIRESTORE_COLLECTIONS.projects).get();
    return snap.docs.flatMap((doc) => {
      const data = documentData(doc);
      if (!data) return [];
      try {
        return [projectFromFirestore(doc.id, data)];
      } catch {
        return [];
      }
    });
  }

  if (!parsed.userId) return [];
  return projectsRepo.listForUser(parsed.userId, parsed.orgIds);
}
