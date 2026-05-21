/* ═══════════════════════════════════════════════════════
   PaperWorking — User Profile Type

   Typed interface for the Firestore /users/{uid} document.
   Used by AuthContext, usePaywall, KPIGrid, and
   any component that reads `profile.*` fields.
   ═══════════════════════════════════════════════════════ */

import { Timestamp } from 'firebase/firestore';

import { Role } from './schema';

export type AccountType = 'investor' | 'vendor';
export type UserRole = Role;
export type SubscriptionPlan = 'None' | 'Individual' | 'Team' | 'Vendor Network';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'paused';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  accountType?: AccountType;
  organizationId: string;

  /* ── Subscription ── */
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;

  /* ── Billing & Stripe Metadata ── */
  stripeCustomerId?: string;
  lastFour?: string;
  cardBrand?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;

  /* ── Contact Info ── */
  phone?: string;
  companyName?: string;

  /* ── Guest / Invite fields ── */
  inviteToken?: string;
  invitedToProjectId?: string;

  /* ── Timestamps ── */
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
