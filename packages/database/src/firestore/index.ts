export {
  getFirestoreAdmin,
  resetFirestoreAdminForTests,
  FIRESTORE_COLLECTIONS,
} from './admin.js';
export type { FirestoreAdminConfig } from './admin.js';
export { getFirestoreClient } from './client.js';
export type { FirestoreClientFactory } from './client.js';

export {
  FirestoreReadNotConfiguredError,
  FirestoreReadNotImplementedError,
  FirestoreDocumentParseError,
} from './errors.js';

export {
  getDatabaseReadMode,
  isFirestoreReadMode,
  isFirestoreShadowReadsEnabled,
  type DatabaseReadMode,
} from './read-mode.js';

export {
  compareReadModels,
  logShadowReadMismatches,
  userFromPostgres,
  organizationFromPostgres,
  organizationMemberFromPostgres,
  projectFromPostgres,
  type ShadowReadMismatch,
} from './shadow-read.js';

export type {
  UserReadModel,
  OrganizationReadModel,
  OrganizationMemberReadModel,
  ProjectReadModel,
} from './types/read-models.js';

export {
  FirestoreUserRepository,
  FirestoreOrganizationRepository,
  FirestoreOrganizationMemberRepository,
  FirestoreProjectRepository,
  requireFirestore,
  documentData,
} from './repositories/index.js';

export const FIRESTORE_PACKAGE_STATUS = 'phase-7-read-repositories' as const;
