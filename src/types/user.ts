/* ═══════════════════════════════════════════════════════
   PaperWorking — User Profile Type

   Typed interface for the Firestore /users/{uid} document.
   Used by AuthContext, usePaywall, KPIGrid, and
   any component that reads `profile.*` fields.
   ═══════════════════════════════════════════════════════ */

import { Timestamp } from 'firebase/firestore';

import { Role, OrgRole } from './schema';

export type AccountType = 'investor' | 'investment_team' | 'vendor' | 'admin';
export type UserTier = 'investor' | 'investment_team' | 'vendor';
export type UserRole = Role;
export type SubscriptionPlan = 'None' | 'Individual' | 'Team' | 'Vendor Network';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'paused';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  orgRole?: OrgRole;
  accountType?: AccountType;
  personalOrganizationId: string; // The user's default "Me" workspace
  organizationId?: string; // DEPRECATED: Transitioning to personalOrganizationId
  memberships?: Record<string, OrgRole | string>; // Map of tenant ID to role

  syntheticAgent?: boolean;
  agentPersona?: string;

  /* ── Subscription ── */
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;

  /* ── Billing & Stripe Metadata ── */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEnd?: string;
  trialEndingSoon?: boolean;
  lastFour?: string;
  cardBrand?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
  /** Billing contact overrides — edited inline on Settings → Billing.
   *  Distinct from the account `email`/`companyName`: invoices and receipts
   *  may need to go to accounts payable rather than the account holder. */
  billingEmail?: string;
  billingAddress?: string;

  /* ── Contact Info ── */
  phone?: string;
  companyName?: string;
  onboardingCompleted?: boolean;
  onboardingIntent?: 'first_investment' | 'own_properties' | 'past_deals' | 're_professional';
  firstMetricLit?: Timestamp;
  onboardingOverlayDismissed?: boolean;
  claimedEmails?: string[];

  /* ── Guest / Invite fields ── */
  inviteToken?: string;
  invitedToProjectId?: string;

  /* ── Buy-Box Thresholds (AQ-13) ── */
  buyBoxTargetCapRate?: number;
  buyBoxTargetCoc?: number;
  buyBoxMinDscr?: number;
  buyBoxMaxPurchasePrice?: number;

  /* ── Push Notifications ── */
  fcmTokens?: string[];
  lastActiveAt?: Timestamp;
  preferences?: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    autoArchiveDays?: number;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    categories?: Record<NotificationCategory, CategoryPreference>;
  };

  /* ── Timestamps ── */
  createdAt: Timestamp;
  updatedAt: Timestamp;

  /* ── GDPR / Growth / Referrals ── */
  deletionScheduledAt?: Timestamp | null;
  referralCode?: string;
  referredBy?: string | null;
  firstUtm?: Record<string, string> | null;
  lastUtm?: Record<string, string> | null;
  vendorTypes?: VendorType[];
}

export type VendorType =
  | 'real_estate_lawyer'
  | 'loan_processor'
  | 'general_contractor'
  | 'specialty_contractor'
  | 'property_manager'
  | 'insurance_agent'
  | 'maintenance'
  | 'cleaning_service'
  | 'real_estate_agent'
  | 'cpa'
  | 'inspector';


export type NotificationCategory = 'syndication' | 'bids' | 'tasks' | 'deadlines' | 'billing' | 'alerts';

export interface CategoryPreference {
  inbox: boolean;
  email: boolean;
  push: boolean;
}
