export type BackfillEntity = 'users';

export type ProposedAction =
  | 'no-op'
  | 'create'
  | 'fill-missing'
  | 'conflict'
  | 'ambiguous'
  | 'skipped';

export type PostgresUserSnapshot = {
  id: string;
  email: string;
  legacyFirebaseUid: string | null;
  name: string | null;
  displayName: string | null;
  phone: string | null;
  role: string | null;
  accountType: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  companyName: string | null;
  syntheticAgent: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AuthUserSnapshot = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  createdAt: Date | null;
  disabled: boolean;
};

export type FirestoreUserDoc = Record<string, unknown>;

export type SecurityReviewReason =
  | 'postgres_admin_account_type'
  | 'postgres_admin_role'
  | 'firestore_admin_mismatch'
  | 'account_type_mismatch';

export type UserBackfillPlanRow = {
  uid: string;
  email: string | null;
  firestoreExists: boolean;
  postgresMatch: 'by_uid' | 'by_legacy_uid' | 'by_email' | 'none';
  authFallback: boolean;
  proposedAction: ProposedAction;
  conflict: boolean;
  conflictReasons: string[];
  securityReviews: SecurityReviewReason[];
  fieldsToWrite: string[];
  /** Present when action is create or fill-missing */
  payload?: Record<string, unknown>;
};

export type UserBackfillSummary = {
  dryRun: boolean;
  rows: UserBackfillPlanRow[];
  counts: {
    existing: number;
    create: number;
    fillMissing: number;
    noOp: number;
    conflict: number;
    ambiguous: number;
    skipped: number;
    securityReview: number;
  };
  executed?: {
    migrated: number;
    skipped: number;
    failed: number;
    conflicts: number;
  };
};

export type UserParityReport = {
  authUsers: number;
  firestoreUsers: number;
  missingFirestoreDoc: string[];
  extraFirestoreDocs: string[];
  emailMismatches: Array<{ uid: string; authEmail: string | null; firestoreEmail: string | null }>;
  privilegeConflicts: Array<{ uid: string; reasons: SecurityReviewReason[] }>;
};
