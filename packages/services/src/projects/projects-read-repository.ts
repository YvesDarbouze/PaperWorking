import type { StoredProject } from '@paperworking/authz';

/** Read-only project persistence for list queries (Neon/Postgres). */
export interface ProjectsReadRepository {
  listForUser(userId: string, orgIds: string[], q?: string): Promise<StoredProject[]>;
}
