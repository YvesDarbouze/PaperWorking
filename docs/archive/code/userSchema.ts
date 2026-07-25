/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — User Schema (Zod)
 *
 * Canonical Zod schema for the Firestore `/users/{uid}` document.
 * This is the single source of truth for user data validation.
 *
 * Mirrors: src/types/user.ts (UserProfile)
 *          src/types/schema.ts (ApplicationUser)
 *
 * @architect  Schema owner — do NOT add fields without updating
 *             both the Zod schema and the TypeScript interface.
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Reusable Enums ─────────────────────────────────────────

/** Platform roles — matches `Role` in schema.ts */
export const roleEnum = z.enum([
  'Lead Investor',
  'Platform Admin',
  'Admin',
  'General Contractor',
  'Real Estate Agent',
  'Accountant',
  'Lender',
  'Vendor',
  'Analyst',
  'Observer',
  'Standard',
  'Guest',
]);

/** Organization-level roles — matches `OrgRole` in schema.ts */
export const orgRoleEnum = z.enum(['Lead Investor', 'Admin']);

/** Account type — investor or vendor */
export const accountTypeEnum = z.enum(['investor', 'vendor']);

/** Subscription plans available */
export const subscriptionPlanEnum = z.enum([
  'None',
  'Individual',
  'Team',
  'Vendor Network',
]);

/** Subscription lifecycle states */
export const subscriptionStatusEnum = z.enum([
  'active',
  'inactive',
  'past_due',
  'canceled',
  'trialing',
  'incomplete',
  'paused',
]);

/** Notification categories used for preference routing */
export const notificationCategoryEnum = z.enum([
  'syndication',
  'bids',
  'tasks',
  'deadlines',
  'billing',
  'alerts',
]);

// ── Nested Objects ─────────────────────────────────────────

/** Per-category notification delivery preferences */
export const categoryPreferenceSchema = z.object({
  /** Show in the in-app inbox feed */
  inbox: z.boolean(),
  /** Send as email */
  email: z.boolean(),
  /** Send as push notification (FCM) */
  push: z.boolean(),
});

/** Quiet hours — suppresses push notifications during a window */
export const quietHoursSchema = z.object({
  /** Whether quiet hours are active */
  enabled: z.boolean(),
  /** Start time in HH:MM (24h) format, e.g. "22:00" */
  start: z.string(),
  /** End time in HH:MM (24h) format, e.g. "07:00" */
  end: z.string(),
  /** IANA timezone, e.g. "America/New_York" */
  timezone: z.string(),
});

/** User notification preferences */
export const userPreferencesSchema = z.object({
  /** Master toggle for push notifications */
  pushEnabled: z.boolean().optional(),
  /** Master toggle for email notifications */
  emailEnabled: z.boolean().optional(),
  /** Auto-archive inbox items after N days (0 = never) */
  autoArchiveDays: z.number().int().nonnegative().optional(),
  /** Quiet hours configuration */
  quietHours: quietHoursSchema.optional(),
  /** Per-category delivery preferences */
  categories: z.record(notificationCategoryEnum, categoryPreferenceSchema).optional(),
});

// ── Main Schema ────────────────────────────────────────────

/**
 * Firestore `/users/{uid}` document schema.
 *
 * This schema is intentionally loose with `.optional()` to accommodate
 * existing Firestore documents that may predate newer fields.
 */
export const userSchema = z.object({
  /** Firebase Auth UID — document ID */
  uid: z.string().min(1),

  /** User's email address. Null when using phone-only auth (not currently supported). */
  email: z.string().email().nullable(),

  /** User-facing display name */
  displayName: z.string().min(1),

  /** Platform role — controls global permissions */
  role: roleEnum.or(z.string()),

  /** Organization-level role — the user's self-designated title */
  orgRole: orgRoleEnum.or(z.string()).optional(),

  /** Whether this is an investor or vendor account */
  accountType: accountTypeEnum.optional(),

  /** The user's default "Me" workspace organization ID */
  personalOrganizationId: z.string().min(1),

  /**
   * DEPRECATED: Transitioning to personalOrganizationId.
   * Still present on legacy user documents.
   */
  organizationId: z.string().optional(),

  /**
   * Multi-tenant membership map.
   * Key: organization ID, Value: role string or OrgRole enum.
   */
  memberships: z.record(z.string(), z.string()).optional(),

  // ── Subscription ──

  /** Current subscription plan */
  subscriptionPlan: subscriptionPlanEnum,

  /** Current subscription lifecycle state */
  subscriptionStatus: subscriptionStatusEnum,

  // ── Billing & Stripe Metadata ──

  /** Stripe Customer ID (cus_xxx). Set after first checkout. */
  stripeCustomerId: z.string().optional(),

  /** Last 4 digits of the payment method on file */
  lastFour: z.string().max(4).optional(),

  /** Card brand (e.g. "visa", "mastercard") */
  cardBrand: z.string().optional(),

  /** Whether the subscription cancels at period end */
  cancelAtPeriodEnd: z.boolean().optional(),

  /** Unix timestamp of current billing period end */
  currentPeriodEnd: z.number().optional(),

  // ── Contact Info ──

  /** Phone number (free-form, no strict validation at schema level) */
  phone: z.string().optional(),

  /** Company or organization name */
  companyName: z.string().optional(),

  /** Whether the user has completed the onboarding wizard */
  onboardingCompleted: z.boolean().optional(),

  /** Intent selected during onboarding — which path the user chose */
  onboardingIntent: z.enum(['first_investment', 'own_properties', 'past_deals', 're_professional']).optional(),

  /** Timestamp when the user's first metric went live */
  firstMetricLit: z.any().optional(),

  /** Whether the user dismissed the guided overlay */
  onboardingOverlayDismissed: z.boolean().optional(),

  // ── Guest / Invite fields ──

  /** Invite token when the user arrived via a crowdfund invitation link */
  inviteToken: z.string().optional(),

  /** Project ID the user was invited to join */
  invitedToProjectId: z.string().optional(),

  // ── Push Notifications ──

  /** Firebase Cloud Messaging tokens for push delivery */
  fcmTokens: z.array(z.string()).optional(),

  /** Last active timestamp — Firestore Timestamp or Date */
  lastActiveAt: z.any().optional(),

  /** User notification preferences */
  preferences: userPreferencesSchema.optional(),

  // ── Integration Metadata ──

  /** Google Calendar OAuth2 refresh token */
  googleCalendarRefreshToken: z.string().optional(),

  // ── Timestamps ──
  // Firestore stores these as Timestamps; the client hydrates them to Date.
  // z.any() is used here to accept both Timestamp and Date objects.

  /** Document creation timestamp */
  createdAt: z.any(),

  /** Last update timestamp */
  updatedAt: z.any(),
});

/** Inferred TypeScript type from the Zod schema */
export type User = z.infer<typeof userSchema>;

/**
 * Partial schema for updates — all fields optional.
 * Use when validating PATCH-style Firestore updates.
 */
export const userUpdateSchema = userSchema.partial();
export type UserUpdate = z.infer<typeof userUpdateSchema>;
