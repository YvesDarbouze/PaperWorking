export const DATABASE_PACKAGE_STATUS = 'firestore-only' as const;

export { sanitizeDbRecord } from './sanitize.js';
export * from './firestore/index.js';
export * from './sync/index.js';
export {
  createIdentityUserRepository,
  createSessionUserStore,
} from './runtime/identity-data-store.js';
export {
  createAuthzStore,
  createProjectsReadRepository,
  createProjectsCommandRepository,
  createProjectKpiReadRepository,
  createProjectDocumentsRepository,
} from './runtime/projects-data-store.js';
export {
  createPortfolioMetricsReadRepository,
  createPortfolioInsightsReadRepository,
} from './runtime/portfolio-data-store.js';
export {
  createDealsReadRepository,
  createDealsCommandRepository,
  createDealCommunicationRepository,
} from './runtime/deals-data-store.js';
export {
  createInboxReadRepository,
  createInboxCommandRepository,
} from './runtime/inbox-data-store.js';
export {
  createTeamMembersReadRepository,
  createTeamCommandRepository,
} from './runtime/team-data-store.js';
export {
  createMarketplaceProfileReadRepository,
  createMarketplaceInvestorsReadRepository,
  createMarketplaceFollowCommandRepository,
} from './runtime/marketplace-data-store.js';
export {
  createVendorsReadRepository,
  createVendorPortalReadRepository,
  createVendorPortalCommandRepository,
} from './runtime/vendors-data-store.js';
export { createProfileSettingsRepository } from './runtime/profile-data-store.js';
export { createReportsReadRepository } from './runtime/reports-data-store.js';
export { createBillingSubscriptionRepository } from './runtime/billing-data-store.js';
export { createAdminReadRepository } from './runtime/admin-data-store.js';
export { createAdminCommandRepository } from './runtime/admin-command-data-store.js';
export { createUserSettingsRepository } from './runtime/user-settings-data-store.js';
export { createOrganizationsRepository } from './runtime/organizations-data-store.js';
export { createProjectMembersRepository } from './runtime/project-members-data-store.js';
export { createMessagesRepository } from './runtime/messages-data-store.js';
export { createTaskAssignmentsRepository } from './runtime/tasks-data-store.js';
export {
  createProjectsNestLegacyRepository,
  type NestProjectSubcollectionName,
  NEST_PROJECT_SUBCOLLECTION_ALLOWLIST,
} from './runtime/projects-nest-legacy-data-store.js';
export {
  createAuthProfileAccess,
  createFirestoreAuthProfileAccess,
  type AuthProfileAccess,
  type AuthProfileUserRow,
  type AuthProfileSubscriptionRow,
} from './runtime/auth-profile-access.js';
export type { FileStoragePort } from './storage/file-storage-port.js';
export {
  createFirebaseFileStorage,
  firebaseStorageHasCredentials,
  resolveFirebaseStorageConfig,
  resetFirebaseStorageForTests,
} from './firebase/firebase-file-storage.js';
export { createUnavailableFileStorage } from './storage/unavailable-file-storage.js';
export {
  createStripeBillingProvider,
  type StripeBillingProvider,
} from './stripe/stripe-billing-provider.js';
export { createReportPdfExportPort, type ReportPdfExportAdapter } from './reports/report-pdf-export.js';
