/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Schema Barrel Export
 *
 * Single import point for all canonical Zod schemas and inferred types.
 *
 * Usage:
 *   import { userSchema, projectSchema, type User, type Project }
 *     from '@/lib/schemas';
 *
 * @architect  Schema owner — add new schemas here after creation.
 * ═══════════════════════════════════════════════════════════════
 */

// ── User ───────────────────────────────────────────────────
export {
  roleEnum,
  orgRoleEnum,
  accountTypeEnum,
  subscriptionPlanEnum,
  subscriptionStatusEnum,
  notificationCategoryEnum,
  categoryPreferenceSchema,
  quietHoursSchema,
  userPreferencesSchema,
  userSchema,
  userUpdateSchema,
  type User,
  type UserUpdate,
} from './userSchema.js';

// ── Organization ───────────────────────────────────────────
export {
  internalRoleEnum,
  memberStatusEnum,
  permissionEnum,
  orgTeamMemberSchema,
  organizationSchema,
  organizationUpdateSchema,
  type Organization,
  type OrganizationUpdate,
} from './organizationSchema.js';

// ── Project ────────────────────────────────────────────────
export {
  projectStatusEnum,
  phaseStatusEnum,
  assetClassEnum,
  projectRoleEnum,
  loanStatusEnum,
  offerStatusEnum,
  financingTypeEnum,
  exitStrategyTypeEnum,
  exitTypeEnum,
  entryPathEnum,
  rehabTierEnum,
  projectMemberSchema,
  costEntrySchema,
  projectFinancialsSchema,
  projectSchema,
  projectUpdateSchema,
  type Project,
  type ProjectUpdate,
  type ProjectFinancials,
} from './projectSchema.js';

// ── Property Metric Snapshot ───────────────────────────────
export {
  periodTypeEnum,
  propertyMetricSnapshotSchema,
  type PropertyMetricSnapshot,
} from './propertyMetricSnapshotSchema.js';

// ── Project Documents ──────────────────────────────────────
export {
  documentCategoryEnum,
  folderPhaseEnum,
  projectFolderSchema,
  projectFileSchema,
  type ProjectFolder,
  type ProjectFile,
} from './projectDocumentSchema.js';

// ── Vendor Request ─────────────────────────────────────────
export {
  requestStatusEnum,
  vendorTypeEnum,
  vendorRequestSchema,
  createVendorRequestSchema,
  type VendorRequest,
  type CreateVendorRequestInput,
} from './vendorRequestSchema.js';

// ── Notification ───────────────────────────────────────────
export {
  notificationTypeEnum,
  notificationUrgencyEnum,
  notificationChannelEnum,
  notificationActorSchema,
  notificationObjectReferenceSchema,
  notificationSchema,
  type Notification,
} from './notificationSchema.js';

// ── Inbox Item ─────────────────────────────────────────────
export {
  inboxItemTypeEnum,
  inboxPriorityEnum,
  inboxItemSchema,
  type InboxItem,
} from './inboxItemSchema.js';

// ── Stripe Event ───────────────────────────────────────────
export {
  stripeEventSchema,
  type StripeEvent,
} from './stripeEventSchema.js';

// ── Data Completion Task ───────────────────────────────────
export {
  dataCompletionTaskSchema,
  type DataCompletionTask,
} from './dataCompletionTaskSchema.js';
