import type {
  OrganizationMemberReadModel,
  OrganizationReadModel,
  ProjectReadModel,
  UserReadModel,
} from './types/read-models.js';

export type ShadowReadMismatch = {
  entity: string;
  id: string;
  field: string;
  postgresValue: string | null;
  firestoreValue: string | null;
};

function normalizeForCompare(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function compareReadModels<T extends Record<string, unknown>>(
  entity: string,
  id: string,
  postgres: T,
  firestore: T,
  fields: (keyof T)[],
): ShadowReadMismatch[] {
  const mismatches: ShadowReadMismatch[] = [];
  for (const field of fields) {
    const postgresValue = normalizeForCompare(postgres[field]);
    const firestoreValue = normalizeForCompare(firestore[field]);
    if (postgresValue !== firestoreValue) {
      mismatches.push({
        entity,
        id,
        field: String(field),
        postgresValue,
        firestoreValue,
      });
    }
  }
  return mismatches;
}

/** Log mismatch metadata only — never log emails or other sensitive values. */
export function logShadowReadMismatches(mismatches: ShadowReadMismatch[]): void {
  if (mismatches.length === 0) return;
  console.warn('[firestore-shadow-read] mismatches detected', {
    count: mismatches.length,
    samples: mismatches.slice(0, 5).map((m) => ({
      entity: m.entity,
      id: m.id,
      field: m.field,
    })),
  });
}

type PostgresUserLike = {
  id: string;
  email: string;
  name?: string | null;
  displayName?: string | null;
  accountType?: string | null;
  role?: string | null;
  legacyFirebaseUid?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PostgresOrganizationLike = {
  id: string;
  name: string;
  slug?: string | null;
  ownerId?: string | null;
  settings?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PostgresOrganizationMemberLike = {
  id: string;
  organizationId: string;
  userId?: string | null;
  email?: string | null;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type PostgresProjectLike = {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  investorId?: string | null;
  name?: string | null;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  status?: string | null;
  currentPhase: number;
  visibility?: string | null;
  purchasePrice?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export function userFromPostgres(row: PostgresUserLike): UserReadModel {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? null,
    displayName: row.displayName ?? row.name ?? null,
    accountType: row.accountType ?? null,
    role: row.role ?? null,
    personalOrganizationId: null,
    legacyFirebaseUid: row.legacyFirebaseUid ?? null,
    subscriptionPlan: row.subscriptionPlan ?? null,
    subscriptionStatus: row.subscriptionStatus ?? null,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function organizationFromPostgres(row: PostgresOrganizationLike): OrganizationReadModel {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    ownerId: row.ownerId ?? null,
    settings:
      row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
        ? (row.settings as Record<string, unknown>)
        : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function organizationMemberFromPostgres(
  row: PostgresOrganizationMemberLike,
): OrganizationMemberReadModel {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId ?? null,
    email: row.email ?? null,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function projectFromPostgres(row: PostgresProjectLike): ProjectReadModel {
  return {
    id: row.id,
    organizationId: row.organizationId ?? null,
    userId: row.userId ?? null,
    investorId: row.investorId ?? null,
    name: row.name ?? null,
    title: row.title ?? row.name ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    zip: row.zip ?? null,
    status: row.status ?? null,
    currentPhase: row.currentPhase,
    visibility: row.visibility ?? null,
    purchasePrice: row.purchasePrice ?? null,
    reilProjectId: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
