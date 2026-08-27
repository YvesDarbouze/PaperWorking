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

// ── Organization Members (P0) ───────────────────────────────
export {
  organizationMemberRoleEnum,
  organizationMemberStatusEnum,
  organizationMemberSchema,
  type OrganizationMember,
} from './organizationMemberSchema.js';

// ── Project Members / Memberships (P0 SoT) ──────────────────
// Distinct from embedded projectMemberSchema on projects.members (deprecated).
export {
  projectMembershipRoleEnum,
  projectMembershipStatusEnum,
  projectMembershipSchema,
  type ProjectMembership,
} from './projectMembershipSchema.js';

// ── Task Assignments (P0) ───────────────────────────────────
export {
  taskAssignmentStatusEnum,
  taskAssignmentPriorityEnum,
  taskAssignmentSchema,
  type TaskAssignment,
} from './taskAssignmentSchema.js';

// ── Vendor Services (P1) ────────────────────────────────────
export {
  vendorServiceStatusEnum,
  vendorServiceSchema,
  type VendorService,
} from './vendorServiceSchema.js';

// ── Deal Invitations (P1) ───────────────────────────────────
export {
  dealInvitationStatusEnum,
  dealInvitationSchema,
  type DealInvitation,
} from './dealInvitationSchema.js';

// ── Investor Followers (P1) ─────────────────────────────────
export {
  investorFollowerSchema,
  type InvestorFollower,
} from './investorFollowerSchema.js';

// ── Message Threads (P1) ────────────────────────────────────
export {
  messageThreadTypeEnum,
  messageThreadSchema,
  type MessageThread,
} from './messageThreadSchema.js';
