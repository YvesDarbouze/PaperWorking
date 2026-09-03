export type LinkageProposedAction =
  | 'no-op'
  | 'create'
  | 'update-linkage'
  | 'conflict'
  | 'ambiguous'
  | 'skipped';

export type StripeCustomerSnapshot = {
  id: string;
  email: string | null;
  metadata: Record<string, string>;
};

export type StripeSubscriptionSnapshot = {
  id: string;
  customerId: string;
  status: string;
  priceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  trialEnd: number | null;
  metadata: Record<string, string>;
  customer: StripeCustomerSnapshot;
};

export type AuthUserIndexEntry = {
  uid: string;
  email: string | null;
};

export type FirestoreUserBillingSnapshot = {
  uid: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
};

export type FirestoreSubscriptionSnapshot = {
  uid: string;
  plan: string | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  updatedAt: unknown;
};

export type StripeDiscoveryRow = {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  email: string | null;
  metadataUid: string | null;
  authUserMatch: string | null;
  confidence: 'verified_metadata' | 'existing_linkage' | 'unique_email' | 'unmatched' | 'ambiguous' | 'conflict';
  action: string;
};

export type StripeLinkagePlanRow = {
  uid: string | null;
  email: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  existingFirestoreSubscription: boolean;
  proposedAction: LinkageProposedAction;
  conflict: boolean;
  conflictReasons: string[];
  unresolvedPlan: boolean;
  fieldsToWrite: string[];
  payload?: Record<string, unknown>;
  userSnapshotPayload?: Record<string, unknown>;
};

export type StripeLinkageSummary = {
  dryRun: boolean;
  discovery: StripeDiscoveryRow[];
  rows: StripeLinkagePlanRow[];
  counts: {
    matched: number;
    unmatched: number;
    ambiguous: number;
    conflicts: number;
    noOp: number;
    create: number;
    updateLinkage: number;
    skipped: number;
    unresolvedPlan: number;
  };
  executed?: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    conflicts: number;
  };
};

export type StripeLinkageParityReport = {
  stripeCustomers: number;
  stripeSubscriptions: number;
  firestoreSubscriptions: number;
  linkedUsers: number;
  missingStripeIds: string[];
};
