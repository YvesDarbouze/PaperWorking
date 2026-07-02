/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Organization Schema (Zod)
 *
 * Canonical Zod schema for the Firestore `/organizations/{orgId}` document.
 * Organizations are the B2B multi-tenant boundary — every project
 * belongs to exactly one organization.
 *
 * Mirrors: src/types/schema.ts (Organization, OrgTeamMember)
 *
 * @architect  Schema owner
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { subscriptionPlanEnum, subscriptionStatusEnum } from './userSchema';

// ── Nested Types ───────────────────────────────────────────

/** Internal roles within an organization (not project-specific) */
export const internalRoleEnum = z.enum([
  'CEO',
  'President',
  'CFO',
  'COO',
  'Admin',
  'Deal Lead',
]);

/** Member status within the organization */
export const memberStatusEnum = z.enum([
  'active',
  'invited',
  'removed',
  'suspended',
]);

/** Atomic permission keys for fine-grained RBAC */
export const permissionEnum = z.enum([
  'projects.view',
  'projects.create',
  'projects.edit',
  'projects.delete',
  'tasks.view',
  'tasks.create',
  'tasks.edit',
  'tasks.assign',
  'reports.view',
  'reports.export',
  'billing.manage',
  'team.invite',
  'team.manage_members',
  'team.manage_roles',
  'vendors.manage',
  'deal_marketplace.post',
  'crowdfunding.manage',
  'settings.manage',
]);

/** Organization team member embedded in the teamMembers array */
export const orgTeamMemberSchema = z.object({
  /** Member record ID */
  id: z.string().min(1),

  /** Firebase Auth UID. Undefined if invitation hasn't been accepted. */
  uid: z.string().optional(),

  /** Email address used for invitation */
  email: z.string().email(),

  /** Display name */
  displayName: z.string(),

  /** Internal org role (CEO, CFO, Deal Lead, etc.) */
  internalRole: internalRoleEnum,

  /** Optional per-member permission overrides */
  customPermissions: z.array(permissionEnum).optional(),

  /** Scope of this member's access: tenant-wide or project-specific */
  scope: z.enum(['tenant', 'project']).optional(),

  /** Project IDs this member leads (Deal Lead only) */
  assignedProjectIds: z.array(z.string()),

  /** When this member was invited */
  invitedAt: z.any(), // Firestore Timestamp | Date

  /** Current membership status */
  status: memberStatusEnum,
});

// ── Main Schema ────────────────────────────────────────────

/**
 * Firestore `/organizations/{orgId}` document schema.
 *
 * The organization is the top-level tenant boundary.
 * Individual accounts have 1 seat; Team accounts have up to 10.
 */
export const organizationSchema = z.object({
  /** Firestore document ID */
  id: z.string().min(1),

  /** Organization display name */
  name: z.string().min(1),

  /** Firebase UID of the primary billing/admin user */
  ownerUid: z.string().min(1),

  /** Controls seat count and team features */
  accountTier: z.enum(['Individual', 'Team']),

  /** Current subscription plan */
  subscriptionPlan: subscriptionPlanEnum,

  /** Current subscription lifecycle state */
  subscriptionStatus: subscriptionStatusEnum,

  /**
   * Team members array.
   * Individual accounts: always empty.
   * Team accounts: up to maxSeats members.
   */
  teamMembers: z.array(orgTeamMemberSchema),

  /** Maximum seats allowed (1 for Individual, 10 for Team) */
  maxSeats: z.number().int().min(1),

  // ── Portfolio Aggregates ──
  // Updated on Phase 4 Project Close. These are denormalized rollups.

  /**
   * Total number of projects closed under this org.
   * Incremented each time a project reaches closed_won.
   */
  totalProjectsClosed: z.number().int().nonnegative().optional(),

  /**
   * Sum of net realized profit across all closed projects.
   * Unit: USD dollars (float).
   * NOTE: Planned migration to store in cents for precision.
   */
  totalNetRealizedProfit: z.number().optional(),

  /**
   * Weighted average ROI across all closed projects.
   * Unit: percentage as whole number (e.g. 18.5 for 18.5%).
   */
  averagePortfolioROI: z.number().optional(),

  // ── Timestamps ──

  /** Document creation timestamp */
  createdAt: z.any(),

  /** Last update timestamp */
  updatedAt: z.any(),
});

/** Inferred TypeScript type from the Zod schema */
export type Organization = z.infer<typeof organizationSchema>;

/**
 * Partial schema for updates — all fields optional.
 */
export const organizationUpdateSchema = organizationSchema.partial();
export type OrganizationUpdate = z.infer<typeof organizationUpdateSchema>;
