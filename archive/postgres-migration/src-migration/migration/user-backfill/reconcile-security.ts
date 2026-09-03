import type {
  FirestoreUserDoc,
  PostgresUserSnapshot,
  SecurityReviewReason,
} from './types.js';

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function isAdminAccountType(value: string | null | undefined): boolean {
  return norm(value) === 'admin';
}

function isAdminRole(value: string | null | undefined): boolean {
  return norm(value) === 'admin';
}

/** Never auto-elevate privileges; collect security review items. */
export function collectSecurityReviews(input: {
  firestore?: FirestoreUserDoc | null;
  postgres?: PostgresUserSnapshot | null;
}): SecurityReviewReason[] {
  const reviews: SecurityReviewReason[] = [];
  const fs = input.firestore ?? {};
  const pg = input.postgres;

  if (pg) {
    if (isAdminAccountType(pg.accountType)) {
      reviews.push('postgres_admin_account_type');
    }
    if (isAdminRole(pg.role)) {
      reviews.push('postgres_admin_role');
    }
  }

  const fsAccount = norm(typeof fs.accountType === 'string' ? fs.accountType : null);
  const pgAccount = norm(pg?.accountType);
  if (
    fsAccount &&
    pgAccount &&
    fsAccount !== pgAccount &&
    (isAdminAccountType(fs.accountType as string) || isAdminAccountType(pg.accountType))
  ) {
    reviews.push('account_type_mismatch');
  }

  const fsAdmin = isAdminAccountType(fs.accountType as string) || isAdminRole(fs.role as string);
  const pgAdmin =
    isAdminAccountType(pg?.accountType) || isAdminRole(pg?.role);
  if (fsAdmin && pg && !pgAdmin) {
    reviews.push('firestore_admin_mismatch');
  }

  return [...new Set(reviews)];
}

/** Account type safe for automatic provisioning — never admin from Postgres. */
export function safeAccountTypeForCreate(postgres?: PostgresUserSnapshot | null): string {
  if (!postgres?.accountType) return 'investor';
  const n = norm(postgres.accountType);
  if (n === 'admin') return 'investor';
  if (n === 'vendor') return 'vendor';
  if (n === 'investment_team') return 'investment_team';
  return 'investor';
}

/** Role safe to fill when missing — never auto-grant admin. */
export function safeRoleForFill(
  existingRole: unknown,
  postgres?: PostgresUserSnapshot | null,
): string | null | undefined {
  if (existingRole != null && String(existingRole).trim() !== '') {
    return undefined;
  }
  if (!postgres?.role) return undefined;
  if (isAdminRole(postgres.role)) return undefined;
  return postgres.role;
}
