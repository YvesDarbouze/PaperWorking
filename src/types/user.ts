/* ═══════════════════════════════════════════════════════
   PaperWorking — User Profile Type

   Typed interface for the Firestore /users/{uid} document.
   Used by AuthContext, usePaywall, KPIGrid, and
   any component that reads `profile.*` fields.
   ═══════════════════════════════════════════════════════ */

import { Timestamp } from 'firebase/firestore';

export type AccountType = 'investor' | 'vendor';
export type UserRole = 'Lead Investor' | 'General Contractor' | 'Vendor' | 'Analyst' | 'Observer';
export type SubscriptionPlan = 'None' | 'Individual' | 'Team' | 'Vendor Network' | 'Lawyer' | 'Lawyer Lead-Gen';
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

  /* ── Guest / Invite fields ── */
  inviteToken?: string;
  invitedToProjectId?: string;

  /* ── Timestamps ── */
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
