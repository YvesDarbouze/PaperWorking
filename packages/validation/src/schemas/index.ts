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
  interestRateTypeEnum,
  floatingIndexEnum,
  underwritingAcquisitionSchema,
  underwritingRentRollSchema,
  underwritingDebtSchema,
  underwritingExitSchema,
  underwritingHurdlesSchema,
  underwritingInputsSchema,
  getDefaultUnderwritingInputs,
  projectSchema,
  projectUpdateSchema,
  type Project,
  type ProjectUpdate,
  type ProjectFinancials,
  type UnderwritingAcquisition,
  type UnderwritingRentRoll,
  type UnderwritingDebt,
  type UnderwritingExit,
  type UnderwritingHurdles,
  type UnderwritingInputs,
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

// ── REIL Phase 01: Acquisition ───────────────────────────────
export {
  acquisitionPipelineStatusEnum,
  deadReasonCategoryEnum,
  deadRecordSchema,
  sourcingTypeSchema,
  sourceContactSchema,
  sourcingIntakeSchema,
  propertyTypeSchema,
  occupancyStatusSchema,
  propertySnapshotSchema,
  investmentStrategySchema,
  rehabCategoryEnum,
  rehabLineItemSchema,
  itemizedRehabBudgetSchema,
  holdingCostsSchema,
  underwritingAssumptionsSchema,
  annualProjectionItemSchema,
  paymentShockSchema,
  underwritingOutputsSchema,
  underwritingSnapshotSchema,
  offerTermsSchema,
  counterofferRoundSchema,
  offerLoiSchema,
  emdStatusEnum,
  earnestMoneyDepositSchema,
  purchaseAndSaleAgreementSchema,
  contingencyTypeEnum,
  contingencyStatusEnum,
  contingencyExtensionSchema,
  contingencyItemSchema,
  standardDueDiligenceTypeEnum,
  dueDiligenceCategorySchema,
  dueDiligenceItemSchema,
  recordingInfoSchema,
  closingDocumentSchema,
  closingConveyanceSchema,
  acquisitionRoleSchema,
  projectTeamMemberSchema,
  acquisitionTaskStatusSchema,
  acquisitionTaskSchema,
  getStrategyTemplateDefaults,
  type AcquisitionPipelineStatus,
  type DeadReasonCategory,
  type DeadRecord,
  type SourcingType,
  type SourceContact,
  type SourcingIntake,
  type PropertyType,
  type OccupancyStatus,
  type PropertySnapshot,
  type InvestmentStrategy,
  type RehabCategory,
  type RehabLineItem,
  type ItemizedRehabBudget,
  type HoldingCosts,
  type UnderwritingAssumptions,
  type AnnualProjectionItem,
  type PaymentShock,
  type UnderwritingOutputs,
  type UnderwritingSnapshot,
  sensitivityCellSchema,
  sensitivityGridSchema,
  type SensitivityCell,
  type SensitivityGrid,
  type SensitivityGridsResult,
  type OfferTerms,
  type CounterofferRound,
  type OfferLoi,
  type EmdStatus,
  type EarnestMoneyDeposit,
  type PurchaseAndSaleAgreement,
  type ContingencyType,
  type ContingencyStatus,
  type ContingencyExtension,
  type ContingencyItem,
  type StandardDueDiligenceType,
  type DueDiligenceCategory,
  type DueDiligenceItem,
  type RecordingInfo,
  type ClosingDocument,
  type ClosingConveyance,
  type AcquisitionRole,
  type ProjectTeamMember,
  type AcquisitionTaskStatus,
  type AcquisitionTask,
  type StrategyTemplateDefaults,
} from './acquisitionSchema.js';


